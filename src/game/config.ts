// Ekonomi ve simülasyon dengesi tek yerden. / Single source of truth for game balance.
export const CONFIG = {
  seatCount: 14, // klasik minibüs koltuk sayısı
  vehicleSpeed: 10, // birim/sn
  boardInterval: 0.35, // biniş hızı: sn/yolcu
  farePerPassenger: 18, // ₺, sefer başına yolcu ücreti
  fuelCapacity: 100, // depo (birim)
  fuelPerTrip: 20, // sefer başına yakıt tüketimi (birim)
  refuelCostPerUnit: 1.8, // ₺/birim — tam depo ≈ ₺180
  fuelFillRate: 22, // pompada dolum hızı (birim/sn)
  wearPerTrip: 8, // sefer başına yıpranma (%); 100'de araç bakım ister
  repairCostPerUnit: 2.2, // ₺/yıpranma puanı — tam bakım ≈ ₺220
  tripDurationMin: 12, // sefer süresi (sn), ekran dışı
  tripDurationMax: 22,
  maxWaitAtPeron: 12, // dolmadan bekleyeceği azami süre (sn)
  spawnIntervalMin: 0.8, // terminale yolcu geliş aralığı (sn)
  spawnIntervalMax: 2.2,
  maxQueue: 20, // peron kuyruğu limiti
  dayLength: 45, // 1 oyun günü (sn)
  driverWage: 100, // ₺/gün, şoför yevmiyesi
  driverHireCost: 150, // ₺, işe alım
  vehicleBaseCost: 400, // her araçta katlanır
  spotBaseCost: 200, // her park yerinde katlanır
  maxSpots: 8, // tek sıra park kapasitesi
  startMoney: 150,
  startSpots: 2,
  toastLifetime: 3, // sn
}
