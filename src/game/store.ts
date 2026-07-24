import { create } from 'zustand'
import { CONFIG, clockOf, queueCapOf } from './config'
import {
  type P2,
  LAYOUT,
  departPath,
  fromPumpPath,
  pathLength,
  returnPath,
  spotPos,
  toPeronPath,
  toPumpPath,
} from './paths'
import { t } from '../i18n'

export type VehicleState =
  | 'parked'
  | 'toPeron'
  | 'loading'
  | 'departing'
  | 'onTrip'
  | 'returning'
  | 'toPump'
  | 'fueling'
  | 'fromPump'

export type Vehicle = {
  id: number
  no: number // filo sıra numarası
  plate: string // 34 M XXXX — arayüzde araç adı budur
  spotIdx: number // sahip olunan park yeri
  hasDriver: boolean
  state: VehicleState
  path: P2[] | null
  dist: number // mevcut hat üzerinde alınan mesafe
  passengers: number
  wait: number // peronda geçen süre
  boardAcc: number // biniş hız sayacı
  tripLeft: number
  fuel: number // depo (L), 0..fuelCapacity
  wear: number // yıpranma %, 100'de sefer yapamaz
  nightShift: boolean // nöbetçi: 00:00-06:00 arası da çalışır
  kahya: number // muavin seviyesi, 0 = yok
  old: boolean // devren alınan eski kasa: yıpranma hızlı birikir
  share: number // oyuncunun hisse payı (%); 100 = tamamı
  pendingRefuel: boolean // seferdeyken planlanan yakıt: parka dönünce pompaya gider
  pendingRepair: boolean // seferdeyken planlanan bakım: parka dönünce uygulanır
}

// Araç değerlemesi: taban fiyat × kasa yaşı × yıpranma × işletme itibarı
export function valuationOf(v: Vehicle, fleetSize: number, rep: number): number {
  const base = CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (fleetSize - 1)
  return Math.round(
    base * (v.old ? CONFIG.rivalBuyFactor : 1) * (1 - v.wear / 250) * (0.85 + rep * 0.06),
  )
}

// Koltuk + kahyanın aldırdığı ayakta yolcu
export function capacityOf(v: Vehicle): number {
  if (v.kahya <= 0) return CONFIG.seatCount
  return (
    CONFIG.seatCount + CONFIG.kahyaBaseStanding + CONFIG.kahyaStandingPerLevel * (v.kahya - 1)
  )
}

export function kahyaWageOf(v: Vehicle): number {
  return v.kahya > 0 ? CONFIG.kahyaWage + CONFIG.kahyaWagePerLevel * (v.kahya - 1) : 0
}

// Rakip minibüs: aynı hattın başka esnafı — bizim perondan yolcu kapar
export type Rival = {
  id: number
  no: number // hat sıra numarası (görsel etiket)
  plate: string // 34 M XXXX — devren alınırsa araca taşınır
  state: 'away' | 'toPeron' | 'loading' | 'departing'
  path: P2[] | null
  dist: number
  timer: number // away: sonraki ziyaret; loading: peronda geçen süre
  boardAcc: number
  passengers: number
  wear: number // devren satın alınırsa bu yıpranmayla gelir
  playerShare: number // oyuncunun ortaklık payı (%), 0 = yok
}

function makeRival(no: number): Rival {
  return {
    id: nextId++,
    no,
    plate: genPlate(),
    state: 'away',
    path: null,
    dist: 0,
    timer: rand(CONFIG.rivalVisitMin, CONFIG.rivalVisitMax) * Math.random(),
    boardAcc: 0,
    passengers: 0,
    wear: Math.round(rand(CONFIG.rivalWearMin, CONFIG.rivalWearMax)),
    playerShare: 0,
  }
}

// Rakip peron güzergahı: batı kapısından girer, perona yanaşır (dönüş departPath ile)
const rivalArrivePath: P2[] = [
  [-LAYOUT.offX, LAYOUT.laneNearZ],
  [LAYOUT.gateInX, LAYOUT.laneNearZ],
  [LAYOUT.gateInX, LAYOUT.aisleZ],
  [LAYOUT.peronX, LAYOUT.aisleZ],
]

export type Toast = { id: number; text: string; expireAt: number }

// Senet borcu: her akşam yevmiyelerle birlikte günlük taksit düşer
export type Debt = { id: number; no: number; plate?: string; remaining: number; daily: number }

// Günlük görev: her sabah 06:00'da yenilenir
export type DailyTask = {
  kind: 'carry' | 'revenue' | 'trips'
  target: number
  progress: number
  reward: number
  done: boolean
}

