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
  enRouteFaresMin: 38, // hat boyunca inen-binen ek yolcu (dönüşte kasaya girer)
  enRouteFaresMax: 72, // İstanbul yoğunluğu: gerçek günlük ciroyu yakalayan ana kalem
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
  // Filo etkisi: hat büyüdükçe talep büyür (talep ağırlığı başına — otobüs > minibüs)
  fleetSpawnBonus: 0.2, // yolcu geliş hızı artışı (+%20/ağırlık birimi)
  fleetQueueBonus: 6, // kuyruk kapasitesi artışı (+6/araç)
  fleetEnRouteBonus: 0.1, // hat boyu indi-bindi artışı (+%10/araç)

  // Zaman: 1 oyun günü = 24 saat = 300 sn gerçek zaman. Saat 06:00'da başlar.
  dayLength: 300,
  clockStartHour: 6,
  nightEndHour: 6, // 00:00-06:00 arası sadece nöbetçi çalışır
  nightTimeScale: 2, // gece simülasyon 2 kat hızlı akar — sabah çabuk gelir
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
  minOwnShare: 0, // %100 satılabilir — hisse 0'a inince araç filodan çıkar
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
  maxSpots: 20, // iki sıra × 10 cep — otobüs filosuna yer var
  // Ek peron durakları: aynı anda birden çok araç yolcu alır (kuyruk hızlı erir)
  peronMax: 3,
  peronCosts: [2500000, 7500000], // 2. ve 3. peronun bedeli
  startMoney: 100000000, // TEST: normali 150000 — yayından önce geri al!
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

  // VIP transfer aracı (Uber tarzı): çağrı bazlı çalışır, peron kullanmaz, gece de sürer
  vitoCost: 900000, // ₺ (siyah transfer aracı)
  vitoCostStep: 150000, // her ilave araçta artış
  vitoCallMin: 12, // çağrılar arası bekleme (sn)
  vitoCallMax: 35,
  vitoNightCallFactor: 1.6, // gece çağrı seyrekliği çarpanı
  vitoKmMin: 3, // çağrı mesafesi (km)
  vitoKmMax: 40,
  vitoBaseFare: 800, // ₺ açılış — VIP transfer gerçekte ₺2.500-6.000/yolculuk bandında
  vitoPerKmMin: 90, // ₺/km bandı (ort. çağrı ~₺3.200, havalimanı ~₺5.500)
  vitoPerKmMax: 140,
  vitoDurationBase: 8, // sn + km başına süre
  vitoDurationPerKm: 0.7,
  vitoFuelPerKm: 0.3, // L/km
  vitoWearBase: 1.5, // % + km başına yıpranma
  vitoWearPerKm: 0.05,

  // Servis aracı (Sprinter panelvan): hat işine girmez — kontrat seferlerine
  // öncelikli çıkar, boşken özel servis tekliflerini kapar. Şoförlü her sprinter
  // +1 kontrat slotu açar; koştuğu kontrat seferi konfor primiyle daha iyi öder.
  sprinterCost: 1250000, // ₺ 16+1 servis dönüşümlü panelvan (2. el)
  sprinterCostStep: 150000, // her ilave sprinterde artış
  sprinterContractFactor: 0.6, // kontrat seferi yakıt/yıpranma çarpanı (idareli kasa)
  sprinterContractBonus: 0.2, // sprinter koşan sefer ödemesine konfor primi
  sprinterSlotCap: 4, // sprinterlerin ekleyebileceği azami kontrat slotu

  // Otobüs sınıfı hat araçları: özel halk otobüsü ruhu — büyük kasa, büyük ciro, büyük masraf
  busCost: 5500000, // ₺ solo otobüs (12 m, Otokar Kent sınıfı 2. el)
  busCostStep: 600000, // her ilave otobüste artış
  articCost: 9500000, // ₺ körüklü otobüs (18 m)
  articCostStep: 900000,
  ebusCost: 12500000, // ₺ elektrikli otobüs — şarj istasyonu şart
  ebusCostStep: 1000000,

  // Elektrik & akaryakıt tesisleri
  sarjCost: 850000, // şarj istasyonu — elektrikli otobüsün ön şartı
  elektrikPriceFactor: 0.3, // ₺/kWh eşleniği = motorin fiyatı × bu (elektrik çok daha ucuz)
  solarCost: 1600000, // güneş paneli + depo bataryası
  solarChargeFactor: 0.35, // güneşle depolanan enerji: şarj maliyeti çarpanı
  yakitTankiCost: 750000, // terminal akaryakıt tankı
  yakitTankiDiscount: 0.9, // kendi araçların pompa fiyatı çarpanı (toptan mazot)
  yakitTankiSaleLMin: 150, // dışarıya saatlik satış bandı (L) — hattın esnafı + servisler tanktan alır
  yakitTankiSaleLMax: 400, // (gerçek küçük istasyon 5-15 bin L/gün satar; bu ölçek onun terminal payı)
  yakitTankiMarginPerL: 9, // ₺/L kâr marjı (toptan alım - pompa farkı)
  yakitTankiFleetBonus: 0.06, // talep ağırlığı başına satış hacmi artışı — hat büyüdükçe tank döner

  // Servis kontratları: okul/personel — sabah-akşam iki sefer, günlük sabit gelir.
  // Tem 2026 tarifesi: okul servisi ₺4.456/öğrenci-ay (0-1 km), personel ₺2.513/kişi-ay
  // taban — dolu bir araç aylık ₺135-285k kontrat cirosu yapar
  contractSlots: 2, // taban kontrat kapasitesi — filo büyüdükçe artar (contractSlotsOf)
  contractSlotsMax: 6,
  contractSlotsPerFleet: 4, // her 4 şoförlü araca +1 slot
  contractOfferMin: 60, // yeni teklif aralığı (sn)
  contractOfferMax: 140,
  contractOfferLifetime: 90, // teklifin geçerlilik süresi (sn)
  contractDays: 30, // kontrat süresi (gün)
  contractDailyMin: 4500, // günlük ödeme bandı (₺)
  contractDailyMax: 9500,
  contractMorningHour: 7, // sabah seferi penceresi başlangıcı
  contractEveningHour: 17, // akşam seferi
  contractGraceHours: 2, // pencere içinde araç çıkmazsa sefer kaçar
  contractRunDuration: 22, // sefer süresi (sn)
  contractFuel: 8, // sefer yakıtı (L)
  contractWear: 3, // sefer yıpranması (%)
  contractMissRep: 0.1, // kaçan sefer itibar cezası

  // Taksi işletmesi: plaka Tem 2026 İstanbul borsası — geç oyun hedefi.
  // Taksimetre (20 Tem 2026): açılış ₺71,94 · km ₺47,92 · indi-bindi ₺230
  taxiPlateCost: 11500000, // ₺ (gerçek: ₺11,5-12M)
  taxiPlateMax: 3,
  taxiRentDaily: 2200, // kiradaki plakanın günlük getirisi (~₺66k/ay)
  taxiCarCost: 750000, // sarı taksi aracı
  taxiOperateMin: 6500, // gündüz vardiyası günlük net bandı (₺, yeni tarifeyle)
  taxiOperateMax: 13000,
  // Gece vardiyası: ikinci şoför tut, taksi 24 saat döner — gece hasılatı düşükçe
  taxiNightMin: 4500,
  taxiNightMax: 9000,
  taxiNightWage: 2500, // gece şoförü yevmiyesi

  // Araç kiralama (rent-a-car): ofis kur, filo al — her akşam doluluk oranınca kira yatar
  kiralamaOfisCost: 500000, // ₺ ofis + otopark alanı
  rentalCarCost: 1100000, // ₺ sıfır sedan (filo alım fiyatı)
  rentalCarStep: 100000, // her ilave araçta artış
  rentalCarMax: 15, // yazıhane arkasındaki otopark kapasitesi
  rentalDailyMin: 2500, // günlük kira bandı (₺, 2026: ekonomik sedan ₺2.500-4.500)
  rentalDailyMax: 4500,
  rentalOccBase: 0.55, // doluluk tabanı — itibar yükseldikçe artar
  rentalOccPerRep: 0.06, // yıldız başına doluluk artışı
  // Kiralık araçlar gerçek araçtır: yakıt yakar, yıpranır, bakım ister
  rentalTank: 60, // benzinli sedan deposu (L)
  rentalFuelPerDayMin: 12, // kiralanan günde yakılan yakıt (L)
  rentalFuelPerDayMax: 22,
  rentalWearPerDayMin: 4, // kiralanan günde yıpranma (%)
  rentalWearPerDayMax: 8,
  rentalRepairPerUnit: 60, // ₺/puan — tam bakım ≈ ₺6.000
  rentalMinFuel: 15, // altında araç kiraya verilemez (depo doldur)
  // Teminat: kiralamada müşteriden alınır; teslimde yıpranma bedeli kesilir,
  // kalanı 3-4 gün sonra iade edilir. Yakıt full-to-full: müşteri doldurup verir.
  rentalDeposit: 15000, // ₺
  rentalRefundDaysMin: 3,
  rentalRefundDaysMax: 4,

  // Araç modifiye: araç başına tek seferlik yükseltmeler (fiyat kasa boyuyla ölçekli)
  modEngineCost: 150000, // motor yenileme
  modEngineFuelFactor: 0.8, // sefer tüketimi çarpanı (-%20)
  modLpgCost: 80000, // LPG dönüşümü (elektrikliye takılamaz)
  modLpgPriceFactor: 0.65, // yakıt birim fiyatı çarpanı
  modAcCost: 60000, // klima
  modAcRepFactor: 1.5, // sefer itibar kazancı çarpanı
  modSoundCost: 45000, // ses sistemi
  modSoundEnRouteBonus: 0.08, // hat hasılatı bonusu

  // Reklam: billboard (tesis) + araç giydirme — reklamveren her akşam öder
  billboardCost: 400000,
  billboardDailyMin: 8000,
  billboardDailyMax: 15000,
  wrapDailyMin: 1500, // giydirilmiş araç başına günlük reklam geliri
  wrapDailyMax: 3000,

  // Offline kazanç: kapalıyken terminal düşük verimle çalışır
  offlineCapSec: 4 * 3600, // azami birikim süresi (gerçek sn)
  offlineEfficiency: 0.5, // aktif oyuna göre verim
  offlineRatePerVehicle: 28, // ₺/sn, şoförlü dolmuş başına tahmini net

  // Olaylar: gündüz rastgele — zabıta, lastik, yağmur, korsan
  eventIntervalMin: 70, // sn
  eventIntervalMax: 160,
  zabitaFinePerStanding: 2500, // ayakta yolcu başına ceza
  zabitaCleanRep: 0.05, // temiz denetim itibar bonusu
  tireBlowWear: 18, // lastik patlaması yıpranması (%)
  rainDuration: 45, // sn
  rainSpawnFactor: 0.55, // yağmurda yolcu aralığı çarpanı (daha sık)
  korsanDuration: 40, // sn
  korsanSpawnFactor: 1.6, // korsan varken yolcu aralığı çarpanı (seyrek)

  // Şoför becerisi: seviye başına biniş hızı ve yakıt verimliliği
  driverSkillBoardBonus: 0.08, // boardInterval çarpan azalması / seviye
  driverSkillFuelBonus: 0.05, // sefer yakıtı azalması / seviye

  // Otomasyon anlaşmaları (İnşaat > Tesisler)
  otoPompaCost: 150000, // depo azalınca araç kendiliğinden pompaya gider
  otoBakimCost: 200000, // yıpranma %80'i geçince otomatik bakım
  hat2Cost: 25000000, // ikinci hat plakası (Kadıköy) — geç oyun zirvesi
  hat2SpawnBonus: 0.25, // ikinci hatla yolcu akışı
  hat2EnRouteBonus: 0.35, // ikinci hatla güzergah hasılatı

  // Prestij: hattı devret, kalıcı bonuslarla yeni başla
  prestigeSpawnBonus: 0.05, // seviye başına yolcu akış hızı
  prestigeMoneyBonus: 0.25, // seviye başına başlangıç parası çarpanı
  prestigeRepBonus: 0.2, // seviye başına başlangıç itibarı

  // Ekonomi haberleri: motorin/tarife canlı değişir (state'te tutulur)
  newsIntervalMin: 180, // sn (~her oyun günü bir haber)
  newsIntervalMax: 400,
  fuelPriceMin: 60, // ₺/L bandı
  fuelPriceMax: 130,
  fareMin: 43, // indi-bindi bandı
  fareMax: 90,

  // Yolcu tipleri: biniş anında istatistiksel örneklenir
  pctKacak: 0.05, // kaçak binen — kahya varsa yakalanır ve öder
  pctStudent: 0.15, // öğrenci: indirimli ama itibar kazandırır
  pctTourist: 0.1, // turist: bahşiş şansı
  studentFareFactor: 0.65,
  studentRep: 0.004, // öğrenci başına itibar
  touristTipChance: 0.35,
  touristTipMin: 10,
  touristTipMax: 35,

  // Şoför morali: düşerse beceri işlemez, çay molası tazeler
  moralDecayPerDay: 8,
  moralLowThreshold: 40,
  cayMolasiCost: 250,
  cayMolasiBoost: 45,
  moralDecayCayFactor: 0.5, // çay ocağı varsa moral yarı hızda düşer

  // Şoför pazarı: her gün 2 aday (yıldızı belli, ücreti yıldıza göre)
  marketHirePerSkill: 3500,

  // Banka: vadeli mevduat + kurumsal kredi (senetin medeni rakibi)
  // Tem 2026 gerçek piyasa: TCMB politika faizi %37, mevduat yıllık %35-46,
  // ihtiyaç kredisi aylık %2,8-5,5 (ort. %3,7). Oyun günü kısa olduğu için
  // oranlar ~×3 tempo çarpanıyla ölçekli; bankalar arası makas gerçek piyasayla aynı.
  depositTerms: [7, 15, 30], // vade seçenekleri (gün)
  // Gerçek (Tem 2026): 1M TL 32 günde net ₺30-33k (%3-3,3). Oyun günü 5 dk olduğu
  // için tempo çarpanıyla: 30 günde ~%27 (Boğaziçi ×1,2 ile ~%32) — filo getirisiyle
  // yarışmaz ama atıl parayı bekletmeye değer
  depositDailyRates: [0.005, 0.007, 0.009], // günlük basit faiz
  depositMin: 10000, // asgari mevduat ₺
  bankLoanMarkup: 0.055, // taban vade farkı ≈ aylık %3,7 (Tem 2026 ihtiyaç kredisi ortalaması)
  bankLoanScorePenalty: 0.06, // (100-skor)/100 × bu kadar ek vade farkı — kötü skor %5,5/ay bandına iter
  bankLoanTermDays: 45,
  bankMinRep: 3.5, // kredi için asgari itibar
  bankLimitFactor: 10, // limit = son 7 gün ort. günlük gelir × bu
  bankAssetFactor: 0.5, // hipotek: filo değerinin bu kadarı limite eklenir
  creditScoreStart: 70, // 0-100
  creditScoreMissPenalty: 8, // ödeme günü kasa eksideyse
  creditScoreGoodDay: 1, // temiz ödeme günü başına
  creditScoreMin: 30, // altında banka kredi vermez

  toastLifetime: 3, // sn
}

