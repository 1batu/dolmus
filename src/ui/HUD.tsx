import { useEffect, useRef, useState } from 'react'
import { useGame } from '../game/store'
import { CONFIG, clockOf } from '../game/config'
import { t } from '../i18n'

const fmt = (n: number) => n.toLocaleString('tr-TR')

// Koyu cam panel: gündüz de gece de okunur
const GLASS = 'rounded-2xl border border-white/10 bg-neutral-900/70 shadow-lg backdrop-blur-md'

function Stat({ icon, label, value, accent = 'text-white' }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="text-base leading-none">{icon}</span>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</div>
        <div className={`text-sm font-extrabold tabular-nums leading-tight ${accent}`}>{value}</div>
      </div>
    </div>
  )
}

function BuyButton({
  icon,
  label,
  cost,
  enabled,
  accent,
  onClick,
}: {
  icon: string
  label: string
  cost: number
  enabled: boolean
  accent: string // örn 'bg-blue-500'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`pointer-events-auto flex w-64 items-center gap-3 px-3 py-2.5 text-left transition active:scale-[0.98] ${GLASS}
        ${enabled ? 'cursor-pointer hover:border-white/25 hover:bg-neutral-800/80' : 'opacity-45'}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner ${enabled ? accent : 'bg-white/10'}`}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-extrabold text-white">{label}</span>
        <span className="block text-[11px] font-bold tabular-nums text-white/50">₺{fmt(cost)}</span>
      </span>
    </button>
  )
}

// Araç alımı: nakit mi senetli mi? Dolmuşçu usulü seçim
function VehicleBuyCard({
  price,
  money,
  hasFreeSpot,
  onBuy,
}: {
  price: number
  money: number
  hasFreeSpot: boolean
  onBuy: (mode: 'cash' | 'loan') => void
}) {
  const down = Math.ceil(price * CONFIG.loanDownRate)
  const total = Math.round(price * (1 + CONFIG.loanMarkupRate))
  const daily = Math.ceil((total - down) / CONFIG.loanTermDays)
  return (
    <div className={`w-64 p-3 ${GLASS} ${hasFreeSpot ? '' : 'opacity-45'}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-lg shadow-inner">
          🚐
        </span>
        <span className="flex-1">
          <span className="block text-[13px] font-extrabold text-white">{t.buyVehicle}</span>
          <span className="block text-[11px] font-bold tabular-nums text-white/50">₺{fmt(price)}</span>
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <MiniButton
          label={`💵 ${t.payCash} ₺${fmt(price)}`}
          enabled={hasFreeSpot && money >= price}
          onClick={() => onBuy('cash')}
        />
        <MiniButton
          label={`📝 ${t.payLoan} ₺${fmt(down)}`}
          enabled={hasFreeSpot && money >= down}
          onClick={() => onBuy('loan')}
        />
      </div>
      <div className="mt-1 text-right text-[9px] font-bold tabular-nums text-white/35">
        {t.loanNote(daily, CONFIG.loanTermDays)}
      </div>
    </div>
  )
}

// Durum → renk eşlemesi (pill)
const STATE_STYLE: Record<string, string> = {
  onTrip: 'bg-sky-400/15 text-sky-300',
  departing: 'bg-sky-400/15 text-sky-300',
  returning: 'bg-sky-400/15 text-sky-300',
  loading: 'bg-amber-400/15 text-amber-300',
  toPeron: 'bg-amber-400/15 text-amber-300',
  toPump: 'bg-orange-400/15 text-orange-300',
  fueling: 'bg-orange-400/15 text-orange-300',
  fromPump: 'bg-orange-400/15 text-orange-300',
  parked: 'bg-white/10 text-white/60',
  noDriver: 'bg-red-400/15 text-red-300',
  noFuel: 'bg-red-400/15 text-red-300',
  wornOut: 'bg-red-400/15 text-red-300',
}

function Bar({ icon, pct, from, to, low }: { icon: string; pct: number; from: string; to: string; low: boolean }) {
  const width = `${Math.max(0, Math.min(100, pct))}%`
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 text-[10px]">{icon}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all ${low ? 'from-red-500 to-red-400 animate-pulse' : `${from} ${to}`}`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

function MiniButton({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`pointer-events-auto flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold tabular-nums transition active:scale-95
        ${enabled ? 'cursor-pointer bg-white/15 text-white hover:bg-white/25' : 'bg-white/5 text-white/25'}`}
    >
      {label}
    </button>
  )
}

