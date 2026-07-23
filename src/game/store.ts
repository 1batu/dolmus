import { create } from 'zustand'
import { CONFIG } from './config'
import { STOP_TS, STOP_COUNT, curveLength, nextStopAfter } from './route'
import { t } from '../i18n'

export type Passenger = { id: number; from: number; dest: number }

export type Bus = {
  id: number
  t: number // hat üzerindeki normalize konum [0,1)
  state: 'driving' | 'dwelling'
  dwellLeft: number
  nextStop: number
  passengers: Passenger[]
}

export type Toast = { id: number; text: string; ttl: number }

let nextId = 1
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// Ücret: kaç durak gidiyorsa o kadar segment parası (binişte peşin, dolmuş usulü)
function fareFor(p: Passenger): number {
  const segs = (p.dest - p.from + STOP_COUNT) % STOP_COUNT
  return segs * CONFIG.farePerSegment
}

type GameState = {
  money: number
  totalCarried: number
  queues: Passenger[][]
  buses: Bus[]
  toasts: Toast[]
  spawnTimer: number
  nextBusCost: () => number
  buyBus: () => void
  tick: (dt: number) => void
}

function makeBus(tStart: number): Bus {
  return {
    id: nextId++,
    t: tStart,
    state: 'driving',
    dwellLeft: 0,
    nextStop: nextStopAfter(tStart),
    passengers: [],
  }
}

export const useGame = create<GameState>((set, get) => ({
  money: 0,
  totalCarried: 0,
  queues: STOP_TS.map(() => []),
  buses: [makeBus(0.1)],
  toasts: [],
  spawnTimer: 1,

  nextBusCost: () => CONFIG.busBaseCost * get().buses.length,

  buyBus: () => {
    const { money, buses, nextBusCost } = get()
    const cost = nextBusCost()
    if (money < cost) return
    // Yeni araç, öndeki araçla çakışmasın diye hattın karşı yarısından başlar
    const tStart = (buses[buses.length - 1].t + 0.5) % 1
    set({ money: money - cost, buses: [...buses, makeBus(tStart)] })
  },

  tick: (dt: number) => {
    const s = get()
    let { money, totalCarried, spawnTimer } = s
    const queues = s.queues.map((q) => [...q])
    const toasts: Toast[] = s.toasts
      .map((tst) => ({ ...tst, ttl: tst.ttl - dt }))
      .filter((tst) => tst.ttl > 0)

    // Yolcu doğuşu: rastgele durakta, rastgele hedefe
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawnTimer = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax)
      const from = Math.floor(Math.random() * STOP_COUNT)
      if (queues[from].length < CONFIG.maxQueue) {
        const dest = (from + 1 + Math.floor(Math.random() * (STOP_COUNT - 1))) % STOP_COUNT
        queues[from].push({ id: nextId++, from, dest })
      }
    }

    const buses = s.buses.map((bus) => {
      const b = { ...bus, passengers: [...bus.passengers] }

      if (b.state === 'dwelling') {
        b.dwellLeft -= dt
        if (b.dwellLeft <= 0) {
          b.state = 'driving'
          b.nextStop = nextStopAfter(b.t)
        }
        return b
      }

      // driving: hat boyunca ilerle, sıradaki durağı yakaladıysa yanaş
      const move = (CONFIG.busSpeed * dt) / curveLen
      const stopT = STOP_TS[b.nextStop]
      const distToStop = (stopT - b.t + 1) % 1
      if (move < distToStop) {
        b.t = (b.t + move) % 1
        return b
      }

      // Durağa varış
      b.t = stopT
      const stopIdx = b.nextStop
      const unloading = b.passengers.filter((p) => p.dest === stopIdx)
      b.passengers = b.passengers.filter((p) => p.dest !== stopIdx)
      totalCarried += unloading.length

      const free = CONFIG.seatCount - b.passengers.length
      const boarding = queues[stopIdx].splice(0, free)
      b.passengers.push(...boarding)

      if (boarding.length > 0) {
        const fare = boarding.reduce((sum, p) => sum + fareFor(p), 0)
        money += fare
        toasts.push({
          id: nextId++,
          text: t.boarded(boarding.length, t.stopNames[stopIdx], fare),
          ttl: CONFIG.toastLifetime,
        })
      } else if (unloading.length === 0 && free === 0 && queues[stopIdx].length > 0) {
        // Dolu araç, inecek de yok — durağı pas geç (dolmuş klasiği)
        toasts.push({
          id: nextId++,
          text: t.skippedFull(t.stopNames[stopIdx]),
          ttl: CONFIG.toastLifetime,
        })
      }

      if (unloading.length + boarding.length > 0) {
        b.state = 'dwelling'
        b.dwellLeft =
          CONFIG.dwellBase + (unloading.length + boarding.length) * CONFIG.dwellPerPassenger
      } else {
        b.nextStop = nextStopAfter(b.t)
      }
      return b
    })

    set({
      money,
      totalCarried,
      spawnTimer,
      queues,
      buses,
      toasts: toasts.slice(-5),
    })
  },
}))

// route.ts'e döngüsel bağımlılık kurmamak için uzunluğu burada içe alıyoruz
import { curveLength as curveLen } from './route'