// Araç sınıfı özellikleri: koltuk, depo, tüketim, masraf — hepsi kasaya göre ölçeklenir.
// ebus deposu kWh cinsindendir; birim fiyatı elektrikPriceFactor belirler.
export type VehicleSpec = {
  seats: number
  tank: number // L (ebus: kWh)
  fuelPerTrip: number // sefer başına tüketim (L / kWh)
  wearPerTrip: number // sefer başına yıpranma (%)
  repairMult: number // bakım maliyeti çarpanı
  boardMult: number // biniş süresi çarpanı (kapı sayısı etkisi)
  enRouteMult: number // hat boyu indi-bindi çarpanı
  repMult: number // sefer başına itibar çarpanı (elektrikli çevreci)
  demandWeight: number // talep katkısı: otobüs durağa minibüsten çok yolcu çeker
}
export const VEHICLE_SPECS: Record<string, VehicleSpec> = {
  dolmus: { seats: 14, tank: 80, fuelPerTrip: 6, wearPerTrip: 4, repairMult: 1, boardMult: 1, enRouteMult: 1, repMult: 1, demandWeight: 1 },
  vito: { seats: 6, tank: 80, fuelPerTrip: 6, wearPerTrip: 4, repairMult: 1, boardMult: 1, enRouteMult: 1, repMult: 1, demandWeight: 0 },
  sprinter: { seats: 17, tank: 75, fuelPerTrip: 5, wearPerTrip: 3.5, repairMult: 1.1, boardMult: 1, enRouteMult: 1, repMult: 1, demandWeight: 0 },
  bus: { seats: 27, tank: 200, fuelPerTrip: 14, wearPerTrip: 4, repairMult: 1.8, boardMult: 1, enRouteMult: 1.7, repMult: 1, demandWeight: 1.8 },
  artic: { seats: 42, tank: 300, fuelPerTrip: 19, wearPerTrip: 4.5, repairMult: 2.4, boardMult: 0.8, enRouteMult: 2.3, repMult: 1, demandWeight: 2.6 },
  ebus: { seats: 30, tank: 250, fuelPerTrip: 15, wearPerTrip: 3.5, repairMult: 1.3, boardMult: 0.9, enRouteMult: 1.8, repMult: 2, demandWeight: 2 },
}

// Kontrat kapasitesi: taban + her N şoförlü araca bir slot (filo büyüdükçe kurumlar
// kapını çalar) + şoförlü her servis sprinteri bir slot daha açar
export function contractSlotsOf(activeFleet: number, sprinters = 0): number {
  return (
    Math.min(
      CONFIG.contractSlotsMax,
      CONFIG.contractSlots + Math.floor(activeFleet / CONFIG.contractSlotsPerFleet),
    ) + Math.min(CONFIG.sprinterSlotCap, sprinters)
  )
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