// Yanlış tıklamayla ilerleme silinmesin: ilk tık onay ister, 3 sn sonra kurulur
function ResetButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])
  return (
    <button
      onClick={() => {
        if (armed) {
          onReset()
          setArmed(false)
        } else {
          setArmed(true)
          timer.current = setTimeout(() => setArmed(false), 3000)
        }
      }}
      className={`pointer-events-auto cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${GLASS}
        ${armed ? 'border-red-400/40 bg-red-950/80 text-red-300' : 'text-white/40 hover:text-white/80'}`}
    >
      {armed ? `⚠️ ${t.resetConfirm}` : `🗑 ${t.reset}`}
    </button>
  )
}

export function HUD() {
  const day = useGame((s) => s.day)
  // 10 oyun-dakikası hassasiyetli saat — string eşitliği sayesinde her frame re-render olmaz
  const clock = useGame((s) => {
    const h = clockOf(s.time).hour
    const hh = Math.floor(h)
    const mm = Math.floor(((h % 1) * 60) / 10) * 10
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  })
  const isNightHour = useGame((s) => {
    const h = clockOf(s.time).hour
    return h < 6 || h >= 21
  })
  const rep = useGame((s) => Math.round(s.rep * 10) / 10)
  // Görev anahtarı: string eşitliği sayesinde sadece ilerleme değişince re-render
  const taskKey = useGame((s) =>
    s.task ? `${s.task.kind}|${s.task.target}|${Math.floor(s.task.progress)}|${s.task.done ? 1 : 0}|${s.task.reward}` : '',
  )
  const money = useGame((s) => s.money)
  const totalDebt = useGame((s) => s.debts.reduce((sum, d) => sum + d.remaining, 0))
  const queue = useGame((s) => s.queue)
  const drivers = useGame((s) => s.drivers)
  const spots = useGame((s) => s.spots)
  const toasts = useGame((s) => s.toasts)
  const vehicleCount = useGame((s) => s.vehicles.length)
  const buyVehicle = useGame((s) => s.buyVehicle)
  const buySpot = useGame((s) => s.buySpot)
  const hireDriver = useGame((s) => s.hireDriver)
  const refuel = useGame((s) => s.refuel)
  const repair = useGame((s) => s.repair)
  const reset = useGame((s) => s.reset)
  const toggleNightShift = useGame((s) => s.toggleNightShift)
  const pumpBusy = useGame((s) =>
    s.vehicles.some((v) => v.state === 'toPump' || v.state === 'fueling'),
  )
  // Değer eşitliği sayesinde bu string seçici her frame re-render tetiklemez
  const fleetKey = useGame((s) =>
    s.vehicles
      .map((v) => {
        const state = !v.hasDriver
          ? 'noDriver'
          : v.state === 'parked' && v.fuel < CONFIG.fuelPerTrip
            ? 'noFuel'
            : v.state === 'parked' && v.wear >= 100
              ? 'wornOut'
              : v.state
        return `${v.id}|${v.no}|${state}|${v.passengers}|${Math.round(v.fuel)}|${Math.round(v.wear)}|${v.nightShift ? 1 : 0}`
      })
      .join(','),
  )

  const vehicleCost = CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (vehicleCount - 1)
  const spotCost = CONFIG.spotBaseCost * (spots - CONFIG.startSpots + 1)
  const hasFreeSpot = vehicleCount < spots
  const hasIdleVehicle = fleetKey.includes('|noDriver|')

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* Üst bar */}
      <div className={`absolute left-4 top-4 flex items-stretch divide-x divide-white/10 ${GLASS}`}>
        <div className="flex items-center px-3 text-lg font-black tracking-tight text-white">
          🚐 <span className="ml-1.5 hidden sm:inline">{t.appTitle}</span>
        </div>
        <Stat icon="📅" label={t.day} value={`${day}`} />
        <Stat icon={isNightHour ? '🌙' : '☀️'} label={t.clock} value={clock} />
        <Stat icon="💰" label={t.cash} value={`₺${fmt(money)}`} accent={money < 0 ? 'text-red-400' : 'text-emerald-300'} />
        {totalDebt > 0 && <Stat icon="📝" label={t.debt} value={`₺${fmt(totalDebt)}`} accent="text-red-300" />}
        <Stat icon="🧍" label={t.waiting} value={`${queue}`} accent={queue >= CONFIG.maxQueue ? 'text-amber-300' : 'text-white'} />
        <Stat icon="🧔" label={t.drivers} value={`${drivers}`} />
        <Stat
          icon="⭐"
          label={t.rep}
          value={rep.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          accent={rep >= 4 ? 'text-emerald-300' : rep < 2 ? 'text-red-400' : 'text-white'}
        />
      </div>

      {/* Günlük görev */}
      {taskKey && (() => {
        const [kind, targetStr, progressStr, doneStr, rewardStr] = taskKey.split('|')
        const target = Number(targetStr)
        const progress = Number(progressStr)
        const done = doneStr === '1'
        const desc = t.taskDesc[kind as keyof typeof t.taskDesc](target)
        return (
          <div className={`absolute left-4 top-[72px] w-72 p-3 ${GLASS} ${done ? 'border-emerald-400/30' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                🎯 {t.dailyTask}
              </span>
              <span className={`text-[10px] font-extrabold tabular-nums ${done ? 'text-emerald-300' : 'text-white/50'}`}>
                {done ? `✓ ${t.taskDoneLabel}` : `${t.taskReward} ₺${fmt(Number(rewardStr))}`}
              </span>
            </div>
            <div className="mt-1 text-[13px] font-extrabold text-white">{desc}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all ${done ? 'from-emerald-500 to-green-400' : 'from-sky-500 to-cyan-400'}`}
                  style={{ width: `${Math.min(100, (progress / target) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-white/50">
                {fmt(Math.min(progress, target))}/{fmt(target)}
              </span>
            </div>
          </div>
        )
      })()}

      {/* İşletme paneli */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <VehicleBuyCard price={vehicleCost} money={money} hasFreeSpot={hasFreeSpot} onBuy={buyVehicle} />
        <BuyButton
          icon="🧔"
          label={t.hireDriver}
          cost={CONFIG.driverHireCost}
          enabled={money >= CONFIG.driverHireCost && hasIdleVehicle}
          accent="bg-emerald-500"
          onClick={hireDriver}
        />
        <BuyButton
          icon="🅿️"
          label={t.buySpot}
          cost={spotCost}
          enabled={money >= spotCost && spots < CONFIG.maxSpots}
          accent="bg-amber-500"
          onClick={buySpot}
        />
      </div>

      {/* Kasa akışı bildirimleri */}
      <div className="absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-1.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-3 py-1.5 text-xs font-bold tabular-nums text-emerald-300 ${GLASS}`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Sıfırlama */}
      <div className="absolute bottom-4 right-4">
        <ResetButton onReset={reset} />
      </div>

      {/* Filo: depo + yıpranma barları, doldur/bakım, nöbetçi */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        {fleetKey.split(',').map((entry) => {
          const [idStr, no, state, count, fuelStr, wearStr, nightStr] = entry.split('|')
          const id = Number(idStr)
          const fuel = Number(fuelStr)
          const wear = Number(wearStr)
          const night = nightStr === '1'
          const fuelPct = (fuel / CONFIG.fuelCapacity) * 100
          const stateText = t.state[state as keyof typeof t.state]
          const warn = state === 'noDriver' || state === 'noFuel' || state === 'wornOut'
          const refuelPrice = Math.ceil((CONFIG.fuelCapacity - fuel) * CONFIG.refuelCostPerUnit)
          const repairPrice = Math.ceil(wear * CONFIG.repairCostPerUnit)
          // Fiilen parkta mı? (pseudo-durumlar da parkta bekleyen aracı temsil eder)
          const isParked = state === 'parked' || state === 'noFuel' || state === 'wornOut'
          return (
            <div key={id} className={`w-60 p-3 ${GLASS}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  {t.busLabel(Number(no))}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums ${STATE_STYLE[state] ?? 'bg-white/10 text-white/60'}`}
                  >
                    {warn && '⚠️ '}
                    {stateText}
                    {!warn && ` · ${t.seats(Number(count), CONFIG.seatCount)}`}
                  </span>
                  <button
                    onClick={() => toggleNightShift(id)}
                    title={t.nightShift}
                    className={`pointer-events-auto cursor-pointer rounded-lg px-1.5 py-0.5 text-[11px] transition active:scale-95
                      ${night ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-white/10 opacity-40 hover:opacity-100'}`}
                  >
                    🌙
                  </button>
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                <Bar icon="⛽" pct={fuelPct} from="from-amber-500" to="to-yellow-400" low={fuel < CONFIG.fuelPerTrip} />
                <Bar icon="🔧" pct={100 - wear} from="from-emerald-500" to="to-green-400" low={wear >= 100} />
              </div>
              <div className="mt-2 flex gap-1.5">
                <MiniButton
                  label={`⛽ ${t.refuel} ₺${fmt(refuelPrice)}`}
                  enabled={refuelPrice > 0 && money >= refuelPrice && isParked && !pumpBusy}
                  onClick={() => refuel(id)}
                />
                <MiniButton
                  label={`🔧 ${t.repair} ₺${fmt(repairPrice)}`}
                  enabled={repairPrice > 0 && money >= repairPrice && (isParked || state === 'noDriver')}
                  onClick={() => repair(id)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
