import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ContactShadow, facadeTex } from './textures'

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

// Cephe malzemesi: renk × sıva dokusu (renk başına önbellekli)
const facadeCache = new Map<string, THREE.MeshStandardMaterial>()
export function facadeMat(color: string): THREE.MeshStandardMaterial {
  let m = facadeCache.get(color)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, map: facadeTex, roughness: 0.85 })
    facadeCache.set(color, m)
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

// Taksi damalı bandı: siyah-beyaz iki sıra kare — İstanbul taksisinin imzası
let checkerM: THREE.MeshBasicMaterial | null = null
function checkerMat(): THREE.MeshBasicMaterial {
  if (!checkerM) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 16; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#111111' : '#f5f2ea'
        ctx.fillRect(c * 16, r * 16, 16, 16)
      }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    checkerM = new THREE.MeshBasicMaterial({ map: tex })
  }
  return checkerM
}

// Sedan / hatchback / pickup / taksi — Egea sınıfı üç kutu silüet: kama burun,
// yuvarlak sera, bagaj basamağı. Taksi: sarı kasa + damalı bant + tepe lambası.
export function CarMesh({
  color,
  kind = 'sedan',
}: {
  color: string
  kind?: 'sedan' | 'hatch' | 'pickup' | 'taxi'
}) {
  const isTaxi = kind === 'taxi'
  const c = isTaxi ? '#f2c018' : color
  const cabinZ = kind === 'pickup' ? 0.55 : kind === 'hatch' ? -0.2 : -0.15
  const cabinD = kind === 'pickup' ? 1.1 : kind === 'hatch' ? 1.45 : 1.6
  return (
    <group>
      <ContactShadow w={2.1} d={3.6} />
      {/* Gövde */}
      <mesh geometry={rbox(1.5, 0.48, 3.05, 0.19)} material={mat(c, 0.3)} position={[0, 0.5, 0]} castShadow />
      {/* Kaput: öne alçalan kama */}
      <mesh geometry={rbox(1.42, 0.14, 1.0, 0.07)} material={mat(c, 0.3)} position={[0, 0.66, 1.0]} rotation={[0.09, 0, 0]} castShadow />
      {/* Sera: yuvarlatılmış kabin camı + gövde rengi tavan */}
      <mesh
        geometry={rbox(1.32, 0.48, cabinD, 0.22)}
        material={mat(GLASS_DARK, 0.2)}
        position={[0, 0.94, cabinZ]}
        castShadow
      />
      <mesh geometry={rbox(1.18, 0.07, cabinD - 0.35, 0.04)} material={mat(c, 0.35)} position={[0, 1.16, cabinZ]} />
      {/* Sedan/taksi bagaj basamağı */}
      {(kind === 'sedan' || isTaxi) && (
        <mesh geometry={rbox(1.44, 0.16, 0.5, 0.06)} material={mat(c, 0.3)} position={[0, 0.62, -1.25]} />
      )}
      {kind === 'pickup' && (
        <mesh geometry={rbox(1.32, 0.08, 1.25, 0.03)} material={mat('#3a3f45', 0.8)} position={[0, 0.8, -0.85]} />
      )}
      {isTaxi && (
        <>
          {/* Damalı bant: iki yanda kapı hizası */}
          {[-0.755, 0.755].map((x) => (
            <mesh key={`c${x}`} material={checkerMat()} position={[x, 0.62, 0]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <planeGeometry args={[2.6, 0.14]} />
            </mesh>
          ))}
          {/* TAKSİ tepe lambası */}
          <mesh
            geometry={rbox(0.5, 0.15, 0.24, 0.05)}
            material={mat('#f4f2ec', 0.4, { emissive: '#fff6d8', emissiveIntensity: 0.4 })}
            position={[0, 1.27, cabinZ + 0.15]}
          />
        </>
      )}
      {/* Tamponlar + krom ızgara çizgisi */}
      {[1.55, -1.55].map((z) => (
        <mesh key={z} geometry={rbox(1.46, 0.18, 0.14, 0.06)} material={mat('#9aa1a8', 0.6)} position={[0, 0.34, z]} />
      ))}
      <mesh geometry={rbox(0.66, 0.07, 0.05, 0.02)} material={mat('#3a3f45', 0.65)} position={[0, 0.52, 1.54]} />
      {/* Farlar ve stoplar: köşeye sarılan gruplar */}
      {[-0.52, 0.52].map((x) => (
        <mesh
          key={`h${x}`}
          geometry={rbox(0.34, 0.11, 0.07, 0.03)}
          material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })}
          position={[x, 0.56, 1.52]}
        />
      ))}
      {[-0.54, 0.54].map((x) => (
        <mesh
          key={`t${x}`}
          geometry={rbox(0.3, 0.11, 0.05, 0.03)}
          material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })}
          position={[x, 0.6, -1.52]}
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

