import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// Geometri/materyal önbelleği: aynı parça her mesh'te yeniden üretilmez.
// Tüm modeller prosedürel — asset yok, modern görünüm yuvarlatılmış hatlardan gelir.
const geoCache = new Map<string, THREE.BufferGeometry>()
const matCache = new Map<string, THREE.Material>()

export function rbox(w: number, h: number, d: number, r = 0.08): THREE.BufferGeometry {
  const key = `rb:${w},${h},${d},${r}`
  let g = geoCache.get(key)
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2))
    geoCache.set(key, g)
  }
  return g
}

export function cyl(rTop: number, rBot: number, h: number, seg = 16): THREE.BufferGeometry {
  const key = `cy:${rTop},${rBot},${h},${seg}`
  let g = geoCache.get(key)
  if (!g) {
    g = new THREE.CylinderGeometry(rTop, rBot, h, seg)
    geoCache.set(key, g)
  }
  return g
}

export function sph(r: number, flat = false): THREE.BufferGeometry {
  const key = `sp:${r},${flat}`
  let g = geoCache.get(key)
  if (!g) {
    g = flat ? new THREE.IcosahedronGeometry(r, 1) : new THREE.SphereGeometry(r, 20, 14)
    geoCache.set(key, g)
  }
  return g
}

export function mat(
  color: string,
  rough = 0.55,
  opts: { flat?: boolean; emissive?: string; emissiveIntensity?: number; metal?: number } = {},
): THREE.Material {
  const key = `m:${color},${rough},${opts.flat ?? false},${opts.emissive ?? ''},${opts.emissiveIntensity ?? 0},${opts.metal ?? 0}`
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: opts.metal ?? 0,
      flatShading: opts.flat ?? false,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    })
    matCache.set(key, m)
  }
  return m
}

export function glassMat(): THREE.Material {
  const key = 'glass'
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: '#bcd9e8',
      roughness: 0.15,
      transparent: true,
      opacity: 0.35,
    })
    matCache.set(key, m)
  }
  return m
}

const GLASS_DARK = '#242f3a'
const TIRE = '#1d2126'
const HUB = '#c8ccd1'

export function Wheel({ x, z, r = 0.3 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={cyl(r, r, 0.26)} material={mat(TIRE, 0.9)} castShadow />
      <mesh geometry={cyl(r * 0.55, r * 0.55, 0.27)} material={mat(HUB, 0.35, { metal: 0.4 })} />
    </group>
  )
}

// Sedan / hatchback / pickup — ambiyans trafiği için modern kasa
export function CarMesh({ color, kind = 'sedan' }: { color: string; kind?: 'sedan' | 'hatch' | 'pickup' }) {
  const cabinZ = kind === 'pickup' ? 0.55 : kind === 'hatch' ? -0.25 : 0
  return (
    <group>
      <mesh geometry={rbox(1.5, 0.52, 3.0, 0.18)} material={mat(color, 0.35)} position={[0, 0.52, 0]} castShadow />
      <mesh
        geometry={rbox(1.3, 0.46, kind === 'pickup' ? 1.15 : 1.55, 0.16)}
        material={mat(GLASS_DARK, 0.2)}
        position={[0, 0.96, cabinZ]}
        castShadow
      />
      <mesh
        geometry={rbox(1.16, 0.07, kind === 'pickup' ? 0.95 : 1.3, 0.04)}
        material={mat(color, 0.35)}
        position={[0, 1.2, cabinZ]}
      />
      {kind === 'pickup' && (
        <mesh geometry={rbox(1.32, 0.08, 1.25, 0.03)} material={mat('#3a3f45', 0.8)} position={[0, 0.8, -0.85]} />
      )}
      {/* Farlar ve stoplar */}
      {[-0.48, 0.48].map((x) => (
        <mesh
          key={`h${x}`}
          geometry={rbox(0.3, 0.12, 0.06, 0.03)}
          material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })}
          position={[x, 0.58, 1.51]}
        />
      ))}
      {[-0.5, 0.5].map((x) => (
        <mesh
          key={`t${x}`}
          geometry={rbox(0.26, 0.11, 0.05, 0.03)}
          material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })}
          position={[x, 0.58, -1.51]}
        />
      ))}
      <Wheel x={-0.74} z={1.0} r={0.29} />
      <Wheel x={0.74} z={1.0} r={0.29} />
      <Wheel x={-0.74} z={-1.0} r={0.29} />
      <Wheel x={0.74} z={-1.0} r={0.29} />
    </group>
  )
}

// Yolcu: kafa + gövde + bacaklar, kimi çantalı — variant ile deterministik çeşitlilik
const SKIN_TONES = ['#e8b98c', '#d9a06b', '#c98a5b', '#f0c9a0']
const PANTS = ['#3a4454', '#5a5248', '#2e3a2e', '#4a3b52']
const BAGS = ['#8a4a3a', '#3a5a7a', '#6b6b3a']

export function PassengerMesh({ color, variant = 0 }: { color: string; variant?: number }) {
  const h = 0.92 + (variant % 3) * 0.07 // boy çeşitliliği
  const skin = SKIN_TONES[variant % SKIN_TONES.length]
  const pants = PANTS[(variant * 3 + 1) % PANTS.length]
  const hasBag = variant % 4 === 0
  return (
    <group scale={h}>
      {/* Bacaklar */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} geometry={cyl(0.06, 0.07, 0.34, 8)} material={mat(pants, 0.8)} position={[x, 0.17, 0]} />
      ))}
      {/* Gövde */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.36, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Kollar */}
      {[-0.21, 0.21].map((x) => (
        <mesh key={x} geometry={cyl(0.045, 0.05, 0.36, 8)} material={mat(color, 0.75)} position={[x, 0.56, 0]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]} />
      ))}
      {/* Kafa */}
      <mesh geometry={sph(0.15, false)} material={mat(skin, 0.7)} position={[0, 0.92, 0]} castShadow />
      {/* Çanta */}
      {hasBag && (
        <mesh geometry={rbox(0.22, 0.26, 0.12, 0.04)} material={mat(BAGS[variant % BAGS.length], 0.8)} position={[0.3, 0.32, 0]} />
      )}
    </group>
  )
}