function makeTask(vehicleCount: number): DailyTask {
  const kinds = ['carry', 'revenue', 'trips'] as const
  const kind = kinds[Math.floor(Math.random() * kinds.length)]
  const target =
    kind === 'carry'
      ? CONFIG.taskCarryPerVehicle * vehicleCount
      : kind === 'revenue'
        ? CONFIG.taskRevenuePerVehicle * vehicleCount
        : CONFIG.taskTripsPerVehicle * vehicleCount
  return {
    kind,
    target,
    progress: 0,
    reward: CONFIG.taskRewardBase + CONFIG.taskRewardPerVehicle * vehicleCount,
    done: false,
  }
}

const clampRep = (r: number) => Math.max(0, Math.min(5, r))

// Terminal tesisleri: tek seferlik yatırım, kalıcı etki
export type BuildingKind = 'bufe' | 'cayOcagi' | 'tamirhane'
export type Buildings = Record<BuildingKind, boolean>
export const BUILDING_COSTS: Record<BuildingKind, number> = {
  bufe: CONFIG.bufeCost,
  cayOcagi: CONFIG.cayOcagiCost,
  tamirhane: CONFIG.tamirhaneCost,
}

let nextId = 1
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// İstanbul minibüs plakası: 34 M + 4 hane
function genPlate(): string {
  return `34 M ${1000 + Math.floor(Math.random() * 9000)}`
}
let bufeStreetTimer = 0 // yoldan geçen müşteri sayacı (kalıcı olması gerekmez)

// --- Kalıcılık: localStorage'a periyodik yaz, açılışta geri yükle ---
const SAVE_KEY = 'dolmus-save'
const SAVE_VERSION = 8 // araç/ekonomi şeması değişince artır — eski kayıt sessizce atılır
const SAVE_ACCEPTS = [3, 4, 5, 6, 7, 8] // eski kayıtlar yeni alanlar varsayılanla açılır
let saveAcc = 0

type SavedFields = Pick<
  GameState,
  | 'time'
  | 'day'
  | 'wageDay'
  | 'money'
  | 'totalCarried'
  | 'queue'
  | 'spots'
  | 'drivers'
  | 'vehicles'
  | 'debts'
  | 'spawnTimer'
  | 'rep'
  | 'task'
  | 'taskDay'
  | 'buildings'
  | 'bufeToday'
  | 'rivals'
  | 'rivalRespawn'
>

function persist(s: SavedFields) {
  try {
    const { time, day, wageDay, money, totalCarried, queue, spots, drivers, vehicles, debts, spawnTimer, rep, task, taskDay, buildings, bufeToday, rivals, rivalRespawn } = s
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: SAVE_VERSION,
        nextId,
        time,
        day,
        wageDay,
        money,
        totalCarried,
        queue,
        spots,
        drivers,
        vehicles,
        debts,
        spawnTimer,
        rep,
        task,
        taskDay,
        buildings,
        bufeToday,
        rivals,
        rivalRespawn,
      }),
    )
  } catch {
    // depolama dolu/kapalıysa oyun kayıtsız devam eder
  }
}

function loadSave(): Partial<SavedFields> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!SAVE_ACCEPTS.includes(d?.v) || !Array.isArray(d.vehicles) || d.vehicles.length === 0)
      return null
    if (![d.time, d.money, d.spots, d.drivers].every(Number.isFinite)) return null
    nextId = Number.isFinite(d.nextId) ? d.nextId : 100000
    return {
      time: d.time,
      day: d.day,
      wageDay: d.wageDay ?? 0,
      money: d.money,
      totalCarried: d.totalCarried ?? 0,
      queue: d.queue ?? 0,
      spots: d.spots,
      drivers: d.drivers,
      vehicles: d.vehicles.map((v: Vehicle) => ({
        ...v,
        plate: v.plate ?? genPlate(),
        kahya: v.kahya ?? 0,
        old: v.old ?? false,
        share: v.share ?? 100,
        pendingRefuel: v.pendingRefuel ?? false,
        pendingRepair: v.pendingRepair ?? false,
      })),
      debts: Array.isArray(d.debts) ? d.debts : [],
      spawnTimer: d.spawnTimer ?? 1,
      rep: Number.isFinite(d.rep) ? clampRep(d.rep) : CONFIG.repStart,
      task: d.task ?? null,
      taskDay: d.taskDay ?? 0,
      buildings: {
        bufe: d.buildings?.bufe ?? false,
        cayOcagi: d.buildings?.cayOcagi ?? false,
        tamirhane: d.buildings?.tamirhane ?? false,
      },
      bufeToday: Number.isFinite(d.bufeToday) ? d.bufeToday : 0,
      rivals: Array.isArray(d.rivals)
        ? d.rivals.map((r: Rival) => ({
            ...r,
            plate: r.plate ?? genPlate(),
            playerShare: r.playerShare ?? 0,
          }))
        : [makeRival(7), makeRival(12)],
      rivalRespawn: d.rivalRespawn ?? 0,
    }
  } catch {
    return null
  }
}

