// Terminal yerleşimi ve araç güzergahları. Serbest sürüş yok — herkes
// önceden tanımlı waypoint hatlarını izler, simülasyon bu sayede basit kalır.
export type P2 = [number, number] // [x, z]

export const LAYOUT = {
  aisleZ: 8, // park sırası ile peron arasındaki servis yolu
  peronX: -12, // biniş peronu (araç duruş noktası: [peronX, aisleZ])
  entranceX: 2, // ana yola bağlanan giriş
  roadZ: 20, // ana yol merkezi
  roadHalf: 3.5,
  laneNearZ: 18.25, // +x yönü akan şerit (bizim araçlar bunu kullanır)
  laneFarZ: 21.75, // -x yönü akan şerit (ambiyans trafiği)
  offX: 90, // ekran dışı kabul edilen mesafe
  spotRowZ: 0, // park sırası
  spotStartX: 8,
  spotGapX: 3.6,
}

export function spotPos(i: number): P2 {
  return [LAYOUT.spotStartX + i * LAYOUT.spotGapX, LAYOUT.spotRowZ]
}

// Park yerinden perona
export function toPeronPath(spot: P2): P2[] {
  return [spot, [spot[0], LAYOUT.aisleZ], [LAYOUT.peronX, LAYOUT.aisleZ]]
}

// Perondan ana yola, sağa dönüp ekran dışına (sefer başlangıcı)
export const departPath: P2[] = [
  [LAYOUT.peronX, LAYOUT.aisleZ],
  [LAYOUT.entranceX, LAYOUT.aisleZ],
  [LAYOUT.entranceX, LAYOUT.laneNearZ],
  [LAYOUT.offX, LAYOUT.laneNearZ],
]

// Seferden dönüş: ekran dışından girip park yerine
export function returnPath(spot: P2): P2[] {
  return [
    [-LAYOUT.offX, LAYOUT.laneNearZ],
    [LAYOUT.entranceX, LAYOUT.laneNearZ],
    [LAYOUT.entranceX, LAYOUT.aisleZ],
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
