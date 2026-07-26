// Terminal yerleşimi ve araç güzergahları. Serbest sürüş yok — herkes
// önceden tanımlı waypoint hatlarını izler, simülasyon bu sayede basit kalır.
export type P2 = [number, number] // [x, z]

export const LAYOUT = {
  aisleZ: 8, // park sırası ile peron arasındaki servis yolu
  peronX: -12, // biniş peronu (araç duruş noktası: [peronX, aisleZ])
  gateInX: -20, // giriş kapısı (batı) — dönen araçlar buradan girer
  gateOutX: 24, // çıkış kapısı (doğu) — sefere çıkan buradan yola bağlanır
  roadZ: 20, // ana yol merkezi
  roadHalf: 3.5,
  laneNearZ: 18.25, // +x yönü akan şerit (bizim araçlar bunu kullanır)
  laneFarZ: 21.75, // -x yönü akan şerit (ambiyans trafiği)
  offX: 90, // ekran dışı kabul edilen mesafe
  spotRowZ: 0, // ilk park sırası
  spotStartX: 4,
  spotGapX: 4.2, // cep aralığı — otobüs genişliği + manevra payı
  spotsPerRow: 10, // sıra başına cep
  spotRowGapZ: 7.6, // sıralar arası mesafe (körüklü otobüs sığar)
  spotRowOffsetX: 2.1, // arka sıra yarım cep kayar: çıkışta öndekilerin arasından geçilir
}

export function spotPos(i: number): P2 {
  const row = Math.floor(i / LAYOUT.spotsPerRow)
  const col = i % LAYOUT.spotsPerRow
  return [
    LAYOUT.spotStartX + col * LAYOUT.spotGapX + (row % 2) * LAYOUT.spotRowOffsetX,
    LAYOUT.spotRowZ - row * LAYOUT.spotRowGapZ,
  ]
}

// Servis otoparkı: sprinterlerin ayrı park alanı — ana ceplerin batısında,
// rent-a-car mantığıyla kendi şeridi var ama araçlar buradan fiilen sefere çıkar.
// Kolon x'leri şarj koridorunun (x=-4) batısında kalır; kuzeye, servis yoluna bakar.
export const SPRINTER_LOT = {
  startX: -18.5,
  gapX: 2.4,
  z: -3.8,
  max: 6,
}

export function sprinterSpotPos(i: number): P2 {
  return [SPRINTER_LOT.startX + i * SPRINTER_LOT.gapX, SPRINTER_LOT.z]
}

// Araç sınıfına göre park pozisyonu: sprinter kendi otoparkında, gerisi ana ceplerde
export function vehicleSpotPos(kind: string, i: number): P2 {
  return kind === 'sprinter' ? sprinterSpotPos(i) : spotPos(i)
}

// Peron durakları: 1. ana peron (güney platform), 2-3. kuzey cebindeki ek
// duraklar — satın alındıkça açılır, aynı anda birden çok araç yolcu alır.
// Kuzey cebi (z 10) servis yolunun dışında: bekleyen araç trafiği kapatmaz.
export const PERON_STOPS: P2[] = [
  [LAYOUT.peronX, LAYOUT.aisleZ],
  [-2, 10],
  [8, 10],
]

// Park yerinden perona (peron seçmeli)
export function toPeronPath(spot: P2, peronIdx = 0): P2[] {
  const stop = PERON_STOPS[peronIdx] ?? PERON_STOPS[0]
  if (peronIdx === 0) return [spot, [spot[0], LAYOUT.aisleZ], stop]
  // Kuzey cebine: servis yolundan cebe kırar, son metrede düzleşip platforma
  // paralel yanaşır (çapraz durmasın)
  return [
    spot,
    [spot[0], LAYOUT.aisleZ],
    [stop[0] - 5.5, LAYOUT.aisleZ],
    [stop[0] - 2.5, stop[1]],
    stop,
  ]
}

// Perondan doğu kapısına, sağa dönüp ekran dışına (sefer başlangıcı)
export const departPath: P2[] = [
  [LAYOUT.peronX, LAYOUT.aisleZ],
  [LAYOUT.gateOutX, LAYOUT.aisleZ],
  [LAYOUT.gateOutX, LAYOUT.laneNearZ],
  [LAYOUT.offX, LAYOUT.laneNearZ],
]