function makeVehicle(no: number, spotIdx: number, hasDriver: boolean, plate?: string): Vehicle {
  return {
    id: nextId++,
    no,
    plate: plate ?? genPlate(),
    spotIdx,
    hasDriver,
    state: 'parked',
    path: null,
    dist: 0,
    passengers: 0,
    wait: 0,
    boardAcc: 0,
    tripLeft: 0,
    fuel: CONFIG.fuelCapacity,
    wear: 0,
    nightShift: false,
    kahya: 0,
    old: false,
    share: 100,
    pendingRefuel: false,
    pendingRepair: false,
  }
}

// Sefere çıkabilir mi: yakıt yetmeli, bakım sınırına dayanmamış olmalı
export function canServe(v: Vehicle): boolean {
  return v.fuel >= CONFIG.fuelPerTrip && v.wear < 100
}

export function refuelCost(v: Vehicle): number {
  return Math.ceil((CONFIG.fuelCapacity - v.fuel) * CONFIG.refuelCostPerUnit)
}

export function repairCost(v: Vehicle): number {
  return Math.ceil(v.wear * CONFIG.repairCostPerUnit)
}

type GameState = {
  time: number
  day: number
  wageDay: number // yevmiyesi ödenmiş son gün
  money: number
  totalCarried: number
  queue: number // peronda bekleyen yolcu sayısı
  spots: number
  drivers: number
  vehicles: Vehicle[]
  debts: Debt[]
  toasts: Toast[]
  spawnTimer: number
  rep: number // itibar 0-5 ⭐
  task: DailyTask | null
  taskDay: number // görevi üretilmiş son gün
  buildings: Buildings
  bufeToday: number // büfenin bugünkü hasılatı (akşam özetlenir)
  rivals: Rival[]
  rivalRespawn: number // hatta yeni esnaf katılma sayacı
  buyBuilding: (kind: BuildingKind) => void
  buyRival: (rivalId: number) => void
  buyRivalShare: (rivalId: number, pct: number) => void
  sellRivalShare: (rivalId: number, pct: number) => void
  sellShare: (vehicleId: number, pct: number) => void
  buyBackShare: (vehicleId: number, pct: number) => void
  hireKahya: (vehicleId: number) => void
  upgradeKahya: (vehicleId: number) => void
  payInstallment: (debtId: number) => void
  payOffDebt: (debtId: number) => void
  vehicleCost: () => number
  spotCost: () => number
  buyVehicle: (mode: 'cash' | 'loan') => void
  buySpot: () => void
  hireDriver: () => void
  refuel: (vehicleId: number) => void
  repair: (vehicleId: number) => void
  toggleNightShift: (vehicleId: number) => void
  reset: () => void
  tick: (dt: number) => void
}

function initialState() {
  return {
    time: 0,
    day: 1,
    wageDay: 0,
    money: CONFIG.startMoney,
    totalCarried: 0,
    queue: 0,
    spots: CONFIG.startSpots,
    drivers: 1,
    vehicles: [makeVehicle(1, 0, true)],
    debts: [] as Debt[],
    toasts: [] as Toast[],
    spawnTimer: 1,
    rep: CONFIG.repStart,
    task: null as DailyTask | null,
    taskDay: 0,
    buildings: { bufe: false, cayOcagi: false, tamirhane: false } as Buildings,
    bufeToday: 0,
    rivals: [makeRival(7), makeRival(12)],
    rivalRespawn: 0,
  }
}

