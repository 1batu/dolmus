import { create } from 'zustand'
import { CONFIG } from './config'
import { STOP_TS, STOP_COUNT, curveLength, nextStopAfter } from './route'
import { t } from '../i18n'

export type Passenger = { id: number; from: number; dest: number }

export type Bus = {
  id: number
  no: number // filo sıra numarası (Minibüs 1, 2, ...)
  t: number // hat üzerindeki normalize konum [0,1)
  state: 'driving' | 'dwelling'
  dwellLeft: number
  nextStop: number
  passengers: Passenger[]
}

export type Toast = { id: number; text: string; expireAt: number }

let nextId = 1
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// Ücret: kaç durak gidiyorsa o kadar segment parası (binişte peşin, dolmuş usulü)
function fareFor(p: Passenger): number {
  const segs = (p.dest - p.from + STOP_COUNT) % STOP_COUNT
  return segs * CONFIG.farePerSegment
}

type GameState = {
  time: number // toplam oyun süresi (sn)
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

function makeBus(tStart: number, no: number): Bus {
  return {
    id: nextId++,
    no,
    t: tStart,
    state: 'driving',
    dwellLeft: 0,
    nextStop: nextStopAfter(tStart),
    passengers: [],
  }
}

export const useGame = create<GameState>((set, get) => ({
  time: 0,
  money: 0,
  totalCarried: 0,
  queues: STOP_TS.map(() => []),
  buses: [makeBus(0.1, 1)],
  toasts: [],
  spawnTimer: 1,

  nextBusCost: () => CONFIG.busBaseCost * get().buses.length,

  buyBus: () => {
    const { money, buses, nextBusCost } = get()
    const cost = nextBusCost()
    if (money < cost) return
    // Yeni araç, sondaki araçla çakışmasın diye hattın karşı yarısından başlar
    const tStart = (buses[buses.length - 1].t + 0.5) % 1
    set({ money: money - cost, buses: [...buses, makeBus(tStart, buses.length + 1)] })
  },

  tick: (dt: number) => {
    const s = get()
    const time = s.time + dt
    let { money, totalCarried, spawnTimer } = s

    // queues/toasts sadece değişince kopyalanır — HUD boşuna re-render olmasın
    let queues = s.queues
    const touchQueue = (i: number, next: Passenger[]) => {
      if (queues === s.queues) queues = [...queues]
      queues[i] = next
    }
    let toasts = s.toasts
    if (toasts.some((tst) => tst.expireAt <= time)) {
      toasts = toasts.filter((tst) => tst.expireAt > time)
    }
    const pushToast = (text: string) => {
      toasts = [...toasts, { id: nextId++, text, expireAt: time + CONFIG.toastLifetime }].slice(-5)
    }

    // Yolcu doğuşu: rastgele durakta, rastgele hedefe
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawnTimer = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax)
      const from = Math.floor(Math.random() * STOP_COUNT)
      if (queues[from].length < CONFIG.maxQueue) {
        const dest = (from + 1 + Math.floor(Math.random() * (STOP_COUNT - 1))) % STOP_COUNT
        touchQueue(from, [...queues[from], { id: nextId++, from, dest }])
      }
    }

    const buses = s.buses.map((bus) => {
      const b = { ...bus }

      if (b.state === 'dwelling') {
        b.dwellLeft -= dt
        if (b.dwellLeft <= 0) {
          b.state = 'driving'
          b.nextStop = nextStopAfter(b.t)
        }
        return b
      }

      // driving: hat boyunca ilerle, sıradaki durağı yakaladıysa yanaş
      const move = (CONFIG.busSpeed * dt) / curveLength
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
      const staying = b.passengers.filter((p) => p.dest !== stopIdx)
      totalCarried += unloading.length

      const free = CONFIG.seatCount - staying.length
      const boarding = queues[stopIdx].slice(0, free)
      if (boarding.length > 0) {
        touchQueue(stopIdx, queues[stopIdx].slice(boarding.length))
      }
      b.passengers = [...staying, ...boarding]

      if (boarding.length > 0) {
        const fare = boarding.reduce((sum, p) => sum + fareFor(p), 0)
        money += fare
        pushToast(t.boarded(boarding.length, t.stopNames[stopIdx], fare))
      } else if (unloading.length === 0 && free === 0 && queues[stopIdx].length > 0) {
        // Dolu araç, inecek de yok — durağı pas geç (dolmuş klasiği)
        pushToast(t.skippedFull(t.stopNames[stopIdx]))
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

    set({ time, money, totalCarried, spawnTimer, queues, buses, toasts })
  },
}))