// Dükkân tabelası: mahalle esnafı — canvas doku, tabela başına önbellekli
const SHOPS = [
  { name: 'ŞEN BAKKAL', bg: '#c94f4f' },
  { name: 'ECZANE UMUT', bg: '#c9302c' },
  { name: 'BERBER NECMİ', bg: '#2160c4' },
  { name: 'ÖZ MANAV', bg: '#2e8f4f' },
  { name: 'TAŞ FIRIN', bg: '#b4691e' },
  { name: 'KIRAATHANE', bg: '#4a5a6b' },
  { name: 'YILDIZ KURUYEMİŞ', bg: '#8a5a2e' },
  { name: 'EMLAK 34', bg: '#3a6b5a' },
]
const shopSignCache = new Map<number, THREE.MeshBasicMaterial>()
function shopSignMat(idx: number): THREE.MeshBasicMaterial {
  const i = idx % SHOPS.length
  let m = shopSignCache.get(i)
  if (!m) {
    const s = SHOPS[i]
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 72
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = s.bg
    ctx.fillRect(0, 0, 512, 72)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 4
    ctx.strokeRect(5, 5, 502, 62)
    ctx.fillStyle = '#f7f4ec'
    ctx.font = '900 40px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.name, 256, 40)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    m = new THREE.MeshBasicMaterial({ map: tex })
    shopSignCache.set(i, m)
  }
  return m
}