export const useGame = create<GameState>((set, get) => ({
  ...initialState(),
  ...(loadSave() ?? {}),

  vehicleCost: () =>
    CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (get().vehicles.length - 1),
  spotCost: () => CONFIG.spotBaseCost * (get().spots - CONFIG.startSpots + 1),

  buyVehicle: (mode: 'cash' | 'loan') => {
    const s = get()
    const price = s.vehicleCost()
    if (s.vehicles.length >= s.spots) return
    const no = s.vehicles.length + 1
    // İlk boş park yerine konur; şoförü yoksa orada bekler
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    const veh = makeVehicle(no, spotIdx, false)
    const vehicles = [...s.vehicles, veh]

    if (mode === 'cash') {
      if (s.money < price) return
      set({ money: s.money - price, vehicles })
      return
    }
    // Senetli satış: peşinat şimdi, kalanı vade farkıyla her akşam taksit
    const down = Math.ceil(price * CONFIG.loanDownRate)
    if (s.money < down) return
    const remaining = Math.round(price * (1 + CONFIG.loanMarkupRate)) - down
    set({
      money: s.money - down,
      vehicles,
      debts: [
        ...s.debts,
        {
          id: nextId++,
          no,
          plate: veh.plate,
          remaining,
          daily: Math.ceil(remaining / CONFIG.loanTermDays),
        },
      ],
    })
  },

  buySpot: () => {
    const s = get()
    const cost = s.spotCost()
    if (s.money < cost || s.spots >= CONFIG.maxSpots) return
    set({ money: s.money - cost, spots: s.spots + 1 })
  },

  hireDriver: () => {
    const s = get()
    const idle = s.vehicles.find((v) => !v.hasDriver)
    if (s.money < CONFIG.driverHireCost || !idle) return
    set({
      money: s.money - CONFIG.driverHireCost,
      drivers: s.drivers + 1,
      vehicles: s.vehicles.map((v) => (v.id === idle.id ? { ...v, hasDriver: true } : v)),
    })
  },

  refuel: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    // Ortaklı araçta yakıt masrafının sadece oyuncu payı ödenir
    const cost = Math.ceil((refuelCost(v) * v.share) / 100)
    if (cost <= 0 || !v.hasDriver) return
    // Araç parkta değilse ya da pompa doluysa: planla — parka dönünce pompaya gider
    const pumpBusy = s.vehicles.some((veh) => veh.state === 'toPump' || veh.state === 'fueling')
    if (v.state !== 'parked' || pumpBusy) {
      set({
        vehicles: s.vehicles.map((veh) =>
          veh.id === vehicleId ? { ...veh, pendingRefuel: true } : veh,
        ),
      })
      return
    }
    if (s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId
          ? { ...veh, state: 'toPump' as const, path: toPumpPath(spotPos(veh.spotIdx)), dist: 0 }
          : veh,
      ),
      toasts: [
        ...s.toasts,
        { id: nextId++, text: t.refueled(v.plate, cost), expireAt: s.time + CONFIG.toastLifetime },
      ].slice(-5),
    })
  },

  repair: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    const discount = s.buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1
    const cost = Math.ceil((repairCost(v) * discount * v.share) / 100)
    if (cost <= 0) return
    // Araç yoldaysa planla: parka dönünce bakım uygulanır
    if (v.state !== 'parked') {
      set({
        vehicles: s.vehicles.map((veh) =>
          veh.id === vehicleId ? { ...veh, pendingRepair: true } : veh,
        ),
      })
      return
    }
    if (s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) => (veh.id === vehicleId ? { ...veh, wear: 0 } : veh)),
    })
  },

  buyBuilding: (kind: BuildingKind) => {
    const s = get()
    const cost = BUILDING_COSTS[kind]
    if (s.buildings[kind] || s.money < cost) return
    set({ money: s.money - cost, buildings: { ...s.buildings, [kind]: true } })
  },

  buyRival: (rivalId: number) => {
    const s = get()
    const r = s.rivals.find((rv) => rv.id === rivalId)
    if (!r || s.vehicles.length >= s.spots) return
    // Devren: yeni araçtan ucuz ama yıpranmış eski kasa gelir.
    // Ortaklık varsa kalan hisse %10 primle alınır.
    const fullPrice = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    const price =
      r.playerShare > 0
        ? Math.ceil((fullPrice * (100 - r.playerShare)) / 100 * CONFIG.shareBuyBackPremium)
        : fullPrice
    if (s.money < price) return
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    // Devren alınan araç rakibin plakasını taşır
    const vehicle = {
      ...makeVehicle(s.vehicles.length + 1, spotIdx, false, r.plate),
      wear: r.wear,
      old: true,
    }
    set({
      money: s.money - price,
      vehicles: [...s.vehicles, vehicle],
      rivals: s.rivals.filter((rv) => rv.id !== rivalId),
      rivalRespawn: CONFIG.rivalRespawnSec,
    })
  },

  buyRivalShare: (rivalId: number, pct: number) => {
    const s = get()
    const r = s.rivals.find((rv) => rv.id === rivalId)
    if (!r) return
    // Payını dilim dilim artırabilirsin, azami %90
    const add = Math.min(Math.round(Math.max(5, pct)), 90 - r.playerShare)
    if (add <= 0) return
    const fullPrice = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    const cost = Math.ceil((fullPrice * add) / 100)
    if (s.money < cost) return
    set({
      money: s.money - cost,
      rivals: s.rivals.map((rv) =>
        rv.id === rivalId ? { ...rv, playerShare: rv.playerShare + add } : rv,
      ),
    })
  },

  sellRivalShare: (rivalId: number, pct: number) => {
    const s = get()
    const r = s.rivals.find((rv) => rv.id === rivalId)
    if (!r || r.playerShare <= 0) return
    // Ortaklık payı %10 kesintiyle satılır
    const sell = Math.min(Math.round(Math.max(5, pct)), r.playerShare)
    const fullPrice = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    const refund = Math.floor(((fullPrice * sell) / 100) * CONFIG.shareSellRefund)
    set({
      money: s.money + refund,
      rivals: s.rivals.map((rv) =>
        rv.id === rivalId ? { ...rv, playerShare: rv.playerShare - sell } : rv,
      ),
    })
  },

  sellShare: (vehicleId: number, pct: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    // Dilim dilim satılabilir; kontrol kaybolmasın diye asgari pay elde kalır
    const sold = Math.min(Math.round(Math.max(5, pct)), v.share - CONFIG.minOwnShare)
    if (sold <= 0) return
    const price = Math.round((valuationOf(v, s.vehicles.length, s.rep) * sold) / 100)
    set({
      money: s.money + price,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId ? { ...veh, share: veh.share - sold } : veh,
      ),
    })
  },

  buyBackShare: (vehicleId: number, pct: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v || v.share >= 100) return
    // Geri alım primli ve dilim dilim: ortak karlı çıkmadan hisseyi bırakmaz
    const buy = Math.min(Math.round(Math.max(5, pct)), 100 - v.share)
    if (buy <= 0) return
    const cost = Math.ceil(
      ((valuationOf(v, s.vehicles.length, s.rep) * buy) / 100) * CONFIG.shareBuyBackPremium,
    )
    if (s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId ? { ...veh, share: veh.share + buy } : veh,
      ),
    })
  },

  hireKahya: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v || v.kahya > 0 || !v.hasDriver || s.money < CONFIG.kahyaHireCost) return
    set({
      money: s.money - CONFIG.kahyaHireCost,
      vehicles: s.vehicles.map((veh) => (veh.id === vehicleId ? { ...veh, kahya: 1 } : veh)),
    })
  },

  upgradeKahya: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v || v.kahya < 1 || v.kahya >= CONFIG.kahyaMaxLevel) return
    const cost = CONFIG.kahyaUpgradeCosts[v.kahya - 1]
    if (s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId ? { ...veh, kahya: veh.kahya + 1 } : veh,
      ),
    })
  },

  payInstallment: (debtId: number) => {
    const s = get()
    const d = s.debts.find((debt) => debt.id === debtId)
    if (!d) return
    const pay = Math.min(d.daily, d.remaining)
    if (s.money < pay) return
    set({
      money: s.money - pay,
      debts: s.debts
        .map((debt) => (debt.id === debtId ? { ...debt, remaining: debt.remaining - pay } : debt))
        .filter((debt) => debt.remaining > 0),
    })
  },

  payOffDebt: (debtId: number) => {
    const s = get()
    const d = s.debts.find((debt) => debt.id === debtId)
    if (!d) return
    // Erken kapatma: kalan borcun bir kısmı silinir
    const pay = Math.ceil(d.remaining * CONFIG.payoffDiscount)
    if (s.money < pay) return
    set({
      money: s.money - pay,
      debts: s.debts.filter((debt) => debt.id !== debtId),
    })
  },

  toggleNightShift: (vehicleId: number) => {
    const s = get()
    set({
      vehicles: s.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, nightShift: !v.nightShift } : v,
      ),
    })
  },

  reset: () => {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      /* yoksay */
    }
    nextId = 1
    set(initialState())
  },

  tick: (dt: number) => {
    const s = get()
    const time = s.time + dt
    let { money, totalCarried, queue, spawnTimer, wageDay, rep, task, taskDay, bufeToday, rivalRespawn } = s
    const { buildings } = s
    const clock = clockOf(time)
    const day = clock.day
    const isNight = clock.hour < CONFIG.nightEndHour // 00:00-06:00
    const fareMult = isNight ? CONFIG.nightFareMultiplier : 1

    let toasts = s.toasts
    if (toasts.some((tst) => tst.expireAt <= time)) {
      toasts = toasts.filter((tst) => tst.expireAt > time)
    }
    const pushToast = (text: string) => {
      toasts = [...toasts, { id: nextId++, text, expireAt: time + CONFIG.toastLifetime }].slice(-5)
    }

    // Görev ilerlemesi: hedef tutunca ödül + itibar bonusu
    const advanceTask = (kind: DailyTask['kind'], amount: number) => {
      if (!task || task.done || task.kind !== kind) return
      task = { ...task, progress: task.progress + amount }
      if (task.progress >= task.target) {
        task = { ...task, progress: task.target, done: true }
        money += task.reward
        rep = clampRep(rep + CONFIG.repTaskBonus)
        pushToast(t.taskDone(task.reward))
      }
    }

    // Yeni işletme günü (06:00): taze günlük görev
    if (clock.hour >= CONFIG.nightEndHour && taskDay < day) {
      taskDay = day
      task = makeTask(s.vehicles.length)
    }

    // Yevmiyeler + senet taksitleri akşam ödenir (nakit yoksa borca girilir)
    let debts = s.debts
    if (clock.hour >= CONFIG.wageHour && wageDay < day) {
      wageDay = day
      // Yevmiyeler araç payına göre: ortaklı araçta masrafın yarısı ortağın
      const wages = Math.round(
        s.vehicles.reduce(
          (sum, v) =>
            sum + ((v.hasDriver ? CONFIG.driverWage : 0) + kahyaWageOf(v)) * (v.share / 100),
          0,
        ),
      )
      money -= wages
      pushToast(t.wagesPaid(wages))
      if (bufeToday > 0) {
        pushToast(t.bufeSummary(bufeToday))
        bufeToday = 0
      }
      // Ortaklık payları: rakip esnafın günlük cirosundan hisse oranında
      const partnerIncome = Math.round(
        s.rivals.reduce(
          (sum, r) =>
            r.playerShare > 0
              ? sum +
                rand(CONFIG.rivalDailyGrossMin, CONFIG.rivalDailyGrossMax) *
                  (r.playerShare / 100)
              : sum,
          0,
        ),
      )
      if (partnerIncome > 0) {
        money += partnerIncome
        pushToast(t.partnerDaily(partnerIncome))
      }
      if (debts.length > 0) {
        let paid = 0
        debts = debts
          .map((d) => {
            const pay = Math.min(d.daily, d.remaining)
            paid += pay
            return { ...d, remaining: d.remaining - pay }
          })
          .filter((d) => d.remaining > 0)
        money -= paid
        pushToast(t.installmentsPaid(paid))
      }
    }

    // Terminale yolcu akışı — gece ayak seyrekleşir, itibar ve filo büyüklüğü
    // yoğunluğu belirler. Kuyruk doluysa gelen yolcu vazgeçer, itibar zedelenir.
    const activeFleet = Math.max(1, s.vehicles.filter((v) => v.hasDriver).length)
    const queueCap = queueCapOf(activeFleet)
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      const nightFactor = isNight ? CONFIG.nightSpawnFactor : 1
      const repFactor = CONFIG.repSpawnBase - CONFIG.repSpawnSlope * rep
      const fleetFactor = 1 + CONFIG.fleetSpawnBonus * (activeFleet - 1)
      spawnTimer =
        (rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax) * nightFactor * repFactor) /
        fleetFactor
      if (queue < queueCap) {
        queue++
        // Büfe: bekleyen yolcu çay/simit alır, kasaya anında girer
        if (buildings.bufe && Math.random() < CONFIG.bufeSaleChance) {
          const sale = Math.round(rand(CONFIG.bufeSaleMin, CONFIG.bufeSaleMax))
          money += sale
          bufeToday += sale
        }
      } else {
        rep = clampRep(rep - CONFIG.repLostPassenger)
      }
    }

    // Büfe ayak trafiği: yoldan geçenler de alışveriş yapar (gündüz, saatte 1-4)
    if (buildings.bufe && !isNight) {
      bufeStreetTimer += dt
      const gameHour = CONFIG.dayLength / 24
      while (bufeStreetTimer >= gameHour) {
        bufeStreetTimer -= gameHour
        const sales = Math.floor(rand(CONFIG.bufeStreetSalesMin, CONFIG.bufeStreetSalesMax + 1))
        for (let i = 0; i < sales; i++) {
          const sale = Math.round(rand(CONFIG.bufeSaleMin, CONFIG.bufeSaleMax))
          money += sale
          bufeToday += sale
        }
      }
    }

    // Peron tek araçlık ve hat ortak: rakipler de aynı perona yanaşır
    let peronBusy =
      s.vehicles.some((v) => v.state === 'toPeron' || v.state === 'loading') ||
      s.rivals.some((r) => r.state === 'toPeron' || r.state === 'loading')
    // Pompa da tek araçlık
    let pumpInUse = s.vehicles.some((v) => v.state === 'toPump' || v.state === 'fueling')

    // Rakip minibüsler: gündüz gelir, kuyruktan yolcu kapar, para onlara gider
    let rivals = s.rivals.map((rival) => {
      const r = { ...rival }
      const advanceR = () => {
        r.dist += CONFIG.vehicleSpeed * dt
        return r.path !== null && r.dist >= pathLength(r.path)
      }
      switch (r.state) {
        case 'away': {
          r.timer -= dt
          if (r.timer <= 0) {
            if (isNight || peronBusy) {
              r.timer = 4 // kısa süre sonra tekrar dene
            } else {
              peronBusy = true
              r.state = 'toPeron'
              r.path = rivalArrivePath
              r.dist = 0
            }
          }
          break
        }
        case 'toPeron': {
          if (advanceR()) {
            r.state = 'loading'
            r.timer = 0
            r.boardAcc = 0
          }
          break
        }
        case 'loading': {
          r.timer += dt
          r.boardAcc += dt
          while (r.boardAcc >= CONFIG.boardInterval && queue > 0 && r.passengers < CONFIG.seatCount) {
            r.boardAcc -= CONFIG.boardInterval
            queue--
            r.passengers++
          }
          if (r.passengers >= CONFIG.seatCount || r.timer >= CONFIG.rivalMaxWaitAtPeron) {
            r.state = 'departing'
            r.path = departPath
            r.dist = 0
          }
          break
        }
        case 'departing': {
          if (advanceR()) {
            r.state = 'away'
            r.path = null
            r.timer = rand(CONFIG.rivalVisitMin, CONFIG.rivalVisitMax)
            r.passengers = 0
          }
          break
        }
      }
      return r
    })

    // Satın alınan rakibin yerine bir süre sonra hatta yeni esnaf katılır
    if (rivals.length < CONFIG.rivalCount) {
      rivalRespawn -= dt
      if (rivalRespawn <= 0) {
        rivals = [...rivals, makeRival(3 + Math.floor(Math.random() * 42))]
        rivalRespawn = CONFIG.rivalRespawnSec
      }
    }

    const vehicles = s.vehicles.map((vehicle) => {
      const v = { ...vehicle }
      const advance = () => {
        v.dist += CONFIG.vehicleSpeed * dt
        return v.path !== null && v.dist >= pathLength(v.path)
      }

      switch (v.state) {
        case 'parked': {
          // Planlı bakım: parka döner dönmez uygulanır
          if (v.pendingRepair) {
            if (v.wear <= 0) {
              v.pendingRepair = false
            } else {
              const discount = buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1
              const cost = Math.ceil((repairCost(v) * discount * v.share) / 100)
              if (money >= cost) {
                money -= cost
                v.wear = 0
                v.pendingRepair = false
              }
            }
          }
          // Planlı yakıt: pompa boşsa öde ve pompaya sür
          if (v.pendingRefuel && v.hasDriver && !pumpInUse) {
            if (v.fuel >= CONFIG.fuelCapacity) {
              v.pendingRefuel = false
            } else {
              const cost = Math.ceil((refuelCost(v) * v.share) / 100)
              if (money >= cost) {
                money -= cost
                v.pendingRefuel = false
                pumpInUse = true
                pushToast(t.refueled(v.plate, cost))
                v.state = 'toPump'
                v.path = toPumpPath(spotPos(v.spotIdx))
                v.dist = 0
                break
              }
            }
          }
          // Gece (00-06) nöbetçi veya ortaklı araç çalışır (ortağın şoförü sürer)
          const onDuty = !isNight || v.nightShift || v.share < 100
          if (v.hasDriver && canServe(v) && onDuty && !peronBusy) {
            peronBusy = true
            v.state = 'toPeron'
            v.path = toPeronPath(spotPos(v.spotIdx))
            v.dist = 0
          }
          break
        }
        case 'toPeron': {
          if (advance()) {
            v.state = 'loading'
            v.wait = 0
            v.boardAcc = 0
          }
          break
        }
        case 'loading': {
          // Çay ocağı varsa şoför dinç: biniş daha hızlı akar
          const boardInterval =
            CONFIG.boardInterval * (buildings.cayOcagi ? CONFIG.cayOcagiBoardFactor : 1)
          const cap = capacityOf(v) // kahya varsa ayakta yolcu da biner
          v.wait += dt
          v.boardAcc += dt
          while (v.boardAcc >= boardInterval && queue > 0 && v.passengers < cap) {
            v.boardAcc -= boardInterval
            queue--
            v.passengers++
          }
          const full = v.passengers >= cap
          const impatient = v.passengers > 0 && v.wait >= CONFIG.maxWaitAtPeron
          if (full || impatient) {
            // Dolmuş usulü: ücret binişte peşin, sefer başlarken kasaya girer.
            // Gece tarifesi zamlı. Gider kasadan değil araçtan: depo + yıpranma.
            // Ortaklı araçta hasılatın sadece oyuncu payı kasaya girer
            const fare = Math.round(
              (v.passengers * CONFIG.farePerPassenger * fareMult * v.share) / 100,
            )
            money += fare
            totalCarried += v.passengers
            advanceTask('carry', v.passengers)
            advanceTask('revenue', fare)
            v.fuel = Math.max(0, v.fuel - CONFIG.fuelPerTrip)
            // Eski kasa (devren) daha hızlı yıpranır
            v.wear = Math.min(
              100,
              v.wear + CONFIG.wearPerTrip * (v.old ? CONFIG.oldBusWearFactor : 1),
            )
            pushToast(t.departed(v.plate, v.passengers, fare))
            v.state = 'departing'
            v.path = departPath
            v.dist = 0
          }
          break
        }
        case 'departing': {
          if (advance()) {
            v.state = 'onTrip'
            v.path = null
            v.tripLeft = rand(CONFIG.tripDurationMin, CONFIG.tripDurationMax)
          }
          break
        }
        case 'onTrip': {
          v.tripLeft -= dt
          if (v.tripLeft <= 0) {
            // Hat boyunca inen-binen: dönüşte ek indi-bindi hasılatı.
            // Kahya kapıdan hat bağırır — seviyesi durak dışı yolcuyu artırır.
            const kahyaBonus = 1 + CONFIG.kahyaEnRouteBonus * v.kahya
            const fleetBonus = 1 + CONFIG.fleetEnRouteBonus * (activeFleet - 1)
            const enRoute = Math.floor(
              rand(CONFIG.enRouteFaresMin, CONFIG.enRouteFaresMax + 1) * kahyaBonus * fleetBonus,
            )
            const extra = Math.round(
              (enRoute * CONFIG.farePerPassenger * fareMult * v.share) / 100,
            )
            money += extra
            totalCarried += enRoute
            advanceTask('carry', enRoute)
            advanceTask('revenue', extra)
            advanceTask('trips', 1)
            rep = clampRep(rep + CONFIG.repPerTrip)
            pushToast(t.returned(v.plate, extra))
            v.state = 'returning'
            v.path = returnPath(spotPos(v.spotIdx))
            v.dist = 0
            v.passengers = 0
          }
          break
        }
        case 'returning': {
          if (advance()) {
            v.state = 'parked'
            v.path = null
          }
          break
        }
        case 'toPump': {
          // path korunur: dolum sırasında araç pompada sabit durur
          if (advance()) v.state = 'fueling'
          break
        }
        case 'fueling': {
          v.fuel = Math.min(CONFIG.fuelCapacity, v.fuel + CONFIG.fuelFillRate * dt)
          if (v.fuel >= CONFIG.fuelCapacity) {
            v.state = 'fromPump'
            v.path = fromPumpPath(spotPos(v.spotIdx))
            v.dist = 0
          }
          break
        }
        case 'fromPump': {
          if (advance()) {
            v.state = 'parked'
            v.path = null
          }
          break
        }
      }
      return v
    })

    set({ time, day, wageDay, money, totalCarried, queue, spawnTimer, vehicles, debts, toasts, rep, task, taskDay, bufeToday, rivals, rivalRespawn })

    // ~2.5 sn'de bir kaydet — her frame localStorage'a yazmak gereksiz
    saveAcc += dt
    if (saveAcc >= 2.5) {
      saveAcc = 0
      persist(get())
    }
  },
}))
