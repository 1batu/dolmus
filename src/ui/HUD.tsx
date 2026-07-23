import { useGame } from '../game/store'
import { CONFIG } from '../game/config'
import { t } from '../i18n'

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/95 px-4 py-2 shadow-md">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <div className="text-lg font-extrabold text-neutral-800">{value}</div>
    </div>
  )
}

function BuyButton({
  label,
  cost,
  enabled,
  color,
  onClick,
}: {
  label: string
  cost: number
  enabled: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`pointer-events-auto w-56 rounded-xl px-4 py-3 text-left text-sm font-extrabold text-white shadow-md transition active:scale-95
        ${enabled ? `cursor-pointer ${color}` : 'bg-neutral-300 text-neutral-500'}`}
    >
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span>₺{cost.toLocaleString('tr-TR')}</span>
      </span>
    </button>
  )
}

// İnce durum barı: depo/araç sağlığı
function Bar({ icon, pct, color }: { icon: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 text-[10px]">{icon}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
        />
      </div>
    </div>
  )
}

function MiniButton({
  label,
  enabled,
  onClick,
}: {
  label: string
  enabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`pointer-events-auto flex-1 rounded-md px-1.5 py-1 text-[10px] font-bold transition active:scale-95
        ${
          enabled
            ? 'cursor-pointer bg-neutral-800 text-white hover:bg-neutral-700'
            : 'bg-neutral-100 text-neutral-400'
        }`}
    >
      {label}
    </button>
  )
}

export function HUD() {
  const day = useGame((s) => s.day)
  const money = useGame((s) => s.money)
  const queue = useGame((s) => s.queue)
  const drivers = useGame((s) => s.drivers)
  const spots = useGame((s) => s.spots)
  const toasts = useGame((s) => s.toasts)
  const vehicleCount = useGame((s) => s.vehicles.length)
  const buyVehicle = useGame((s) => s.buyVehicle)
  const buySpot = useGame((s) => s.buySpot)
  const hireDriver = useGame((s) => s.hireDriver)
  // Değer eşitliği sayesinde bu string seçiciler her frame re-render tetiklemez
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
        return `${v.id}|${v.no}|${state}|${v.passengers}|${Math.round(v.fuel)}|${Math.round(v.wear)}`
      })
      .join(','),
  )
  const refuel = useGame((s) => s.refuel)
  const repair = useGame((s) => s.repair)
  const pumpBusy = useGame((s) =>
    s.vehicles.some((v) => v.state === 'toPump' || v.state === 'fueling'),
  )

  const vehicleCost = CONFIG.vehicleBaseCost * vehicleCount
  const spotCost = CONFIG.spotBaseCost * (spots - CONFIG.startSpots + 1)
  const hasFreeSpot = vehicleCount < spots
  const hasIdleVehicle = fleetKey.includes('|noDriver|')

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* Üst bar */}
      <div className="absolute left-4 top-4 flex gap-2">
        <Chip label={t.appTitle} value="🚐" />
        <Chip label={t.day} value={`${day}`} />
        <Chip label={t.cash} value={`₺${money.toLocaleString('tr-TR')}`} />
        <Chip label={t.waiting} value={`${queue}`} />
        <Chip label={t.drivers} value={`${drivers}`} />
      </div>

      {/* İşletme paneli */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <BuyButton
          label={`🚐 ${t.buyVehicle}`}
          cost={vehicleCost}
          enabled={money >= vehicleCost && hasFreeSpot}
          color="bg-blue-600 hover:bg-blue-500"
          onClick={buyVehicle}
        />
        <BuyButton
          label={`🧔 ${t.hireDriver}`}
          cost={CONFIG.driverHireCost}
          enabled={money >= CONFIG.driverHireCost && hasIdleVehicle}
          color="bg-emerald-600 hover:bg-emerald-500"
          onClick={hireDriver}
        />
        <BuyButton
          label={`🅿️ ${t.buySpot}`}
          cost={spotCost}
          enabled={money >= spotCost && spots < CONFIG.maxSpots}
          color="bg-amber-600 hover:bg-amber-500"
          onClick={buySpot}
        />
      </div>

      {/* Kasa akışı bildirimleri */}
      <div className="absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-1.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-lg bg-emerald-50/95 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow"
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Filo durumu: depo + yıpranma barları, doldur/bakım aksiyonları */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        {fleetKey.split(',').map((entry) => {
          const [idStr, no, state, count, fuelStr, wearStr] = entry.split('|')
          const id = Number(idStr)
          const fuel = Number(fuelStr)
          const wear = Number(wearStr)
          const stateText = t.state[state as keyof typeof t.state]
          const warn = state === 'noDriver' || state === 'noFuel' || state === 'wornOut'
          const refuelPrice = Math.ceil((CONFIG.fuelCapacity - fuel) * CONFIG.refuelCostPerUnit)
          const repairPrice = Math.ceil(wear * CONFIG.repairCostPerUnit)
          // Fiilen parkta mı? (pseudo-durumlar da parkta bekleyen aracı temsil eder)
          const isParked = state === 'parked' || state === 'noFuel' || state === 'wornOut'
          return (
            <div key={id} className="w-52 rounded-xl bg-white/95 px-3 py-2 shadow-md">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t.busLabel(Number(no))}
                </span>
                <span className="text-[11px] font-extrabold text-neutral-700">
                  {warn ? '⚠️' : '🧍'} {stateText}
                  {!warn && ` · ${t.seats(Number(count), CONFIG.seatCount)}`}
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1">
                <Bar icon="⛽" pct={fuel} color={fuel < CONFIG.fuelPerTrip ? '#dc2626' : '#f59e0b'} />
                <Bar icon="🔧" pct={100 - wear} color={wear >= 100 ? '#dc2626' : '#10b981'} />
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <MiniButton
                  label={`⛽ ${t.refuel} ₺${refuelPrice}`}
                  enabled={refuelPrice > 0 && money >= refuelPrice && isParked && !pumpBusy}
                  onClick={() => refuel(id)}
                />
                <MiniButton
                  label={`🔧 ${t.repair} ₺${repairPrice}`}
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
