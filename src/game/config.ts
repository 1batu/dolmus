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
  enRouteFaresMin: 25, // hat boyunca inen-binen ek yolcu (dönüşte kasaya girer)
  enRouteFaresMax: 50, // gerçek günlük ciroyu (₺13-15k/araç) yakalayan ana kalem

  // Yakıt (litre bazlı)
  fuelCapacity: 80, // depo (L)
  fuelPerTrip: 6, // sefer başına tüketim (L) — ~35 km tur, 17L/100km
  refuelCostPerUnit: 74, // ₺/L motorin — tam depo ≈ ₺5.920
  fuelFillRate: 16, // pompada dolum hızı (L/sn)

  // Bakım
  wearPerTrip: 6, // sefer başına yıpranma (%); 100'de araç bakım ister
  repairCostPerUnit: 120, // ₺/puan — tam bakım ≈ ₺12.000

  // Sefer/terminal ritmi
  tripDurationMin: 10, // sefer süresi (sn), ekran dışı
  tripDurationMax: 16,
  maxWaitAtPeron: 10, // dolmadan bekleyeceği azami süre (sn)
  spawnIntervalMin: 0.7, // yolcu geliş aralığı (sn)
  spawnIntervalMax: 2.0,
  nightSpawnFactor: 4, // gece yolcu aralığı çarpanı (00:00-06:00)
  maxQueue: 20,

  // Zaman: 1 oyun günü = 24 saat = 300 sn gerçek zaman. Saat 06:00'da başlar.
  dayLength: 300,
  clockStartHour: 6,
  nightEndHour: 6, // 00:00-06:00 arası sadece nöbetçi çalışır
  wageHour: 20, // yevmiyeler akşam bu saatte ödenir

  // Personel & yatırım
  driverWage: 1750, // ₺/gün
  driverHireCost: 4000, // ₺, işe alım
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

  toastLifetime: 3, // sn
}

// Oyun saati: time (sn) → gün + saat
export function clockOf(time: number): { day: number; hour: number } {
  const totalHours = CONFIG.clockStartHour + (time / CONFIG.dayLength) * 24
  return { day: Math.floor(totalHours / 24) + 1, hour: totalHours % 24 }
}
