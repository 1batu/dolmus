import { create } from 'zustand'
import { CONFIG, clockOf } from './config'
import {
  type P2,
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
}

export type Toast = { id: number; text: string; expireAt: number }

let nextId = 1
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// --- Kalıcılık: localStorage'a periyodik yaz, açılışta geri yükle ---
const SAVE_KEY = 'dolmus-save'
const SAVE_VERSION = 2 // araç/ekonomi şeması değişince artır — eski kayıt sessizce atılır
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
  | 'spawnTimer'
>

function persist(s: SavedFields) {
  try {
    const { time, day, wageDay, money, totalCarried, queue, spots, drivers, vehicles, spawnTimer } = s
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
        spawnTimer,
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
    if (d?.v !== SAVE_VERSION || !Array.isArray(d.vehicles) || d.vehicles.length === 0) return null
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
      vehicles: d.vehicles,
      spawnTimer: d.spawnTimer ?? 1,
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
  toasts: Toast[]
  spawnTimer: number
  vehicleCost: () => number
  spotCost: () => number
  buyVehicle: () => void
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
    toasts: [] as Toast[],
    spawnTimer: 1,
  }
}

export const useGame = create<GameState>((set, get) => ({
  ...initialState(),
  ...(loadSave() ?? {}),

  vehicleCost: () =>
    CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (get().vehicles.length - 1),
  spotCost: () => CONFIG.spotBaseCost * (get().spots - CONFIG.startSpots + 1),

  buyVehicle: () => {
    const s = get()
    const cost = s.vehicleCost()
    if (s.money < cost || s.vehicles.length >= s.spots) return
    // İlk boş park yerine konur; şoförü yoksa orada bekler
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    set({
      money: s.money - cost,
      vehicles: [...s.vehicles, makeVehicle(s.vehicles.length + 1, spotIdx, false)],
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
    const cost = repairCost(v)
    if (cost <= 0 || s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) => (veh.id === vehicleId ? { ...veh, wear: 0 } : veh)),
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
    let { money, totalCarried, queue, spawnTimer, wageDay } = s
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

    // Yevmiyeler akşam ödenir (nakit yoksa borca girilir)
    if (clock.hour >= CONFIG.wageHour && wageDay < day) {
      wageDay = day
      const wages = s.drivers * CONFIG.driverWage
      money -= wages
      pushToast(t.wagesPaid(wages))
    }

    // Terminale yolcu akışı — gece ayak seyrekleşir
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      const factor = isNight ? CONFIG.nightSpawnFactor : 1
      spawnTimer = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax) * factor
      if (queue < CONFIG.maxQueue) queue++
    }

    // Peron tek araçlık: sırada biri varsa diğerleri parkta bekler
    let peronBusy = s.vehicles.some((v) => v.state === 'toPeron' || v.state === 'loading')

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
          v.wait += dt
          v.boardAcc += dt
          while (v.boardAcc >= CONFIG.boardInterval && queue > 0 && v.passengers < CONFIG.seatCount) {
            v.boardAcc -= CONFIG.boardInterval
            queue--
            v.passengers++
          }
          const full = v.passengers >= CONFIG.seatCount
          const impatient = v.passengers > 0 && v.wait >= CONFIG.maxWaitAtPeron
          if (full || impatient) {
            // Dolmuş usulü: ücret binişte peşin, sefer başlarken kasaya girer.
            // Gece tarifesi zamlı. Gider kasadan değil araçtan: depo + yıpranma.
            const fare = Math.round(v.passengers * CONFIG.farePerPassenger * fareMult)
            money += fare
            totalCarried += v.passengers
            v.fuel = Math.max(0, v.fuel - CONFIG.fuelPerTrip)
            v.wear = Math.min(100, v.wear + CONFIG.wearPerTrip)
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
            // Hat boyunca inen-binen: dönüşte ek indi-bindi hasılatı
            const enRoute = Math.floor(rand(CONFIG.enRouteFaresMin, CONFIG.enRouteFaresMax + 1))
            const extra = Math.round(enRoute * CONFIG.farePerPassenger * fareMult)
            money += extra
            totalCarried += enRoute
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

    set({ time, day, wageDay, money, totalCarried, queue, spawnTimer, vehicles, toasts })

    // ~2.5 sn'de bir kaydet — her frame localStorage'a yazmak gereksiz
    saveAcc += dt
    if (saveAcc >= 2.5) {
      saveAcc = 0
      persist(get())
    }
  },
}))
