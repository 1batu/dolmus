import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGame, BANKS, BUILDING_COSTS, MOD_COSTS, bankLimitOf, capacityOf, fleetAssetValue, valuationOf, getTodayStats, specOf, fuelUnitPrice, type BuildingKind, type BusKind, type VehicleKind } from '../game/store'
import { CONFIG, VEHICLE_SPECS, clockOf, contractSlotsOf, queueCapOf } from '../game/config'
import { SPRINTER_LOT } from '../game/paths'
import {
  AlertTriangle,
  Landmark,
  PiggyBank,
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
  BusFront,
  CarFront,
  CupSoda,
  Droplets,
  FileSignature,
  FileText,
  Flame,
  Fuel,
  Handshake,
  KeyRound,
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
  PlugZap,
  Volume2,
  VolumeX,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { isMuted, toggleMute } from '../game/sound'
import { t } from '../i18n'

const BUILDING_ICONS: Record<BuildingKind, ReactNode> = {
  bufe: <CupSoda className="h-7 w-7 text-amber-600" />,
  cayOcagi: <Coffee className="h-7 w-7 text-orange-600" />,
  tamirhane: <Wrench className="h-7 w-7 text-sky-600" />,
  otoPompa: <Fuel className="h-7 w-7 text-emerald-600" />,
  otoBakim: <Cog className="h-7 w-7 text-violet-600" />,
  sarj: <PlugZap className="h-7 w-7 text-cyan-600" />,
  solar: <Sun className="h-7 w-7 text-yellow-600" />,
  yakitTanki: <Droplets className="h-7 w-7 text-amber-600" />,
  billboard: <Megaphone className="h-7 w-7 text-pink-600" />,
  hat2: <MapIcon className="h-7 w-7 text-yellow-600" />,
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

// Açık düz panel: Game Dev Tycoon tarzı — mat zemin, kalın kenar, sert alt gölge
const PANEL =
  'rounded-2xl border-2 border-[#c9d4da] bg-[#eef2f5] shadow-[0_5px_0_rgba(44,62,80,0.16)]'

function Stat({ icon, label, value, accent = 'text-[#2c3e50]' }: { icon: ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="flex items-center leading-none text-[#4a6076]">{icon}</span>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#93a5af]">{label}</div>
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
    <div className="flex flex-col rounded-xl border border-[#d5dee4] bg-white p-3 shadow-[0_3px_0_#dde5ea]">
      <div className="flex h-14 items-center justify-center rounded-lg bg-[#edf2f5] text-3xl">
        {icon}
      </div>
      <div className="mt-2 text-[12px] font-extrabold text-[#2c3e50]">{title}</div>
      {badge && (
        <div className={`mt-1 self-start rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${badgeClass ?? 'bg-[#e2e9ed] text-[#5b7383]'}`}>
          {badge}
        </div>
      )}
      <div className="mt-1 flex-1 text-[10px] font-bold leading-tight text-[#7f929e]">{desc}</div>
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
      className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-extrabold tabular-nums transition
        ${
          enabled
            ? 'cursor-pointer bg-[#2ecc71] text-white shadow-[0_3px_0_#27ae60] hover:bg-[#40d47e] active:translate-y-[2px] active:shadow-[0_1px_0_#27ae60]'
            : 'bg-[#e4eaee] text-[#adbac2]'
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
      className="pointer-events-auto h-1.5 flex-1 cursor-pointer accent-[#3498db]"
    />
  )
}

// Kendi aracının hissesi: kaydırıcıyla dilim seç, sat ya da geri al
function OwnShareControls({
  vehicleId,
  share,
  valuation,
  money,
  partners,
  onSell,
  onBuyBack,
}: {
  vehicleId: number
  share: number
  valuation: number
  money: number
  partners: Array<{ name: string; pct: number }>
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
        <div className="mt-1.5 rounded-lg bg-indigo-400/15 px-1.5 py-1 text-center text-[10px] font-bold text-indigo-600">
          {t.partneredBadge(100 - share)}
        </div>
      )}
      {partners.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {partners.map((pt, i) => (
            <span key={i} className="rounded-full bg-[#e2e9ed] px-1.5 py-0.5 text-[9px] font-bold text-[#5b7383]">
              {pt.name} · %{pt.pct}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="flex w-4 items-center text-[#6f8694]"><Handshake className="h-3 w-3" /></span>
        <ShareSlider value={pct} min={5} max={100} onChange={setPct} />
        <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#6f8694]">%{pct}</span>
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
        <span className="flex w-4 items-center text-[#6f8694]"><Handshake className="h-3 w-3" /></span>
        <ShareSlider value={pct} min={5} max={90} onChange={setPct} />
        <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#6f8694]">%{pct}</span>
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
  onTrip: 'bg-sky-400/15 text-sky-600',
  departing: 'bg-sky-400/15 text-sky-600',
  returning: 'bg-sky-400/15 text-sky-600',
  loading: 'bg-amber-400/15 text-amber-600',
  toPeron: 'bg-amber-400/15 text-amber-600',
  toPump: 'bg-orange-400/15 text-orange-600',
  fueling: 'bg-orange-400/15 text-orange-600',
  fromPump: 'bg-orange-400/15 text-orange-600',
  parked: 'bg-[#e2e9ed] text-[#5b7383]',
  charter: 'bg-purple-400/15 text-purple-600',
  vipCall: 'bg-fuchsia-400/15 text-fuchsia-600',
  noDriver: 'bg-red-400/15 text-red-600',
  noFuel: 'bg-red-400/15 text-red-600',
  wornOut: 'bg-red-400/15 text-red-600',
  inRepair: 'bg-orange-400/15 text-orange-600',
}

// Dock çipindeki durum noktası renkleri
const DOT_STYLE: Record<string, string> = {
  parked: 'bg-[#aebbc3]',
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
  inRepair: 'bg-orange-500 animate-pulse',
}

function Bar({ icon, pct, from, to, low }: { icon: ReactNode; pct: number; from: string; to: string; low: boolean }) {
  const width = `${Math.max(0, Math.min(100, pct))}%`
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex w-4 items-center text-[#5b7383]">{icon}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e2e9ed]">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all ${low ? 'from-red-500 to-red-400 animate-pulse' : `${from} ${to}`}`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

function MiniButton({ label, enabled, onClick, active = false }: { label: ReactNode; enabled: boolean; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`pointer-events-auto flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold tabular-nums transition
        ${
          active
            ? 'cursor-pointer bg-[#3498db] text-white shadow-[0_2px_0_#2980b9] active:translate-y-[1px] active:shadow-none'
            : enabled
              ? 'cursor-pointer bg-[#dde6eb] text-[#2c3e50] shadow-[0_2px_0_#c3cfd6] hover:bg-[#d1dce2] active:translate-y-[1px] active:shadow-none'
              : 'bg-[#e9eef1] text-[#b8c4cb]'
        }`}
    >
      {label}
    </button>
  )
}

// Araç detay gövdesi: hem sol alttaki yüzen panelde (3D tıklama) hem Filo
// modalının içinde kullanılır — tüm veri/aksiyonlar store'dan çekilir
function VehicleDetailBody({ entry, onClose, floating = false }: { entry: string; onClose: () => void; floating?: boolean }) {
  const money = useGame((s) => s.money)
  const buildings = useGame((s) => s.buildings)
  const fuelPrice = useGame((s) => s.fuelPrice)
  const pumpBusy = useGame((s) =>
    s.vehicles.some((v) => v.state === 'toPump' || v.state === 'fueling'),
  )
  const refuel = useGame((s) => s.refuel)
  const repair = useGame((s) => s.repair)
  const toggleNightShift = useGame((s) => s.toggleNightShift)
  const cayMolasi = useGame((s) => s.cayMolasi)
  const sellShare = useGame((s) => s.sellShare)
  const buyBackShare = useGame((s) => s.buyBackShare)
  const hireKahya = useGame((s) => s.hireKahya)
  const upgradeKahya = useGame((s) => s.upgradeKahya)
  const buyMod = useGame((s) => s.buyMod)
  const toggleWrap = useGame((s) => s.toggleWrap)

  const [idStr, plate, state, count, fuelStr, wearStr, nightStr, kahyaStr, capStr, oldStr, shareStr, valuationStr, pendFStr, pendRStr, kindStr, driverName, driverSkillStr, moralStr, partnersStr, modsStr, wrapStr] = entry.split('|')
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
  // Servis sprinteri peron kuyruğuna girmez: koltuk sayacı ve nöbet düğmesi anlamsız
  const isServis = kindStr === 'sprinter'
  const spec = VEHICLE_SPECS[kindStr] ?? VEHICLE_SPECS.dolmus
  const fuelPct = (fuel / spec.tank) * 100
  const stateText = t.state[state as keyof typeof t.state]
  const warn = state === 'noDriver' || state === 'noFuel' || state === 'wornOut'
  // Birim fiyat: elektrikli şarj / LPG / tanklı toptan mazot indirimi dahil
  const unitPrice = fuelUnitPrice(
    kindStr as VehicleKind,
    fuelPrice,
    buildings,
    (modsStr ?? '').includes('lpg'),
  )
  const refuelPrice = Math.ceil((spec.tank - fuel) * unitPrice)
  const repairPrice = Math.ceil(
    wear * CONFIG.repairCostPerUnit * spec.repairMult * (buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1),
  )
  // Fiilen parkta mı? (pseudo-durumlar da parkta bekleyen aracı temsil eder)
  const isParked = state === 'parked' || state === 'noFuel' || state === 'wornOut'
  return (
    <div
      className={
        floating
          ? `pointer-events-auto absolute bottom-14 left-4 w-64 p-3 ${PANEL}`
          : 'w-64 shrink-0 self-start rounded-xl bg-white p-3 ring-1 ring-inset ring-[#d5dee4]'
      }
    >
      <div className="relative flex items-center justify-center">
        <PlateBadge plate={plate} small />
        <span className="absolute left-0 flex items-center gap-0.5">
          {isOld && <span title={t.oldBus}><History className="h-3 w-3 text-amber-500" /></span>}
          {(pendF || pendR) && <span title={t.planned}><Hourglass className="h-3 w-3 text-[#5b7383]" /></span>}
        </span>
        <button
          onClick={onClose}
          className="absolute right-0 cursor-pointer rounded-md bg-[#e2e9ed] px-1.5 text-[10px] font-bold text-[#5b7383] transition hover:bg-[#cfdae1]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`flex-1 rounded-full px-2 py-0.5 text-center text-[10px] font-extrabold tabular-nums ${STATE_STYLE[state] ?? 'bg-[#e2e9ed] text-[#5b7383]'}`}
        >
          {warn && <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />}
          {stateText}
          {!warn && !isVito && !isServis && ` · ${t.seats(Number(count), cap)}`}
        </span>
        {!isVito && !isServis && (
          <button
            onClick={() => toggleNightShift(id)}
            title={t.nightShift}
            className={`pointer-events-auto cursor-pointer rounded-lg px-1.5 py-0.5 text-[11px] transition active:scale-95
              ${night ? 'bg-indigo-500 text-white shadow-[0_2px_0_#4338ca]' : 'bg-[#e2e9ed] text-[#5b7383] opacity-60 hover:opacity-100'}`}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {driverName && (() => {
        const moral = Number(moralStr)
        return (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-[#edf2f5] px-1.5 py-1">
            <span className="flex-1 text-[10px] font-bold text-[#5b7383]">
              {t.driverRow(driverName, Number(driverSkillStr))}
            </span>
            <span className={`text-[9px] font-bold tabular-nums ${moral < CONFIG.moralLowThreshold ? 'text-red-600' : 'text-[#93a5af]'}`}>
              %{moral}
            </span>
            <button
              onClick={() => cayMolasi(id)}
              disabled={moral >= 100 || money < CONFIG.cayMolasiCost}
              title={t.cayMolasi}
              className={`pointer-events-auto flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold transition active:scale-95
                ${moral < 100 && money >= CONFIG.cayMolasiCost ? 'cursor-pointer bg-orange-400/20 text-orange-600 hover:bg-orange-400/30' : 'bg-white text-[#b8c4cb]'}`}
            >
              <Coffee className="h-3 w-3" /> ₺{fmt(CONFIG.cayMolasiCost)}
            </button>
          </div>
        )
      })()}
      <div className="mt-1.5 flex flex-col gap-1">
        <Bar icon={<Fuel className="h-3 w-3" />} pct={fuelPct} from="from-amber-500" to="to-yellow-400" low={fuel < spec.fuelPerTrip} />
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
        partners={(partnersStr ?? '')
          .split(';')
          .filter(Boolean)
          .map((p) => {
            const [name, pct] = p.split('~')
            return { name, pct: Number(pct) }
          })}
        onSell={sellShare}
        onBuyBack={buyBackShare}
      />
      <div className={`mt-1.5 items-center gap-1.5 ${isVito || isServis ? 'hidden' : 'flex'}`}>
        {kahya === 0 ? (
          <MiniButton
            label={<><HardHat className="h-3 w-3" /> {t.hireKahya} ₺{fmt(CONFIG.kahyaHireCost)}</>}
            enabled={state !== 'noDriver' && money >= CONFIG.kahyaHireCost}
            onClick={() => hireKahya(id)}
          />
        ) : (
          <>
            <span className="flex-1 rounded-lg bg-indigo-400/15 px-1.5 py-1.5 text-center text-[10px] font-bold text-indigo-600">
              {t.kahya} {t.kahyaLevel(kahya)} · {t.kahyaEffect(cap - spec.seats)}
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
      {/* Modifiye: tek seferlik yükseltmeler + reklam giydirme */}
      {(() => {
        const mods = (modsStr ?? '').split('+').filter(Boolean)
        const wrap = Number(wrapStr ?? 0)
        return (
          <div className="mt-2 border-t border-[#d5dee4] pt-1.5">
            <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-[#9dadb6]">{t.modsTitle}</div>
            <div className="grid grid-cols-2 gap-1">
              {(['engine', 'lpg', 'ac', 'sound'] as const).map((m) => {
                if (m === 'lpg' && kindStr === 'ebus') return null
                const cost = Math.ceil(MOD_COSTS[m] * spec.repairMult)
                return mods.includes(m) ? (
                  <span key={m} className="rounded-lg bg-emerald-400/15 px-1.5 py-1 text-center text-[9px] font-bold text-emerald-600">
                    {t.modNames[m]}
                  </span>
                ) : (
                  <MiniButton
                    key={m}
                    label={`${t.modNames[m]} ₺${fmt(cost)}`}
                    enabled={money >= cost}
                    onClick={() => buyMod(id, m)}
                  />
                )
              })}
            </div>
            <div className="mt-1">
              <MiniButton
                label={
                  wrap > 0
                    ? t.wrapRemove
                    : t.wrapAdd(CONFIG.wrapDailyMin, CONFIG.wrapDailyMax)
                }
                enabled
                active={wrap > 0}
                onClick={() => toggleWrap(id)}
              />
            </div>
          </div>
        )
      })()}
    </div>
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
      className={`pointer-events-auto cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${PANEL}
        ${armed ? '!border-red-300 !bg-red-50 text-red-600' : 'text-[#93a5af] hover:text-[#3d5568]'}`}
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
  // Talep araç sınıfına göre ağırlıklı: otobüs minibüsten çok yolcu çeker
  const queueCap = useGame((s) =>
    queueCapOf(
      Math.max(
        1,
        s.vehicles.reduce((sum, v) => sum + (v.hasDriver ? specOf(v.kind).demandWeight : 0), 0),
      ),
    ),
  )
  const drivers = useGame((s) => s.drivers)
  const spots = useGame((s) => s.spots)
  const toasts = useGame((s) => s.toasts)
  const vehicleCount = useGame((s) => s.vehicles.length)
  const vitoCount = useGame((s) => s.vehicles.filter((v) => v.kind === 'vito').length)
  const sprinterCount = useGame((s) => s.vehicles.filter((v) => v.kind === 'sprinter').length)
  const sprinterActive = useGame(
    (s) => s.vehicles.filter((v) => v.kind === 'sprinter' && v.hasDriver).length,
  )
  const busCount = useGame((s) => s.vehicles.filter((v) => v.kind === 'bus').length)
  const articCount = useGame((s) => s.vehicles.filter((v) => v.kind === 'artic').length)
  const ebusCount = useGame((s) => s.vehicles.filter((v) => v.kind === 'ebus').length)
  const rentalOffice = useGame((s) => s.rentalOffice)
  // Kiralık filo: değer eşitliği için string anahtar (frame başı re-render yok)
  const rentalsKey = useGame((s) =>
    s.rentals
      .map(
        (r) =>
          `${r.id}|${r.plate}|${Math.round(r.fuel)}|${Math.round(r.wear)}|${r.rentDaysLeft}|${r.corporate ? 1 : 0}|${r.rentDaily}|${r.refundIn}`,
      )
      .join(','),
  )
  const rentalCars = rentalsKey ? rentalsKey.split(',').length : 0
  const refuelRental = useGame((s) => s.refuelRental)
  const repairRental = useGame((s) => s.repairRental)
  const sellRental = useGame((s) => s.sellRental)
  const buyVehicle = useGame((s) => s.buyVehicle)
  const buyVito = useGame((s) => s.buyVito)
  const buySprinter = useGame((s) => s.buySprinter)
  const buyBus = useGame((s) => s.buyBus)
  const buyRentalOffice = useGame((s) => s.buyRentalOffice)
  const buyRentalCar = useGame((s) => s.buyRentalCar)
  const perons = useGame((s) => s.perons)
  const buyPeron = useGame((s) => s.buyPeron)
  const buySpot = useGame((s) => s.buySpot)
  const hireDriver = useGame((s) => s.hireDriver)
  const reset = useGame((s) => s.reset)
  const buildings = useGame((s) => s.buildings)
  const buyBuilding = useGame((s) => s.buyBuilding)
  const charterKey = useGame((s) =>
    s.charter
      ? `${s.charter.id}|${s.charter.kind}|${s.charter.km}|${s.charter.payout}|${Math.ceil(s.charter.expiresAt - s.time)}`
      : '',
  )
  // Özel servise yalnız sprinter çıkar: hat araçları peronda kalır
  const charterVehicleReady = useGame((s) =>
    s.charter
      ? s.vehicles.some(
          (v) =>
            v.kind === 'sprinter' &&
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
        const state = v.brokenUntilDay > 0 && clockOf(s.time).day < v.brokenUntilDay
          ? 'inRepair'
          : !v.hasDriver
          ? 'noDriver'
          : v.charterPayout > 0 && v.state !== 'parked'
            ? v.kind === 'vito'
              ? 'vipCall'
              : 'charter'
            : v.state === 'parked' && v.fuel < specOf(v.kind).fuelPerTrip
              ? 'noFuel'
              : v.state === 'parked' && v.wear >= 100
                ? 'wornOut'
                : v.state
        return `${v.id}|${v.plate}|${state}|${v.passengers}|${Math.round(v.fuel)}|${Math.round(v.wear)}|${v.nightShift ? 1 : 0}|${v.kahya}|${capacityOf(v)}|${v.old ? 1 : 0}|${v.share}|${valuationOf(v, s.vehicles.length, s.rep)}|${v.pendingRefuel ? 1 : 0}|${v.pendingRepair ? 1 : 0}|${v.kind}|${v.hasDriver ? v.driverName : ''}|${v.driverSkill}|${Math.round(v.driverMoral)}|${v.partners.map((pt) => `${pt.name}~${pt.pct}`).join(';')}|${v.mods.join('+')}|${v.wrap}`
      })
      .join(','),
  )
  const debtsKey = useGame((s) => {
    const today = clockOf(s.time).day
    return s.debts
      .map(
        (d) =>
          `${d.id}|${d.bank ? (t.bankNames[d.bankId ?? ''] ?? 'Banka') : (d.plate ?? `Minibüs ${d.no}`)}|${d.remaining}|${d.daily}|${d.bank ? 1 : 0}|${d.every ?? 1}|${Math.max(0, (d.nextPayDay ?? today) - today)}`,
      )
      .join(',')
  })
  const payInstallment = useGame((s) => s.payInstallment)
  const payOffDebt = useGame((s) => s.payOffDebt)
  const [debtsOpen, setDebtsOpen] = useState(false)
  const rivalsKey = useGame((s) =>
    s.rivals.map((r) => `${r.id}|${r.no}|${r.wear}|${r.playerShare}|${r.plate}`).join(','),
  )
  const buyRival = useGame((s) => s.buyRival)
  const buyRivalShare = useGame((s) => s.buyRivalShare)
  const sellRivalShare = useGame((s) => s.sellRivalShare)
  const [buildOpen, setBuildOpen] = useState(false)
  const [buildTab, setBuildTab] = useState<'arac' | 'personel' | 'tesis' | 'kontrat' | 'taksi' | 'kiralama' | 'devren' | 'stats' | 'prestij'>('arac')
  const streak = useGame((s) => s.streak)
  const creditScore = useGame((s) => Math.round(s.creditScore))
  const depositsKey = useGame((s) =>
    s.deposits.map((d) => `${d.id}|${d.bankId}|${d.amount}|${d.daysLeft}|${d.rate}|${d.term}`).join(','),
  )
  const bankUsedKey = useGame((s) =>
    BANKS.map((b) =>
      s.debts.reduce((sum, d) => sum + (d.bank && d.bankId === b.id ? d.remaining : 0), 0),
    ).join(','),
  )
  const openDeposit = useGame((s) => s.openDeposit)
  const breakDeposit = useGame((s) => s.breakDeposit)
  const takeBankLoan = useGame((s) => s.takeBankLoan)
  const [bankOpen, setBankOpen] = useState(false)
  const [filoOpen, setFiloOpen] = useState(false)
  const [filoTab, setFiloTab] = useState<'hat' | 'taksi' | 'kiralama'>('hat')
  // 3D sahnede araca tıklanınca detay Filo modalında açılır (ayrı panel yok)
  const selectedVehicleId = useGame((s) => s.selectedVehicle)
  useEffect(() => {
    if (selectedVehicleId != null) {
      setFiloOpen(true)
      setFiloTab('hat')
    }
  }, [selectedVehicleId])
  const [bankIdx, setBankIdx] = useState(0)
  const [depositPct, setDepositPct] = useState(50)
  const [loanPct, setLoanPct] = useState(50)
  const driverMarket = useGame((s) => s.driverMarket)
  const hireFromMarket = useGame((s) => s.hireFromMarket)
  const statsHistory = useGame((s) => s.statsHistory)
  // Hipotek: banka limitine eklenen filo değeri (hisse ağırlıklı)
  const assetValue = useGame((s) => fleetAssetValue(s.vehicles, s.rep))
  // Bugünün özel günü (varsa üst barda çip olarak görünür)
  const specialToday = useGame((s) =>
    s.specialDayFor === clockOf(s.time).day ? s.specialDay : null,
  )
  const restructureDebt = useGame((s) => s.restructureDebt)
  const taxisKey = useGame((s) =>
    s.taxis
      .map((tx) => `${tx.id}|${tx.plate}|${tx.mode}|${tx.hasCar ? 1 : 0}|${tx.nightShift ? 1 : 0}`)
      .join(','),
  )
  const buyTaxiPlate = useGame((s) => s.buyTaxiPlate)
  const buyTaxiCar = useGame((s) => s.buyTaxiCar)
  const setTaxiMode = useGame((s) => s.setTaxiMode)
  const toggleTaxiNightShift = useGame((s) => s.toggleTaxiNightShift)
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

  // Filo butonundaki uyarı noktası: ilgi bekleyen araç var mı
  const fleetWarn = fleetKey
    ? fleetKey.split(',').some((e) => {
        const st = e.split('|')[2]
        return st === 'noDriver' || st === 'noFuel' || st === 'wornOut'
      })
    : false
  const selectedEntry =
    selectedVehicle != null
      ? fleetKey.split(',').find((e) => Number(e.split('|')[0]) === selectedVehicle)
      : undefined

  const vehicleCost = CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (vehicleCount - 1)
  const spotCost = CONFIG.spotBaseCost * (spots - CONFIG.startSpots + 1)
  // Sprinterler ana cepleri kullanmaz: kendi servis otoparkı vardır
  const hasFreeSpot = vehicleCount - sprinterCount < spots
  const hasFreeSprinterSpot = sprinterCount < SPRINTER_LOT.max
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
        className={`pointer-events-auto absolute left-4 top-4 flex max-w-[calc(100vw-200px)] items-stretch divide-x divide-[#d5dee4] overflow-x-auto ${PANEL}`}
      >
        <div className="flex items-center px-3 text-lg font-black tracking-tight text-[#2c3e50]">
          <img src="/favicon.svg" alt={t.appTitle} title={t.appTitle} className="h-6 w-6 rounded-md" />
        </div>
        <Stat icon={<CalendarDays className="h-4 w-4" />} label={t.day} value={`${day}`} />
        <Stat icon={isNightHour ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-600" />} label={t.clock} value={clock} />
        <Stat icon={<Wallet className="h-4 w-4 text-emerald-600" />} label={t.cash} value={`₺${fmt(money)}`} accent={money < 0 ? 'text-red-600' : 'text-emerald-600'} />
        {totalDebt > 0 && (
          <button
            onClick={() => setDebtsOpen((o) => !o)}
            className={`pointer-events-auto cursor-pointer transition hover:bg-white ${debtsOpen ? 'bg-[#e2e9ed]' : ''}`}
          >
            <Stat icon={<ScrollText className="h-4 w-4 text-red-600" />} label={t.debt} value={`₺${fmt(totalDebt)}`} accent="text-red-600" />
          </button>
        )}
        <Stat icon={<Users className="h-4 w-4" />} label={t.waiting} value={`${queue}`} accent={queue >= queueCap ? 'text-amber-600' : 'text-[#2c3e50]'} />
        <Stat icon={<UserRound className="h-4 w-4" />} label={t.drivers} value={`${drivers}`} />
        <Stat icon={<Fuel className="h-4 w-4 text-amber-600" />} label={t.fuelLabel} value={`₺${fuelPrice.toFixed(0)}/L`} />
        <Stat icon={<Ticket className="h-4 w-4 text-sky-600" />} label={t.fareLabel} value={`₺${fareNow}`} />
        {streak >= 2 && <Stat icon={<Flame className="h-4 w-4 text-orange-400" />} label={t.streakLabel} value={`${streak}`} accent="text-orange-600" />}
        {specialToday && (
          <Stat
            icon={
              specialToday === 'mac' ? (
                <Trophy className="h-4 w-4 text-pink-600" />
              ) : specialToday === 'bayram' ? (
                <PartyPopper className="h-4 w-4 text-pink-600" />
              ) : (
                <School className="h-4 w-4 text-pink-600" />
              )
            }
            label={t.specialLabel}
            value={t.specialNames[specialToday]}
            accent="text-pink-600"
          />
        )}
        <Stat
          icon={<Star className="h-4 w-4 text-yellow-600" />}
          label={t.rep}
          value={rep.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          accent={rep >= 4 ? 'text-emerald-600' : rep < 2 ? 'text-red-600' : 'text-[#2c3e50]'}
        />
      </div>

      {/* Senet paneli: taksit öde / erken kapat */}
      {debtsOpen && debtsKey && (
        <div className={`pointer-events-auto absolute left-[320px] top-[72px] flex max-h-[72dvh] w-80 flex-col p-3 ${PANEL}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#93a5af]">
              <ScrollText className="mr-1 inline h-3 w-3" /> {t.debtsTitle}
            </span>
            <span className="text-[9px] font-bold text-emerald-600/70">{t.payoffNote}</span>
          </div>
          {/* Toplam + adet: liste uzayınca genel resim kaybolmasın */}
          <div className="mt-1.5 flex items-baseline justify-between rounded-lg bg-red-400/10 px-2 py-1">
            <span className="text-[10px] font-bold text-red-500">
              {t.debtsCount(debtsKey.split(',').length)}
            </span>
            <span className="text-[11px] font-extrabold tabular-nums text-red-600">₺{fmt(totalDebt)}</span>
          </div>
          <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {debtsKey.split(',').map((entry) => {
              const [idStr, label, remainingStr, dailyStr, bankFlag, everyStr, dueStr] = entry.split('|')
              const id = Number(idStr)
              const remaining = Number(remainingStr)
              const daily = Number(dailyStr)
              const every = Number(everyStr || 1)
              const dueIn = Number(dueStr || 0)
              const installment = Math.min(daily, remaining)
              const payoff = Math.ceil(remaining * CONFIG.payoffDiscount)
              return (
                <div key={id} className="rounded-xl bg-white p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-extrabold text-[#2c3e50]">
                      {bankFlag === '1' ? t.bankLoanItem(label) : t.debtItem(label)}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-red-600">
                      ₺{fmt(remaining)} ·{' '}
                      {every === 1 ? t.perDay(daily) : every === 7 ? t.perWeek(daily) : t.perMonth(daily)}
                    </span>
                  </div>
                  {/* Tahsilat geri sayımı: günü gelen kesinti kırmızı yanar */}
                  <div className={`mt-0.5 text-[9px] font-bold tabular-nums ${dueIn === 0 ? 'animate-pulse text-red-600' : 'text-[#93a5af]'}`}>
                    {dueIn === 0 ? t.dueTonight : t.dueIn(dueIn)}
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
                  {/* Yapılandırma: taksit yükü ağırsa haftalık/aylık plana geç */}
                  {every === 1 && (
                    <div className="mt-1.5 flex gap-1.5">
                      <MiniButton
                        label={t.restructureWeekly}
                        enabled
                        onClick={() => restructureDebt(id, 'weekly')}
                      />
                      <MiniButton
                        label={t.restructureMonthly}
                        enabled
                        onClick={() => restructureDebt(id, 'monthly')}
                      />
                    </div>
                  )}
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
          <div className={`absolute left-4 top-[72px] w-72 p-3 ${PANEL} ${done ? '!border-[#2ecc71]' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#93a5af]">
                <Target className="mr-1 inline h-3 w-3" /> {t.dailyTask}
              </span>
              <span className={`text-[10px] font-extrabold tabular-nums ${done ? 'text-emerald-600' : 'text-[#6f8694]'}`}>
                {done ? `✓ ${t.taskDoneLabel}` : `${t.taskReward} ₺${fmt(Number(rewardStr))}`}
              </span>
            </div>
            <div className="mt-1 text-[13px] font-extrabold text-[#2c3e50]">{desc}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e2e9ed]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all ${done ? 'from-emerald-500 to-green-400' : 'from-sky-500 to-cyan-400'}`}
                  style={{ width: `${Math.min(100, (progress / target) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-[#6f8694]">
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
          <div className="absolute inset-0 bg-[#22313f]/65" />
          <div className={`relative w-80 p-5 text-center ${PANEL}`}>
            <div className="flex items-center justify-center gap-2 text-[#4a6076]"><BedDouble className="h-7 w-7" /><span className="text-[#93a5af]">→</span><Banknote className="h-7 w-7 text-emerald-600" /></div>
            <div className="mt-2 text-sm font-black text-[#2c3e50]">{t.offlineTitle}</div>
            <div className="mt-1 text-[11px] font-bold text-[#6f8694]">
              {t.offlineMsg(Math.round(offlineSecs / 60))}
            </div>
            <div className="mt-2 text-xl font-black tabular-nums text-emerald-600">
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
            className={`pointer-events-auto cursor-pointer rounded-xl px-2.5 py-3 text-sm text-[#2c3e50] shadow-lg transition active:scale-95 ${PANEL} ${mutedUi ? 'opacity-50' : ''}`}
          >
            {mutedUi ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setFiloOpen((o) => !o)}
            className={`pointer-events-auto relative flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#2980b9] transition active:translate-y-[2px] active:shadow-[0_2px_0_#2980b9]
              ${filoOpen ? 'bg-[#5dade2]' : 'bg-[#3498db] hover:bg-[#4aa3df]'}`}
          >
            <Bus className="h-4 w-4" /> {t.fleetBtn}
            {fleetWarn && !filoOpen && (
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-amber-400 shadow" />
            )}
          </button>
          <button
            onClick={() => setBankOpen((o) => !o)}
            className={`pointer-events-auto flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#27ae60] transition active:translate-y-[2px] active:shadow-[0_2px_0_#27ae60]
              ${bankOpen ? 'bg-[#58d68d]' : 'bg-[#2ecc71] hover:bg-[#40d47e]'}`}
          >
            <Landmark className="h-4 w-4" /> {t.tabBank}
          </button>
        <button
          onClick={() => setBuildOpen((o) => !o)}
          className={`pointer-events-auto relative flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#c0392b] transition active:translate-y-[2px] active:shadow-[0_2px_0_#c0392b]
            ${buildOpen ? 'bg-[#ec7063]' : 'bg-[#e74c3c] hover:bg-[#eb6152]'}`}
        >
          <Hammer className="h-4 w-4" /> {t.construction}
          {canBuySomething && !buildOpen && (
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow" />
          )}
        </button>
        </div>
      </div>


      {/* Banka modalı: İnşaat'tan bağımsız */}
      {bankOpen && (
        <div className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#22313f]/55" onClick={() => setBankOpen(false)} />
          <div className={`relative flex max-h-[82dvh] w-[700px] max-w-[94vw] flex-col overflow-hidden ${PANEL}`}>
            <div className="flex items-center justify-between border-b border-[#d5dee4] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black text-[#2c3e50]">
                <span className="h-4 w-1 rounded-full bg-emerald-500" /> <Landmark className="h-4 w-4" /> {t.tabBank}
              </span>
              <button
                onClick={() => setBankOpen(false)}
                className="cursor-pointer rounded-lg bg-[#e2e9ed] px-2 py-1 text-xs font-bold text-[#4a6076] transition hover:bg-[#cfdae1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
{(() => {
                const bank = BANKS[bankIdx]
                const limit = bankLimitOf(statsHistory, bank.limitFactor, assetValue)
                const used = Number(bankUsedKey.split(',')[bankIdx] ?? 0)
                const avail = Math.max(0, limit - used)
                const repOk = rep >= bank.minRep
                const scoreOk = creditScore >= bank.minScore
                const depositAmt = Math.max(
                  CONFIG.depositMin,
                  Math.floor((money * depositPct) / 100 / 1000) * 1000,
                )
                const canDeposit = money >= CONFIG.depositMin && depositAmt <= money
                const loanAmt = Math.floor((avail * loanPct) / 100 / 1000) * 1000
                return (
                  <div className="col-span-2 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#93a5af]">
                        {t.creditScoreLabel}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e2e9ed]">
                        <div
                          className={`h-full rounded-full ${creditScore >= 60 ? 'bg-emerald-500' : creditScore >= CONFIG.creditScoreMin ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${creditScore}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-black tabular-nums text-[#2c3e50]">{creditScore}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {BANKS.map((b, i) => (
                        <button
                          key={b.id}
                          onClick={() => setBankIdx(i)}
                          className={`flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-extrabold transition
                            ${bankIdx === i ? 'bg-[#2c3e50] text-white' : 'bg-[#e2e9ed] text-[#5b7383] hover:bg-[#cfdae1]'}`}
                        >
                          <Landmark className="h-3 w-3" /> {t.bankNames[b.id]}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-bold text-[#7f929e]">{t.bankDescs[bank.id]}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <ModalCard
                        icon={<PiggyBank className="h-7 w-7 text-emerald-600" />}
                        title={t.depositTitle}
                        badge={`₺${fmt(depositAmt)}`}
                        badgeClass="bg-emerald-400/15 text-emerald-600"
                        desc={t.depositDesc}
                      >
                        <div className="flex items-center gap-1.5">
                          <ShareSlider value={depositPct} min={10} max={100} onChange={setDepositPct} />
                          <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#6f8694]">%{depositPct}</span>
                        </div>
                        {CONFIG.depositTerms.map((term, ti) => {
                          const rate = CONFIG.depositDailyRates[ti] * bank.depositMult
                          const payout = Math.round(depositAmt * (1 + rate * term))
                          return (
                            <PriceButton
                              key={term}
                              label={t.depositTermBtn(term, (rate * 100).toFixed(1), fmt(payout))}
                              enabled={canDeposit}
                              onClick={() => openDeposit(bankIdx, depositAmt, ti)}
                            />
                          )
                        })}
                      </ModalCard>
                      <ModalCard
                        icon={<Landmark className="h-7 w-7 text-sky-600" />}
                        title={t.loanTitle}
                        badge={t.loanLimit(fmt(used), fmt(limit))}
                        badgeClass="bg-sky-400/15 text-sky-600"
                        desc={t.loanDesc(CONFIG.bankLoanTermDays)}
                      >
                        {!repOk && (
                          <div className="rounded-lg bg-red-400/10 px-1.5 py-1 text-center text-[10px] font-bold text-red-600">
                            {t.loanNeedRep(bank.minRep)}
                          </div>
                        )}
                        {!scoreOk && (
                          <div className="rounded-lg bg-red-400/10 px-1.5 py-1 text-center text-[10px] font-bold text-red-600">
                            {t.loanNeedScore(bank.minScore)}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <ShareSlider value={loanPct} min={10} max={100} onChange={setLoanPct} />
                          <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#6f8694]">%{loanPct}</span>
                        </div>
                        <PriceButton
                          label={`${t.loanTake} ₺${fmt(loanAmt)}`}
                          enabled={repOk && scoreOk && loanAmt > 0}
                          onClick={() => takeBankLoan(bankIdx, loanAmt)}
                        />
                      </ModalCard>
                    </div>
                    {depositsKey && (
                      <div className="flex flex-col gap-1.5">
                        {depositsKey.split(',').map((entry) => {
                          const [idStr, bankId, amountStr, daysStr, rateStr, termStr] = entry.split('|')
                          const payout = Math.round(Number(amountStr) * (1 + Number(rateStr) * Number(termStr)))
                          return (
                            <div key={idStr} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5">
                              <PiggyBank className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span className="flex-1 text-[11px] font-bold text-[#4a6076]">
                                {t.depositActive(t.bankNames[bankId] ?? bankId, Number(daysStr))}
                              </span>
                              <span className="text-[11px] font-extrabold tabular-nums text-emerald-600">
                                ₺{fmt(Number(amountStr))} → ₺{fmt(payout)}
                              </span>
                              <MiniButton
                                label={t.depositBreak}
                                enabled
                                onClick={() => breakDeposit(Number(idStr))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* İnşaat & Yatırım modalı: sekmeli, kart grid'li */}
      {buildOpen && (
        <div className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#22313f]/55" onClick={() => setBuildOpen(false)} />
          <div className={`relative flex max-h-[82dvh] w-[700px] max-w-[94vw] flex-col overflow-hidden ${PANEL}`}>
            <div className="flex items-center justify-between border-b border-[#d5dee4] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black text-[#2c3e50]">
                <span className="h-4 w-1 rounded-full bg-red-500" /> <Hammer className="h-4 w-4" /> {t.buildModalTitle}
              </span>
              <span className="flex items-center gap-2">
                <ResetButton onReset={reset} />
                <button
                  onClick={() => setBuildOpen(false)}
                  className="cursor-pointer rounded-lg bg-[#e2e9ed] px-2 py-1 text-xs font-bold text-[#4a6076] transition hover:bg-[#cfdae1]"
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
                  ['kiralama', <><KeyRound className="h-3.5 w-3.5" /> {t.tabRental}</>],
                  ['devren', <><Handshake className="h-3.5 w-3.5" /> {t.devren}</>],
                  ['stats', <><BarChart3 className="h-3.5 w-3.5" /> {t.tabStats}</>],
                  ['prestij', <><Star className="h-3.5 w-3.5" /> {t.tabPrestige}</>],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBuildTab(key)}
                  className={`flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-extrabold transition
                    ${buildTab === key ? 'bg-[#2c3e50] text-white' : 'bg-[#e2e9ed] text-[#5b7383] hover:bg-[#cfdae1]'}`}
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
                    icon={<CarTaxiFront className="h-7 w-7 text-fuchsia-600" />}
                    title={t.buyVito}
                    badge="+1 VIP"
                    badgeClass="bg-fuchsia-400/15 text-fuchsia-600"
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
              {buildTab === 'arac' && (() => {
                const sprPrice = CONFIG.sprinterCost + CONFIG.sprinterCostStep * sprinterCount
                const sprDown = Math.ceil(sprPrice * CONFIG.loanDownRate)
                return (
                  <ModalCard
                    icon={<School className="h-7 w-7 text-amber-600" />}
                    title={t.buySprinter}
                    badge={t.sprinterBadge}
                    badgeClass="bg-amber-400/15 text-amber-600"
                    desc={t.sprinterDesc}
                  >
                    <PriceButton
                      label={<><Banknote className="h-3.5 w-3.5" /> {t.payCash} ₺{fmt(sprPrice)}</>}
                      enabled={money >= sprPrice && hasFreeSprinterSpot}
                      onClick={() => buySprinter('cash')}
                    />
                    <PriceButton
                      label={<><ScrollText className="h-3.5 w-3.5" /> {t.payLoan} ₺{fmt(sprDown)}</>}
                      enabled={money >= sprDown && hasFreeSprinterSpot}
                      onClick={() => buySprinter('loan')}
                    />
                  </ModalCard>
                )
              })()}
              {buildTab === 'arac' && (
                <ModalCard
                  icon={<Bus className="h-7 w-7 text-sky-600" />}
                  title={t.buyVehicle}
                  badge="+1 araç"
                  badgeClass="bg-sky-400/15 text-sky-600"
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
              {buildTab === 'arac' &&
                (
                  [
                    {
                      kind: 'bus' as BusKind,
                      icon: <BusFront className="h-7 w-7 text-orange-600" />,
                      title: t.buyBus,
                      desc: t.busDesc,
                      price: CONFIG.busCost + CONFIG.busCostStep * busCount,
                      locked: false,
                    },
                    {
                      kind: 'artic' as BusKind,
                      icon: <Bus className="h-7 w-7 text-rose-600" />,
                      title: t.buyArtic,
                      desc: t.articDesc,
                      price: CONFIG.articCost + CONFIG.articCostStep * articCount,
                      locked: false,
                    },
                    {
                      kind: 'ebus' as BusKind,
                      icon: <Zap className="h-7 w-7 text-lime-600" />,
                      title: t.buyEbus,
                      desc: buildings.sarj ? t.ebusDesc : `${t.ebusDesc} — ${t.needSarj}`,
                      price: CONFIG.ebusCost + CONFIG.ebusCostStep * ebusCount,
                      locked: !buildings.sarj,
                    },
                  ]
                ).map((b) => (
                  <ModalCard
                    key={b.kind}
                    icon={b.icon}
                    title={b.title}
                    badge={t.seatsBadge(VEHICLE_SPECS[b.kind].seats)}
                    badgeClass="bg-orange-400/15 text-orange-600"
                    desc={b.desc}
                  >
                    <PriceButton
                      label={<><Banknote className="h-3.5 w-3.5" /> {t.payCash} ₺{fmt(b.price)}</>}
                      enabled={!b.locked && money >= b.price && hasFreeSpot}
                      onClick={() => buyBus(b.kind, 'cash')}
                    />
                    <PriceButton
                      label={<><ScrollText className="h-3.5 w-3.5" /> {t.payLoan} ₺{fmt(Math.ceil(b.price * CONFIG.loanDownRate))}</>}
                      enabled={!b.locked && money >= Math.ceil(b.price * CONFIG.loanDownRate) && hasFreeSpot}
                      onClick={() => buyBus(b.kind, 'loan')}
                    />
                  </ModalCard>
                ))}
              {buildTab === 'personel' && (
                <>
                  <ModalCard
                    icon={<UserRound className="h-7 w-7 text-emerald-600" />}
                    title={t.hireDriver}
                    badge="+1 şoför"
                    badgeClass="bg-emerald-400/15 text-emerald-600"
                    desc={t.driverDesc}
                  >
                    <PriceButton
                      label={`₺${fmt(CONFIG.driverHireCost)}`}
                      enabled={money >= CONFIG.driverHireCost && hasIdleVehicle}
                      onClick={hireDriver}
                    />
                  </ModalCard>
                  <ModalCard
                    icon={<MapIcon className="h-7 w-7 text-amber-600" />}
                    title={t.buySpot}
                    badge="+1 cep"
                    badgeClass="bg-amber-400/15 text-amber-600"
                    desc={t.spotDesc}
                  >
                    <PriceButton
                      label={spots >= CONFIG.maxSpots ? t.maxed : `₺${fmt(spotCost)}`}
                      enabled={money >= spotCost && spots < CONFIG.maxSpots}
                      onClick={buySpot}
                    />
                  </ModalCard>
                  <ModalCard
                    icon={<Users className="h-7 w-7 text-sky-600" />}
                    title={t.buyPeron}
                    badge={`${perons}/${CONFIG.peronMax}`}
                    badgeClass="bg-sky-400/15 text-sky-600"
                    desc={t.peronDesc}
                  >
                    <PriceButton
                      label={
                        perons >= CONFIG.peronMax
                          ? t.maxed
                          : `₺${fmt(CONFIG.peronCosts[perons - 1])}`
                      }
                      enabled={perons < CONFIG.peronMax && money >= (CONFIG.peronCosts[perons - 1] ?? Infinity)}
                      onClick={buyPeron}
                    />
                  </ModalCard>
                  {driverMarket.map((cand, i) => (
                    <ModalCard
                      key={`${cand.name}-${i}`}
                      icon={<UserRound className="h-7 w-7 text-orange-600" />}
                      title={cand.name}
                      badge={'★'.repeat(cand.skill)}
                      badgeClass="bg-yellow-400/15 text-yellow-600"
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
                    badgeClass="bg-emerald-400/15 text-emerald-600"
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
                        icon={<FileSignature className="h-7 w-7 text-sky-600" />}
                        title={t.contractKinds[Number(kindStr)]}
                        badge={t.contractOfferTitle}
                        badgeClass="bg-sky-400/15 text-sky-600"
                        desc={t.contractDesc}
                      >
                        <PriceButton
                          label={`${t.accept} · ${t.contractPerDay(Number(payStr))}`}
                          enabled={contractCount < contractSlotsOf(drivers, sprinterActive)}
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
                            ${done ? 'bg-emerald-400/15 text-emerald-600' : missed ? 'bg-red-400/15 text-red-600' : 'bg-[#e2e9ed] text-[#6f8694]'}`}
                        >
                          {label} {done ? '✓' : missed ? '✗' : <Hourglass className="inline h-2.5 w-2.5" />}
                        </span>
                      )
                      return (
                        <ModalCard
                          key={idStr}
                          icon={<Bus className="h-7 w-7 text-amber-600" />}
                          title={t.contractKinds[Number(kindStr)]}
                          badge={t.contractDaysLeft(Number(daysStr))}
                          badgeClass="bg-amber-400/15 text-amber-600"
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
                    <div className="col-span-2 py-6 text-center text-[11px] font-bold text-[#93a5af]">
                      {t.noContracts}
                    </div>
                  )}
                </>
              )}
              {buildTab === 'taksi' && (
                <>
                  <ModalCard
                    icon={<CarTaxiFront className="h-7 w-7 text-yellow-600" />}
                    title={t.buyTaxiPlate}
                    badge={`${taxisKey ? taxisKey.split(',').length : 0}/${CONFIG.taxiPlateMax}`}
                    badgeClass="bg-yellow-400/15 text-yellow-600"
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
                      const [idStr, taxiPlate, mode, hasCarStr, nightStr] = entry.split('|')
                      const id = Number(idStr)
                      const hasCar = hasCarStr === '1'
                      const operating = mode === 'operate'
                      const taxiNight = nightStr === '1'
                      return (
                        <ModalCard
                          key={id}
                          icon={<CarTaxiFront className="h-7 w-7 text-yellow-600" />}
                          title={taxiPlate}
                          badge={
                            operating
                              ? taxiNight
                                ? t.taxiNightBadge
                                : t.taxiOperateMode
                              : t.taxiRentMode
                          }
                          badgeClass={
                            operating
                              ? taxiNight
                                ? 'bg-indigo-400/15 text-indigo-600'
                                : 'bg-yellow-400/15 text-yellow-600'
                              : 'bg-emerald-400/15 text-emerald-600'
                          }
                          desc={
                            operating
                              ? taxiNight
                                ? t.taxiNightNote(CONFIG.taxiNightMin, CONFIG.taxiNightMax, CONFIG.taxiNightWage)
                                : t.taxiOperateNote(CONFIG.taxiOperateMin, CONFIG.taxiOperateMax)
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
                              {operating && (
                                <MiniButton
                                  label={<><Moon className="h-3 w-3" /> {t.taxiNightShift}</>}
                                  enabled
                                  active={taxiNight}
                                  onClick={() => toggleTaxiNightShift(id)}
                                />
                              )}
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
              {buildTab === 'kiralama' && (
                <>
                  <ModalCard
                    icon={<KeyRound className="h-7 w-7 text-teal-600" />}
                    title={t.rentalOfficeTitle}
                    badge={rentalOffice ? `✓ ${t.built}` : undefined}
                    badgeClass="bg-emerald-400/15 text-emerald-600"
                    desc={t.rentalOfficeDesc}
                  >
                    <PriceButton
                      label={rentalOffice ? `✓ ${t.built}` : `₺${fmt(CONFIG.kiralamaOfisCost)}`}
                      enabled={!rentalOffice && money >= CONFIG.kiralamaOfisCost}
                      onClick={buyRentalOffice}
                    />
                  </ModalCard>
                  <ModalCard
                    icon={<CarFront className="h-7 w-7 text-teal-600" />}
                    title={t.rentalCarTitle}
                    badge={t.rentalCount(rentalCars, CONFIG.rentalCarMax)}
                    badgeClass="bg-teal-400/15 text-teal-600"
                    desc={rentalOffice ? t.rentalCarDesc : `${t.rentalCarDesc} — ${t.rentalNeedOffice}`}
                  >
                    <PriceButton
                      label={
                        rentalCars >= CONFIG.rentalCarMax
                          ? t.maxed
                          : `₺${fmt(CONFIG.rentalCarCost + CONFIG.rentalCarStep * rentalCars)}`
                      }
                      enabled={
                        rentalOffice &&
                        rentalCars < CONFIG.rentalCarMax &&
                        money >= CONFIG.rentalCarCost + CONFIG.rentalCarStep * rentalCars
                      }
                      onClick={buyRentalCar}
                    />
                  </ModalCard>
                  {rentalsKey &&
                    rentalsKey.split(',').map((entry) => {
                      const [idStr, rPlate, fuelStr, wearStr, daysStr, corpStr, dailyStr] = entry.split('|')
                      const id = Number(idStr)
                      const rFuel = Number(fuelStr)
                      const rWear = Number(wearStr)
                      const days = Number(daysStr)
                      const corp = corpStr === '1'
                      const out = rFuel < CONFIG.rentalMinFuel || rWear >= 100
                      const refuelPrice = Math.ceil(
                        (CONFIG.rentalTank - rFuel) *
                          fuelPrice *
                          (buildings.yakitTanki ? CONFIG.yakitTankiDiscount : 1),
                      )
                      const repairPrice = Math.ceil(
                        rWear *
                          CONFIG.rentalRepairPerUnit *
                          (buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1),
                      )
                      return (
                        <ModalCard
                          key={id}
                          icon={<CarFront className="h-7 w-7 text-teal-600" />}
                          title={rPlate}
                          badge={
                            days > 0
                              ? corp
                                ? t.rentalStatusCorp(days)
                                : t.rentalStatusRented(days)
                              : out
                                ? t.rentalStatusOut
                                : t.rentalStatusIdle
                          }
                          badgeClass={
                            days > 0
                              ? corp
                                ? 'bg-violet-400/15 text-violet-600'
                                : 'bg-teal-400/15 text-teal-600'
                              : out
                                ? 'bg-red-400/15 text-red-600'
                                : 'bg-[#e2e9ed] text-[#5b7383]'
                          }
                          desc={
                            days > 0
                              ? `${t.rentalCondition(Math.round((rFuel / CONFIG.rentalTank) * 100), rWear)} · ₺${fmt(Number(dailyStr))}/${t.perDayShort}`
                              : t.rentalCondition(Math.round((rFuel / CONFIG.rentalTank) * 100), rWear)
                          }
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex gap-1.5">
                              <PriceButton
                                label={<><Fuel className="h-3.5 w-3.5" /> {t.refuel} ₺{fmt(refuelPrice)}</>}
                                enabled={refuelPrice > 0 && money >= refuelPrice}
                                onClick={() => refuelRental(id)}
                              />
                              <PriceButton
                                label={<><Wrench className="h-3.5 w-3.5" /> {t.repair} ₺{fmt(repairPrice)}</>}
                                enabled={repairPrice > 0 && money >= repairPrice}
                                onClick={() => repairRental(id)}
                              />
                            </div>
                            <MiniButton
                              label={`${t.sellRental} ₺${fmt(Math.round(CONFIG.rentalCarCost * Math.max(0.4, 1 - rWear / 180)))}`}
                              enabled={days === 0}
                              onClick={() => sellRental(id)}
                            />
                          </div>
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
                      <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-[#93a5af]">
                        {t.statsToday}
                      </div>
                      {totalIn === 0 ? (
                        <div className="py-3 text-center text-[11px] font-bold text-[#93a5af]">{t.statsEmpty}</div>
                      ) : (
                        <>
                          <div className="flex h-3 overflow-hidden rounded-full bg-[#e2e9ed]">
                            {entries.map(([src, val], i) => (
                              <div key={src} className={colors[i % colors.length]} style={{ width: `${(val / totalIn) * 100}%` }} />
                            ))}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                            {entries.map(([src, val], i) => (
                              <div key={src} className="flex items-center justify-between text-[11px] font-bold">
                                <span className="flex items-center gap-1.5 text-[#5b7383]">
                                  <span className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
                                  {t.statsSources[src] ?? src}
                                </span>
                                <span className="tabular-nums text-[#2c3e50]">₺{fmt(Math.round(val))}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-[#5b7383]">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                {t.statsExpense}
                              </span>
                              <span className="tabular-nums text-red-600">-₺{fmt(Math.round(today.expense))}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black">
                              <span className="text-[#5b7383]">{t.statsProfit}</span>
                              <span className="tabular-nums text-emerald-600">
                                ₺{fmt(Math.round(totalIn - today.expense))}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-[#93a5af]">
                        {t.statsWeek}
                      </div>
                      {week.length === 0 ? (
                        <div className="py-3 text-center text-[11px] font-bold text-[#93a5af]">{t.statsEmpty}</div>
                      ) : (
                        <div className="flex h-24 items-end gap-2">
                          {week.map((d) => {
                            const profit = Object.values(d.income).reduce((a, b) => a + b, 0) - d.expense
                            const h = Math.max(6, (Math.abs(profit) / maxAbs) * 80)
                            return (
                              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                                <span className="text-[9px] font-bold tabular-nums text-[#6f8694]">
                                  {profit >= 0 ? '+' : '-'}₺{fmt(Math.round(Math.abs(profit) / 1000))}k
                                </span>
                                <div
                                  className={`w-full rounded-t ${profit >= 0 ? 'bg-[#2ecc71]' : 'bg-[#e74c3c]'}`}
                                  style={{ height: `${h}px` }}
                                />
                                <span className="text-[9px] font-bold text-[#93a5af]">G{d.day}</span>
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
                    icon={<Star className="h-7 w-7 text-yellow-600" />}
                    title={t.prestigeTitle}
                    badge={t.prestigeLevel(prestige)}
                    badgeClass="bg-yellow-400/15 text-yellow-600"
                    desc={t.prestigeDesc}
                  >
                    <div className="text-center text-[11px] font-bold text-[#5b7383]">
                      {t.prestigeGain(prestigeGain)}
                    </div>
                    <div className="text-center text-[10px] font-bold text-[#93a5af]">
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
                          icon={<Bus className="h-7 w-7 text-emerald-600" />}
                          title={rivalPlate}
                          badge={
                            playerShare > 0
                              ? t.partnered(playerShare)
                              : `${t.oldBus} · ${t.rivalWear(wear)}`
                          }
                          badgeClass={
                            playerShare > 0
                              ? 'bg-indigo-400/15 text-indigo-600'
                              : 'bg-amber-400/15 text-amber-600'
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
            className={`toast-in px-3 py-1.5 text-xs font-bold tabular-nums text-emerald-600 ${PANEL}`}
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
          <div className={`pointer-events-auto absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 p-3 ${PANEL} !border-[#9b59b6]`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600/80">
                <Megaphone className="mr-1 inline h-3 w-3" /> {t.charterTitle}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-[#6f8694]">{left} sn</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold text-[#2c3e50]">
              {(() => {
                const KindIcon = CHARTER_ICONS[Number(kindStr)] ?? PartyPopper
                return <KindIcon className="h-4 w-4 text-purple-600" />
              })()}
              {kind} · {t.charterKm(Number(kmStr))}
            </div>
            <div className="mt-0.5 text-[12px] font-extrabold tabular-nums text-emerald-600">
              +₺{fmt(Number(payoutStr))}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#e2e9ed]">
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

      {/* Filo modalı: tüm araçlar tek yerde — hat araçları, taksiler, kiralıklar.
          Hat aracına tıklayınca modal kapanır, detay paneli açılır */}
      {filoOpen && (
        <div className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[#22313f]/55"
            onClick={() => {
              setFiloOpen(false)
              selectVehicle(null)
            }}
          />
          <div className={`relative flex max-h-[82dvh] w-[780px] max-w-[94vw] flex-col overflow-hidden ${PANEL}`}>
            <div className="flex items-center justify-between border-b border-[#d5dee4] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black text-[#2c3e50]">
                <span className="h-4 w-1 rounded-full bg-sky-500" /> <Bus className="h-4 w-4" /> {t.fleetTitle}
              </span>
              <button
                onClick={() => {
                  setFiloOpen(false)
                  selectVehicle(null)
                }}
                className="cursor-pointer rounded-lg bg-[#e2e9ed] px-2 py-1 text-xs font-bold text-[#4a6076] transition hover:bg-[#cfdae1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Sekmeler */}
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {(
                [
                  ['hat', <><Bus className="h-3.5 w-3.5" /> {t.fleetSectionHat}</>],
                  ['taksi', <><CarTaxiFront className="h-3.5 w-3.5" /> {t.tabTaxi}</>],
                  ['kiralama', <><KeyRound className="h-3.5 w-3.5" /> {t.tabRental}</>],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFiloTab(key)}
                  className={`flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-extrabold transition
                    ${filoTab === key ? 'bg-[#2c3e50] text-white' : 'bg-[#e2e9ed] text-[#5b7383] hover:bg-[#cfdae1]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 overflow-hidden p-4">
              {filoTab === 'hat' && (
                <>
                  {/* Araç listesi: tıklayınca detay sağda aynı panelde açılır */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto">
                    {!fleetKey && <div className="text-xs text-[#93a5af]">{t.fleetEmpty}</div>}
                    {fleetKey &&
                      fleetKey.split(',').map((entry) => {
                        const [idStr, vPlate, vState, , vFuelStr, vWearStr, , , , , , , , , vKindStr, vDriver] = entry.split('|')
                        const id = Number(idStr)
                        const vSpec = VEHICLE_SPECS[vKindStr] ?? VEHICLE_SPECS.dolmus
                        const selected = selectedVehicle === id
                        return (
                          <button
                            key={id}
                            onClick={() => selectVehicle(selected ? null : id)}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition
                              ${selected ? 'bg-[#d8e1e7] ring-1 ring-inset ring-[#9fb2bd]' : 'bg-white hover:bg-[#e2e9ed]'}`}
                          >
                            <PlateBadge plate={vPlate} small />
                            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_STYLE[vState] ?? 'bg-[#aebbc3]'}`} />
                            <span className="w-14 shrink-0 text-[10px] font-bold text-[#5b7383]">{t.kindNames[vKindStr] ?? ''}</span>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#3d5568]">
                              {vDriver || t.state.noDriver}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold tabular-nums text-amber-600/90">
                              <Fuel className="mr-0.5 inline h-3 w-3" />%{Math.round((Number(vFuelStr) / vSpec.tank) * 100)}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold tabular-nums text-sky-600/90">
                              <Wrench className="mr-0.5 inline h-3 w-3" />%{vWearStr}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-[#6f8694]">{t.state[vState as keyof typeof t.state]}</span>
                          </button>
                        )
                      })}
                  </div>
                  {/* Seçili aracın detayı: aynı modalın içinde */}
                  {selectedEntry ? (
                    <div className="overflow-y-auto">
                      <VehicleDetailBody entry={selectedEntry} onClose={() => selectVehicle(null)} />
                    </div>
                  ) : (
                    fleetKey && (
                      <div className="flex w-64 shrink-0 items-center justify-center rounded-xl bg-white/60 p-3 text-center text-[11px] font-bold text-[#adbac2] ring-1 ring-inset ring-[#dee6ea]">
                        {t.fleetPickHint}
                      </div>
                    )
                  )}
                </>
              )}
              {filoTab === 'taksi' && (
                <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {!taxisKey && <div className="text-xs text-[#93a5af]">{t.fleetEmpty}</div>}
                  {taxisKey &&
                    taxisKey.split(',').map((entry) => {
                      const [idStr, txPlate, txMode, txHasCar, txNight] = entry.split('|')
                      const operating = txMode === 'operate'
                      return (
                        <div key={idStr} className="flex items-center gap-2.5 rounded-xl bg-white px-2.5 py-1.5">
                          <PlateBadge plate={txPlate} small />
                          <span className="w-14 shrink-0 text-[10px] font-bold text-[#5b7383]">{t.kindNames.taxi}</span>
                          <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#3d5568]">
                            {txHasCar === '1'
                              ? operating
                                ? txNight === '1'
                                  ? t.taxiNightBadge
                                  : t.taxiOperateMode
                                : t.taxiRentMode
                              : t.taxiRentMode}
                          </span>
                          <span className="shrink-0 text-[10px] font-bold text-[#6f8694]">
                            {operating && txHasCar === '1'
                              ? t.taxiOperateNote(CONFIG.taxiOperateMin, CONFIG.taxiOperateMax)
                              : t.taxiRentNote(CONFIG.taxiRentDaily)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
              {filoTab === 'kiralama' && (
                <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {!rentalsKey && <div className="text-xs text-[#93a5af]">{t.fleetEmpty}</div>}
                  {rentalsKey &&
                    rentalsKey.split(',').map((entry) => {
                      const [idStr, rPlate, rFuelStr, rWearStr, rDaysStr, rCorpStr, , rRefundStr] = entry.split('|')
                      const rDays = Number(rDaysStr)
                      const rRefund = Number(rRefundStr)
                      const rOut = Number(rFuelStr) < CONFIG.rentalMinFuel || Number(rWearStr) >= 100
                      return (
                        <div key={idStr} className="flex items-center gap-2.5 rounded-xl bg-white px-2.5 py-1.5">
                          <PlateBadge plate={rPlate} small />
                          <span className="w-14 shrink-0 text-[10px] font-bold text-[#5b7383]">{t.kindNames.rental}</span>
                          <span
                            className={`min-w-0 flex-1 truncate text-[11px] font-bold ${
                              rDays > 0 ? 'text-teal-600' : rOut ? 'text-red-600' : 'text-[#5b7383]'
                            }`}
                          >
                            {rDays > 0
                              ? rCorpStr === '1'
                                ? t.rentalStatusCorp(rDays)
                                : t.rentalStatusRented(rDays)
                              : rOut
                                ? t.rentalStatusOut
                                : t.rentalStatusIdle}
                            {rDays <= 0 && rRefund > 0 && ` · ${t.rentalRefundNote(rRefund)}`}
                          </span>
                          <span className="shrink-0 text-[10px] font-bold tabular-nums text-[#6f8694]">
                            {t.rentalCondition(Math.round((Number(rFuelStr) / CONFIG.rentalTank) * 100), Number(rWearStr))}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
