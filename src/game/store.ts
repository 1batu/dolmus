import { create } from 'zustand'
import { CONFIG, clockOf } from './config'
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
  state: 'away' | 'toPeron' | 'loading' | 'departing'
  path: P2[] | null
  dist: number
  timer: number // away: sonraki ziyaret; loading: peronda geçen süre
  boardAcc: number
  passengers: number
  wear: number // devren satın alınırsa bu yıpranmayla gelir
}

function makeRival(no: number): Rival {
  return {
    id: nextId++,
    no,
    state: 'away',
    path: null,
    dist: 0,
    timer: rand(CONFIG.rivalVisitMin, CONFIG.rivalVisitMax) * Math.random(),
    boardAcc: 0,
    passengers: 0,
    wear: Math.round(rand(CONFIG.rivalWearMin, CONFIG.rivalWearMax)),
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
export type Debt = { id: number; no: number; remaining: number; daily: number }

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
let bufeStreetTimer = 0 // yoldan geçen müşteri sayacı (kalıcı olması gerekmez)

// --- Kalıcılık: localStorage'a periyodik yaz, açılışta geri yükle ---
const SAVE_KEY = 'dolmus-save'
const SAVE_VERSION = 7 // araç/ekonomi şeması değişince artır — eski kayıt sessizce atılır
const SAVE_ACCEPTS = [3, 4, 5, 6, 7] // eski kayıtlar yeni alanlar varsayılanla açılır
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
      vehicles: d.vehicles.map((v: Vehicle) => ({ ...v, kahya: v.kahya ?? 0, old: v.old ?? false })),
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
      rivals: Array.isArray(d.rivals) ? d.rivals : [makeRival(7), makeRival(12)],
      rivalRespawn: d.rivalRespawn ?? 0,
    }
  } catch {
    return null
  }
}

function makeVehicle(no: number, spotIdx: number, hasDriver: boolean): Vehicle {
  return {
    id: nextId++,
    no,
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
    const vehicles = [...s.vehicles, makeVehicle(no, spotIdx, false)]

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
        { id: nextId++, no, remaining, daily: Math.ceil(remaining / CONFIG.loanTermDays) },
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
    const cost = refuelCost(v)
    // Gerçekçi akış: araç fiilen pompaya sürer — şoför ve boş pompa şart
    const pumpBusy = s.vehicles.some((veh) => veh.state === 'toPump' || veh.state === 'fueling')
    if (cost <= 0 || s.money < cost || v.state !== 'parked' || !v.hasDriver || pumpBusy) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId
          ? { ...veh, state: 'toPump' as const, path: toPumpPath(spotPos(veh.spotIdx)), dist: 0 }
          : veh,
      ),
      toasts: [
        ...s.toasts,
        { id: nextId++, text: t.refueled(v.no, cost), expireAt: s.time + CONFIG.toastLifetime },
      ].slice(-5),
    })
  },

  repair: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    const discount = s.buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1
    const cost = Math.ceil(repairCost(v) * discount)
    if (cost <= 0 || s.money < cost) return
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
    // Devren: yeni araçtan ucuz ama yıpranmış eski kasa gelir
    const price = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    if (s.money < price) return
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    const vehicle = {
      ...makeVehicle(s.vehicles.length + 1, spotIdx, false),
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
      const kahyaWages = s.vehicles.reduce((sum, v) => sum + kahyaWageOf(v), 0)
      const wages = s.drivers * CONFIG.driverWage + kahyaWages
      money -= wages
      pushToast(t.wagesPaid(wages))
      if (bufeToday > 0) {
        pushToast(t.bufeSummary(bufeToday))
        bufeToday = 0
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

    // Terminale yolcu akışı — gece ayak seyrekleşir, itibar yoğunluğu belirler.
    // Kuyruk doluysa gelen yolcu vazgeçer ve itibar zedelenir.
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      const nightFactor = isNight ? CONFIG.nightSpawnFactor : 1
      const repFactor = CONFIG.repSpawnBase - CONFIG.repSpawnSlope * rep
      spawnTimer = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax) * nightFactor * repFactor
      if (queue < CONFIG.maxQueue) {
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
          // Gece (00-06) sadece nöbetçi araç sefere çıkar
          const onDuty = !isNight || v.nightShift
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
            const fare = Math.round(v.passengers * CONFIG.farePerPassenger * fareMult)
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
            pushToast(t.departed(v.no, v.passengers, fare))
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
            const enRoute = Math.floor(
              rand(CONFIG.enRouteFaresMin, CONFIG.enRouteFaresMax + 1) * kahyaBonus,
            )
            const extra = Math.round(enRoute * CONFIG.farePerPassenger * fareMult)
            money += extra
            totalCarried += enRoute
            advanceTask('carry', enRoute)
            advanceTask('revenue', extra)
            advanceTask('trips', 1)
            rep = clampRep(rep + CONFIG.repPerTrip)
            pushToast(t.returned(v.no, extra))
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
