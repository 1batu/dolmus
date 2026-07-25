import { create } from 'zustand'
import { CONFIG, VEHICLE_SPECS, clockOf, queueCapOf, type VehicleSpec } from './config'
import {
  type P2,
  LAYOUT,
  departPath,
  departPathOf,
  fromChargePath,
  fromPumpPath,
  fromRepairPath,
  pathLength,
  returnPath,
  spotDepartPath,
  spotPos,
  toChargePath,
  toPeronPath,
  toPumpPath,
  toRepairPath,
} from './paths'
import { t } from '../i18n'
import { sfx } from './sound'

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
  | 'toRepair'
  | 'inRepair'
  | 'fromRepair'

// dolmus/bus/artic/ebus hat araçlarıdır (peron kullanır); vito çağrı bazlı çalışır
export type VehicleKind = 'dolmus' | 'vito' | 'bus' | 'artic' | 'ebus'
export type BusKind = 'bus' | 'artic' | 'ebus'

export function specOf(kind: VehicleKind): VehicleSpec {
  return VEHICLE_SPECS[kind] ?? VEHICLE_SPECS.dolmus
}

// Hat aracı mı: peron kuyruğundan yolcu alır, kontrat/servise çıkabilir
export function isHatVehicle(kind: VehicleKind): boolean {
  return kind !== 'vito'
}

// Pompa birim fiyatı: elektrikli şebekeden (güneş varsa depodan) şarj olur,
// dizel araçlar yakıt tankı varsa toptan fiyattan doldurur
export function fuelUnitPrice(kind: VehicleKind, fuelPrice: number, b: Buildings): number {
  if (kind === 'ebus') {
    return fuelPrice * CONFIG.elektrikPriceFactor * (b.solar ? CONFIG.solarChargeFactor : 1)
  }
  return fuelPrice * (b.yakitTanki ? CONFIG.yakitTankiDiscount : 1)
}

export type Vehicle = {
  id: number
  no: number // filo sıra numarası
  kind: VehicleKind // dolmuş: hat aracı; vito: çağrı bazlı VIP transfer
  plate: string // 34 M XXXX — arayüzde araç adı budur
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
  share: number // oyuncunun hisse payı (%); 100 = tamamı
  pendingRefuel: boolean // seferdeyken planlanan yakıt: parka dönünce pompaya gider
  pendingRepair: boolean // seferdeyken planlanan bakım: parka dönünce uygulanır
  charterPayout: number // aktif özel servisin ödemesi; 0 = serviste değil
  partners: Array<{ name: string; pct: number }> // hisse ortakları (isimli)
  charterQueued: boolean // dönüş yolunda kabul edildi: park edince servise çıkar
  charterDuration: number // kuyruktaki servisin süresi (sn)
  callIn: number // vito: sonraki çağrıya kalan süre (sn)
  contractRun: boolean // kontrat seferinde: ücretsiz tur, dönüşte sıfırlanır
  driverName: string // şoför profili (hasDriver ise anlamlı)
  driverSkill: number // 1-3 ⭐: biniş hızı + yakıt verimi
  driverMoral: number // 0-100: düşükse beceri işlemez, çay molası tazeler
  peronIdx: number // yanaştığı peron durağı (0 = ana peron)
  brokenUntilDay: number // ağır arıza: bu güne kadar tamirhanede (0 = sağlam)
}

// Servis kontratı: her gün sabah + akşam birer sefer, günlük sabit ödeme
export type Contract = {
  id: number
  kind: number
  dailyPay: number
  daysLeft: number
  morningDone: boolean
  eveningDone: boolean
  morningMissed: boolean
  eveningMissed: boolean
}
export type ContractOffer = { id: number; kind: number; dailyPay: number; expiresAt: number }

// Taksi işletmesi: plaka en büyük yatırım — kirada pasif, işletmede yüksek gelir.
// nightShift: gece şoförü tutulur, taksi 24 saat çalışır (gece geliri - yevmiye)
export type Taxi = {
  id: number
  plate: string
  mode: 'rent' | 'operate'
  hasCar: boolean
  nightShift: boolean
}

// Kiralık araç: gerçek araç — yakıt yakar, yıpranır, kiradayken trafiğe karışır.
// Sabah 06:00'da dolulukla kiraya çıkar, akşam 20:00'de kira yatar + masraf işler.
// Uzun dönem: turist 3-7 gün, kurumsal müşteri 30 gün alır (indirimli ama garanti).
export type Rental = {
  id: number
  plate: string
  fuel: number
  wear: number
  rentDaysLeft: number // 0 = boşta; >0 müşteride kalan gün
  rentDaily: number // anlaşılan günlük kira (₺)
  corporate: boolean // 30 günlük kurumsal sözleşme
  depositHeld: number // müşteriden alınan teminat (₺); 0 = yok
  wearAtRent: number // kiraya çıkarkenki yıpranma — teslimde fark müşteriden kesilir
  refundIn: number // teslimden sonra teminat iadesine kalan gün; 0 = bekleyen iade yok
}

function makeRental(): Rental {
  const seri = Array.from(
    { length: 3 },
    () => PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)],
  ).join('')
  return {
    id: nextId++,
    plate: `34 ${seri} ${100 + Math.floor(Math.random() * 900)}`,
    fuel: CONFIG.rentalTank,
    wear: 0,
    rentDaysLeft: 0,
    rentDaily: 0,
    corporate: false,
    depositHeld: 0,
    wearAtRent: 0,
    refundIn: 0,
  }
}

// Kiraya verilebilir mi: deposu ve bakımı yeterli olmalı
export function rentalServiceable(r: Rental): boolean {
  return r.fuel >= CONFIG.rentalMinFuel && r.wear < 100
}

function makeContractOffer(time: number): ContractOffer {
  return {
    id: nextId++,
    kind: Math.floor(Math.random() * 4),
    dailyPay: Math.round(rand(CONFIG.contractDailyMin, CONFIG.contractDailyMax) / 100) * 100,
    expiresAt: time + CONFIG.contractOfferLifetime,
  }
}

// Özel servis teklifi: düğün/havalimanı vb. — süresi içinde kabul edilmezse uçar.
// Mesafe fiyatı, süreyi ve masrafı belirler.
export type Charter = {
  id: number
  kind: number
  km: number
  payout: number
  duration: number
  expiresAt: number
}

function makeCharter(time: number, activeFleet: number): Charter {
  const km = Math.round(rand(CONFIG.charterKmMin, CONFIG.charterKmMax))
  const fleetBonus = 1 + CONFIG.charterFleetBonus * (activeFleet - 1)
  return {
    id: nextId++,
    kind: Math.floor(Math.random() * 5),
    km,
    payout: Math.round(
      (CONFIG.charterBaseFee + km * rand(CONFIG.charterPerKmMin, CONFIG.charterPerKmMax)) *
        fleetBonus,
    ),
    duration: CONFIG.charterDurationBase + km * CONFIG.charterDurationPerKm,
    expiresAt: time + CONFIG.charterLifetime,
  }
}

// Araç değerlemesi: taban fiyat × kasa yaşı × yıpranma × işletme itibarı
export function valuationOf(v: Vehicle, fleetSize: number, rep: number): number {
  const base =
    v.kind === 'vito'
      ? CONFIG.vitoCost
      : v.kind === 'bus'
        ? CONFIG.busCost
        : v.kind === 'artic'
          ? CONFIG.articCost
          : v.kind === 'ebus'
            ? CONFIG.ebusCost
            : CONFIG.vehicleBaseCost + CONFIG.vehicleCostStep * (fleetSize - 1)
  return Math.round(
    base * (v.old ? CONFIG.rivalBuyFactor : 1) * (1 - v.wear / 250) * (0.85 + rep * 0.06),
  )
}

// Koltuk + kahyanın aldırdığı ayakta yolcu (koltuk sayısı araç sınıfına göre)
export function capacityOf(v: Vehicle): number {
  const seats = specOf(v.kind ?? 'dolmus').seats
  if (v.kahya <= 0) return seats
  return seats + CONFIG.kahyaBaseStanding + CONFIG.kahyaStandingPerLevel * (v.kahya - 1)
}

export function kahyaWageOf(v: Vehicle): number {
  return v.kahya > 0 ? CONFIG.kahyaWage + CONFIG.kahyaWagePerLevel * (v.kahya - 1) : 0
}

// Rakip minibüs: aynı hattın başka esnafı — bizim perondan yolcu kapar
export type Rival = {
  id: number
  no: number // hat sıra numarası (görsel etiket)
  plate: string // 34 M XXXX — devren alınırsa araca taşınır
  state: 'away' | 'toPeron' | 'loading' | 'departing'
  path: P2[] | null
  dist: number
  timer: number // away: sonraki ziyaret; loading: peronda geçen süre
  boardAcc: number
  passengers: number
  wear: number // devren satın alınırsa bu yıpranmayla gelir
  playerShare: number // oyuncunun ortaklık payı (%), 0 = yok
}

