import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGame, BUILDING_COSTS, capacityOf, valuationOf, getTodayStats, type BuildingKind } from '../game/store'
import { CONFIG, clockOf, queueCapOf } from '../game/config'
import {
  AlertTriangle,
  ArrowUp,
  Banknote,
  BarChart3,
  BedDouble,
  Coins,
  History,
  Hourglass,
  Megaphone,
  PartyPopper,
  Plane,
  School,
  Target,
  Trash2,
  TreePine,
  TrendingUp,
  Trophy,
  Building2,
  Bus,
  CalendarDays,
  CarTaxiFront,
  Coffee,
  Cog,
  CupSoda,
  FileSignature,
  FileText,
  Flame,
  Fuel,
  Handshake,
  HardHat,
  Hammer,
  Map as MapIcon,
  Moon,
  ScrollText,
  Star,
  Sun,
  Ticket,
  Users,
  UserRound,
  Volume2,
  VolumeX,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { isMuted, toggleMute } from '../game/sound'
import { t } from '../i18n'

const BUILDING_ICONS: Record<BuildingKind, ReactNode> = {
  bufe: <CupSoda className="h-7 w-7 text-amber-300" />,
  cayOcagi: <Coffee className="h-7 w-7 text-orange-300" />,
  tamirhane: <Wrench className="h-7 w-7 text-sky-300" />,
  otoPompa: <Fuel className="h-7 w-7 text-emerald-300" />,
  otoBakim: <Cog className="h-7 w-7 text-violet-300" />,
  hat2: <MapIcon className="h-7 w-7 text-yellow-300" />,
}

// Görev/milestone kutlaması: kısa konfeti yağmuru
function Confetti({ token }: { token: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (token <= 0) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(id)
  }, [token])
  if (!visible) return null
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#eab308', '#a855f7']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`@keyframes dolmus-confetti { 0% { transform: translateY(-8vh) rotate(0deg); opacity: 1 } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6 } }`}</style>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={`${token}-${i}`}
          className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `dolmus-confetti ${1 + (i % 5) * 0.16}s ease-in ${(i % 7) * 0.08}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('tr-TR')

// Özel servis türü ikonları (charterKinds sırasıyla)
const CHARTER_ICONS = [PartyPopper, Plane, Trophy, School, TreePine]

// Koyu cam panel: gündüz de gece de okunur
const GLASS =
  'rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/85 to-neutral-950/70 shadow-xl shadow-black/40 backdrop-blur-xl ring-1 ring-inset ring-white/5'

function Stat({ icon, label, value, accent = 'text-white' }: { icon: ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="flex items-center leading-none text-white/70">{icon}</span>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</div>
        <div className={`text-sm font-extrabold tabular-nums leading-tight ${accent}`}>{value}</div>
      </div>
    </div>
  )
}

// Modal kartı: ikon karosu + isim + etki rozeti + açıklama + aksiyon
function ModalCard({
  icon,
  title,
  badge,
  badgeClass,
  desc,
  children,
}: {
  icon: ReactNode
  title: string
  badge?: string
  badgeClass?: string
  desc: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex h-14 items-center justify-center rounded-lg bg-white/5 text-3xl">
        {icon}
      </div>
      <div className="mt-2 text-[12px] font-extrabold text-white">{title}</div>
      {badge && (
        <div className={`mt-1 self-start rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${badgeClass ?? 'bg-white/10 text-white/60'}`}>
          {badge}
        </div>
      )}
      <div className="mt-1 flex-1 text-[10px] font-bold leading-tight text-white/45">{desc}</div>
      <div className="mt-2 flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

// Referans oyundaki yeşil fiyat butonu
function PriceButton({ label, enabled, onClick }: { label: ReactNode; enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-extrabold tabular-nums transition active:scale-[0.98]
        ${
          enabled
            ? 'cursor-pointer bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-inset ring-white/20 hover:from-emerald-400 hover:to-emerald-500'
            : 'bg-white/5 text-white/30'
        }`}
    >
      {label}
    </button>
  )
}

// Gerçek plaka görünümü: mavi TR bandı + emaye beyaz zemin + vida başları
function PlateBadge({ plate, small = false }: { plate: string; small?: boolean }) {
  return (
    <div
      className="relative inline-flex items-stretch overflow-hidden rounded-[4px] border border-neutral-500 bg-gradient-to-b from-white to-neutral-200 shadow-md"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.5)' }}
    >
      <span className={`flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 leading-none ${small ? 'px-0.5' : 'px-1'}`}>
        <span className={`${small ? 'text-[6px]' : 'text-[7px]'} font-black text-white`}>TR</span>
      </span>
      <span
        className={`whitespace-nowrap font-mono font-black text-neutral-900 ${
          small
            ? plate.length > 9
              ? 'px-1 text-[10px] tracking-[0.02em]'
              : 'px-1.5 text-[11px] tracking-[0.08em]'
            : 'px-2.5 py-0.5 text-[13px] tracking-[0.12em]'
        }`}
        style={{ textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}
      >
        {plate}
      </span>
      {/* Vida başları */}
      <span className="absolute right-0.5 top-0.5 h-[3px] w-[3px] rounded-full bg-neutral-400 shadow-inner" />
      <span className="absolute bottom-0.5 right-0.5 h-[3px] w-[3px] rounded-full bg-neutral-400 shadow-inner" />
    </div>
  )
}

// Hisse kaydırıcısı: oran kullanıcının elinde
function ShareSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={5}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="pointer-events-auto h-1.5 flex-1 cursor-pointer accent-indigo-400"
    />
  )
}

