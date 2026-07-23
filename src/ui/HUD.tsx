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

export function HUD() {
  const money = useGame((s) => s.money)
  const carried = useGame((s) => s.totalCarried)
  const toasts = useGame((s) => s.toasts)
  const buyBus = useGame((s) => s.buyBus)
  const busCount = useGame((s) => s.buses.length)
  // Doluluk anahtarı string olarak seçilir — değer eşitliği sayesinde her frame re-render olmaz
  const occupancyKey = useGame((s) =>
    s.buses.map((b) => `${b.no}:${b.passengers.length}`).join(','),
  )
  const cost = CONFIG.busBaseCost * busCount
  const canBuy = money >= cost

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* Üst bar */}
      <div className="absolute left-4 top-4 flex gap-2">
        <Chip label={t.appTitle} value="🚐" />
        <Chip label={t.cash} value={`₺${money.toLocaleString('tr-TR')}`} />
        <Chip label={t.carried} value={`${carried}`} />
        <Chip label={t.fleet} value={`${busCount}`} />
      </div>

      {/* Satın alma */}
      <div className="absolute right-4 top-4">
        <button
          onClick={buyBus}
          disabled={!canBuy}
          className={`pointer-events-auto rounded-xl px-5 py-3 text-sm font-extrabold shadow-md transition
            ${
              canBuy
                ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                : 'bg-white/70 text-neutral-400'
            }`}
        >
          🚐 {t.buyBus} — ₺{cost.toLocaleString('tr-TR')}
        </button>
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

      {/* Filo doluluk çipleri */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        {occupancyKey.split(',').map((entry) => {
          const [id, count] = entry.split(':')
          return (
            <div key={id} className="rounded-xl bg-white/95 px-3 py-2 shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t.busLabel(Number(id))}
              </div>
              <div className="text-sm font-extrabold text-neutral-800">
                🧍 {t.seats(Number(count), CONFIG.seatCount)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