function makeRival(no: number): Rival {
  return {
    id: nextId++,
    no,
    plate: genPlate(),
    state: 'away',
    path: null,
    dist: 0,
    timer: rand(CONFIG.rivalVisitMin, CONFIG.rivalVisitMax) * Math.random(),
    boardAcc: 0,
    passengers: 0,
    wear: Math.round(rand(CONFIG.rivalWearMin, CONFIG.rivalWearMax)),
    playerShare: 0,
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
export type Debt = {
  id: number
  no: number
  plate?: string
  remaining: number
  daily: number // taksit tutarı (periyot başına)
  bank?: boolean
  bankId?: string
  paidDay?: number // bu gün elle taksit ödendiyse akşam otomatiği atlar
  every?: number // taksit periyodu (gün): 1 = günlük, 7 = haftalık, 30 = aylık
  nextPayDay?: number // sıradaki otomatik kesinti günü
}

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

// Kilometre taşları: koşulu sağlanınca ödül + konfeti (bir kez)
type MilestoneDef = { id: string; reward: number; cond: (s: GameState) => boolean }
export const MILESTONES: MilestoneDef[] = [
  { id: 'kasa100k', reward: 10000, cond: (s) => s.money >= 100000 },
  { id: 'kasa1m', reward: 50000, cond: (s) => s.money >= 1000000 },
  { id: 'kasa10m', reward: 250000, cond: (s) => s.money >= 10000000 },
  { id: 'yolcu1k', reward: 15000, cond: (s) => s.totalCarried >= 1000 },
  { id: 'yolcu10k', reward: 75000, cond: (s) => s.totalCarried >= 10000 },
  { id: 'filo5', reward: 25000, cond: (s) => s.vehicles.length >= 5 },
  { id: 'filo8', reward: 60000, cond: (s) => s.vehicles.length >= 8 },
  { id: 'ilkVito', reward: 20000, cond: (s) => s.vehicles.some((v) => v.kind === 'vito') },
  {
    id: 'ilkOtobus',
    reward: 100000,
    cond: (s) => s.vehicles.some((v) => v.kind === 'bus' || v.kind === 'artic' || v.kind === 'ebus'),
  },
  { id: 'ilkElektrikli', reward: 200000, cond: (s) => s.vehicles.some((v) => v.kind === 'ebus') },
  { id: 'ilkTaksi', reward: 500000, cond: (s) => s.taxis.length >= 1 },
  { id: 'kiralama5', reward: 150000, cond: (s) => s.rentals.length >= 5 },
  { id: 'itibar5', reward: 30000, cond: (s) => s.rep >= 5 },
  { id: 'gun30', reward: 20000, cond: (s) => s.day >= 30 },
]

// Ortak havuzu: hisse her satışta farklı bir kişiye/kuruma gider
const PARTNER_NAMES = [
  // Mahalleden kişiler
  'Hacı Salih', 'Neriman Abla', 'Emekli Albay Kenan', 'Berber Fikret', 'Manav Cavit',
  'Kasap Nurettin', 'Terzi Mükerrem', 'Fırıncı İhsan', 'Muhtar Necdet', 'Eczacı Perihan',
  'Kuyumcu Agop', 'Balıkçı Tahir', 'Emekli Öğretmen Saime', 'Kahveci Dursun', 'Tesisatçı Ramazan',
  'Galerici Suat', 'Noter Kâtibi Ferda', 'Pazarcı Şükrü', 'Simitçi Bayram', 'Lokantacı Vedat',
  'Emlakçı Hayri', 'Şarküterici Kirkor', 'Tuhafiyeci Mualla', 'Nalbur Zeki', 'Dolmuşçu Emekli Nail',
  'Kaptan İskender', 'Hurdacı Cemşit', 'Antikacı Rüstem', 'Çiçekçi Gülizar', 'Tornacı Hamdi',
  // Kurumlar
  'Yıldız Turizm A.Ş.', 'Karayel Nakliyat', 'Uzunlar Gıda Ltd.', 'Altın Emlak', 'Şimşek Oto Kiralama',
  'Boğaz Petrol Ltd.', 'Derya Balıkçılık A.Ş.', 'Mercan İnşaat', 'Saray Döner Zinciri', 'Pak Temizlik Hizmetleri',
  'Duman Lastik San.', 'Nur Un Fabrikası', 'Ege Zeytincilik Koop.', 'Hızır Kurye Ltd.', 'Safir Kuyumculuk',
]
function genPartner(): string {
  return PARTNER_NAMES[Math.floor(Math.random() * PARTNER_NAMES.length)]
}

// Şoför isimleri: işe alımda rastgele atanır
// 50 isimlik şoför havuzu — hepsi "X Usta" olarak görünür
const DRIVER_NAMES = [
  'Kemal', 'Cemal', 'Hasan', 'Rıza', 'Şevket', 'Metin', 'Orhan', 'Selim', 'Yaşar', 'İrfan',
  'Dursun', 'Bahri', 'Muzaffer', 'Necati', 'Fikret', 'Hüsnü', 'Kadir', 'Ramazan', 'Şaban', 'İlyas',
  'Nurettin', 'Sabri', 'Tahsin', 'Vedat', 'Zeki', 'Adem', 'Bekir', 'Cevdet', 'Ekrem', 'Fahri',
  'Galip', 'Hamdi', 'İsmet', 'Kazım', 'Lütfü', 'Mahmut', 'Nail', 'Osman', 'Recep', 'Seyfi',
  'Turan', 'Ulvi', 'Veysel', 'Yakup', 'Zülfü', 'Arif', 'Burhan', 'Cafer', 'Davut', 'Enver',
]
function genDriver(): { name: string; skill: number } {
  return {
    name: `${DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)]} Usta`,
    skill: 1 + Math.floor(Math.random() * 3),
  }
}

// Terminal tesisleri: tek seferlik yatırım, kalıcı etki
export type BuildingKind =
  | 'bufe'
  | 'cayOcagi'
  | 'tamirhane'
  | 'otoPompa'
  | 'otoBakim'
  | 'sarj'
  | 'solar'
  | 'yakitTanki'
  | 'hat2'
export type Buildings = Record<BuildingKind, boolean>
export const BUILDING_COSTS: Record<BuildingKind, number> = {
  bufe: CONFIG.bufeCost,
  cayOcagi: CONFIG.cayOcagiCost,
  tamirhane: CONFIG.tamirhaneCost,
  otoPompa: CONFIG.otoPompaCost,
  otoBakim: CONFIG.otoBakimCost,
  sarj: CONFIG.sarjCost,
  solar: CONFIG.solarCost,
  yakitTanki: CONFIG.yakitTankiCost,
  hat2: CONFIG.hat2Cost,
}

let nextId = 1
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// İstanbul plakaları: dolmuş "34 M 1234", otobüs "34 O 1234", VIP "34 SYF 5454", taksi "34 T 1234"
const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTUVYZ'
function genPlate(kind: VehicleKind = 'dolmus'): string {
  const num = 1000 + Math.floor(Math.random() * 9000)
  if (kind === 'vito') {
    const seri = Array.from(
      { length: 3 },
      () => PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)],
    ).join('')
    return `34 ${seri} ${num}`
  }
  if (kind === 'bus' || kind === 'artic' || kind === 'ebus') return `34 O ${num}`
  return `34 M ${num}`
}
let bufeStreetTimer = 0 // yoldan geçen müşteri sayacı (kalıcı olması gerekmez)
let yakitTankiTimer = 0 // tanktan dışarıya mazot satışı sayacı
let charterTimer = 45 // ilk servis teklifine kalan süre
let contractOfferTimer = 70 // ilk kontrat teklifine kalan süre
let eventTimer = 90 // ilk rastgele olaya kalan süre
let newsTimer = 150 // ilk ekonomi haberine kalan süre
let marketRefreshPending = true // şoför pazarı ilk açılışta ve her sabah yenilenir

// Bankalar: her birinin karakteri farklı — şart, faiz, limit
export type Bank = {
  id: string
  minRep: number
  minScore: number
  markup: number // kredi vade farkı tabanı
  limitFactor: number // ciro çarpanı
  depositMult: number // mevduat faiz çarpanı
}
// Tem 2026 piyasasına göre kademeli: pahalı banka aylık ~%5 bandı, ortalama %3,7,
// en iyisi kampanyalı ~%2,8-3 bandı (45 günlük vade farkına çevrilmiş hali)
export const BANKS: Bank[] = [
  { id: 'esnaf', minRep: 2.5, minScore: 20, markup: 0.075, limitFactor: 6, depositMult: 0.85 },
  { id: 'dolmusbank', minRep: 3.5, minScore: 40, markup: 0.055, limitFactor: 10, depositMult: 1.0 },
  { id: 'bogazici', minRep: 4.2, minScore: 60, markup: 0.042, limitFactor: 14, depositMult: 1.2 },
]

// Vadeli mevduat: vade dolunca ana para + basit faiz kasaya döner
export type Deposit = {
  id: number
  bankId: string
  amount: number
  rate: number
  term: number
  daysLeft: number
}

// Banka kredi limiti: son 7 günün ortalama geliri × bankanın çarpanı
// Limit = gelir tabanı (son 7 gün ort. × banka çarpanı) + hipotek payı
// (filo değerinin hisse ağırlıklı %50'si — araçlar/hisseler teminat gösterilir)
export function bankLimitOf(history: DayStats[], factor: number, assetValue = 0): number {
  const week = history.slice(-7)
  const avg =
    week.length === 0
      ? 0
      : week.reduce((sum, d) => sum + Object.values(d.income).reduce((a, b) => a + b, 0), 0) /
        week.length
  return Math.round((avg * factor + assetValue * CONFIG.bankAssetFactor) / 1000) * 1000
}

// Hipoteğe konu filo değeri: her aracın değerlemesi × oyuncunun hissesi
export function fleetAssetValue(vehicles: Vehicle[], rep: number): number {
  return Math.round(
    vehicles.reduce(
      (sum, v) => sum + (valuationOf(v, vehicles.length, rep) * v.share) / 100,
      0,
    ),
  )
}

// Günlük istatistik biriktiricileri (kalıcı değil, gün dönümünde tarihe yazılır)
export type DayStats = { day: number; income: Record<string, number>; expense: number }
let dayIncome: Record<string, number> = {}
let dayExpense = 0
function trackIncome(src: string, amt: number) {
  if (amt > 0) dayIncome[src] = (dayIncome[src] ?? 0) + amt
}
function trackExpense(amt: number) {
  if (amt > 0) dayExpense += amt
}
export function getTodayStats(): { income: Record<string, number>; expense: number } {
  return { income: dayIncome, expense: dayExpense }
}

// Günlük seri: gerçek takvim günü bazlı
let streakToastPending: { streak: number; reward: number } | null = null
function localDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// --- Kalıcılık: localStorage'a periyodik yaz, açılışta geri yükle ---
const SAVE_KEY = 'dolmus-save'
const SAVE_VERSION = 8 // araç/ekonomi şeması değişince artır — eski kayıt sessizce atılır
const SAVE_ACCEPTS = [3, 4, 5, 6, 7, 8] // eski kayıtlar yeni alanlar varsayılanla açılır
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
  | 'contracts'
  | 'taxis'
  | 'milestonesDone'
  | 'prestige'
  | 'fuelPrice'
  | 'fare'
  | 'statsHistory'
  | 'deposits'
  | 'creditScore'
  | 'missedPayDays'
  | 'streak'
  | 'lastPlayDate'
  | 'rentalOffice'
  | 'rentals'
  | 'perons'
>

function persist(s: SavedFields) {
  try {
    const { time, day, wageDay, money, totalCarried, queue, spots, drivers, vehicles, debts, spawnTimer, rep, task, taskDay, buildings, bufeToday, rivals, rivalRespawn, contracts, taxis, milestonesDone, prestige, fuelPrice, fare, statsHistory, deposits, creditScore, missedPayDays, streak, lastPlayDate, rentalOffice, rentals, perons } = s
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: SAVE_VERSION,
        nextId,
        savedAt: Date.now(),
        milestonesDone,
        prestige,
        fuelPrice,
        fare,
        statsHistory,
        deposits,
        creditScore,
        missedPayDays,
        streak,
        lastPlayDate,
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
        contracts,
        taxis,
        rentalOffice,
        rentals,
        perons,
      }),
    )
  } catch {
    // depolama dolu/kapalıysa oyun kayıtsız devam eder
  }
}

