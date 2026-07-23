import { create } from 'zustand'
import { CONFIG } from './config'
import {
  type P2,
  departPath,
  pathLength,
  returnPath,
  spotPos,
  toPeronPath,
} from './paths'
import { t } from '../i18n'

export type VehicleState =
  | 'parked'
  | 'toPeron'
  | 'loading'
  | 'departing'
  | 'onTrip'
  | 'returning'

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
  fuel: number // depo, 0..fuelCapacity
  wear: number // yıpranma %, 100'de sefer yapamaz
}

export type Toast = { id: number; text: string; expireAt: number }

let nextId = 1
const rand = (min: number, max: number) => min + Math.random() * (max - min)

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
  tick: (dt: number) => void
}

export const useGame = create<GameState>((set, get) => ({
  time: 0,
  day: 1,
  money: CONFIG.startMoney,
  totalCarried: 0,
  queue: 0,
  spots: CONFIG.startSpots,
  drivers: 1,
  vehicles: [makeVehicle(1, 0, true)],
  toasts: [],
  spawnTimer: 1,

  vehicleCost: () => CONFIG.vehicleBaseCost * get().vehicles.length,
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
    if (cost <= 0 || s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId ? { ...veh, fuel: CONFIG.fuelCapacity } : veh,
      ),
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

  tick: (dt: number) => {
    const s = get()
    const time = s.time + dt
    let { money, totalCarried, queue, spawnTimer, day } = s

    let toasts = s.toasts
    if (toasts.some((tst) => tst.expireAt <= time)) {
      toasts = toasts.filter((tst) => tst.expireAt > time)
    }
    const pushToast = (text: string) => {
      toasts = [...toasts, { id: nextId++, text, expireAt: time + CONFIG.toastLifetime }].slice(-5)
    }

    // Gün dönümü: yevmiyeler kasadan düşer
    const newDay = Math.floor(time / CONFIG.dayLength) + 1
    if (newDay > day) {
      day = newDay
      const wages = s.drivers * CONFIG.driverWage
      money -= wages
      pushToast(t.wagesPaid(wages))
    }

    // Terminale yolcu akışı
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawnTimer = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax)
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
          if (v.hasDriver && canServe(v) && !peronBusy) {
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
            // Gider kasadan değil araçtan: depo azalır, yıpranma birikir.
            const fare = v.passengers * CONFIG.farePerPassenger
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
      }
      return v
    })

    set({ time, day, money, totalCarried, queue, spawnTimer, vehicles, toasts })
  },
}))