// Çöp kutusu — durak/peron aksesuarı
export function TrashBin() {
  return (
    <group>
      <mesh geometry={cyl(0.2, 0.17, 0.55, 12)} material={mat('#3d6b4f', 0.7)} position={[0, 0.28, 0]} castShadow />
      <mesh geometry={cyl(0.22, 0.22, 0.06, 12)} material={mat('#2e5240', 0.7)} position={[0, 0.58, 0]} />
    </group>
  )
}

// Türk mahalle apartmanı: pencere grid'i, balkonlar, zemin katta kepenkli dükkân
export function Apartment({
  w = 9,
  floors = 4,
  color,
  awning = '#c94f4f',
  seed = 0,
}: {
  w?: number
  floors?: number
  color: string
  awning?: string
  seed?: number
}) {
  const floorH = 1.9
  const baseH = 2.3 // zemin kat (dükkân)
  const H = baseH + floors * floorH
  const cols = Math.max(2, Math.floor(w / 2.4))
  const colXs = Array.from({ length: cols }, (_, i) => -w / 2 + (w / (cols + 1)) * (i + 1) + w / (2 * (cols + 1)))
  return (
    <group>
      {/* Gövde */}
      <mesh geometry={rbox(w, H, 7, 0.08)} material={mat(color, 0.75)} position={[0, H / 2, 0]} castShadow />
      {/* Çatı parapeti + teras */}
      <mesh geometry={rbox(w + 0.3, 0.35, 7.3, 0.06)} material={mat('#8c8579', 0.8)} position={[0, H + 0.12, 0]} />
      <mesh geometry={rbox(1.2, 0.7, 1.2, 0.06)} material={mat('#b3b8bd', 0.7)} position={[w / 4, H + 0.6, -1]} />
      {/* Zemin kat dükkân: vitrin + tente */}
      <mesh geometry={rbox(w - 0.8, 1.5, 0.15, 0.04)} material={mat('#2f3b46', 0.3)} position={[0, 1.05, 3.5]} />
      <mesh
        geometry={rbox(w - 0.6, 0.08, 1.3, 0.03)}
        material={mat(awning, 0.6)}
        position={[0, 2.25, 4.05]}
        rotation={[0.32, 0, 0]}
        castShadow
      />
      {/* Kat pencereleri + balkonlar */}
      {Array.from({ length: floors }, (_, f) =>
        colXs.map((x, c) => {
          const y = baseH + f * floorH + 1.0
          const lit = (seed * 7 + f * 3 + c) % 6 === 0
          const hasBalcony = (seed + f + c) % 3 === 1
          return (
            <group key={`${f},${c}`}>
              <mesh
                geometry={rbox(0.95, 1.05, 0.1, 0.03)}
                material={
                  lit
                    ? mat('#ffd98c', 0.4, { emissive: '#ffca5f', emissiveIntensity: 0.5 })
                    : mat('#42525f', 0.25)
                }
                position={[x, y, 3.52]}
              />
              {hasBalcony && (
                <group position={[x, y - 0.62, 3.95]}>
                  <mesh geometry={rbox(1.5, 0.09, 0.85, 0.03)} material={mat('#cfc9bd', 0.8)} castShadow />
                  <mesh geometry={rbox(1.5, 0.45, 0.07, 0.02)} material={mat('#9aa1a8', 0.6)} position={[0, 0.26, 0.4]} />
                </group>
              )}
            </group>
          )
        }),
      )}
    </group>
  )
}

// Yumuşak blob ağaç — referans oyundaki toparlak yeşillik
export function TreeBlob({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh geometry={cyl(0.13, 0.18, 1.0, 8)} material={mat('#8a6844', 0.9)} position={[0, 0.5, 0]} />
      <mesh geometry={sph(0.95, true)} material={mat('#69a85c', 0.8, { flat: true })} position={[0, 1.75, 0]} castShadow />
      <mesh geometry={sph(0.55, true)} material={mat('#7cb96d', 0.8, { flat: true })} position={[0.55, 1.3, 0.35]} castShadow />
    </group>
  )
}

export function TreePine({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh geometry={cyl(0.14, 0.2, 1.2, 8)} material={mat('#8a6844', 0.9)} position={[0, 0.6, 0]} />
      <mesh geometry={cyl(0.02, 1.0, 2.6, 10)} material={mat('#4f8f4a', 0.8, { flat: true })} position={[0, 2.3, 0]} castShadow />
    </group>
  )
}

// Sokak lambası — yol kenarı ambiyansı
export function StreetLamp({ flip = false }: { flip?: boolean }) {
  const dir = flip ? -1 : 1
  return (
    <group>
      <mesh geometry={cyl(0.06, 0.09, 4.4, 10)} material={mat('#697077', 0.6, { metal: 0.3 })} position={[0, 2.2, 0]} castShadow />
      <mesh geometry={rbox(0.08, 0.07, 1.1, 0.03)} material={mat('#697077', 0.6, { metal: 0.3 })} position={[0, 4.35, dir * 0.5]} />
      <mesh
        geometry={rbox(0.26, 0.09, 0.55, 0.04)}
        material={mat('#fff3c9', 0.3, { emissive: '#ffe89a', emissiveIntensity: 0.8 })}
        position={[0, 4.28, dir * 1.0]}
      />
    </group>
  )
}