function loadSave(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!SAVE_ACCEPTS.includes(d?.v) || !Array.isArray(d.vehicles) || d.vehicles.length === 0)
      return null
    if (![d.time, d.money, d.spots, d.drivers].every(Number.isFinite)) return null
    nextId = Number.isFinite(d.nextId) ? d.nextId : 100000

    // Offline kazanç: kapalı geçen süre × tahmini net oran (verim düşük, süre kapaklı)
    let offlineEarned = 0
    let offlineSecs = 0
    if (Number.isFinite(d.savedAt)) {
      offlineSecs = Math.min(Math.max(0, (Date.now() - d.savedAt) / 1000), CONFIG.offlineCapSec)
      if (offlineSecs > 30) {
        const activeDolmus = d.vehicles.filter(
          (v: Vehicle) => v.hasDriver && isHatVehicle(v.kind ?? 'dolmus'),
        ).length
        const activeVito = d.vehicles.filter((v: Vehicle) => v.hasDriver && v.kind === 'vito').length
        const taxiRate =
          ((d.taxis ?? []) as Taxi[]).reduce(
            (sum, tx) =>
              sum +
              (tx.mode === 'operate' && tx.hasCar
                ? (CONFIG.taxiOperateMin + CONFIG.taxiOperateMax) / 2
                : CONFIG.taxiRentDaily),
            0,
          ) / CONFIG.dayLength
        const contractRate =
          ((d.contracts ?? []) as Contract[]).reduce((sum, c) => sum + c.dailyPay, 0) /
          CONFIG.dayLength
        const rate =
          (activeDolmus * CONFIG.offlineRatePerVehicle +
            activeVito * CONFIG.offlineRatePerVehicle * 0.8 +
            taxiRate +
            contractRate) *
          CONFIG.offlineEfficiency
        offlineEarned = Math.round(rate * offlineSecs)
      } else {
        offlineSecs = 0
      }
    }

    return {
      offlineEarned,
      offlineSecs,
      time: d.time,
      day: d.day,
      wageDay: d.wageDay ?? 0,
      money: d.money + offlineEarned,
      totalCarried: d.totalCarried ?? 0,
      queue: d.queue ?? 0,
      spots: d.spots,
      drivers: d.drivers,
      vehicles: d.vehicles.map((v: Vehicle) => ({
        ...v,
        // Eski kayıtlardaki vito'lar dolmuş formatında kalmışsa plakayı yenile
        plate:
          v.kind === 'vito' && (!v.plate || v.plate.startsWith('34 M '))
            ? genPlate('vito')
            : (v.plate ?? genPlate(v.kind ?? 'dolmus')),
        kahya: v.kahya ?? 0,
        old: v.old ?? false,
        share: v.share ?? 100,
        pendingRefuel: v.pendingRefuel ?? false,
        pendingRepair: v.pendingRepair ?? false,
        charterPayout: v.charterPayout ?? 0,
        charterQueued: v.charterQueued ?? false,
        charterDuration: v.charterDuration ?? 0,
        kind: v.kind ?? 'dolmus',
        callIn: v.callIn ?? 20,
        contractRun: v.contractRun ?? false,
        driverName: v.driverName ?? (v.hasDriver ? genDriver().name : ''),
        driverSkill: v.driverSkill ?? 1 + Math.floor(Math.random() * 3),
        driverMoral: v.driverMoral ?? 100,
        peronIdx: v.peronIdx ?? 0,
        brokenUntilDay: v.brokenUntilDay ?? 0,
        partners:
          v.partners ?? (v.share != null && v.share < 100 ? [{ name: genPartner(), pct: 100 - v.share }] : []),
      })),
      debts: Array.isArray(d.debts) ? d.debts : [],
      spawnTimer: d.spawnTimer ?? 1,
      rep: Number.isFinite(d.rep) ? clampRep(d.rep) : CONFIG.repStart,
      task: d.task ?? null,
      taskDay: d.taskDay ?? 0,
      buildings: {
        bufe: d.buildings?.bufe ?? false,
        cayOcagi: d.buildings?.cayOcagi ?? false,
        tamirhane: d.buildings?.tamirhane ?? false,
        otoPompa: d.buildings?.otoPompa ?? false,
        otoBakim: d.buildings?.otoBakim ?? false,
        sarj: d.buildings?.sarj ?? false,
        solar: d.buildings?.solar ?? false,
        yakitTanki: d.buildings?.yakitTanki ?? false,
        hat2: d.buildings?.hat2 ?? false,
      },
      bufeToday: Number.isFinite(d.bufeToday) ? d.bufeToday : 0,
      rivals: Array.isArray(d.rivals)
        ? d.rivals.map((r: Rival) => ({
            ...r,
            plate: r.plate ?? genPlate(),
            playerShare: r.playerShare ?? 0,
          }))
        : [makeRival(7), makeRival(12)],
      rivalRespawn: d.rivalRespawn ?? 0,
      contracts: Array.isArray(d.contracts) ? d.contracts : [],
      taxis: Array.isArray(d.taxis)
        ? d.taxis.map((tx: Taxi) => ({ ...tx, nightShift: tx.nightShift ?? false }))
        : [],
      milestonesDone: Array.isArray(d.milestonesDone) ? d.milestonesDone : [],
      prestige: Number.isFinite(d.prestige) ? d.prestige : 0,
      fuelPrice: Number.isFinite(d.fuelPrice) ? d.fuelPrice : CONFIG.refuelCostPerUnit,
      fare: Number.isFinite(d.fare) ? d.fare : CONFIG.farePerPassenger,
      statsHistory: Array.isArray(d.statsHistory) ? d.statsHistory : [],
      deposits: Array.isArray(d.deposits) ? d.deposits : [],
      creditScore: Number.isFinite(d.creditScore) ? d.creditScore : CONFIG.creditScoreStart,
      missedPayDays: Number.isFinite(d.missedPayDays) ? d.missedPayDays : 0,
      rentalOffice: d.rentalOffice ?? false,
      perons: Number.isFinite(d.perons) ? d.perons : 1,
      // Eski kayıt: sayı olarak tutulan filo, plakalı gerçek araçlara çevrilir
      rentals: Array.isArray(d.rentals)
        ? d.rentals.map((r: Partial<Rental>) => ({
            ...makeRental(),
            ...r,
            rentDaysLeft: r.rentDaysLeft ?? 0,
            rentDaily: r.rentDaily ?? 0,
            corporate: r.corporate ?? false,
          }))
        : Array.from({ length: Number.isFinite(d.rentalCars) ? d.rentalCars : 0 }, makeRental),
      ...(() => {
        // Günlük seri: dün oynandıysa seri büyür (ödül ilk tick'te toast'lanır)
        const today = localDateStr()
        const yesterday = localDateStr(-1)
        const last = typeof d.lastPlayDate === 'string' ? d.lastPlayDate : ''
        let streak = Number.isFinite(d.streak) ? d.streak : 1
        if (last === today) {
          // aynı gün — seri değişmez
        } else if (last === yesterday) {
          streak += 1
          const reward = Math.min(streak, 7) * 4000
          streakToastPending = { streak, reward }
        } else {
          streak = 1
        }
        return { streak, lastPlayDate: today }
      })(),
    }
  } catch {
    return null
  }
}

function makeVehicle(
  no: number,
  spotIdx: number,
  hasDriver: boolean,
  plate?: string,
  kind: VehicleKind = 'dolmus',
): Vehicle {
  return {
    id: nextId++,
    no,
    kind,
    plate: plate ?? genPlate(kind),
    spotIdx,
    hasDriver,
    state: 'parked',
    path: null,
    dist: 0,
    passengers: 0,
    wait: 0,
    boardAcc: 0,
    tripLeft: 0,
    fuel: specOf(kind).tank,
    wear: 0,
    nightShift: false,
    kahya: 0,
    old: false,
    share: 100,
    pendingRefuel: false,
    pendingRepair: false,
    charterPayout: 0,
    partners: [],
    charterQueued: false,
    charterDuration: 0,
    callIn: 20,
    contractRun: false,
    ...(hasDriver ? (({ name, skill }) => ({ driverName: name, driverSkill: skill }))(genDriver()) : { driverName: '', driverSkill: 1 }),
    driverMoral: 100,
    peronIdx: 0,
    brokenUntilDay: 0,
  }
}

// Sefere çıkabilir mi: yakıt yetmeli, bakım sınırına dayanmamış olmalı
export function canServe(v: Vehicle): boolean {
  return v.fuel >= specOf(v.kind ?? 'dolmus').fuelPerTrip && v.wear < 100
}

// pricePerL çağıran tarafta fuelUnitPrice ile hesaplanır (tank indirimi / elektrik)
export function refuelCost(v: Vehicle, pricePerL = CONFIG.refuelCostPerUnit): number {
  return Math.ceil((specOf(v.kind ?? 'dolmus').tank - v.fuel) * pricePerL)
}