export function departPathOf(peronIdx: number): P2[] {
  if (peronIdx <= 0) return departPath
  const stop = PERON_STOPS[peronIdx] ?? PERON_STOPS[0]
  return [
    stop,
    [stop[0] + 2.5, stop[1]],
    [stop[0] + 5.5, LAYOUT.aisleZ],
    [LAYOUT.gateOutX, LAYOUT.aisleZ],
    [LAYOUT.gateOutX, LAYOUT.laneNearZ],
    [LAYOUT.offX, LAYOUT.laneNearZ],
  ]
}

// Parktan doğrudan sefere (özel servis/VIP/kontrat): cebinden çıkar,
// servis yolundan doğu kapısına sürer — ışınlanma yok
export function spotDepartPath(spot: P2): P2[] {
  return [
    spot,
    [spot[0], LAYOUT.aisleZ],
    [LAYOUT.gateOutX, LAYOUT.aisleZ],
    [LAYOUT.gateOutX, LAYOUT.laneNearZ],
    [LAYOUT.offX, LAYOUT.laneNearZ],
  ]
}

// Seferden dönüş: batı kapısından girip park yerine
export function returnPath(spot: P2): P2[] {
  return [
    [-LAYOUT.offX, LAYOUT.laneNearZ],
    [LAYOUT.gateInX, LAYOUT.laneNearZ],
    [LAYOUT.gateInX, LAYOUT.aisleZ],
    [spot[0], LAYOUT.aisleZ],
    spot,
  ]
}

// Terminal içi akaryakıt pompası: "Doldur" basınca araç buraya sürer
export const PUMP_STOP: P2 = [1, 4.5]

export function toPumpPath(spot: P2): P2[] {
  return [spot, [spot[0], LAYOUT.aisleZ], [PUMP_STOP[0], LAYOUT.aisleZ], PUMP_STOP]
}

export function fromPumpPath(spot: P2): P2[] {
  return [PUMP_STOP, [PUMP_STOP[0], LAYOUT.aisleZ], [spot[0], LAYOUT.aisleZ], spot]
}

// Şarj istasyonu (tesis şeridinde): elektrikli araçlar pompaya değil buraya sürer.
// x=-4 dikey koridoru park ceplerinin batısında kalır — parktakilere çarpmaz.
export const CHARGE_STOP: P2 = [-4, -11]

export function toChargePath(spot: P2): P2[] {
  return [spot, [spot[0], LAYOUT.aisleZ], [CHARGE_STOP[0], LAYOUT.aisleZ], CHARGE_STOP]
}

export function fromChargePath(spot: P2): P2[] {
  return [CHARGE_STOP, [CHARGE_STOP[0], LAYOUT.aisleZ], [spot[0], LAYOUT.aisleZ], spot]
}

// Tamirhane servis alanı: ağır arızalı araç doğu koridorundan (x=47, tüm park
// ceplerinin dışından) inip tamirhanenin yanındaki servis parkına çekilir
export const REPAIR_STOP: P2 = [28.5, -13]

export function toRepairPath(spot: P2): P2[] {
  return [spot, [spot[0], LAYOUT.aisleZ], [47, LAYOUT.aisleZ], [47, REPAIR_STOP[1]], REPAIR_STOP]
}

export function fromRepairPath(spot: P2): P2[] {
  return [REPAIR_STOP, [47, REPAIR_STOP[1]], [47, LAYOUT.aisleZ], [spot[0], LAYOUT.aisleZ], spot]
}

export function pathLength(path: P2[]): number {
  let len = 0
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
  }
  return len
}

// Hat üzerinde `dist` kadar ilerlemiş aracın konumu ve yönü
export function pointAt(path: P2[], dist: number): { x: number; z: number; angle: number } {
  let remaining = dist
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0]
    const dz = path[i][1] - path[i - 1][1]
    const segLen = Math.hypot(dx, dz)
    if (remaining <= segLen || i === path.length - 1) {
      const f = segLen === 0 ? 0 : Math.min(remaining / segLen, 1)
      return {
        x: path[i - 1][0] + dx * f,
        z: path[i - 1][1] + dz * f,
        angle: Math.atan2(dx, dz),
      }
    }
    remaining -= segLen
  }
  const [x, z] = path[path.length - 1]
  return { x, z, angle: 0 }
}
