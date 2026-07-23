import * as THREE from 'three'

// Ring hattı: yumuşatılmış kapalı döngü. Trafik AI'ı yok — herkes bu spline'ı izler.
const CONTROL_POINTS: Array<[number, number]> = [
  [-32, -18],
  [0, -23],
  [32, -18],
  [39, 0],
  [32, 18],
  [0, 23],
  [-32, 18],
  [-39, 0],
]

export const curve = new THREE.CatmullRomCurve3(
  CONTROL_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  'catmullrom',
  0.6,
)

export const curveLength = curve.getLength()

// Durakların hat üzerindeki normalize konumları (arc-length param)
export const STOP_TS = [0.02, 0.27, 0.52, 0.77]
export const STOP_COUNT = STOP_TS.length

// t konumundaki noktanın yol dışına bakan birim normali (XZ düzleminde)
export function outwardNormal(tParam: number): THREE.Vector3 {
  const tangent = curve.getTangentAt(tParam)
  return new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
}

export function nextStopAfter(tParam: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < STOP_TS.length; i++) {
    const d = (STOP_TS[i] - tParam + 1) % 1
    if (d > 1e-4 && d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

// Yol şeridi geometrisi: spline boyunca örneklenmiş düz ribbon
export function buildRoadGeometry(width = 4.6, samples = 320): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= samples; i++) {
    const tp = (i % samples) / samples
    const p = curve.getPointAt(tp)
    const n = outwardNormal(tp).multiplyScalar(width / 2)
    positions.push(p.x - n.x, 0.02, p.z - n.z, p.x + n.x, 0.02, p.z + n.z)
  }
  for (let i = 0; i < samples; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