// Türk mahalle apartmanı: PVC çerçeveli pencereler, balkonlar, cumba, klimalar,
// kiremit çatı (kimi düz teras), zemin katta tabelalı mahalle esnafı
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
  const bodyMat = facadeMat(color)
  const tiledRoof = seed % 2 === 1 // kimi kiremit çatı, kimi düz teras
  const hasCumba = seed % 3 === 0 // İstanbul klasiği: sokağa taşan cumba kolonu
  const cumbaX = colXs[seed % cols]
  return (
    <group>
      {/* Gövde */}
      <mesh geometry={rbox(w, H, 7, 0.08)} material={bodyMat} position={[0, H / 2, 0]} castShadow />
      {/* Cumba: üst katlar boyunca sokağa taşan çıkma */}
      {hasCumba && (
        <mesh
          geometry={rbox(1.9, H - baseH - 0.3, 0.75, 0.06)}
          material={bodyMat}
          position={[cumbaX, baseH + (H - baseH) / 2, 3.62]}
          castShadow
        />
      )}
      {/* Çatı: kiremit kırma çatı ya da parapetli düz teras */}
      {tiledRoof ? (
        <mesh
          geometry={cyl(0.12, 0.72, 1, 4)}
          material={mat('#a8543c', 0.85, { flat: true })}
          position={[0, H + 0.55, 0]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[w * 0.78, 1.1, 5.4]}
          castShadow
        />
      ) : (
        <>
          <mesh geometry={rbox(w + 0.3, 0.35, 7.3, 0.06)} material={mat('#8c8579', 0.8)} position={[0, H + 0.12, 0]} />
          <mesh geometry={rbox(1.2, 0.7, 1.2, 0.06)} material={mat('#b3b8bd', 0.7)} position={[w / 4, H + 0.6, -1]} />
          {/* Güneş enerjisi su deposu: teraslı çatının demirbaşı */}
          <mesh geometry={cyl(0.35, 0.35, 1.1, 12)} material={mat('#c9ccd1', 0.5, { metal: 0.3 })} position={[-w / 4, H + 0.5, 0.5]} rotation={[0, 0, Math.PI / 2]} />
        </>
      )}
      {/* Zemin kat dükkân: vitrin + isimli tabela + tente + apartman girişi */}
      <mesh geometry={rbox(w - 2.2, 1.5, 0.15, 0.04)} material={mat('#2f3b46', 0.3)} position={[-0.7, 1.05, 3.5]} />
      <mesh material={shopSignMat(seed)} position={[-0.7, 2.62, 3.6]}>
        <planeGeometry args={[Math.min(w - 2.0, 5.2), 0.5]} />
      </mesh>
      <mesh geometry={rbox(1.0, 1.85, 0.14, 0.04)} material={mat('#5a4634', 0.7)} position={[w / 2 - 0.9, 0.98, 3.52]} />
      <mesh
        geometry={rbox(w - 1.8, 0.08, 1.25, 0.03)}
        material={mat(awning, 0.6)}
        position={[-0.7, 2.28, 4.0]}
        rotation={[0.32, 0, 0]}
        castShadow
      />
      {/* Çatı: anten + çanak */}
      <mesh geometry={cyl(0.025, 0.025, 1.7, 6)} material={mat('#6b7178', 0.5, { metal: 0.4 })} position={[-w / 4, H + 1.1, -1.5]} />
      <mesh geometry={rbox(0.7, 0.03, 0.03, 0.01)} material={mat('#6b7178', 0.5, { metal: 0.4 })} position={[-w / 4, H + 1.75, -1.5]} />
      {seed % 2 === 0 && (
        <mesh
          geometry={cyl(0.3, 0.3, 0.06, 12)}
          material={mat('#dcd8cc', 0.5)}
          position={[w / 3, H + 0.5, 2.8]}
          rotation={[1.15, 0, 0.3]}
        />
      )}
      {/* Kat pencereleri: PVC çerçeve + cam + orta kayıt; balkon ve klimalar */}
      {Array.from({ length: floors }, (_, f) =>
        colXs.map((x, c) => {
          const y = baseH + f * floorH + 1.0
          const lit = (seed * 7 + f * 3 + c) % 6 === 0
          const onCumba = hasCumba && x === cumbaX
          const zFace = onCumba ? 4.01 : 3.52
          const hasBalcony = !onCumba && (seed + f + c) % 3 === 1
          const hasAc = !onCumba && (seed * 3 + f * 5 + c) % 7 === 2
          return (
            <group key={`${f},${c}`}>
              {/* PVC çerçeve + cam + orta kayıt */}
              <mesh geometry={rbox(1.05, 1.15, 0.08, 0.02)} material={mat('#e8e5dc', 0.55)} position={[x, y, zFace - 0.02]} />
              <mesh
                geometry={rbox(0.9, 1.0, 0.08, 0.02)}
                material={
                  lit
                    ? mat('#ffd98c', 0.4, { emissive: '#ffca5f', emissiveIntensity: 0.5 })
                    : mat('#42525f', 0.25)
                }
                position={[x, y, zFace]}
              />
              <mesh geometry={rbox(0.05, 1.0, 0.09, 0.01)} material={mat('#e8e5dc', 0.55)} position={[x, y, zFace + 0.01]} />
              {hasBalcony && (
                <group position={[x, y - 0.62, 3.95]}>
                  <mesh geometry={rbox(1.5, 0.09, 0.85, 0.03)} material={mat('#cfc9bd', 0.8)} castShadow />
                  <mesh geometry={rbox(1.5, 0.45, 0.07, 0.02)} material={mat('#9aa1a8', 0.6)} position={[0, 0.26, 0.4]} />
                  {/* Balkon çamaşır ipi direği havası: ince korkuluk dikmeleri */}
                  {[-0.6, 0, 0.6].map((ox) => (
                    <mesh key={ox} geometry={rbox(0.04, 0.42, 0.04, 0.01)} material={mat('#9aa1a8', 0.6)} position={[ox, 0.24, 0.38]} />
                  ))}
                </group>
              )}
              {/* Klima dış ünitesi: pencere yanına asılı */}
              {hasAc && (
                <mesh geometry={rbox(0.5, 0.32, 0.24, 0.03)} material={mat('#d7d4cc', 0.5)} position={[x + 0.68, y - 0.25, 3.62]} castShadow />
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