export function repairCost(v: Vehicle): number {
  return Math.ceil(v.wear * CONFIG.repairCostPerUnit * specOf(v.kind ?? 'dolmus').repairMult)
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
  charter: Charter | null // bekleyen özel servis teklifi
  acceptCharter: () => void
  contracts: Contract[]
  contractOffer: ContractOffer | null
  acceptContract: () => void
  taxis: Taxi[]
  driverMarket: Array<{ name: string; skill: number; price: number }>
  cayMolasi: (vehicleId: number) => void
  hireFromMarket: (idx: number) => void
  selectedVehicle: number | null // sahnede/dock'ta seçilen araç (kalıcı değil)
  selectVehicle: (vehicleId: number | null) => void
  milestonesDone: string[]
  fuelPrice: number // güncel motorin ₺/L (haberlerle değişir)
  fare: number // güncel indi-bindi tarifesi ₺
  statsHistory: DayStats[] // son 14 günün gelir/gider dökümü
  deposits: Deposit[]
  creditScore: number // 0-100: ödeme geçmişi
  missedPayDays: number // üst üste aksayan ödeme günü — 3 olursa haciz
  openDeposit: (bankIdx: number, amount: number, termIdx: number) => void
  breakDeposit: (depositId: number) => void
  takeBankLoan: (bankIdx: number, amount: number) => void
  streak: number // art arda oynanan gerçek gün sayısı
  lastPlayDate: string
  rainUntil: number // yağmur bitiş zamanı (oyun sn)
  korsanUntil: number // korsan dolmuş bitiş zamanı
  prestige: number // devir sayısı: kalıcı bonuslar
  offlineEarned: number // açılışta gösterilen "sen yokken" kazancı (kalıcı değil)
  offlineSecs: number
  celebrateAt: number // konfeti tetikleyici (görev/milestone)
  dismissOffline: () => void
  prestigeReset: () => void
  buyTaxiPlate: () => void
  buyTaxiCar: (taxiId: number) => void
  setTaxiMode: (taxiId: number, mode: 'rent' | 'operate') => void
  toggleTaxiNightShift: (taxiId: number) => void
  buyBuilding: (kind: BuildingKind) => void
  buyRival: (rivalId: number) => void
  buyRivalShare: (rivalId: number, pct: number) => void
  sellRivalShare: (rivalId: number, pct: number) => void
  sellShare: (vehicleId: number, pct: number) => void
  buyBackShare: (vehicleId: number, pct: number) => void
  hireKahya: (vehicleId: number) => void
  upgradeKahya: (vehicleId: number) => void
  payInstallment: (debtId: number) => void
  restructureDebt: (debtId: number, plan: 'weekly' | 'monthly') => void
  payOffDebt: (debtId: number) => void
  vehicleCost: () => number
  spotCost: () => number
  buyVehicle: (mode: 'cash' | 'loan') => void
  buyVito: (mode: 'cash' | 'loan') => void
  buyBus: (kind: BusKind, mode: 'cash' | 'loan') => void
  rentalOffice: boolean // rent-a-car ofisi kuruldu mu
  rentals: Rental[] // kiralama filosu — plakalı gerçek araçlar
  buyRentalOffice: () => void
  buyRentalCar: () => void
  refuelRental: (rentalId: number) => void
  repairRental: (rentalId: number) => void
  sellRental: (rentalId: number) => void
  perons: number // peron durağı sayısı: aynı anda bu kadar araç yolcu alır
  buyPeron: () => void
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
    buildings: {
      bufe: false,
      cayOcagi: false,
      tamirhane: false,
      otoPompa: false,
      otoBakim: false,
      sarj: false,
      solar: false,
      yakitTanki: false,
      hat2: false,
    } as Buildings,
    bufeToday: 0,
    rivals: [makeRival(7), makeRival(12)],
    rivalRespawn: 0,
    charter: null as Charter | null,
    contracts: [] as Contract[],
    contractOffer: null as ContractOffer | null,
    taxis: [] as Taxi[],
    driverMarket: [] as Array<{ name: string; skill: number; price: number }>,
    selectedVehicle: null as number | null,
    milestonesDone: [] as string[],
    fuelPrice: CONFIG.refuelCostPerUnit,
    fare: CONFIG.farePerPassenger,
    statsHistory: [] as DayStats[],
    deposits: [] as Deposit[],
    creditScore: CONFIG.creditScoreStart,
    missedPayDays: 0,
    rentalOffice: false,
    rentals: [] as Rental[],
    perons: 1,
    streak: 1,
    lastPlayDate: localDateStr(),
    rainUntil: 0,
    korsanUntil: 0,
    prestige: 0,
    offlineEarned: 0,
    offlineSecs: 0,
    celebrateAt: 0,
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
    const veh = makeVehicle(no, spotIdx, false)
    const vehicles = [...s.vehicles, veh]

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
        {
          id: nextId++,
          no,
          plate: veh.plate,
          remaining,
          daily: Math.ceil(remaining / CONFIG.loanTermDays),
        },
      ],
    })
  },

  buyVito: (mode: 'cash' | 'loan') => {
    const s = get()
    const vitoCount = s.vehicles.filter((v) => v.kind === 'vito').length
    const price = CONFIG.vitoCost + CONFIG.vitoCostStep * vitoCount
    if (s.vehicles.length >= s.spots) return
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    const veh = makeVehicle(s.vehicles.length + 1, spotIdx, false, undefined, 'vito')
    const vehicles = [...s.vehicles, veh]

    if (mode === 'cash') {
      if (s.money < price) return
      set({ money: s.money - price, vehicles })
      return
    }
    const down = Math.ceil(price * CONFIG.loanDownRate)
    if (s.money < down) return
    const remaining = Math.round(price * (1 + CONFIG.loanMarkupRate)) - down
    set({
      money: s.money - down,
      vehicles,
      debts: [
        ...s.debts,
        {
          id: nextId++,
          no: veh.no,
          plate: veh.plate,
          remaining,
          daily: Math.ceil(remaining / CONFIG.loanTermDays),
        },
      ],
    })
  },

  // Otobüs sınıfı: hat aracıdır — perona girer, daha çok koltuk, daha büyük masraf.
  // Elektrikli otobüs şarj istasyonu olmadan alınamaz.
  buyBus: (kind: BusKind, mode: 'cash' | 'loan') => {
    const s = get()
    if (kind === 'ebus' && !s.buildings.sarj) return
    const count = s.vehicles.filter((v) => v.kind === kind).length
    const price =
      kind === 'bus'
        ? CONFIG.busCost + CONFIG.busCostStep * count
        : kind === 'artic'
          ? CONFIG.articCost + CONFIG.articCostStep * count
          : CONFIG.ebusCost + CONFIG.ebusCostStep * count
    if (s.vehicles.length >= s.spots) return
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    const veh = makeVehicle(s.vehicles.length + 1, spotIdx, false, undefined, kind)
    const vehicles = [...s.vehicles, veh]

    if (mode === 'cash') {
      if (s.money < price) return
      set({ money: s.money - price, vehicles })
      return
    }
    const down = Math.ceil(price * CONFIG.loanDownRate)
    if (s.money < down) return
    const remaining = Math.round(price * (1 + CONFIG.loanMarkupRate)) - down
    set({
      money: s.money - down,
      vehicles,
      debts: [
        ...s.debts,
        {
          id: nextId++,
          no: veh.no,
          plate: veh.plate,
          remaining,
          daily: Math.ceil(remaining / CONFIG.loanTermDays),
        },
      ],
    })
  },

  // Rent-a-car: ofis tek seferlik, sonra filo araç araç büyür — kira akşamları yatar
  buyRentalOffice: () => {
    const s = get()
    if (s.rentalOffice || s.money < CONFIG.kiralamaOfisCost) return
    set({ money: s.money - CONFIG.kiralamaOfisCost, rentalOffice: true })
  },
  buyRentalCar: () => {
    const s = get()
    if (!s.rentalOffice || s.rentals.length >= CONFIG.rentalCarMax) return
    const price = CONFIG.rentalCarCost + CONFIG.rentalCarStep * s.rentals.length
    if (s.money < price) return
    set({ money: s.money - price, rentals: [...s.rentals, makeRental()] })
  },

  // Kiralık araç bakımı otobüslerle aynı mantık: depoyu doldur / yıpranmayı sıfırla
  refuelRental: (rentalId: number) => {
    const s = get()
    const r = s.rentals.find((x) => x.id === rentalId)
    if (!r || r.fuel >= CONFIG.rentalTank) return
    const cost = Math.ceil(
      (CONFIG.rentalTank - r.fuel) *
        s.fuelPrice *
        (s.buildings.yakitTanki ? CONFIG.yakitTankiDiscount : 1),
    )
    if (s.money < cost) return
    trackExpense(cost)
    set({
      money: s.money - cost,
      rentals: s.rentals.map((x) => (x.id === rentalId ? { ...x, fuel: CONFIG.rentalTank } : x)),
    })
  },
  // Eskiyen kiralık satılır: değer yıpranmayla düşer (kiradayken satılamaz)
  sellRental: (rentalId: number) => {
    const s = get()
    const r = s.rentals.find((x) => x.id === rentalId)
    if (!r || r.rentDaysLeft > 0) return
    const price = Math.round(CONFIG.rentalCarCost * Math.max(0.4, 1 - r.wear / 180))
    trackIncome('kiralama', price)
    set({
      money: s.money + price,
      rentals: s.rentals.filter((x) => x.id !== rentalId),
    })
  },

  repairRental: (rentalId: number) => {
    const s = get()
    const r = s.rentals.find((x) => x.id === rentalId)
    if (!r || r.wear <= 0) return
    const cost = Math.ceil(
      r.wear *
        CONFIG.rentalRepairPerUnit *
        (s.buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1),
    )
    if (s.money < cost) return
    trackExpense(cost)
    set({
      money: s.money - cost,
      rentals: s.rentals.map((x) => (x.id === rentalId ? { ...x, wear: 0 } : x)),
    })
  },

  buySpot: () => {
    const s = get()
    const cost = s.spotCost()
    if (s.money < cost || s.spots >= CONFIG.maxSpots) return
    set({ money: s.money - cost, spots: s.spots + 1 })
  },

  // Ek peron durağı: belediyeden tahsis — aynı anda bir araç daha yolcu alır
  buyPeron: () => {
    const s = get()
    if (s.perons >= CONFIG.peronMax) return
    const cost = CONFIG.peronCosts[s.perons - 1]
    if (!cost || s.money < cost) return
    set({ money: s.money - cost, perons: s.perons + 1 })
  },

  hireDriver: () => {
    const s = get()
    const idle = s.vehicles.find((v) => !v.hasDriver)
    if (s.money < CONFIG.driverHireCost || !idle) return
    const prof = genDriver()
    set({
      money: s.money - CONFIG.driverHireCost,
      drivers: s.drivers + 1,
      vehicles: s.vehicles.map((v) =>
        v.id === idle.id
          ? { ...v, hasDriver: true, driverName: prof.name, driverSkill: prof.skill }
          : v,
      ),
    })
  },

  refuel: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    // Ortaklı araçta yakıt masrafının sadece oyuncu payı ödenir
    const cost = Math.ceil(
      (refuelCost(v, fuelUnitPrice(v.kind ?? 'dolmus', s.fuelPrice, s.buildings)) * v.share) / 100,
    )
    if (cost <= 0 || !v.hasDriver) return
    // Elektrikli araç şarj ünitesine, dizel pompaya sürer — ayrı kuyruklar.
    // Araç parkta değilse ya da nokta doluysa: planla — parka dönünce gider
    const isEV = v.kind === 'ebus'
    const stationBusy = s.vehicles.some(
      (veh) =>
        (veh.state === 'toPump' || veh.state === 'fueling') && (veh.kind === 'ebus') === isEV,
    )
    if (v.state !== 'parked' || stationBusy) {
      set({
        vehicles: s.vehicles.map((veh) =>
          veh.id === vehicleId ? { ...veh, pendingRefuel: true } : veh,
        ),
      })
      return
    }
    if (s.money < cost) return
    trackExpense(cost)
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId
          ? {
              ...veh,
              state: 'toPump' as const,
              path: isEV ? toChargePath(spotPos(veh.spotIdx)) : toPumpPath(spotPos(veh.spotIdx)),
              dist: 0,
            }
          : veh,
      ),
      toasts: [
        ...s.toasts,
        { id: nextId++, text: t.refueled(v.plate, cost), expireAt: s.time + CONFIG.toastLifetime },
      ].slice(-5),
    })
  },

  repair: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    const discount = s.buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1
    const cost = Math.ceil((repairCost(v) * discount * v.share) / 100)
    if (cost <= 0) return
    // Araç yoldaysa planla: parka dönünce bakım uygulanır
    if (v.state !== 'parked') {
      set({
        vehicles: s.vehicles.map((veh) =>
          veh.id === vehicleId ? { ...veh, pendingRepair: true } : veh,
        ),
      })
      return
    }
    if (s.money < cost) return
    trackExpense(cost)
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
    // Devren: yeni araçtan ucuz ama yıpranmış eski kasa gelir.
    // Ortaklık varsa kalan hisse %10 primle alınır.
    const fullPrice = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    const price =
      r.playerShare > 0
        ? Math.ceil((fullPrice * (100 - r.playerShare)) / 100 * CONFIG.shareBuyBackPremium)
        : fullPrice
    if (s.money < price) return
    const usedSpots = new Set(s.vehicles.map((v) => v.spotIdx))
    let spotIdx = 0
    while (usedSpots.has(spotIdx)) spotIdx++
    // Devren alınan araç rakibin plakasını taşır
    const vehicle = {
      ...makeVehicle(s.vehicles.length + 1, spotIdx, false, r.plate),
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

  buyRivalShare: (rivalId: number, pct: number) => {
    const s = get()
    const r = s.rivals.find((rv) => rv.id === rivalId)
    if (!r) return
    // Payını dilim dilim artırabilirsin, azami %90
    const add = Math.min(Math.round(Math.max(5, pct)), 90 - r.playerShare)
    if (add <= 0) return
    const fullPrice = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    const cost = Math.ceil((fullPrice * add) / 100)
    if (s.money < cost) return
    set({
      money: s.money - cost,
      rivals: s.rivals.map((rv) =>
        rv.id === rivalId ? { ...rv, playerShare: rv.playerShare + add } : rv,
      ),
    })
  },

  sellRivalShare: (rivalId: number, pct: number) => {
    const s = get()
    const r = s.rivals.find((rv) => rv.id === rivalId)
    if (!r || r.playerShare <= 0) return
    // Ortaklık payı %10 kesintiyle satılır
    const sell = Math.min(Math.round(Math.max(5, pct)), r.playerShare)
    const fullPrice = Math.ceil(s.vehicleCost() * CONFIG.rivalBuyFactor)
    const refund = Math.floor(((fullPrice * sell) / 100) * CONFIG.shareSellRefund)
    set({
      money: s.money + refund,
      rivals: s.rivals.map((rv) =>
        rv.id === rivalId ? { ...rv, playerShare: rv.playerShare - sell } : rv,
      ),
    })
  },

  sellShare: (vehicleId: number, pct: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return
    // Dilim dilim ya da tamamı satılabilir
    const sold = Math.min(Math.round(Math.max(5, pct)), v.share - CONFIG.minOwnShare)
    if (sold <= 0) return
    const price = Math.round((valuationOf(v, s.vehicles.length, s.rep) * sold) / 100)

    // Hisse 0'a indi: araç devredildi, filodan çıkar; şoför boştaki araca geçer
    if (v.share - sold <= 0) {
      let vehicles = s.vehicles.filter((veh) => veh.id !== vehicleId)
      let drivers = s.drivers
      if (v.hasDriver) {
        const idleIdx = vehicles.findIndex((veh) => !veh.hasDriver)
        if (idleIdx >= 0) {
          vehicles = vehicles.map((veh, i) => (i === idleIdx ? { ...veh, hasDriver: true } : veh))
        } else {
          drivers -= 1
        }
      }
      set({
        money: s.money + price,
        vehicles,
        drivers,
        selectedVehicle: s.selectedVehicle === vehicleId ? null : s.selectedVehicle,
      })
      return
    }

    set({
      money: s.money + price,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId
          ? {
              ...veh,
              share: veh.share - sold,
              partners: [...veh.partners, { name: genPartner(), pct: sold }],
            }
          : veh,
      ),
    })
  },

  buyBackShare: (vehicleId: number, pct: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v || v.share >= 100) return
    // Geri alım primli ve dilim dilim: ortak karlı çıkmadan hisseyi bırakmaz
    const buy = Math.min(Math.round(Math.max(5, pct)), 100 - v.share)
    if (buy <= 0) return
    const cost = Math.ceil(
      ((valuationOf(v, s.vehicles.length, s.rep) * buy) / 100) * CONFIG.shareBuyBackPremium,
    )
    if (s.money < cost) return
    set({
      money: s.money - cost,
      vehicles: s.vehicles.map((veh) => {
        if (veh.id !== vehicleId) return veh
        // Geri alım son ortaktan başlar (LIFO)
        let left = buy
        const partners = [...veh.partners]
        while (left > 0 && partners.length > 0) {
          const last = partners[partners.length - 1]
          if (last.pct <= left) {
            left -= last.pct
            partners.pop()
          } else {
            partners[partners.length - 1] = { ...last, pct: last.pct - left }
            left = 0
          }
        }
        return { ...veh, share: veh.share + buy, partners }
      }),
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
    const today = clockOf(s.time).day
    set({
      money: s.money - pay,
      debts: s.debts
        .map((debt) =>
          debt.id === debtId
            ? {
                ...debt,
                remaining: debt.remaining - pay,
                paidDay: today,
                nextPayDay: today + (debt.every ?? 1),
              }
            : debt,
        )
        .filter((debt) => debt.remaining > 0),
    })
  },

  // Senet yapılandırma: günlük taksiti kaldıramayan haftalık (13 taksit, +%8)
  // veya aylık (6 taksit, +%15) plana çevirir — bir kez yapılır
  restructureDebt: (debtId: number, plan: 'weekly' | 'monthly') => {
    const s = get()
    const d = s.debts.find((debt) => debt.id === debtId)
    if (!d || (d.every ?? 1) !== 1) return
    const markup = plan === 'weekly' ? 1.08 : 1.15
    const installments = plan === 'weekly' ? 13 : 6
    const every = plan === 'weekly' ? 7 : 30
    const remaining = Math.round(d.remaining * markup)
    const today = clockOf(s.time).day
    set({
      debts: s.debts.map((debt) =>
        debt.id === debtId
          ? {
              ...debt,
              remaining,
              daily: Math.ceil(remaining / installments),
              every,
              nextPayDay: today + every,
            }
          : debt,
      ),
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

  acceptCharter: () => {
    const s = get()
    const c = s.charter
    if (!c) return
    // Uygun araç: şoförlü, yakıtı yeter, bakımı gelmemiş — parktaki hemen çıkar,
    // dönüş yolundaki park edince servise yönlenir
    const fuelNeed = Math.ceil(c.km * CONFIG.charterFuelPerKm)
    const eligible = (veh: Vehicle) =>
      isHatVehicle(veh.kind) &&
      veh.brokenUntilDay === 0 &&
      veh.hasDriver &&
      veh.fuel >= fuelNeed &&
      veh.wear < 100 &&
      veh.charterPayout === 0
    const v =
      s.vehicles.find((veh) => veh.state === 'parked' && eligible(veh)) ??
      s.vehicles.find(
        (veh) => (veh.state === 'returning' || veh.state === 'fromPump') && eligible(veh),
      )
    if (!v) return
    const wearAdd =
      (CONFIG.charterWearBase + c.km * CONFIG.charterWearPerKm) *
      (v.old ? CONFIG.oldBusWearFactor : 1)
    const immediate = v.state === 'parked'
    set({
      charter: null,
      vehicles: s.vehicles.map((veh) =>
        veh.id === v.id
          ? {
              ...veh,
              ...(immediate
                ? {
                    state: 'departing' as const,
                    path: spotDepartPath(spotPos(veh.spotIdx)),
                    dist: 0,
                    tripLeft: c.duration,
                  }
                : { charterQueued: true, charterDuration: c.duration }),
              fuel: Math.max(0, veh.fuel - fuelNeed),
              wear: Math.min(100, veh.wear + wearAdd),
              charterPayout: c.payout,
            }
          : veh,
      ),
      toasts: [
        ...s.toasts,
        {
          id: nextId++,
          text: t.charterAccepted(v.plate, c.km),
          expireAt: s.time + CONFIG.toastLifetime,
        },
      ].slice(-5),
    })
  },

  acceptContract: () => {
    const s = get()
    const o = s.contractOffer
    if (!o || s.contracts.length >= CONFIG.contractSlots) return
    set({
      contractOffer: null,
      contracts: [
        ...s.contracts,
        {
          id: nextId++,
          kind: o.kind,
          dailyPay: o.dailyPay,
          daysLeft: CONFIG.contractDays,
          morningDone: false,
          eveningDone: false,
          morningMissed: false,
          eveningMissed: false,
        },
      ],
    })
  },

  selectVehicle: (vehicleId: number | null) => {
    set({ selectedVehicle: vehicleId })
  },

  cayMolasi: (vehicleId: number) => {
    const s = get()
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v || !v.hasDriver || v.driverMoral >= 100 || s.money < CONFIG.cayMolasiCost) return
    set({
      money: s.money - CONFIG.cayMolasiCost,
      vehicles: s.vehicles.map((veh) =>
        veh.id === vehicleId
          ? { ...veh, driverMoral: Math.min(100, veh.driverMoral + CONFIG.cayMolasiBoost) }
          : veh,
      ),
    })
  },

  hireFromMarket: (idx: number) => {
    const s = get()
    const cand = s.driverMarket[idx]
    const idle = s.vehicles.find((v) => !v.hasDriver)
    if (!cand || !idle || s.money < cand.price) return
    set({
      money: s.money - cand.price,
      drivers: s.drivers + 1,
      driverMarket: s.driverMarket.filter((_, i) => i !== idx),
      vehicles: s.vehicles.map((v) =>
        v.id === idle.id
          ? { ...v, hasDriver: true, driverName: cand.name, driverSkill: cand.skill, driverMoral: 100 }
          : v,
      ),
    })
  },

  dismissOffline: () => set({ offlineEarned: 0, offlineSecs: 0 }),

  openDeposit: (bankIdx: number, amount: number, termIdx: number) => {
    const s = get()
    const bank = BANKS[bankIdx]
    const term = CONFIG.depositTerms[termIdx]
    const rate = (CONFIG.depositDailyRates[termIdx] ?? 0) * (bank?.depositMult ?? 1)
    const amt = Math.floor(amount)
    if (!bank || !term || amt < CONFIG.depositMin || amt > s.money) return
    set({
      money: s.money - amt,
      deposits: [
        ...s.deposits,
        { id: nextId++, bankId: bank.id, amount: amt, rate, term, daysLeft: term },
      ],
    })
  },

  breakDeposit: (depositId: number) => {
    const s = get()
    const dep = s.deposits.find((d) => d.id === depositId)
    if (!dep) return
    // Erken bozum: faiz yanar, ana para döner
    set({
      money: s.money + dep.amount,
      deposits: s.deposits.filter((d) => d.id !== depositId),
    })
  },

  takeBankLoan: (bankIdx: number, amount: number) => {
    const s = get()
    const bank = BANKS[bankIdx]
    if (!bank || s.rep < bank.minRep || s.creditScore < bank.minScore) return
    const limit = bankLimitOf(s.statsHistory, bank.limitFactor, fleetAssetValue(s.vehicles, s.rep))
    const used = s.debts.reduce(
      (sum, d) => sum + (d.bank && d.bankId === bank.id ? d.remaining : 0),
      0,
    )
    const amt = Math.floor(amount)
    if (amt <= 0 || amt > limit - used) return
    // Kredi skoru vade farkını belirler: skor düştükçe faiz artar.
    // Banka taksitleri HAFTALIK işler (gerçekte kimse günlük kredi ödemez)
    const markup = bank.markup + ((100 - s.creditScore) / 100) * CONFIG.bankLoanScorePenalty
    const remaining = Math.round(amt * (1 + markup))
    const weeks = Math.ceil(CONFIG.bankLoanTermDays / 7)
    const today = clockOf(s.time).day
    set({
      money: s.money + amt,
      debts: [
        ...s.debts,
        {
          id: nextId++,
          no: 0,
          bank: true,
          bankId: bank.id,
          remaining,
          daily: Math.ceil(remaining / weeks),
          every: 7,
          nextPayDay: today + 7,
        },
      ],
    })
  },

  prestigeReset: () => {
    const s = get()
    // Devir puanı: taşınan yolcu + varlıklar; kalıcı bonusla sıfırdan başla
    const gain = Math.max(
      1,
      Math.floor(Math.sqrt(s.totalCarried / 200)) + s.taxis.length * 3 + Math.floor(s.vehicles.length / 3),
    )
    const prestige = s.prestige + gain
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      /* yoksay */
    }
    nextId = 1
    const fresh = initialState()
    set({
      ...fresh,
      prestige,
      milestonesDone: s.milestonesDone,
      money: Math.round(CONFIG.startMoney * (1 + CONFIG.prestigeMoneyBonus * prestige)),
      rep: clampRep(CONFIG.repStart + CONFIG.prestigeRepBonus * prestige),
    })
  },

  buyTaxiPlate: () => {
    const s = get()
    if (s.taxis.length >= CONFIG.taxiPlateMax || s.money < CONFIG.taxiPlateCost) return
    set({
      money: s.money - CONFIG.taxiPlateCost,
      taxis: [
        ...s.taxis,
        { id: nextId++, plate: `34 T ${1000 + Math.floor(Math.random() * 9000)}`, mode: 'rent', hasCar: false, nightShift: false },
      ],
    })
  },

  buyTaxiCar: (taxiId: number) => {
    const s = get()
    const taxi = s.taxis.find((tx) => tx.id === taxiId)
    if (!taxi || taxi.hasCar || s.money < CONFIG.taxiCarCost) return
    set({
      money: s.money - CONFIG.taxiCarCost,
      taxis: s.taxis.map((tx) =>
        tx.id === taxiId ? { ...tx, hasCar: true, mode: 'operate' as const } : tx,
      ),
    })
  },

  setTaxiMode: (taxiId: number, mode: 'rent' | 'operate') => {
    const s = get()
    const taxi = s.taxis.find((tx) => tx.id === taxiId)
    if (!taxi || (mode === 'operate' && !taxi.hasCar)) return
    set({ taxis: s.taxis.map((tx) => (tx.id === taxiId ? { ...tx, mode } : tx)) })
  },

  // Gece vardiyası: ikinci şoför — taksi 24 saat döner (yalnız işletilen takside)
  toggleTaxiNightShift: (taxiId: number) => {
    const s = get()
    const taxi = s.taxis.find((tx) => tx.id === taxiId)
    if (!taxi || !taxi.hasCar || taxi.mode !== 'operate') return
    set({
      taxis: s.taxis.map((tx) =>
        tx.id === taxiId ? { ...tx, nightShift: !tx.nightShift } : tx,
      ),
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
    // Gece simülasyon hızlanır: saat, araçlar, yolcular — her şey aynı çarpanla
    if (clockOf(s.time).hour < CONFIG.nightEndHour) dt *= CONFIG.nightTimeScale
    const time = s.time + dt
    let { money, totalCarried, queue, spawnTimer, wageDay, rep, task, taskDay, bufeToday, rivalRespawn, charter, contractOffer, rainUntil, korsanUntil, celebrateAt, fuelPrice, fare } = s
    let contracts = s.contracts
    let statsHistory = s.statsHistory
    let deposits = s.deposits
    let rentals = s.rentals
    let creditScore = s.creditScore
    let missedPayDays = s.missedPayDays
    let hacizPending = false
    let moralDecayNow = 0
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

    // Günlük seri ödülü: açılıştan sonraki ilk tick'te bir kez
    if (streakToastPending) {
      money += streakToastPending.reward
      trackIncome('odul', streakToastPending.reward)
      pushToast(t.streakToast(streakToastPending.streak, streakToastPending.reward))
      celebrateAt = time
      streakToastPending = null
    }

    // Görev ilerlemesi: hedef tutunca ödül + itibar bonusu + konfeti
    const advanceTask = (kind: DailyTask['kind'], amount: number) => {
      if (!task || task.done || task.kind !== kind) return
      task = { ...task, progress: task.progress + amount }
      if (task.progress >= task.target) {
        task = { ...task, progress: task.target, done: true }
        money += task.reward
        trackIncome('odul', task.reward)
        rep = clampRep(rep + CONFIG.repTaskBonus)
        pushToast(t.taskDone(task.reward))
        celebrateAt = time
        sfx('ding')
      }
    }

    // Yeni işletme günü (06:00): taze görev + kontrat sıfırlama + istatistik dökümü
    if (clock.hour >= CONFIG.nightEndHour && taskDay < day) {
      taskDay = day
      task = makeTask(s.vehicles.length)
      statsHistory = [
        ...statsHistory,
        { day: day - 1, income: dayIncome, expense: dayExpense },
      ].slice(-14)
      dayIncome = {}
      dayExpense = 0
      // Şoför pazarı yenilenir, moraller günlük düşer
      marketRefreshPending = true
      // Kiralama sabahı: boştaki uygun araçlar dolulukla kiraya çıkar.
      // %10 kurumsal (30 gün, ×0.85 ama garanti), %20 uzun hafta (3-7 gün, ×0.95)
      if (s.rentalOffice && rentals.length > 0) {
        const occ = Math.min(0.95, CONFIG.rentalOccBase + CONFIG.rentalOccPerRep * rep)
        let corpSigned: string | null = null
        let depositsTaken = 0
        rentals = rentals.map((r) => {
          if (r.rentDaysLeft > 0 || !rentalServiceable(r)) return r
          if (Math.random() >= occ) return r
          // Teminat müşteriden peşin alınır; teslimde kesintiler düşülüp iade edilir
          depositsTaken += CONFIG.rentalDeposit
          const rented = { ...r, depositHeld: CONFIG.rentalDeposit, wearAtRent: r.wear, refundIn: 0 }
          const base = rand(CONFIG.rentalDailyMin, CONFIG.rentalDailyMax)
          // %5 kurumsal (30 gün, indirimli ama garanti); gerisi 1-10 gün arası bireysel
          if (Math.random() < 0.05) {
            corpSigned = r.plate
            return { ...rented, rentDaysLeft: 30, rentDaily: Math.round(base * 0.85), corporate: true }
          }
          return {
            ...rented,
            rentDaysLeft: Math.round(rand(1, 10)),
            rentDaily: Math.round(base),
            corporate: false,
          }
        })
        // Teminat gelir değildir: kasada bekler, iadede geri çıkar
        money += depositsTaken
        if (corpSigned) pushToast(t.rentalCorpDeal(corpSigned))
        // Sabah bilgisi: bugün kaç araç kiraya çıktı (araçlar otoparktan trafiğe karışır)
        const outToday = rentals.filter((r) => r.rentDaysLeft > 0).length
        if (outToday > 0) pushToast(t.rentalMorning(outToday, rentals.length))
      }
      // Mevduat vadeleri işler: dolan mevduat faiziyle kasaya döner
      if (deposits.length > 0) {
        const next: Deposit[] = []
        for (const dep of deposits) {
          const left = dep.daysLeft - 1
          if (left <= 0) {
            const payout = Math.round(dep.amount * (1 + dep.rate * dep.term))
            money += payout
            trackIncome('faiz', payout - dep.amount)
            pushToast(t.depositMatured(payout))
            sfx('coin')
          } else {
            next.push({ ...dep, daysLeft: left })
          }
        }
        deposits = next
      }
      contracts = contracts
        .map((c) => ({
          ...c,
          daysLeft: c.daysLeft - 1,
          morningDone: false,
          eveningDone: false,
          morningMissed: false,
          eveningMissed: false,
        }))
        .filter((c) => {
          if (c.daysLeft > 0) return true
          pushToast(t.contractEnded(t.contractKinds[c.kind]))
          return false
        })
    }

    // Yevmiyeler + senet taksitleri akşam ödenir (nakit yoksa borca girilir)
    let debts = s.debts
    if (clock.hour >= CONFIG.wageHour && wageDay < day) {
      wageDay = day
      // Yevmiyeler araç payına göre: ortaklı araçta masrafın yarısı ortağın
      const wages = Math.round(
        s.vehicles.reduce(
          (sum, v) =>
            sum + ((v.hasDriver ? CONFIG.driverWage : 0) + kahyaWageOf(v)) * (v.share / 100),
          0,
        ),
      )
      money -= wages
      trackExpense(wages)
      pushToast(t.wagesPaid(wages))
      // Moral günlük yıpranır; çay ocağı varsa yarı hızda (araç döngüsünde uygulanır)
      moralDecayNow =
        CONFIG.moralDecayPerDay * (buildings.cayOcagi ? CONFIG.moralDecayCayFactor : 1)
      sfx('coin')
      if (bufeToday > 0) {
        pushToast(t.bufeSummary(bufeToday))
        bufeToday = 0
      }
      // Ortaklık payları: rakip esnafın günlük cirosundan hisse oranında
      const partnerIncome = Math.round(
        s.rivals.reduce(
          (sum, r) =>
            r.playerShare > 0
              ? sum +
                rand(CONFIG.rivalDailyGrossMin, CONFIG.rivalDailyGrossMax) *
                  (r.playerShare / 100)
              : sum,
          0,
        ),
      )
      if (partnerIncome > 0) {
        money += partnerIncome
        trackIncome('ortaklik', partnerIncome)
        pushToast(t.partnerDaily(partnerIncome))
      }
      // Taksi gelirleri: kirada sabit, işletmede değişken günlük net
      const taxiIncome = Math.round(
        s.taxis.reduce(
          (sum, tx) =>
            sum +
            (tx.mode === 'operate' && tx.hasCar
              ? rand(CONFIG.taxiOperateMin, CONFIG.taxiOperateMax) +
                // Gece vardiyası: ikinci şoförün hasılatı - yevmiyesi
                (tx.nightShift
                  ? rand(CONFIG.taxiNightMin, CONFIG.taxiNightMax) - CONFIG.taxiNightWage
                  : 0)
              : CONFIG.taxiRentDaily),
          0,
        ),
      )
      if (taxiIncome > 0) {
        money += taxiIncome
        trackIncome('taksi', taxiIncome)
        pushToast(t.taxiIncome(taxiIncome))
      }
      // Kiralama: kiradaki araçlar günlük kirayı yatırır; yakıt yanar, yıpranma işler.
      // Teslimde full-to-full: müşteri %70 depoyu doldurup verir, vermezse eksik
      // yakıt + yıpranma bedeli teminatından kesilir. Kalan teminat 3-4 günde iade.
      if (rentals.some((r) => r.rentDaysLeft > 0 || r.refundIn > 0)) {
        let rentalIncome = 0
        let rentedCount = 0
        let refundPaid = 0
        let kesintiTotal = 0
        rentals = rentals.map((r) => {
          // Bekleyen teminat iadesi: günü gelince kalan tutar müşteriye döner
          if (r.rentDaysLeft <= 0 && r.refundIn > 0) {
            const left = r.refundIn - 1
            if (left <= 0) {
              refundPaid += r.depositHeld
              return { ...r, refundIn: 0, depositHeld: 0 }
            }
            return { ...r, refundIn: left }
          }
          if (r.rentDaysLeft <= 0) return r
          rentedCount++
          rentalIncome += r.rentDaily
          const wear = Math.min(
            100,
            r.wear + rand(CONFIG.rentalWearPerDayMin, CONFIG.rentalWearPerDayMax),
          )
          const fuel = Math.max(
            0,
            r.fuel - rand(CONFIG.rentalFuelPerDayMin, CONFIG.rentalFuelPerDayMax),
          )
          const daysLeft = wear >= 100 ? 0 : r.rentDaysLeft - 1
          if (daysLeft > 0) return { ...r, fuel, wear, rentDaysLeft: daysLeft }
          // TESLİM: yıpranma bedeli teminattan kesilir; %30 müşteri depoyu
          // doldurmadan verir — eksik yakıt da teminattan tahsil edilir
          let kesinti = Math.round((wear - r.wearAtRent) * CONFIG.rentalRepairPerUnit)
          let returnFuel = CONFIG.rentalTank
          if (Math.random() < 0.3) {
            kesinti += Math.ceil((CONFIG.rentalTank - fuel) * fuelPrice)
            returnFuel = fuel
          }
          kesinti = Math.min(kesinti, r.depositHeld)
          kesintiTotal += kesinti
          return {
            ...r,
            fuel: returnFuel,
            wear,
            rentDaysLeft: 0,
            corporate: false,
            depositHeld: r.depositHeld - kesinti,
            refundIn: Math.round(rand(CONFIG.rentalRefundDaysMin, CONFIG.rentalRefundDaysMax)),
          }
        })
        rentalIncome = Math.round(rentalIncome)
        if (rentalIncome > 0) {
          money += rentalIncome
          trackIncome('kiralama', rentalIncome)
          pushToast(t.rentalIncome(rentedCount, rentals.length, rentalIncome))
        }
        // Kesinti bizde kalır: teminat zaten kasada, sadece iade azalır — gelir sayılır
        if (kesintiTotal > 0) {
          trackIncome('kiralama', kesintiTotal)
          pushToast(t.rentalKesinti(kesintiTotal))
        }
        if (refundPaid > 0) {
          money -= refundPaid
          pushToast(t.rentalRefund(refundPaid))
        }
      }
      // Otomasyon kiralık filoyu da kapsar: oto-pompa depoları doldurur,
      // bakım aboneliği yıpranmışları elden geçirir (hat araçlarıyla aynı eşikler)
      if ((buildings.otoPompa || buildings.otoBakim) && rentals.length > 0) {
        rentals = rentals.map((r) => {
          let rr = r
          if (buildings.otoPompa && rr.fuel < CONFIG.rentalMinFuel * 2) {
            const cost = Math.ceil(
              (CONFIG.rentalTank - rr.fuel) *
                fuelPrice *
                (buildings.yakitTanki ? CONFIG.yakitTankiDiscount : 1),
            )
            if (money >= cost) {
              money -= cost
              trackExpense(cost)
              rr = { ...rr, fuel: CONFIG.rentalTank }
            }
          }
          if (buildings.otoBakim && rr.wear >= 80) {
            const cost = Math.ceil(
              rr.wear *
                CONFIG.rentalRepairPerUnit *
                (buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1),
            )
            if (money >= cost) {
              money -= cost
              trackExpense(cost)
              rr = { ...rr, wear: 0 }
            }
          }
          return rr
        })
      }
      // Kontrat gelirleri: koşulan sefer başına günlük ödemenin yarısı
      const contractIncome = Math.round(
        contracts.reduce(
          (sum, c) =>
            sum + (c.morningDone ? c.dailyPay / 2 : 0) + (c.eveningDone ? c.dailyPay / 2 : 0),
          0,
        ),
      )
      if (contractIncome > 0) {
        money += contractIncome
        trackIncome('kontrat', contractIncome)
        pushToast(t.contractIncome(contractIncome))
      }
      // Kredi skoru: ödemeler sonrası kasa eksideyse sicil bozulur, temizse düzelir
      if (money < 0) {
        creditScore = Math.max(0, creditScore - CONFIG.creditScoreMissPenalty)
        missedPayDays += 1
        pushToast(t.creditScoreDown(Math.round(creditScore)))
      } else {
        missedPayDays = 0
        if (debts.length > 0 || deposits.length > 0) {
          creditScore = Math.min(100, creditScore + CONFIG.creditScoreGoodDay)
        }
      }
      // HACİZ bayrağı: araç dizisi kurulduktan sonra infaz edilir
      if (missedPayDays >= 3 && debts.length > 0) {
        hacizPending = true
        missedPayDays = 0
      }
      if (debts.length > 0) {
        let paid = 0
        debts = debts
          .map((d) => {
            // Gün içinde elle ödendiyse bu akşam kesinti yok
            if (d.paidDay === day) return d
            // Haftalık/aylık plan: vadesi gelmediyse dokunma
            const nextDue = d.nextPayDay ?? day
            if (day < nextDue) return d
            const pay = Math.min(d.daily, d.remaining)
            paid += pay
            return {
              ...d,
              remaining: d.remaining - pay,
              paidDay: day,
              nextPayDay: day + (d.every ?? 1),
            }
          })
          .filter((d) => d.remaining > 0)
        if (paid > 0) {
          money -= paid
          trackExpense(paid)
          pushToast(t.installmentsPaid(paid))
        }
      }
    }

    // Terminale yolcu akışı — gece ayak seyrekleşir, itibar/filo/prestij ve
    // hava olayları yoğunluğu belirler. Kuyruk doluysa itibar zedelenir.
    // Talep, araç SINIFI ağırlıklı: otobüs durağa minibüsten çok yolcu çeker
    // (demandWeight — dolmuş 1, otobüs 1.8, körüklü 2.6, elektrikli 2; vito saymaz)
    const activeFleet = Math.max(
      1,
      s.vehicles.reduce((sum, v) => sum + (v.hasDriver ? specOf(v.kind).demandWeight : 0), 0),
    )
    const queueCap = queueCapOf(activeFleet)
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      const nightFactor = isNight ? CONFIG.nightSpawnFactor : 1
      const repFactor = CONFIG.repSpawnBase - CONFIG.repSpawnSlope * rep
      const fleetFactor =
        (1 + CONFIG.fleetSpawnBonus * (activeFleet - 1)) *
        (1 + CONFIG.prestigeSpawnBonus * s.prestige) *
        (buildings.hat2 ? 1 + CONFIG.hat2SpawnBonus : 1)
      const weatherFactor =
        (time < rainUntil ? CONFIG.rainSpawnFactor : 1) *
        (time < korsanUntil ? CONFIG.korsanSpawnFactor : 1)
      spawnTimer =
        (rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax) *
          nightFactor *
          repFactor *
          weatherFactor) /
        fleetFactor
      if (queue < queueCap) {
        queue++
        // Büfe: bekleyen yolcu çay/simit alır, kasaya anında girer
        if (buildings.bufe && Math.random() < CONFIG.bufeSaleChance) {
          const sale = Math.round(rand(CONFIG.bufeSaleMin, CONFIG.bufeSaleMax))
          money += sale
          trackIncome('bufe', sale)
          bufeToday += sale
        }
      } else {
        // Büyük terminalde tek kaçan yolcunun itibar etkisi orantısal küçülür —
        // yoksa otobüs filosunda hızlanan yolcu akışı itibarı eritiyor
        rep = clampRep(rep - CONFIG.repLostPassenger / Math.sqrt(activeFleet))
      }
    }

    // Özel servis teklifleri: gündüz arada bir düşer, süresi geçerse uçar
    if (charter && charter.expiresAt <= time) charter = null
    if (!charter && !isNight) {
      charterTimer -= dt
      if (charterTimer <= 0) {
        charterTimer = rand(CONFIG.charterIntervalMin, CONFIG.charterIntervalMax)
        charter = makeCharter(time, activeFleet)
      }
    }

    // Kontrat teklifleri: boş slot varsa gündüz arada bir düşer
    if (contractOffer && contractOffer.expiresAt <= time) contractOffer = null
    if (!contractOffer && !isNight && contracts.length < CONFIG.contractSlots) {
      contractOfferTimer -= dt
      if (contractOfferTimer <= 0) {
        contractOfferTimer = rand(CONFIG.contractOfferMin, CONFIG.contractOfferMax)
        contractOffer = makeContractOffer(time)
        // Teklif sessizce sekmede beklemesin: oyuncuya haber ver
        pushToast(t.contractOfferToast(t.contractKinds[contractOffer.kind], contractOffer.dailyPay))
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
          trackIncome('bufe', sale)
          bufeToday += sale
        }
      }
    }

    // Akaryakıt tankı: hattın diğer esnafı tanktan mazot alır — saatlik toptan satış kârı
    if (buildings.yakitTanki && !isNight) {
      yakitTankiTimer += dt
      const gameHour = CONFIG.dayLength / 24
      while (yakitTankiTimer >= gameHour) {
        yakitTankiTimer -= gameHour
        const liters = Math.round(rand(CONFIG.yakitTankiSaleLMin, CONFIG.yakitTankiSaleLMax))
        const profit = liters * CONFIG.yakitTankiMarginPerL
        money += profit
        trackIncome('yakit', profit)
      }
    }

    // Peron tek araçlık ve hat ortak: rakipler de aynı perona yanaşır
    // Peron slotları: her durak aynı anda tek araç alır — rakipler ana peronu (0) kullanır
    const peronSlots: boolean[] = new Array(Math.max(1, s.perons)).fill(false)
    for (const v of s.vehicles) {
      if (v.state === 'toPeron' || v.state === 'loading') {
        peronSlots[Math.min(v.peronIdx ?? 0, peronSlots.length - 1)] = true
      }
    }
    if (s.rivals.some((r) => r.state === 'toPeron' || r.state === 'loading')) {
      peronSlots[0] = true
    }
    // Pompa ve şarj ünitesi ayrı ayrı tek araçlık: dizel pompaya, elektrikli şarja
    let pumpInUse = s.vehicles.some(
      (v) => (v.state === 'toPump' || v.state === 'fueling') && v.kind !== 'ebus',
    )
    let chargerInUse = s.vehicles.some(
      (v) => (v.state === 'toPump' || v.state === 'fueling') && v.kind === 'ebus',
    )

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
            if (isNight || peronSlots[0]) {
              r.timer = 4 // kısa süre sonra tekrar dene
            } else {
              peronSlots[0] = true
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
      if (moralDecayNow > 0 && v.hasDriver) {
        v.driverMoral = Math.max(0, v.driverMoral - moralDecayNow)
      }
      const advance = () => {
        v.dist += CONFIG.vehicleSpeed * dt
        return v.path !== null && v.dist >= pathLength(v.path)
      }

      switch (v.state) {
        case 'parked': {
          // Ağır arıza: araç tamirhanede — günü dolana kadar hiçbir şey yapamaz,
          // çıkışta sıfır bakımla döner (fatura arıza anında kesildi)
          if (v.brokenUntilDay > 0) {
            if (day < v.brokenUntilDay) break
            v.brokenUntilDay = 0
            v.wear = 0
            pushToast(t.bigRepairDone(v.plate))
          }
          // Kuyruktaki özel servis: park eder etmez yola çıkar (masrafı kabulde ödendi)
          if (v.charterQueued) {
            v.charterQueued = false
            v.state = 'departing'
            v.path = spotDepartPath(spotPos(v.spotIdx))
            v.dist = 0
            v.tripLeft = v.charterDuration
            break
          }
          // Planlı bakım: parka döner dönmez uygulanır
          if (v.pendingRepair) {
            if (v.wear <= 0) {
              v.pendingRepair = false
            } else {
              const discount = buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1
              const cost = Math.ceil((repairCost(v) * discount * v.share) / 100)
              if (money >= cost) {
                money -= cost
                trackExpense(cost)
                v.wear = 0
                v.pendingRepair = false
              }
            }
          }
          // Planlı yakıt: pompa boşsa öde ve pompaya sür
          if (v.pendingRefuel && v.hasDriver && !(v.kind === 'ebus' ? chargerInUse : pumpInUse)) {
            if (v.fuel >= specOf(v.kind).tank) {
              v.pendingRefuel = false
            } else {
              const cost = Math.ceil(
                (refuelCost(v, fuelUnitPrice(v.kind, fuelPrice, buildings)) * v.share) / 100,
              )
              if (money >= cost) {
                money -= cost
                trackExpense(cost)
                v.pendingRefuel = false
                if (v.kind === 'ebus') chargerInUse = true
                else pumpInUse = true
                pushToast(t.refueled(v.plate, cost))
                v.state = 'toPump'
                v.path =
                  v.kind === 'ebus'
                    ? toChargePath(spotPos(v.spotIdx))
                    : toPumpPath(spotPos(v.spotIdx))
                v.dist = 0
                break
              }
            }
          }
          // Otomasyon: bakım aboneliği (%80 üstü otomatik) ve oto-pompa anlaşması
          if (buildings.otoBakim && v.wear >= 80) {
            const discount = buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1
            const cost = Math.ceil((repairCost(v) * discount * v.share) / 100)
            if (money >= cost) {
              money -= cost
              trackExpense(cost)
              v.wear = 0
              v.pendingRepair = false
            }
          }
          if (
            buildings.otoPompa &&
            v.hasDriver &&
            !(v.kind === 'ebus' ? chargerInUse : pumpInUse) &&
            v.fuel < specOf(v.kind).fuelPerTrip * 2 &&
            v.fuel < specOf(v.kind).tank
          ) {
            const cost = Math.ceil(
              (refuelCost(v, fuelUnitPrice(v.kind, fuelPrice, buildings)) * v.share) / 100,
            )
            if (money >= cost) {
              money -= cost
              trackExpense(cost)
              v.pendingRefuel = false
              if (v.kind === 'ebus') chargerInUse = true
              else pumpInUse = true
              v.state = 'toPump'
              v.path =
                v.kind === 'ebus'
                  ? toChargePath(spotPos(v.spotIdx))
                  : toPumpPath(spotPos(v.spotIdx))
              v.dist = 0
              break
            }
          }
          // VIP transfer: peron beklemez — çağrı gelince yola çıkar (gece dahil)
          if (v.kind === 'vito') {
            if (v.hasDriver && v.wear < 100) {
              v.callIn -= dt
              if (v.callIn <= 0) {
                const km = Math.round(rand(CONFIG.vitoKmMin, CONFIG.vitoKmMax))
                const fuelNeed = Math.ceil(km * CONFIG.vitoFuelPerKm)
                if (v.fuel >= fuelNeed) {
                  v.fuel -= fuelNeed
                  v.wear = Math.min(
                    100,
                    v.wear +
                      (CONFIG.vitoWearBase + km * CONFIG.vitoWearPerKm) *
                        (v.old ? CONFIG.oldBusWearFactor : 1),
                  )
                  v.charterPayout = Math.round(
                    CONFIG.vitoBaseFare + km * rand(CONFIG.vitoPerKmMin, CONFIG.vitoPerKmMax),
                  )
                  v.tripLeft = CONFIG.vitoDurationBase + km * CONFIG.vitoDurationPerKm
                  v.state = 'departing'
                  v.path = spotDepartPath(spotPos(v.spotIdx))
                  v.dist = 0
                }
                v.callIn =
                  rand(CONFIG.vitoCallMin, CONFIG.vitoCallMax) *
                  (isNight ? CONFIG.vitoNightCallFactor : 1)
              }
            }
            break
          }
          // Gece (00-06) nöbetçi veya ortaklı araç çalışır (ortağın şoförü sürer)
          const onDuty = !isNight || v.nightShift || v.share < 100
          const freeSlot = peronSlots.findIndex((used) => !used)
          if (v.hasDriver && canServe(v) && onDuty && freeSlot >= 0) {
            peronSlots[freeSlot] = true
            v.peronIdx = freeSlot
            v.state = 'toPeron'
            v.path = toPeronPath(spotPos(v.spotIdx), freeSlot)
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
          // Çay ocağı + şoför becerisi: biniş daha hızlı akar
          const effSkill = v.driverMoral < CONFIG.moralLowThreshold ? 1 : v.driverSkill
          const boardInterval =
            CONFIG.boardInterval *
            specOf(v.kind).boardMult *
            (buildings.cayOcagi ? CONFIG.cayOcagiBoardFactor : 1) *
            (1 - CONFIG.driverSkillBoardBonus * (effSkill - 1))
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
            // Dolmuş usulü: ücret binişte peşin, canlı tarifeden. Yolcu tipleri
            // istatistiksel: öğrenci indirimli (+itibar), turist bahşişli,
            // kaçak binen kahyaya takılırsa öder. Ortak payı düşülür.
            let fareSum = 0
            let students = 0
            let kacakCaught = false
            for (let i = 0; i < v.passengers; i++) {
              const r = Math.random()
              if (r < CONFIG.pctKacak) {
                if (v.kahya > 0) {
                  fareSum += fare
                  kacakCaught = true
                }
              } else if (r < CONFIG.pctKacak + CONFIG.pctStudent) {
                fareSum += fare * CONFIG.studentFareFactor
                students++
              } else if (r < CONFIG.pctKacak + CONFIG.pctStudent + CONFIG.pctTourist) {
                fareSum += fare
                if (Math.random() < CONFIG.touristTipChance) {
                  fareSum += rand(CONFIG.touristTipMin, CONFIG.touristTipMax)
                }
              } else {
                fareSum += fare
              }
            }
            rep = clampRep(rep + students * CONFIG.studentRep)
            if (kacakCaught && Math.random() < 0.35) pushToast(t.kacakCaught(v.plate))
            const tripFare = Math.round((fareSum * fareMult * v.share) / 100)
            money += tripFare
            trackIncome('dolmus', tripFare)
            totalCarried += v.passengers
            advanceTask('carry', v.passengers)
            advanceTask('revenue', tripFare)
            sfx('horn')
            // Usta şoför yakıtı idareli kullanır (tüketim araç sınıfına göre)
            v.fuel = Math.max(
              0,
              v.fuel -
                specOf(v.kind).fuelPerTrip *
                  (1 -
                    CONFIG.driverSkillFuelBonus *
                      ((v.driverMoral < CONFIG.moralLowThreshold ? 1 : v.driverSkill) - 1)),
            )
            // Eski kasa (devren) daha hızlı yıpranır
            v.wear = Math.min(
              100,
              v.wear + specOf(v.kind).wearPerTrip * (v.old ? CONFIG.oldBusWearFactor : 1),
            )
            pushToast(t.departed(v.plate, v.passengers, tripFare))
            v.state = 'departing'
            v.path = departPathOf(v.peronIdx ?? 0)
            v.dist = 0
          }
          break
        }
        case 'departing': {
          if (advance()) {
            v.state = 'onTrip'
            v.path = null
            // Özel servisteyse süresi kabul anında belirlendi
            if (v.charterPayout <= 0) {
              v.tripLeft = rand(CONFIG.tripDurationMin, CONFIG.tripDurationMax)
            }
          }
          break
        }
        case 'onTrip': {
          v.tripLeft -= dt
          if (v.tripLeft <= 0 && v.contractRun) {
            // Kontrat seferi dönüşü: ücret yok, ödeme akşam toplu gelir
            v.contractRun = false
            pushToast(t.contractRunDone(v.plate))
            v.state = 'returning'
            v.path = returnPath(spotPos(v.spotIdx))
            v.dist = 0
            v.passengers = 0
            break
          }
          if (v.tripLeft <= 0 && v.charterPayout > 0) {
            // Özel servis dönüşü: toplu ödeme (hisse oranında)
            const pay = Math.round((v.charterPayout * v.share) / 100)
            money += pay
            trackIncome(v.kind === 'vito' ? 'vip' : 'servis', pay)
            rep = clampRep(rep + CONFIG.repPerTrip)
            advanceTask('trips', 1)
            advanceTask('revenue', pay)
            pushToast(v.kind === 'vito' ? t.vitoDone(v.plate, pay) : t.charterDone(v.plate, pay))
            sfx('coin')
            v.charterPayout = 0
            v.state = 'returning'
            v.path = returnPath(spotPos(v.spotIdx))
            v.dist = 0
            v.passengers = 0
            break
          }
          if (v.tripLeft <= 0) {
            // Hat boyunca inen-binen: dönüşte ek indi-bindi hasılatı.
            // Kahya kapıdan hat bağırır — seviyesi durak dışı yolcuyu artırır.
            const kahyaBonus = 1 + CONFIG.kahyaEnRouteBonus * v.kahya
            const fleetBonus =
              (1 + CONFIG.fleetEnRouteBonus * (activeFleet - 1)) *
              (buildings.hat2 ? 1 + CONFIG.hat2EnRouteBonus : 1)
            // Büyük kasa hat boyunca daha çok indi-bindi alır (enRouteMult)
            const enRoute = Math.floor(
              rand(CONFIG.enRouteFaresMin, CONFIG.enRouteFaresMax + 1) *
                specOf(v.kind).enRouteMult *
                kahyaBonus *
                fleetBonus,
            )
            const extra = Math.round(
              (enRoute * fare * fareMult * v.share) / 100,
            )
            money += extra
            trackIncome('dolmus', extra)
            totalCarried += enRoute
            advanceTask('carry', enRoute)
            advanceTask('revenue', extra)
            advanceTask('trips', 1)
            // Elektrikli otobüs çevreci imaj yapar: itibar iki kat işler
            rep = clampRep(rep + CONFIG.repPerTrip * specOf(v.kind).repMult)
            pushToast(t.returned(v.plate, extra))
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
          // Dolum hızı depoyla ölçekli: otobüs de minibüsle aynı sürede dolar
          const tank = specOf(v.kind).tank
          v.fuel = Math.min(tank, v.fuel + CONFIG.fuelFillRate * (tank / CONFIG.fuelCapacity) * dt)
          if (v.fuel >= tank) {
            v.state = 'fromPump'
            v.path =
              v.kind === 'ebus'
                ? fromChargePath(spotPos(v.spotIdx))
                : fromPumpPath(spotPos(v.spotIdx))
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
        case 'toRepair': {
          // path korunur: araç servis parkında sabit bekler
          if (advance()) v.state = 'inRepair'
          break
        }
        case 'inRepair': {
          if (day >= v.brokenUntilDay) {
            v.brokenUntilDay = 0
            v.wear = 0
            pushToast(t.bigRepairDone(v.plate))
            v.state = 'fromRepair'
            v.path = fromRepairPath(spotPos(v.spotIdx))
            v.dist = 0
          }
          break
        }
        case 'fromRepair': {
          if (advance()) {
            v.state = 'parked'
            v.path = null
          }
          break
        }
      }
      return v
    })

    // Ekonomi haberleri: motorin/tarife arada bir değişir
    newsTimer -= dt
    if (newsTimer <= 0) {
      newsTimer = rand(CONFIG.newsIntervalMin, CONFIG.newsIntervalMax)
      if (Math.random() < 0.6) {
        const old = fuelPrice
        const zam = Math.random() < 0.75
        const change = zam ? 1 + rand(0.03, 0.09) : 1 - rand(0.02, 0.05)
        fuelPrice = Math.round(
          Math.max(CONFIG.fuelPriceMin, Math.min(CONFIG.fuelPriceMax, fuelPrice * change)) * 100,
        ) / 100
        if (Math.round(fuelPrice) !== Math.round(old)) pushToast(t.newsFuel(old, fuelPrice))
      } else {
        const old = fare
        const delta = Math.random() < 0.85 ? Math.round(rand(2, 5)) : -Math.round(rand(1, 3))
        fare = Math.max(CONFIG.fareMin, Math.min(CONFIG.fareMax, fare + delta))
        if (fare !== old) pushToast(t.newsFare(old, fare))
      }
    }

    // Rastgele olaylar: gündüz — zabıta, lastik, yağmur, korsan dolmuş
    if (!isNight) {
      eventTimer -= dt
      if (eventTimer <= 0) {
        eventTimer = rand(CONFIG.eventIntervalMin, CONFIG.eventIntervalMax)
        // Büyük filoda (6+) ağır arıza da olasılık havuzuna girer
        const roll = Math.floor(rand(0, vehicles.length >= 6 ? 5 : 4))
        if (roll === 4) {
          // Ağır arıza: şanzıman/motor — araç servis parkına çekilir, 2-3 gün
          // tamirde kalır, fatura peşin kesilir
          const idx = vehicles.findIndex(
            (v) => v.state === 'parked' && v.hasDriver && v.brokenUntilDay === 0,
          )
          if (idx >= 0) {
            const days = 2 + Math.floor(rand(0, 2))
            const bill = Math.ceil(
              CONFIG.repairCostPerUnit *
                60 *
                specOf(vehicles[idx].kind).repairMult *
                (buildings.tamirhane ? CONFIG.tamirhaneDiscount : 1),
            )
            money -= bill
            trackExpense(bill)
            vehicles[idx] = {
              ...vehicles[idx],
              brokenUntilDay: day + days,
              state: 'toRepair',
              path: toRepairPath(spotPos(vehicles[idx].spotIdx)),
              dist: 0,
            }
            pushToast(t.bigBreakdown(vehicles[idx].plate, days, bill))
          }
        } else if (roll === 0) {
          // Zabıta: ayakta yolcu taşıyan araç yakalanırsa ceza
          const overloaded = vehicles.find(
            (v) =>
              v.passengers > specOf(v.kind).seats &&
              (v.state === 'departing' || v.state === 'onTrip'),
          )
          if (overloaded) {
            const standing = overloaded.passengers - specOf(overloaded.kind).seats
            const fine = standing * CONFIG.zabitaFinePerStanding
            money -= fine
            trackExpense(fine)
            rep = clampRep(rep - 0.1)
            pushToast(t.zabitaFine(overloaded.plate, fine))
          } else {
            rep = clampRep(rep + CONFIG.zabitaCleanRep)
            pushToast(t.zabitaClean)
          }
        } else if (roll === 1) {
          // Lastik patlaması: yoldaki rastgele araç yıpranır
          const idx = vehicles.findIndex((v) => v.state === 'onTrip')
          if (idx >= 0) {
            vehicles[idx] = {
              ...vehicles[idx],
              wear: Math.min(100, vehicles[idx].wear + CONFIG.tireBlowWear),
            }
            pushToast(t.tireBlow(vehicles[idx].plate))
          }
        } else if (roll === 2) {
          rainUntil = time + CONFIG.rainDuration
          pushToast(t.rainStart)
        } else {
          korsanUntil = time + CONFIG.korsanDuration
          pushToast(t.korsanStart)
        }
      }
    }

    // Kilometre taşları: yeni tamamlanan varsa ödül + konfeti
    for (const m of MILESTONES) {
      if (s.milestonesDone.includes(m.id)) continue
      if (m.cond({ ...s, money, totalCarried, rep, day } as GameState)) {
        money += m.reward
        trackIncome('odul', m.reward)
        pushToast(t.milestone(t.milestoneNames[m.id] ?? m.id, m.reward))
        celebrateAt = time
        sfx('ding')
        set({ milestonesDone: [...get().milestonesDone, m.id] })
      }
    }

    // HACİZ infazı: en değerli araç alacaklılara gider, bedeli borçtan düşülür
    if (hacizPending && vehicles.length > 0) {
      let seizeIdx = 0
      let bestVal = -1
      for (let i = 0; i < vehicles.length; i++) {
        const val = valuationOf(vehicles[i], vehicles.length, rep)
        if (val > bestVal) {
          bestVal = val
          seizeIdx = i
        }
      }
      const seized = vehicles[seizeIdx]
      vehicles.splice(seizeIdx, 1)
      let credit = Math.round((bestVal * seized.share) / 100)
      debts = [...debts]
        .sort((a, b) => b.remaining - a.remaining)
        .map((d) => {
          if (credit <= 0) return d
          const cut = Math.min(credit, d.remaining)
          credit -= cut
          return { ...d, remaining: d.remaining - cut }
        })
        .filter((d) => d.remaining > 0)
      if (credit > 0) money += credit
      rep = clampRep(rep - 0.5)
      pushToast(t.haciz(seized.plate))
    }

    // Kontrat seferleri: sabah/akşam penceresinde parktaki bir dolmuş servise çıkar,
    // pencere kaçarsa itibar cezası
    if (contracts.length > 0) {
      const h = clock.hour
      const dispatchContract = (): boolean => {
        const idx = vehicles.findIndex(
          (veh) =>
            isHatVehicle(veh.kind) &&
            veh.brokenUntilDay === 0 &&
            veh.state === 'parked' &&
            veh.hasDriver &&
            veh.fuel >= CONFIG.contractFuel &&
            veh.wear < 100 &&
            veh.charterPayout === 0 &&
            !veh.charterQueued,
        )
        if (idx < 0) return false
        const veh = vehicles[idx]
        vehicles[idx] = {
          ...veh,
          state: 'departing',
          path: spotDepartPath(spotPos(veh.spotIdx)),
          dist: 0,
          tripLeft: CONFIG.contractRunDuration,
          contractRun: true,
          fuel: Math.max(0, veh.fuel - CONFIG.contractFuel),
          wear: Math.min(
            100,
            veh.wear + CONFIG.contractWear * (veh.old ? CONFIG.oldBusWearFactor : 1),
          ),
        }
        pushToast(t.contractRunOut(veh.plate))
        return true
      }
      let changed = false
      const next = contracts.map((c) => {
        const cc = { ...c }
        let dirty = false
        if (!cc.morningDone && !cc.morningMissed && h >= CONFIG.contractMorningHour) {
          if (h < CONFIG.contractMorningHour + CONFIG.contractGraceHours) {
            if (dispatchContract()) {
              cc.morningDone = true
              dirty = true
            }
          } else {
            cc.morningMissed = true
            rep = clampRep(rep - CONFIG.contractMissRep)
            pushToast(t.contractMissed(t.contractKinds[cc.kind]))
            dirty = true
          }
        }
        if (!cc.eveningDone && !cc.eveningMissed && h >= CONFIG.contractEveningHour) {
          if (h < CONFIG.contractEveningHour + CONFIG.contractGraceHours) {
            if (dispatchContract()) {
              cc.eveningDone = true
              dirty = true
            }
          } else {
            cc.eveningMissed = true
            rep = clampRep(rep - CONFIG.contractMissRep)
            pushToast(t.contractMissed(t.contractKinds[cc.kind]))
            dirty = true
          }
        }
        if (dirty) changed = true
        return dirty ? cc : c
      })
      if (changed) contracts = next
    }

    // Şoför pazarı: sabahları 2 yeni aday
    let driverMarket = s.driverMarket
    if (marketRefreshPending) {
      marketRefreshPending = false
      driverMarket = Array.from({ length: 2 }, () => {
        const prof = genDriver()
        return { name: prof.name, skill: prof.skill, price: prof.skill * CONFIG.marketHirePerSkill }
      })
    }

    set({ time, day, wageDay, money, totalCarried, queue, spawnTimer, vehicles, debts, toasts, rep, task, taskDay, bufeToday, rivals, rivalRespawn, charter, contracts, contractOffer, rainUntil, korsanUntil, celebrateAt, fuelPrice, fare, statsHistory, deposits, creditScore, missedPayDays, driverMarket, rentals })

    // ~2.5 sn'de bir kaydet — her frame localStorage'a yazmak gereksiz
    saveAcc += dt
    if (saveAcc >= 2.5) {
      saveAcc = 0
      persist(get())
    }
  },
}))
