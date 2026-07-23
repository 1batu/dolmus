// Ekonomi ve simülasyon dengesi tek yerden. / Single source of truth for game balance.
export const CONFIG = {
  seatCount: 14, // klasik minibüs koltuk sayısı
  busSpeed: 9, // birim/sn, hat üzerinde
  dwellBase: 0.6, // durakta minimum bekleme (sn)
  dwellPerPassenger: 0.3, // iniş/biniş başına ek süre (sn)
  farePerSegment: 8, // ₺, durak arası başına
  spawnIntervalMin: 0.9, // yolcu doğma aralığı (sn)
  spawnIntervalMax: 2.4,
  maxQueue: 10, // durak başına kuyruk limiti
  busBaseCost: 400, // yeni minibüs taban fiyatı, her araçta katlanır
  toastLifetime: 3, // sn
}
