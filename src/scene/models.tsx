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

// Yolcu: gövde kapsül + kafa — kuyrukta bekleyenler
export function PassengerMesh({ color }: { color: string }) {
  return (
    <group>
      <mesh geometry={sph(0.19, false)} material={mat('#e8b98c', 0.7)} position={[0, 0.78, 0]} castShadow />
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
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
