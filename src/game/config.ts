// Ekonomi ve simülasyon dengesi tek yerden. / Single source of truth for game balance.
// Fiyatlar Temmuz 2026 İstanbul gerçeklerine dayanır: indi-bindi ₺43 (İBB/UKOME),
// motorin ₺74/L, eski kasa 2. el minibüs ~₺400-500 bin, şoför yevmiyesi ~₺1.750.
export const CONFIG = {
  seatCount: 14, // klasik minibüs koltuk sayısı
  vehicleSpeed: 10, // birim/sn
  boardInterval: 0.3, // biniş hızı: sn/yolcu

  // Gelir
  farePerPassenger: 43, // ₺, indi-bindi (0-4 km tarifesi)
  nightFareMultiplier: 1.5, // gece tarifesi (00:00-06:00)
  enRouteFaresMin: 30, // hat boyunca inen-binen ek yolcu (dönüşte kasaya girer)
  enRouteFaresMax: 60, // gerçek günlük ciroyu (₺13-15k/araç) yakalayan ana kalem
  kahyaEnRouteBonus: 0.15, // kahya seviyesi başına durak dışı indi-bindi artışı

  // Yakıt (litre bazlı)
  fuelCapacity: 80, // depo (L)
  fuelPerTrip: 6, // sefer başına tüketim (L) — ~35 km tur, 17L/100km
  refuelCostPerUnit: 74, // ₺/L motorin — tam depo ≈ ₺5.920
  fuelFillRate: 16, // pompada dolum hızı (L/sn)

  // Bakım
  wearPerTrip: 4, // sefer başına yıpranma (%); 100'de araç bakım ister
  repairCostPerUnit: 120, // ₺/puan — tam bakım ≈ ₺12.000

  // Sefer/terminal ritmi
  tripDurationMin: 10, // sefer süresi (sn), ekran dışı
  tripDurationMax: 16,
  maxWaitAtPeron: 10, // dolmadan bekleyeceği azami süre (sn)
  spawnIntervalMin: 0.7, // yolcu geliş aralığı (sn)
  spawnIntervalMax: 2.0,
  nightSpawnFactor: 4, // gece yolcu aralığı çarpanı (00:00-06:00)
  maxQueue: 20,
  // Filo etkisi: hat büyüdükçe talep büyür (şoförlü araç başına)
  fleetSpawnBonus: 0.25, // yolcu geliş hızı artışı (+%25/araç)
  fleetQueueBonus: 6, // kuyruk kapasitesi artışı (+6/araç)
  fleetEnRouteBonus: 0.1, // hat boyu indi-bindi artışı (+%10/araç)

  // Zaman: 1 oyun günü = 24 saat = 300 sn gerçek zaman. Saat 06:00'da başlar.
  dayLength: 300,
  clockStartHour: 6,
  nightEndHour: 6, // 00:00-06:00 arası sadece nöbetçi çalışır
  wageHour: 20, // yevmiyeler akşam bu saatte ödenir

  // Personel & yatırım
  driverWage: 1750, // ₺/gün
  driverHireCost: 4000, // ₺, işe alım
  // Kahya (muavin): ayakta yolcu aldırır — kapasite artar, yevmiye eklenir
  kahyaHireCost: 2500,
  kahyaWage: 1000, // ₺/gün
  kahyaWagePerLevel: 250, // seviye başına ek yevmiye
  kahyaBaseStanding: 4, // Sv.1'de ayakta yolcu
  kahyaStandingPerLevel: 2, // her seviyede +2
  kahyaMaxLevel: 3,
  kahyaUpgradeCosts: [5000, 10000], // Sv.2 ve Sv.3 geçiş ücreti
  // Senet erken kapatma: kalan borcun %5'i silinir
  payoffDiscount: 0.95,

  // Rakip minibüsler: aynı hattın diğer esnafı — perona girer, yolcu kapar
  rivalCount: 2,
  rivalVisitMin: 180, // ziyaret aralığı (sn) — sık gelirse oyuncunun cirosunu boğar
  rivalVisitMax: 360,
  rivalMaxWaitAtPeron: 6, // rakip peronda daha aceleci
  rivalBuyFactor: 0.6, // devren fiyat = yeni araç fiyatı × bu
  rivalWearMin: 55, // devren gelirkenki yıpranma (%)
  rivalWearMax: 80,
  oldBusWearFactor: 1.5, // eski kasa: sefer başına yıpranma çarpanı
  rivalRespawnSec: 240, // satın alınca hatta yeni esnaf katılma süresi

  // Hisse/ortaklık: kendi aracının %50'sini sat, ortaklı araç gece de çalışır.
  // Değerleme itibar + yıpranmaya bakar; geri alım primlidir.
  shareFraction: 0.5,
  shareBuyBackPremium: 1.1, // hisse geri alırken prim
  shareSellRefund: 0.9, // rakip ortaklık payını satarken kesinti
  minOwnShare: 25, // kendi aracında elde kalması gereken asgari pay (%)
  // Rakip minibüsün günlük cirosu (hat boyu, ekran dışı) — ortaklık payı bundan ödenir
  rivalDailyGrossMin: 12000,
  rivalDailyGrossMax: 18000,
  vehicleBaseCost: 390000, // eski kasa 2. el minibüs
  vehicleCostStep: 130000, // her ilave araçta artış
  // Senetli satış: dolmuşçu usulü — peşinat ver, kalanı her akşam taksitle öde
  loanDownRate: 0.25, // peşinat oranı
  loanMarkupRate: 0.15, // vade farkı
  loanTermDays: 30, // taksit süresi (gün)
  spotBaseCost: 30000, // park cebi devri, her cepte katlanır
  maxSpots: 8,
  startMoney: 150000,
  startSpots: 2,

  // İtibar (0-5 ⭐): yüksek itibar durağa daha çok yolcu çeker
  repStart: 3,
  repPerTrip: 0.02, // tamamlanan sefer başına artış
  repLostPassenger: 0.01, // kuyruk doluyken vazgeçen yolcu başına düşüş
  repTaskBonus: 0.2, // günlük görev ödülü
  // Yolcu geliş çarpanı: 5⭐ → ×0.7 (yoğun), 0⭐ → ×1.6 (tenha)
  repSpawnBase: 1.6,
  repSpawnSlope: 0.18,

  // Günlük görev: her sabah 06:00'da yenilenir, hedefler filo boyuyla ölçeklenir
  taskCarryPerVehicle: 150, // taşınacak yolcu / araç
  taskRevenuePerVehicle: 8000, // ₺ hasılat / araç
  taskTripsPerVehicle: 4, // sefer / araç
  taskRewardBase: 5000, // ₺ ödül tabanı
  taskRewardPerVehicle: 4000,

  // İnşaat: terminal tesisleri (tek seferlik yatırım)
  bufeCost: 120000, // büfe — bekleyen yolcu + yoldan geçen satışı
  bufeSaleChance: 0.55, // gelen yolcunun alışveriş olasılığı
  bufeSaleMin: 25, // ₺ simit/su bandı (2026: simit ₺25-30, çay ₺15-25)
  bufeSaleMax: 150, // ₺ tost + içecek sepeti
  bufeStreetSalesMin: 1, // saatlik yoldan geçen müşteri (06-24 arası)
  bufeStreetSalesMax: 4,
  cayOcagiCost: 80000, // çay ocağı — şoför morali: biniş %25 hızlanır
  cayOcagiBoardFactor: 0.8,
  tamirhaneCost: 250000, // tamirhane — bakım %40 indirimli
  tamirhaneDiscount: 0.6, // bakım fiyat çarpanı

  // Özel servis teklifleri: düğün/havalimanı vb. — mesafe fiyatı belirler
  charterIntervalMin: 40, // teklifler arası süre (sn, gündüz)
  charterIntervalMax: 100,
  charterLifetime: 40, // teklifin geçerlilik süresi (sn)
  charterKmMin: 5, // servis mesafesi (km)
  charterKmMax: 60,
  charterBaseFee: 1500, // ₺ taban ücret
  charterPerKmMin: 140, // ₺/km bandı
  charterPerKmMax: 220,
  charterFleetBonus: 0.1, // araç başına teklif büyümesi
  charterDurationBase: 15, // sn + km başına süre
  charterDurationPerKm: 0.8,
  charterFuelPerKm: 0.35, // L/km (gidiş-dönüş dahil)
  charterWearBase: 2, // % + km başına yıpranma
  charterWearPerKm: 0.08,

  toastLifetime: 3, // sn
}

// Şoförlü araç sayısına göre kuyruk kapasitesi
export function queueCapOf(activeFleet: number): number {
  return CONFIG.maxQueue + CONFIG.fleetQueueBonus * Math.max(0, activeFleet - 1)
}

// Oyun saati: time (sn) → gün + saat
export function clockOf(time: number): { day: number; hour: number } {
  const totalHours = CONFIG.clockStartHour + (time / CONFIG.dayLength) * 24
  return { day: Math.floor(totalHours / 24) + 1, hour: totalHours % 24 }
}