// Kendi aracının hissesi: kaydırıcıyla dilim seç, sat ya da geri al
function OwnShareControls({
  vehicleId,
  share,
  valuation,
  money,
  onSell,
  onBuyBack,
}: {
  vehicleId: number
  share: number
  valuation: number
  money: number
  onSell: (id: number, pct: number) => void
  onBuyBack: (id: number, pct: number) => void
}) {
  const [pct, setPct] = useState(25)
  const sellable = Math.min(pct, share - CONFIG.minOwnShare)
  const buyable = Math.min(pct, 100 - share)
  const sellPrice = Math.round((valuation * sellable) / 100)
  const buyPrice = Math.ceil(((valuation * buyable) / 100) * CONFIG.shareBuyBackPremium)
  return (
    <>
      {share < 100 && (
        <div className="mt-1.5 rounded-lg bg-indigo-400/15 px-1.5 py-1 text-center text-[10px] font-bold text-indigo-300">
          {t.partneredBadge(100 - share)}
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="flex w-4 items-center text-white/50"><Handshake className="h-3 w-3" /></span>
        <ShareSlider value={pct} min={5} max={100} onChange={setPct} />
        <span className="w-8 text-right text-[10px] font-bold tabular-nums text-white/50">%{pct}</span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <MiniButton
          label={<><Handshake className="h-3 w-3" /> {t.sellShareBtn(sellable, fmt(sellPrice))}</>}
          enabled={sellable > 0}
          onClick={() => onSell(vehicleId, pct)}
        />
        <MiniButton
          label={<><TrendingUp className="h-3 w-3" /> %{buyable} {t.buyBack} ₺{fmt(buyPrice)}</>}
          enabled={buyable > 0 && money >= buyPrice}
          onClick={() => onBuyBack(vehicleId, pct)}
        />
      </div>
    </>
  )
}

// Rakip ortaklığı: payını artır ya da sat
function RivalPartnerRow({
  rivalId,
  fullPrice,
  playerShare,
  money,
  onPartner,
  onSellShare,
}: {
  rivalId: number
  fullPrice: number
  playerShare: number
  money: number
  onPartner: (id: number, pct: number) => void
  onSellShare: (id: number, pct: number) => void
}) {
  const [pct, setPct] = useState(25)
  const addable = Math.min(pct, 90 - playerShare)
  const sellable = Math.min(pct, playerShare)
  const addCost = Math.ceil((fullPrice * addable) / 100)
  const refund = Math.floor(((fullPrice * sellable) / 100) * CONFIG.shareSellRefund)
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="flex w-4 items-center text-white/50"><Handshake className="h-3 w-3" /></span>
        <ShareSlider value={pct} min={5} max={90} onChange={setPct} />
        <span className="w-8 text-right text-[10px] font-bold tabular-nums text-white/50">%{pct}</span>
      </div>
      <div className="flex gap-1.5">
        <MiniButton
          label={<><Handshake className="h-3 w-3" /> %{addable} ₺{fmt(addCost)}</>}
          enabled={addable > 0 && money >= addCost}
          onClick={() => onPartner(rivalId, pct)}
        />
        <MiniButton
          label={<><Coins className="h-3 w-3" /> %{sellable} +₺{fmt(refund)}</>}
          enabled={sellable > 0}
          onClick={() => onSellShare(rivalId, pct)}
        />
      </div>
    </>
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
  charter: 'bg-purple-400/15 text-purple-300',
  vipCall: 'bg-fuchsia-400/15 text-fuchsia-300',
  noDriver: 'bg-red-400/15 text-red-300',
  noFuel: 'bg-red-400/15 text-red-300',
  wornOut: 'bg-red-400/15 text-red-300',
}

// Dock çipindeki durum noktası renkleri
const DOT_STYLE: Record<string, string> = {
  parked: 'bg-white/40',
  toPeron: 'bg-amber-400',
  loading: 'bg-amber-400',
  departing: 'bg-sky-400',
  onTrip: 'bg-sky-400',
  returning: 'bg-sky-400',
  toPump: 'bg-orange-400',
  fueling: 'bg-orange-400',
  fromPump: 'bg-orange-400',
  charter: 'bg-purple-400',
  vipCall: 'bg-fuchsia-400',
  noDriver: 'bg-red-500 animate-pulse',
  noFuel: 'bg-red-500 animate-pulse',
  wornOut: 'bg-red-500 animate-pulse',
}

function Bar({ icon, pct, from, to, low }: { icon: ReactNode; pct: number; from: string; to: string; low: boolean }) {
  const width = `${Math.max(0, Math.min(100, pct))}%`
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex w-4 items-center text-white/60">{icon}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all ${low ? 'from-red-500 to-red-400 animate-pulse' : `${from} ${to}`}`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

function MiniButton({ label, enabled, onClick }: { label: ReactNode; enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`pointer-events-auto flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold tabular-nums transition active:scale-95
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
      {armed ? <><AlertTriangle className="h-3 w-3" /> {t.resetConfirm}</> : <><Trash2 className="h-3 w-3" /> {t.reset}</>}
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
  const queueCap = useGame((s) =>
    queueCapOf(Math.max(1, s.vehicles.filter((v) => v.hasDriver).length)),
  )
  const drivers = useGame((s) => s.drivers)
  const spots = useGame((s) => s.spots)
  const toasts = useGame((s) => s.toasts)
  const vehicleCount = useGame((s) => s.vehicles.length)
  const vitoCount = useGame((s) => s.vehicles.filter((v) => v.kind === 'vito').length)
  const buyVehicle = useGame((s) => s.buyVehicle)
  const buyVito = useGame((s) => s.buyVito)
  const buySpot = useGame((s) => s.buySpot)
  const hireDriver = useGame((s) => s.hireDriver)
  const refuel = useGame((s) => s.refuel)
  const repair = useGame((s) => s.repair)
  const reset = useGame((s) => s.reset)
  const toggleNightShift = useGame((s) => s.toggleNightShift)
  const buildings = useGame((s) => s.buildings)
  const buyBuilding = useGame((s) => s.buyBuilding)
  const pumpBusy = useGame((s) =>
    s.vehicles.some((v) => v.state === 'toPump' || v.state === 'fueling'),
  )
  const charterKey = useGame((s) =>
    s.charter
      ? `${s.charter.id}|${s.charter.kind}|${s.charter.km}|${s.charter.payout}|${Math.ceil(s.charter.expiresAt - s.time)}`
      : '',
  )
  const charterVehicleReady = useGame((s) =>
    s.charter
      ? s.vehicles.some(
          (v) =>
            (v.state === 'parked' || v.state === 'returning' || v.state === 'fromPump') &&
            v.hasDriver &&
            v.charterPayout === 0 &&
            v.fuel >= Math.ceil(s.charter!.km * CONFIG.charterFuelPerKm) &&
            v.wear < 100,
        )
      : false,
  )
  const acceptCharter = useGame((s) => s.acceptCharter)
  // Değer eşitliği sayesinde bu string seçici her frame re-render tetiklemez
  const fleetKey = useGame((s) =>
    s.vehicles
      .map((v) => {
        const state = !v.hasDriver
          ? 'noDriver'
          : v.charterPayout > 0 && v.state !== 'parked'
            ? v.kind === 'vito'
              ? 'vipCall'
              : 'charter'
            : v.state === 'parked' && v.fuel < CONFIG.fuelPerTrip
              ? 'noFuel'
              : v.state === 'parked' && v.wear >= 100
                ? 'wornOut'
                : v.state
        return `${v.id}|${v.plate}|${state}|${v.passengers}|${Math.round(v.fuel)}|${Math.round(v.wear)}|${v.nightShift ? 1 : 0}|${v.kahya}|${capacityOf(v)}|${v.old ? 1 : 0}|${v.share}|${valuationOf(v, s.vehicles.length, s.rep)}|${v.pendingRefuel ? 1 : 0}|${v.pendingRepair ? 1 : 0}|${v.kind}|${v.hasDriver ? v.driverName : ''}|${v.driverSkill}|${Math.round(v.driverMoral)}`
      })
      .join(','),
  )
  const debtsKey = useGame((s) =>
    s.debts.map((d) => `${d.id}|${d.plate ?? `Minibüs ${d.no}`}|${d.remaining}|${d.daily}`).join(','),
  )
  const payInstallment = useGame((s) => s.payInstallment)
  const payOffDebt = useGame((s) => s.payOffDebt)
  const hireKahya = useGame((s) => s.hireKahya)
  const upgradeKahya = useGame((s) => s.upgradeKahya)
  const [debtsOpen, setDebtsOpen] = useState(false)
  const rivalsKey = useGame((s) =>
    s.rivals.map((r) => `${r.id}|${r.no}|${r.wear}|${r.playerShare}|${r.plate}`).join(','),
  )
  const buyRival = useGame((s) => s.buyRival)
  const buyRivalShare = useGame((s) => s.buyRivalShare)
  const sellRivalShare = useGame((s) => s.sellRivalShare)
  const sellShare = useGame((s) => s.sellShare)
  const buyBackShare = useGame((s) => s.buyBackShare)
  const [buildOpen, setBuildOpen] = useState(false)
  const [buildTab, setBuildTab] = useState<'arac' | 'personel' | 'tesis' | 'kontrat' | 'taksi' | 'devren' | 'stats' | 'prestij'>('arac')
  const streak = useGame((s) => s.streak)
  const driverMarket = useGame((s) => s.driverMarket)
  const hireFromMarket = useGame((s) => s.hireFromMarket)
  const cayMolasi = useGame((s) => s.cayMolasi)
  const statsHistory = useGame((s) => s.statsHistory)
  const taxisKey = useGame((s) =>
    s.taxis.map((tx) => `${tx.id}|${tx.plate}|${tx.mode}|${tx.hasCar ? 1 : 0}`).join(','),
  )
  const buyTaxiPlate = useGame((s) => s.buyTaxiPlate)
  const buyTaxiCar = useGame((s) => s.buyTaxiCar)
  const setTaxiMode = useGame((s) => s.setTaxiMode)
  const fuelPrice = useGame((s) => s.fuelPrice)
  const fareNow = useGame((s) => s.fare)
  const offlineEarned = useGame((s) => s.offlineEarned)
  const offlineSecs = useGame((s) => s.offlineSecs)
  const dismissOffline = useGame((s) => s.dismissOffline)
  const celebrateAt = useGame((s) => s.celebrateAt)
  const prestige = useGame((s) => s.prestige)
  const prestigeGain = useGame((s) =>
    Math.max(
      1,
      Math.floor(Math.sqrt(s.totalCarried / 200)) +
        s.taxis.length * 3 +
        Math.floor(s.vehicles.length / 3),
    ),
  )
  const prestigeReset = useGame((s) => s.prestigeReset)
  const [prestigeArmed, setPrestigeArmed] = useState(false)
  const [mutedUi, setMutedUi] = useState(isMuted())
  const contractsKey = useGame((s) =>
    s.contracts
      .map(
        (c) =>
          `${c.id}|${c.kind}|${c.dailyPay}|${c.daysLeft}|${c.morningDone ? 1 : 0}${c.morningMissed ? 1 : 0}${c.eveningDone ? 1 : 0}${c.eveningMissed ? 1 : 0}`,
      )
      .join(','),
  )
  const contractOfferKey = useGame((s) =>
    s.contractOffer ? `${s.contractOffer.id}|${s.contractOffer.kind}|${s.contractOffer.dailyPay}` : '',
  )
  const contractCount = useGame((s) => s.contracts.length)
  const acceptContract = useGame((s) => s.acceptContract)
  const selectedVehicle = useGame((s) => s.selectedVehicle)
  const selectVehicle = useGame((s) => s.selectVehicle)

  const selectedEntry =
    selectedVehicle != null
      ? fleetKey.split(',').find((e) => Number(e.split('|')[0]) === selectedVehicle)
      : undefined

  const vehicleCost = CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (vehicleCount - 1)
  const spotCost = CONFIG.spotBaseCost * (spots - CONFIG.startSpots + 1)
  const hasFreeSpot = vehicleCount < spots
  const hasIdleVehicle = fleetKey.includes('|noDriver|')
  // İnşaat butonundaki yeşil nokta: alınabilecek bir şey var mı?
  const canBuySomething =
    (hasFreeSpot && money >= Math.ceil(vehicleCost * CONFIG.loanDownRate)) ||
    (hasIdleVehicle && money >= CONFIG.driverHireCost) ||
    (spots < CONFIG.maxSpots && money >= spotCost) ||
    (Object.keys(BUILDING_ICONS) as BuildingKind[]).some(
      (k) => !buildings[k] && money >= BUILDING_COSTS[k],
    )

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* Üst bar */}
      <div
        className={`pointer-events-auto absolute left-4 top-4 flex max-w-[calc(100vw-200px)] items-stretch divide-x divide-white/10 overflow-x-auto ${GLASS}`}
      >
        <div className="flex items-center px-3 text-lg font-black tracking-tight text-white">
          <Bus className="h-5 w-5 text-amber-300" /> <span className="ml-1.5 hidden sm:inline">{t.appTitle}</span>
        </div>
        <Stat icon={<CalendarDays className="h-4 w-4" />} label={t.day} value={`${day}`} />
        <Stat icon={isNightHour ? <Moon className="h-4 w-4 text-indigo-300" /> : <Sun className="h-4 w-4 text-amber-300" />} label={t.clock} value={clock} />
        <Stat icon={<Wallet className="h-4 w-4 text-emerald-300" />} label={t.cash} value={`₺${fmt(money)}`} accent={money < 0 ? 'text-red-400' : 'text-emerald-300'} />
        {totalDebt > 0 && (
          <button
            onClick={() => setDebtsOpen((o) => !o)}
            className={`pointer-events-auto cursor-pointer transition hover:bg-white/5 ${debtsOpen ? 'bg-white/10' : ''}`}
          >
            <Stat icon={<ScrollText className="h-4 w-4 text-red-300" />} label={t.debt} value={`₺${fmt(totalDebt)}`} accent="text-red-300" />
          </button>
        )}
        <Stat icon={<Users className="h-4 w-4" />} label={t.waiting} value={`${queue}`} accent={queue >= queueCap ? 'text-amber-300' : 'text-white'} />
        <Stat icon={<UserRound className="h-4 w-4" />} label={t.drivers} value={`${drivers}`} />
        <Stat icon={<Fuel className="h-4 w-4 text-amber-300" />} label={t.fuelLabel} value={`₺${fuelPrice.toFixed(0)}/L`} />
        <Stat icon={<Ticket className="h-4 w-4 text-sky-300" />} label={t.fareLabel} value={`₺${fareNow}`} />
        {streak >= 2 && <Stat icon={<Flame className="h-4 w-4 text-orange-400" />} label={t.streakLabel} value={`${streak}`} accent="text-orange-300" />}
        <Stat
          icon={<Star className="h-4 w-4 text-yellow-300" />}
          label={t.rep}
          value={rep.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          accent={rep >= 4 ? 'text-emerald-300' : rep < 2 ? 'text-red-400' : 'text-white'}
        />
      </div>

      {/* Senet paneli: taksit öde / erken kapat */}
      {debtsOpen && debtsKey && (
        <div className={`absolute left-[320px] top-[72px] w-80 p-3 ${GLASS}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
              <ScrollText className="mr-1 inline h-3 w-3" /> {t.debtsTitle}
            </span>
            <span className="text-[9px] font-bold text-emerald-300/70">{t.payoffNote}</span>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {debtsKey.split(',').map((entry) => {
              const [idStr, label, remainingStr, dailyStr] = entry.split('|')
              const id = Number(idStr)
              const remaining = Number(remainingStr)
              const daily = Number(dailyStr)
              const installment = Math.min(daily, remaining)
              const payoff = Math.ceil(remaining * CONFIG.payoffDiscount)
              return (
                <div key={id} className="rounded-xl bg-white/5 p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-extrabold text-white">
                      {t.debtItem(label)}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-red-300">
                      ₺{fmt(remaining)} · {t.perDay(daily)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <MiniButton
                      label={`${t.payInstallment} ₺${fmt(installment)}`}
                      enabled={money >= installment}
                      onClick={() => payInstallment(id)}
                    />
                    <MiniButton
                      label={`${t.payOff} ₺${fmt(payoff)}`}
                      enabled={money >= payoff}
                      onClick={() => payOffDebt(id)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                <Target className="mr-1 inline h-3 w-3" /> {t.dailyTask}
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

      <Confetti token={celebrateAt} />

      {/* Offline kazanç karşılaması */}
      {offlineEarned > 0 && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative w-80 p-5 text-center ${GLASS}`}>
            <div className="flex items-center justify-center gap-2 text-white/70"><BedDouble className="h-7 w-7" /><span className="text-white/40">→</span><Banknote className="h-7 w-7 text-emerald-300" /></div>
            <div className="mt-2 text-sm font-black text-white">{t.offlineTitle}</div>
            <div className="mt-1 text-[11px] font-bold text-white/50">
              {t.offlineMsg(Math.round(offlineSecs / 60))}
            </div>
            <div className="mt-2 text-xl font-black tabular-nums text-emerald-300">
              +₺{fmt(offlineEarned)}
            </div>
            <div className="mt-3">
              <PriceButton label={t.continueBtn} enabled onClick={dismissOffline} />
            </div>
          </div>
        </div>
      )}

      {/* İşletme paneli: sağ üstte İnşaat + ses düğmesi */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMutedUi(toggleMute())}
            className={`pointer-events-auto cursor-pointer rounded-xl px-2.5 py-3 text-sm text-white shadow-lg transition active:scale-95 ${GLASS} ${mutedUi ? 'opacity-50' : ''}`}
          >
            {mutedUi ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        <button
          onClick={() => setBuildOpen((o) => !o)}
          className={`pointer-events-auto relative flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-950/50 ring-1 ring-inset ring-white/20 transition active:scale-95
            ${buildOpen ? 'bg-gradient-to-b from-red-400 to-red-500' : 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500'}`}
        >
          <Hammer className="h-4 w-4" /> {t.construction}
          {canBuySomething && !buildOpen && (
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow" />
          )}
        </button>
        </div>
      </div>

      {/* İnşaat & Yatırım modalı: sekmeli, kart grid'li */}
      {buildOpen && (
        <div className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBuildOpen(false)} />
          <div className={`relative flex max-h-[82dvh] w-[700px] max-w-[94vw] flex-col overflow-hidden ${GLASS}`}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black text-white">
                <span className="h-4 w-1 rounded-full bg-red-500" /> <Hammer className="h-4 w-4" /> {t.buildModalTitle}
              </span>
              <span className="flex items-center gap-2">
                <ResetButton onReset={reset} />
                <button
                  onClick={() => setBuildOpen(false)}
                  className="cursor-pointer rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-white/70 transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {(
                [
                  ['arac', <><Bus className="h-3.5 w-3.5" /> {t.sectionVehicles}</>],
                  ['personel', <><Users className="h-3.5 w-3.5" /> {t.sectionStaffPark}</>],
                  ['tesis', <><Building2 className="h-3.5 w-3.5" /> {t.sectionFacilities}</>],
                  ['kontrat', <><FileText className="h-3.5 w-3.5" /> {t.tabContracts}</>],
                  ['taksi', <><CarTaxiFront className="h-3.5 w-3.5" /> {t.tabTaxi}</>],
                  ['devren', <><Handshake className="h-3.5 w-3.5" /> {t.devren}</>],
                  ['stats', <><BarChart3 className="h-3.5 w-3.5" /> {t.tabStats}</>],
                  ['prestij', <><Star className="h-3.5 w-3.5" /> {t.tabPrestige}</>],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBuildTab(key)}
                  className={`flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-extrabold transition
                    ${buildTab === key ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto p-4">
              {buildTab === 'arac' && (() => {
                const vitoPrice = CONFIG.vitoCost + CONFIG.vitoCostStep * vitoCount
                const vitoDown = Math.ceil(vitoPrice * CONFIG.loanDownRate)
                return (
                  <ModalCard
                    icon={<CarTaxiFront className="h-7 w-7 text-fuchsia-300" />}
                    title={t.buyVito}
                    badge="+1 VIP"
                    badgeClass="bg-fuchsia-400/15 text-fuchsia-300"
                    desc={t.vitoDesc}
                  >
                    <PriceButton
                      label={<><Banknote className="h-3.5 w-3.5" /> {t.payCash} ₺{fmt(vitoPrice)}</>}
                      enabled={money >= vitoPrice && hasFreeSpot}
                      onClick={() => buyVito('cash')}
                    />
                    <PriceButton
                      label={<><ScrollText className="h-3.5 w-3.5" /> {t.payLoan} ₺{fmt(vitoDown)}</>}
                      enabled={money >= vitoDown && hasFreeSpot}
                      onClick={() => buyVito('loan')}
                    />
                  </ModalCard>
                )
              })()}
              {buildTab === 'arac' && (
                <ModalCard
                  icon={<Bus className="h-7 w-7 text-sky-300" />}
                  title={t.buyVehicle}
                  badge="+1 araç"
                  badgeClass="bg-sky-400/15 text-sky-300"
                  desc={t.loanNote(
                    Math.ceil(
                      (Math.round(vehicleCost * (1 + CONFIG.loanMarkupRate)) -
                        Math.ceil(vehicleCost * CONFIG.loanDownRate)) /
                        CONFIG.loanTermDays,
                    ),
                    CONFIG.loanTermDays,
                  )}
                >
                  <PriceButton
                    label={<><Banknote className="h-3.5 w-3.5" /> {t.payCash} ₺{fmt(vehicleCost)}</>}
                    enabled={money >= vehicleCost && hasFreeSpot}
                    onClick={() => buyVehicle('cash')}
                  />
                  <PriceButton
                    label={<><ScrollText className="h-3.5 w-3.5" /> {t.payLoan} ₺{fmt(Math.ceil(vehicleCost * CONFIG.loanDownRate))}</>}
                    enabled={money >= Math.ceil(vehicleCost * CONFIG.loanDownRate) && hasFreeSpot}
                    onClick={() => buyVehicle('loan')}
                  />
                </ModalCard>
              )}
              {buildTab === 'personel' && (
                <>
                  <ModalCard
                    icon={<UserRound className="h-7 w-7 text-emerald-300" />}
                    title={t.hireDriver}
                    badge="+1 şoför"
                    badgeClass="bg-emerald-400/15 text-emerald-300"
                    desc={t.driverDesc}
                  >
                    <PriceButton
                      label={`₺${fmt(CONFIG.driverHireCost)}`}
                      enabled={money >= CONFIG.driverHireCost && hasIdleVehicle}
                      onClick={hireDriver}
                    />
                  </ModalCard>
                  <ModalCard
                    icon={<MapIcon className="h-7 w-7 text-amber-300" />}
                    title={t.buySpot}
                    badge="+1 cep"
                    badgeClass="bg-amber-400/15 text-amber-300"
                    desc={t.spotDesc}
                  >
                    <PriceButton
                      label={spots >= CONFIG.maxSpots ? t.maxed : `₺${fmt(spotCost)}`}
                      enabled={money >= spotCost && spots < CONFIG.maxSpots}
                      onClick={buySpot}
                    />
                  </ModalCard>
                  {driverMarket.map((cand, i) => (
                    <ModalCard
                      key={`${cand.name}-${i}`}
                      icon={<UserRound className="h-7 w-7 text-orange-300" />}
                      title={cand.name}
                      badge={'★'.repeat(cand.skill)}
                      badgeClass="bg-yellow-400/15 text-yellow-300"
                      desc={t.marketDesc}
                    >
                      <PriceButton
                        label={`₺${fmt(cand.price)}`}
                        enabled={hasIdleVehicle && money >= cand.price}
                        onClick={() => hireFromMarket(i)}
                      />
                    </ModalCard>
                  ))}
                </>
              )}
              {buildTab === 'tesis' &&
                (Object.keys(BUILDING_ICONS) as BuildingKind[]).map((kind) => (
                  <ModalCard
                    key={kind}
                    icon={BUILDING_ICONS[kind]}
                    title={t.buildingNames[kind]}
                    badge={buildings[kind] ? `✓ ${t.built}` : undefined}
                    badgeClass="bg-emerald-400/15 text-emerald-300"
                    desc={t.buildingEffects[kind]}
                  >
                    <PriceButton
                      label={buildings[kind] ? `✓ ${t.built}` : `₺${fmt(BUILDING_COSTS[kind])}`}
                      enabled={!buildings[kind] && money >= BUILDING_COSTS[kind]}
                      onClick={() => buyBuilding(kind)}
                    />
                  </ModalCard>
                ))}
              {buildTab === 'kontrat' && (
                <>
                  {contractOfferKey && (() => {
                    const [, kindStr, payStr] = contractOfferKey.split('|')
                    return (
                      <ModalCard
                        icon={<FileSignature className="h-7 w-7 text-sky-300" />}
                        title={t.contractKinds[Number(kindStr)]}
                        badge={t.contractOfferTitle}
                        badgeClass="bg-sky-400/15 text-sky-300"
                        desc={t.contractDesc}
                      >
                        <PriceButton
                          label={`${t.accept} · ${t.contractPerDay(Number(payStr))}`}
                          enabled={contractCount < CONFIG.contractSlots}
                          onClick={acceptContract}
                        />
                      </ModalCard>
                    )
                  })()}
                  {contractsKey &&
                    contractsKey.split(',').map((entry) => {
                      const [idStr, kindStr, payStr, daysStr, flags] = entry.split('|')
                      const mDone = flags[0] === '1'
                      const mMiss = flags[1] === '1'
                      const eDone = flags[2] === '1'
                      const eMiss = flags[3] === '1'
                      const pill = (done: boolean, missed: boolean, label: string) => (
                        <span
                          className={`flex-1 rounded-lg px-1.5 py-1 text-center text-[10px] font-bold
                            ${done ? 'bg-emerald-400/15 text-emerald-300' : missed ? 'bg-red-400/15 text-red-300' : 'bg-white/10 text-white/50'}`}
                        >
                          {label} {done ? '✓' : missed ? '✗' : <Hourglass className="inline h-2.5 w-2.5" />}
                        </span>
                      )
                      return (
                        <ModalCard
                          key={idStr}
                          icon={<Bus className="h-7 w-7 text-amber-300" />}
                          title={t.contractKinds[Number(kindStr)]}
                          badge={t.contractDaysLeft(Number(daysStr))}
                          badgeClass="bg-amber-400/15 text-amber-300"
                          desc={t.contractPerDay(Number(payStr))}
                        >
                          <div className="flex gap-1.5">
                            {pill(mDone, mMiss, t.morningRun)}
                            {pill(eDone, eMiss, t.eveningRun)}
                          </div>
                        </ModalCard>
                      )
                    })}
                  {!contractOfferKey && !contractsKey && (
                    <div className="col-span-2 py-6 text-center text-[11px] font-bold text-white/40">
                      {t.noContracts}
                    </div>
                  )}
                </>
              )}
              {buildTab === 'taksi' && (
                <>
                  <ModalCard
                    icon={<CarTaxiFront className="h-7 w-7 text-yellow-300" />}
                    title={t.buyTaxiPlate}
                    badge={`${taxisKey ? taxisKey.split(',').length : 0}/${CONFIG.taxiPlateMax}`}
                    badgeClass="bg-yellow-400/15 text-yellow-300"
                    desc={t.taxiPlateDesc}
                  >
                    <PriceButton
                      label={
                        (taxisKey ? taxisKey.split(',').length : 0) >= CONFIG.taxiPlateMax
                          ? t.maxed
                          : `₺${fmt(CONFIG.taxiPlateCost)}`
                      }
                      enabled={
                        money >= CONFIG.taxiPlateCost &&
                        (taxisKey ? taxisKey.split(',').length : 0) < CONFIG.taxiPlateMax
                      }
                      onClick={buyTaxiPlate}
                    />
                  </ModalCard>
                  {taxisKey &&
                    taxisKey.split(',').map((entry) => {
                      const [idStr, taxiPlate, mode, hasCarStr] = entry.split('|')
                      const id = Number(idStr)
                      const hasCar = hasCarStr === '1'
                      const operating = mode === 'operate'
                      return (
                        <ModalCard
                          key={id}
                          icon={<CarTaxiFront className="h-7 w-7 text-yellow-300" />}
                          title={taxiPlate}
                          badge={operating ? t.taxiOperateMode : t.taxiRentMode}
                          badgeClass={
                            operating
                              ? 'bg-yellow-400/15 text-yellow-300'
                              : 'bg-emerald-400/15 text-emerald-300'
                          }
                          desc={
                            operating
                              ? t.taxiOperateNote(CONFIG.taxiOperateMin, CONFIG.taxiOperateMax)
                              : t.taxiRentNote(CONFIG.taxiRentDaily)
                          }
                        >
                          {hasCar ? (
                            <div className="flex gap-1.5">
                              <MiniButton
                                label={t.taxiRentMode}
                                enabled={operating}
                                onClick={() => setTaxiMode(id, 'rent')}
                              />
                              <MiniButton
                                label={t.taxiOperateMode}
                                enabled={!operating}
                                onClick={() => setTaxiMode(id, 'operate')}
                              />
                            </div>
                          ) : (
                            <PriceButton
                              label={`${t.buyTaxiCar} ₺${fmt(CONFIG.taxiCarCost)}`}
                              enabled={money >= CONFIG.taxiCarCost}
                              onClick={() => buyTaxiCar(id)}
                            />
                          )}
                        </ModalCard>
                      )
                    })}
                </>
              )}
              {buildTab === 'stats' && (() => {
                const today = getTodayStats()
                const entries = Object.entries(today.income).sort((a, b) => b[1] - a[1])
                const totalIn = entries.reduce((sum, [, v]) => sum + v, 0)
                const colors = ['bg-sky-500', 'bg-fuchsia-500', 'bg-purple-500', 'bg-amber-500', 'bg-yellow-500', 'bg-orange-500', 'bg-indigo-500', 'bg-emerald-500']
                const week = statsHistory.slice(-7)
                const maxAbs = Math.max(
                  1,
                  ...week.map((d) => Math.abs(Object.values(d.income).reduce((a, b) => a + b, 0) - d.expense)),
                )
                return (
                  <div className="col-span-2 flex flex-col gap-3">
                    <div>
                      <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-white/40">
                        {t.statsToday}
                      </div>
                      {totalIn === 0 ? (
                        <div className="py-3 text-center text-[11px] font-bold text-white/40">{t.statsEmpty}</div>
                      ) : (
                        <>
                          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                            {entries.map(([src, val], i) => (
                              <div key={src} className={colors[i % colors.length]} style={{ width: `${(val / totalIn) * 100}%` }} />
                            ))}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                            {entries.map(([src, val], i) => (
                              <div key={src} className="flex items-center justify-between text-[11px] font-bold">
                                <span className="flex items-center gap-1.5 text-white/60">
                                  <span className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
                                  {t.statsSources[src] ?? src}
                                </span>
                                <span className="tabular-nums text-white">₺{fmt(Math.round(val))}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-white/60">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                {t.statsExpense}
                              </span>
                              <span className="tabular-nums text-red-300">-₺{fmt(Math.round(today.expense))}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black">
                              <span className="text-white/60">{t.statsProfit}</span>
                              <span className="tabular-nums text-emerald-300">
                                ₺{fmt(Math.round(totalIn - today.expense))}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-white/40">
                        {t.statsWeek}
                      </div>
                      {week.length === 0 ? (
                        <div className="py-3 text-center text-[11px] font-bold text-white/40">{t.statsEmpty}</div>
                      ) : (
                        <div className="flex h-24 items-end gap-2">
                          {week.map((d) => {
                            const profit = Object.values(d.income).reduce((a, b) => a + b, 0) - d.expense
                            const h = Math.max(6, (Math.abs(profit) / maxAbs) * 80)
                            return (
                              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                                <span className="text-[9px] font-bold tabular-nums text-white/50">
                                  {profit >= 0 ? '+' : '-'}₺{fmt(Math.round(Math.abs(profit) / 1000))}k
                                </span>
                                <div
                                  className={`w-full rounded-t ${profit >= 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-red-600 to-red-400'}`}
                                  style={{ height: `${h}px` }}
                                />
                                <span className="text-[9px] font-bold text-white/40">G{d.day}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
              {buildTab === 'prestij' && (
                <div className="col-span-2">
                  <ModalCard
                    icon={<Star className="h-7 w-7 text-yellow-300" />}
                    title={t.prestigeTitle}
                    badge={t.prestigeLevel(prestige)}
                    badgeClass="bg-yellow-400/15 text-yellow-300"
                    desc={t.prestigeDesc}
                  >
                    <div className="text-center text-[11px] font-bold text-white/60">
                      {t.prestigeGain(prestigeGain)}
                    </div>
                    <div className="text-center text-[10px] font-bold text-white/40">
                      {t.prestigeBonuses(
                        Math.round(CONFIG.prestigeMoneyBonus * (prestige + prestigeGain) * 100),
                        (CONFIG.prestigeRepBonus * (prestige + prestigeGain)).toFixed(1),
                        Math.round(CONFIG.prestigeSpawnBonus * (prestige + prestigeGain) * 100),
                      )}
                    </div>
                    <PriceButton
                      label={prestigeArmed ? <><AlertTriangle className="h-3.5 w-3.5" /> {t.resetConfirm}</> : <><Star className="h-3.5 w-3.5" /> {t.prestigeBtn}</>}
                      enabled
                      onClick={() => {
                        if (prestigeArmed) {
                          prestigeReset()
                          setPrestigeArmed(false)
                          setBuildOpen(false)
                        } else {
                          setPrestigeArmed(true)
                          setTimeout(() => setPrestigeArmed(false), 3000)
                        }
                      }}
                    />
                  </ModalCard>
                </div>
              )}
              {buildTab === 'devren' &&
                (rivalsKey
                  ? rivalsKey.split(',').map((entry) => {
                      const [idStr, no, wearStr, shareStr, rivalPlate] = entry.split('|')
                      const id = Number(idStr)
                      const wear = Number(wearStr)
                      const playerShare = Number(shareStr)
                      void no
                      const price = Math.ceil(
                        (CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (vehicleCount - 1)) *
                          CONFIG.rivalBuyFactor,
                      )
                      const restPrice = Math.ceil(
                        ((price * (100 - playerShare)) / 100) * CONFIG.shareBuyBackPremium,
                      )
                      return (
                        <ModalCard
                          key={id}
                          icon={<Bus className="h-7 w-7 text-emerald-300" />}
                          title={rivalPlate}
                          badge={
                            playerShare > 0
                              ? t.partnered(playerShare)
                              : `${t.oldBus} · ${t.rivalWear(wear)}`
                          }
                          badgeClass={
                            playerShare > 0
                              ? 'bg-indigo-400/15 text-indigo-300'
                              : 'bg-amber-400/15 text-amber-300'
                          }
                          desc={t.rivalDesc}
                        >
                          <RivalPartnerRow
                            rivalId={id}
                            fullPrice={price}
                            playerShare={playerShare}
                            money={money}
                            onPartner={buyRivalShare}
                            onSellShare={sellRivalShare}
                          />
                          <PriceButton
                            label={
                              playerShare > 0
                                ? `${t.buyRest} ₺${fmt(restPrice)}`
                                : `${t.buyFull} ₺${fmt(price)}`
                            }
                            enabled={
                              money >= (playerShare > 0 ? restPrice : price) && hasFreeSpot
                            }
                            onClick={() => buyRival(id)}
                          />
                        </ModalCard>
                      )
                    })
                  : null)}
            </div>
          </div>
        </div>
      )}

      {/* Kasa akışı bildirimleri */}
      <div className="absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-1.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-in px-3 py-1.5 text-xs font-bold tabular-nums text-emerald-300 ${GLASS}`}
          >
            {toast.text}
          </div>
        ))}
      </div>


      {/* Özel servis teklifi: süresi dolmadan kabul et */}
      {charterKey && (() => {
        const [, kindStr, kmStr, payoutStr, leftStr] = charterKey.split('|')
        const kind = t.charterKinds[Number(kindStr)]
        const left = Math.max(0, Number(leftStr))
        return (
          <div className={`pointer-events-auto absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 p-3 ${GLASS} border-purple-400/30 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300/80">
                <Megaphone className="mr-1 inline h-3 w-3" /> {t.charterTitle}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-white/50">{left} sn</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold text-white">
              {(() => {
                const KindIcon = CHARTER_ICONS[Number(kindStr)] ?? PartyPopper
                return <KindIcon className="h-4 w-4 text-purple-300" />
              })()}
              {kind} · {t.charterKm(Number(kmStr))}
            </div>
            <div className="mt-0.5 text-[12px] font-extrabold tabular-nums text-emerald-300">
              +₺{fmt(Number(payoutStr))}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all"
                style={{ width: `${(left / CONFIG.charterLifetime) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex">
              <PriceButton
                label={charterVehicleReady ? t.accept : t.noVehicleAvailable}
                enabled={charterVehicleReady}
                onClick={acceptCharter}
              />
            </div>
          </div>
        )
      })()}

      {/* Filo dock: minik plaka çipleri — araca ya da çipe tıklayınca detay açılır */}
      <div className="pointer-events-auto absolute bottom-3 left-4 right-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {fleetKey.split(',').map((entry) => {
          const [idStr, plate, state] = entry.split('|')
          const id = Number(idStr)
          const selected = selectedVehicle === id
          return (
            <button
              key={id}
              onClick={() => selectVehicle(selected ? null : id)}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 px-1.5 py-1 transition ${GLASS}
                ${selected ? 'border-white/40 bg-neutral-800/90' : 'hover:border-white/25'}`}
            >
              <PlateBadge plate={plate} small />
              <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_STYLE[state] ?? 'bg-white/40'}`} />
            </button>
          )
        })}
      </div>

      {/* Seçili araç detayı */}
      {selectedEntry && (() => {
        const [idStr, plate, state, count, fuelStr, wearStr, nightStr, kahyaStr, capStr, oldStr, shareStr, valuationStr, pendFStr, pendRStr, kindStr, driverName, driverSkillStr, moralStr] = selectedEntry.split('|')
        const id = Number(idStr)
        const fuel = Number(fuelStr)
        const wear = Number(wearStr)
        const night = nightStr === '1'
        const kahya = Number(kahyaStr)
        const cap = Number(capStr)
        const isOld = oldStr === '1'
        const share = Number(shareStr)
        const valuation = Number(valuationStr)
        const pendF = pendFStr === '1'
        const pendR = pendRStr === '1'
        const isVito = kindStr === 'vito'
        const fuelPct = (fuel / CONFIG.fuelCapacity) * 100
        const stateText = t.state[state as keyof typeof t.state]
        const warn = state === 'noDriver' || state === 'noFuel' || state === 'wornOut'
        const refuelPrice = Math.ceil((CONFIG.fuelCapacity - fuel) * fuelPrice)
        const repairPrice = Math.ceil(
          wear * CONFIG.repairCostPerUnit * (buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1),
        )
        // Fiilen parkta mı? (pseudo-durumlar da parkta bekleyen aracı temsil eder)
        const isParked = state === 'parked' || state === 'noFuel' || state === 'wornOut'
        return (
          <div className={`pointer-events-auto absolute bottom-14 left-4 w-64 p-3 ${GLASS}`}>
            <div className="relative flex items-center justify-center">
              <PlateBadge plate={plate} small />
              <span className="absolute left-0 flex items-center gap-0.5">
                {isOld && <span title={t.oldBus}><History className="h-3 w-3 text-amber-400/80" /></span>}
                {(pendF || pendR) && <span title={t.planned}><Hourglass className="h-3 w-3 text-white/60" /></span>}
              </span>
              <button
                onClick={() => selectVehicle(null)}
                className="absolute right-0 cursor-pointer rounded-md bg-white/10 px-1.5 text-[10px] font-bold text-white/60 transition hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`flex-1 rounded-full px-2 py-0.5 text-center text-[10px] font-extrabold tabular-nums ${STATE_STYLE[state] ?? 'bg-white/10 text-white/60'}`}
              >
                {warn && <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />}
                {stateText}
                {!warn && !isVito && ` · ${t.seats(Number(count), cap)}`}
              </span>
              {!isVito && (
                <button
                  onClick={() => toggleNightShift(id)}
                  title={t.nightShift}
                  className={`pointer-events-auto cursor-pointer rounded-lg px-1.5 py-0.5 text-[11px] transition active:scale-95
                    ${night ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-white/10 opacity-40 hover:opacity-100'}`}
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {driverName && (() => {
              const moral = Number(moralStr)
              return (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-white/5 px-1.5 py-1">
                  <span className="flex-1 text-[10px] font-bold text-white/60">
                    {t.driverRow(driverName, Number(driverSkillStr))}
                  </span>
                  <span className={`text-[9px] font-bold tabular-nums ${moral < CONFIG.moralLowThreshold ? 'text-red-300' : 'text-white/40'}`}>
                    %{moral}
                  </span>
                  <button
                    onClick={() => cayMolasi(id)}
                    disabled={moral >= 100 || money < CONFIG.cayMolasiCost}
                    title={t.cayMolasi}
                    className={`pointer-events-auto flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold transition active:scale-95
                      ${moral < 100 && money >= CONFIG.cayMolasiCost ? 'cursor-pointer bg-orange-400/20 text-orange-300 hover:bg-orange-400/30' : 'bg-white/5 text-white/25'}`}
                  >
                    <Coffee className="h-3 w-3" /> ₺{fmt(CONFIG.cayMolasiCost)}
                  </button>
                </div>
              )
            })()}
            <div className="mt-1.5 flex flex-col gap-1">
              <Bar icon={<Fuel className="h-3 w-3" />} pct={fuelPct} from="from-amber-500" to="to-yellow-400" low={fuel < CONFIG.fuelPerTrip} />
              <Bar icon={<Wrench className="h-3 w-3" />} pct={100 - wear} from="from-emerald-500" to="to-green-400" low={wear >= 100} />
            </div>
            <div className="mt-2 flex gap-1.5">
              <MiniButton
                label={<><Fuel className="h-3 w-3" />{pendF ? ` ${t.planned}` : ` ${t.refuel} ₺${fmt(refuelPrice)}`}</>}
                enabled={
                  !pendF &&
                  refuelPrice > 0 &&
                  state !== 'noDriver' &&
                  (isParked ? money >= refuelPrice && !pumpBusy : true)
                }
                onClick={() => refuel(id)}
              />
              <MiniButton
                label={<><Wrench className="h-3 w-3" />{pendR ? ` ${t.planned}` : ` ${t.repair} ₺${fmt(repairPrice)}`}</>}
                enabled={
                  !pendR &&
                  repairPrice > 0 &&
                  (isParked || state === 'noDriver' ? money >= repairPrice : true)
                }
                onClick={() => repair(id)}
              />
            </div>
            <OwnShareControls
              vehicleId={id}
              share={share}
              valuation={valuation}
              money={money}
              onSell={sellShare}
              onBuyBack={buyBackShare}
            />
            <div className={`mt-1.5 items-center gap-1.5 ${isVito ? 'hidden' : 'flex'}`}>
              {kahya === 0 ? (
                <MiniButton
                  label={<><HardHat className="h-3 w-3" /> {t.hireKahya} ₺{fmt(CONFIG.kahyaHireCost)}</>}
                  enabled={state !== 'noDriver' && money >= CONFIG.kahyaHireCost}
                  onClick={() => hireKahya(id)}
                />
              ) : (
                <>
                  <span className="flex-1 rounded-lg bg-indigo-400/15 px-1.5 py-1.5 text-center text-[10px] font-bold text-indigo-300">
                    {t.kahya} {t.kahyaLevel(kahya)} · {t.kahyaEffect(cap - CONFIG.seatCount)}
                  </span>
                  {kahya < CONFIG.kahyaMaxLevel && (
                    <MiniButton
                      label={<><ArrowUp className="h-3 w-3" /> {t.upgrade} ₺{fmt(CONFIG.kahyaUpgradeCosts[kahya - 1])}</>}
                      enabled={money >= CONFIG.kahyaUpgradeCosts[kahya - 1]}
                      onClick={() => upgradeKahya(id)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
