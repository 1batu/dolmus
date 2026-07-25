import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pointAt, spotPos } from '../game/paths'
import { useGame, specOf } from '../game/store'
import { rbox, mat, Wheel } from './models'
import { ContactShadow } from './textures'

const BODY = '#f7f6f1'
const STRIPE = '#2160c4'
const GLASS = '#242f3a'
const BUMPER = '#b6bac0'

// Plaka dokusu: beyaz zemin + mavi TR bandı + siyah koyu punto (plaka başına önbellekli)
const plateMatCache = new Map<string, THREE.MeshBasicMaterial>()
export function plateMaterial(plate: string): THREE.MeshBasicMaterial {
  let m = plateMatCache.get(plate)
  if (!m) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#1d4ed8'
    ctx.fillRect(0, 0, 34, 64)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('TR', 17, 44)
    ctx.fillStyle = '#111111'
    ctx.font = plate.length > 9 ? 'bold 29px monospace' : 'bold 38px monospace'
    ctx.fillText(plate, 145, plate.length > 9 ? 42 : 46)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    m = new THREE.MeshBasicMaterial({ map: tex })
    plateMatCache.set(plate, m)
  }
  return m
}

export const plateGeo = new THREE.PlaneGeometry(0.72, 0.18)

// Klasik beyaz + renkli şerit Türk minibüsü — yuvarlatılmış modern kasa, sıfır asset
export function MinibusMesh({
  stripe = STRIPE,
  body = BODY,
  plate,
}: {
  stripe?: string
  body?: string
  plate?: string
}) {
  return (
    <group>
      <ContactShadow w={2.5} d={4.6} />
      {/* Ana gövde */}
      <mesh geometry={rbox(1.7, 1.15, 3.75, 0.16)} material={mat(body, 0.35)} position={[0, 0.95, 0]} castShadow />
      {/* Etek + tamponlar */}
      <mesh geometry={rbox(1.74, 0.26, 3.85, 0.1)} material={mat(BUMPER, 0.6)} position={[0, 0.42, 0]} />
      {/* Hat şeridi */}
      <mesh geometry={rbox(1.73, 0.15, 3.77, 0.06)} material={mat(stripe, 0.4)} position={[0, 0.72, 0]} />
      {/* Ön cam (eğimli) */}
      <mesh
        geometry={rbox(1.5, 0.52, 0.07, 0.03)}
        material={mat(GLASS, 0.15)}
        position={[0, 1.28, 1.8]}
        rotation={[-0.22, 0, 0]}
      />
      {/* Yan camlar: 3 pencere / taraf */}
      {[-0.87, 0.87].map((x) =>
        [0.72, -0.18, -1.08].map((z) => (
          <mesh
            key={`${x},${z}`}
            geometry={rbox(0.05, 0.42, 0.72, 0.03)}
            material={mat(GLASS, 0.15)}
            position={[x, 1.22, z]}
          />
        )),
      )}
      {/* Arka cam */}
      <mesh geometry={rbox(1.3, 0.42, 0.06, 0.03)} material={mat(GLASS, 0.15)} position={[0, 1.22, -1.88]} />
      {/* Farlar */}
      {[-0.55, 0.55].map((x) => (
        <mesh
          key={`h${x}`}
          geometry={rbox(0.34, 0.15, 0.07, 0.04)}
          material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })}
          position={[x, 0.68, 1.9]}
        />
      ))}
      {/* Izgara */}
      <mesh geometry={rbox(0.6, 0.13, 0.06, 0.03)} material={mat('#3a3f45', 0.7)} position={[0, 0.68, 1.9]} />
      {/* Sinyaller */}
      {[-0.78, 0.78].map((x) => (
        <mesh
          key={`s${x}`}
          geometry={rbox(0.1, 0.1, 0.06, 0.03)}
          material={mat('#e8923a', 0.4, { emissive: '#e8923a', emissiveIntensity: 0.3 })}
          position={[x, 0.68, 1.89]}
        />
      ))}
      {/* Plakalar: araç kendi plakasını taşır */}
      {plate ? (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.48, 1.94]} />
          <mesh
            geometry={plateGeo}
            material={plateMaterial(plate)}
            position={[0, 0.48, -1.94]}
            rotation={[0, Math.PI, 0]}
          />
        </>
      ) : (
        <>
          <mesh geometry={rbox(0.36, 0.11, 0.03, 0.01)} material={mat('#f4f2ec', 0.4)} position={[0, 0.48, 1.93]} />
          <mesh geometry={rbox(0.36, 0.11, 0.03, 0.01)} material={mat('#f4f2ec', 0.4)} position={[0, 0.48, -1.93]} />
        </>
      )}
      {/* Stoplar */}
      {[-0.6, 0.6].map((x) => (
        <mesh
          key={`t${x}`}
          geometry={rbox(0.2, 0.3, 0.06, 0.03)}
          material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })}
          position={[x, 0.78, -1.9]}
        />
      ))}
      {/* Aynalar */}
      {[-0.95, 0.95].map((x) => (
        <group key={`m${x}`} position={[x, 1.3, 1.55]}>
          <mesh geometry={rbox(0.18, 0.05, 0.05, 0.02)} material={mat('#3a3f45', 0.7)} position={[x > 0 ? 0.06 : -0.06, 0, 0]} />
          <mesh geometry={rbox(0.05, 0.22, 0.14, 0.02)} material={mat('#3a3f45', 0.7)} position={[x > 0 ? 0.16 : -0.16, -0.1, 0]} />
        </group>
      ))}
      {/* Hat tabelası */}
      <mesh
        geometry={rbox(0.95, 0.18, 0.08, 0.04)}
        material={mat('#ffd23f', 0.4, { emissive: '#ffd23f', emissiveIntensity: 0.7 })}
        position={[0, 1.62, 1.78]}
      />
      {/* Tavan havalandırması */}
      <mesh geometry={rbox(0.5, 0.07, 0.7, 0.03)} material={mat(body, 0.5)} position={[0, 1.56, -0.6]} />
      <Wheel x={-0.78} z={1.25} />
      <Wheel x={0.78} z={1.25} />
      <Wheel x={-0.78} z={-1.25} />
      <Wheel x={0.78} z={-1.25} />
    </group>
  )
}

// VIP transfer aracı: siyah minivan — alçak tavan, eğimli kaput, film cam
export function VitoMesh({ plate }: { plate?: string }) {
  const black = mat('#191c20', 0.25, { metal: 0.35 })
  return (
    <group>
      <ContactShadow w={2.4} d={4.2} />
      {/* Kabin gövdesi (arka 2/3) */}
      <mesh geometry={rbox(1.62, 0.9, 2.7, 0.22)} material={black} position={[0, 0.82, -0.45]} castShadow />
      {/* Kaput: öne alçalan burun */}
      <mesh geometry={rbox(1.56, 0.5, 1.1, 0.16)} material={black} position={[0, 0.6, 1.25]} castShadow />
      {/* Kaput-kabin geçişi: keskin rake'li ön cam */}
      <mesh geometry={rbox(1.44, 0.72, 0.08, 0.04)} material={mat('#0c1116', 0.12)} position={[0, 0.98, 0.98]} rotation={[-0.5, 0, 0]} />
      {/* Etek */}
      <mesh geometry={rbox(1.66, 0.22, 3.5, 0.1)} material={mat('#101215', 0.5)} position={[0, 0.36, 0.1]} />
      {/* Film cam bandı (yalnız kabinde) */}
      <mesh geometry={rbox(1.64, 0.3, 2.2, 0.06)} material={mat('#0c1116', 0.12)} position={[0, 1.02, -0.55]} />
      {/* Krom ızgara + farlar */}
      <mesh geometry={rbox(0.74, 0.1, 0.06, 0.03)} material={mat('#c8ccd1', 0.3, { metal: 0.7 })} position={[0, 0.6, 1.81]} />
      {[-0.54, 0.54].map((x) => (
        <mesh
          key={`h${x}`}
          geometry={rbox(0.32, 0.11, 0.07, 0.04)}
          material={mat('#eef4ff', 0.2, { emissive: '#dbe8ff', emissiveIntensity: 0.6 })}
          position={[x, 0.6, 1.8]}
        />
      ))}
      {[-0.56, 0.56].map((x) => (
        <mesh
          key={`t${x}`}
          geometry={rbox(0.2, 0.24, 0.06, 0.03)}
          material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })}
          position={[x, 0.72, -1.81]}
        />
      ))}
      {/* Krom yan çıta */}
      {[-0.82, 0.82].map((x) => (
        <mesh key={`s${x}`} geometry={rbox(0.03, 0.045, 3.2, 0.01)} material={mat('#c8ccd1', 0.3, { metal: 0.7 })} position={[x, 0.56, -0.1]} />
      ))}
      {plate && (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.42, 1.83]} />
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.42, -1.83]} rotation={[0, Math.PI, 0]} />
        </>
      )}
      <Wheel x={-0.74} z={1.15} r={0.28} />
      <Wheel x={0.74} z={1.15} r={0.28} />
      <Wheel x={-0.74} z={-1.15} r={0.28} />
      <Wheel x={0.74} z={-1.15} r={0.28} />
    </group>
  )
}

// Solo otobüs (12 m): özel halk otobüsü havası — uzun kasa, boydan cam bandı,
// çift kapı, tavan klima. electric: yeşil şerit + tavan batarya paketi, egzozsuz.
export function BusMesh({ plate, electric = false }: { plate?: string; electric?: boolean }) {
  const stripe = electric ? '#2e9e5b' : '#d8842a'
  return (
    <group>
      <ContactShadow w={2.7} d={6.2} />
      {/* Ana kasa */}
      <mesh geometry={rbox(1.9, 1.5, 5.4, 0.18)} material={mat(BODY, 0.4)} position={[0, 1.18, 0]} castShadow />
      {/* Etek + tampon */}
      <mesh geometry={rbox(1.94, 0.3, 5.5, 0.1)} material={mat('#3a3f45', 0.65)} position={[0, 0.42, 0]} />
      {/* İşletme şeridi */}
      <mesh geometry={rbox(1.92, 0.2, 5.42, 0.06)} material={mat(stripe, 0.4)} position={[0, 0.72, 0]} />
      {/* Boydan yan cam bandı */}
      {[-0.94, 0.94].map((x) => (
        <mesh key={x} geometry={rbox(0.05, 0.55, 4.4, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.52, -0.2]} />
      ))}
      {/* Ön cam + arka cam */}
      <mesh geometry={rbox(1.66, 0.72, 0.07, 0.03)} material={mat(GLASS, 0.15)} position={[0, 1.5, 2.66]} rotation={[-0.12, 0, 0]} />
      <mesh geometry={rbox(1.56, 0.5, 0.06, 0.03)} material={mat(GLASS, 0.15)} position={[0, 1.52, -2.68]} />
      {/* Yolcu kapıları (sağ taraf: ön + orta) */}
      {[1.75, -0.85].map((z) => (
        <mesh key={z} geometry={rbox(0.045, 1.15, 0.72, 0.03)} material={mat('#242f3a', 0.25)} position={[0.955, 1.05, z]} />
      ))}
      {/* Farlar + ızgara + sinyaller */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={`h${x}`} geometry={rbox(0.38, 0.16, 0.07, 0.04)} material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })} position={[x, 0.66, 2.72]} />
      ))}
      <mesh geometry={rbox(0.7, 0.14, 0.06, 0.03)} material={mat('#3a3f45', 0.7)} position={[0, 0.66, 2.72]} />
      {[-0.86, 0.86].map((x) => (
        <mesh key={`s${x}`} geometry={rbox(0.12, 0.12, 0.06, 0.03)} material={mat('#e8923a', 0.4, { emissive: '#e8923a', emissiveIntensity: 0.3 })} position={[x, 0.66, 2.71]} />
      ))}
      {/* Stoplar */}
      {[-0.68, 0.68].map((x) => (
        <mesh key={`t${x}`} geometry={rbox(0.22, 0.34, 0.06, 0.03)} material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })} position={[x, 0.85, -2.72]} />
      ))}
      {/* Hat tabelası */}
      <mesh geometry={rbox(1.2, 0.2, 0.08, 0.04)} material={mat('#ffd23f', 0.4, { emissive: '#ffd23f', emissiveIntensity: 0.7 })} position={[0, 1.98, 2.6]} />
      {/* Tavan: klima + (elektrikliyse) batarya paketi, değilse egzoz bacası */}
      <mesh geometry={rbox(0.95, 0.15, 1.6, 0.05)} material={mat('#d7d4cc', 0.55)} position={[0, 2.0, 0.9]} />
      {electric ? (
        <mesh geometry={rbox(1.25, 0.2, 2.4, 0.07)} material={mat('#2e9e5b', 0.45)} position={[0, 2.02, -1.2]} />
      ) : (
        <mesh geometry={rbox(0.16, 0.3, 0.16, 0.04)} material={mat('#2a2f35', 0.7)} position={[-0.6, 2.05, -2.3]} />
      )}
      {/* Aynalar */}
      {[-1.02, 1.02].map((x) => (
        <mesh key={`m${x}`} geometry={rbox(0.06, 0.26, 0.16, 0.02)} material={mat('#3a3f45', 0.7)} position={[x, 1.62, 2.45]} />
      ))}
      {plate && (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.44, 2.77]} />
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.44, -2.77]} rotation={[0, Math.PI, 0]} />
        </>
      )}
      <Wheel x={-0.86} z={1.95} r={0.34} />
      <Wheel x={0.86} z={1.95} r={0.34} />
      <Wheel x={-0.86} z={-1.7} r={0.34} />
      <Wheel x={0.86} z={-1.7} r={0.34} />
    </group>
  )
}

// Körüklü otobüs (18 m): iki kasa + akordiyon körük, üç dingil
export function ArticBusMesh({ plate }: { plate?: string }) {
  const stripe = '#b84a4a'
  return (
    <group>
      <ContactShadow w={2.7} d={7.8} />
      {/* Ön kasa */}
      <mesh geometry={rbox(1.9, 1.5, 3.6, 0.18)} material={mat(BODY, 0.4)} position={[0, 1.18, 1.7]} castShadow />
      {/* Arka kasa */}
      <mesh geometry={rbox(1.9, 1.5, 2.7, 0.18)} material={mat(BODY, 0.4)} position={[0, 1.18, -2.05]} castShadow />
      {/* Körük: koyu akordiyon dilimleri */}
      {[-0.12, -0.36, -0.6].map((z, i) => (
        <mesh key={z} geometry={rbox(i === 1 ? 1.86 : 1.78, 1.38, 0.22, 0.08)} material={mat(i === 1 ? '#22262b' : '#2e343b', 0.85)} position={[0, 1.16, z]} />
      ))}
      {/* Etek + şerit (iki kasada da) */}
      {[{ z: 1.7, d: 3.68 }, { z: -2.05, d: 2.78 }].map((s) => (
        <group key={s.z}>
          <mesh geometry={rbox(1.94, 0.3, s.d, 0.1)} material={mat('#3a3f45', 0.65)} position={[0, 0.42, s.z]} />
          <mesh geometry={rbox(1.92, 0.2, s.d - 0.06, 0.06)} material={mat(stripe, 0.4)} position={[0, 0.72, s.z]} />
        </group>
      ))}
      {/* Cam bantları */}
      {[-0.94, 0.94].map((x) => (
        <group key={x}>
          <mesh geometry={rbox(0.05, 0.55, 2.7, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.52, 1.55]} />
          <mesh geometry={rbox(0.05, 0.55, 2.2, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.52, -2.0]} />
        </group>
      ))}
      {/* Ön cam */}
      <mesh geometry={rbox(1.66, 0.72, 0.07, 0.03)} material={mat(GLASS, 0.15)} position={[0, 1.5, 3.46]} rotation={[-0.12, 0, 0]} />
      {/* Üç yolcu kapısı (sağ) */}
      {[2.6, 0.35, -1.9].map((z) => (
        <mesh key={z} geometry={rbox(0.045, 1.15, 0.68, 0.03)} material={mat('#242f3a', 0.25)} position={[0.955, 1.05, z]} />
      ))}
      {/* Farlar + sinyaller + stoplar */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={`h${x}`} geometry={rbox(0.38, 0.16, 0.07, 0.04)} material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })} position={[x, 0.66, 3.52]} />
      ))}
      {[-0.68, 0.68].map((x) => (
        <mesh key={`t${x}`} geometry={rbox(0.22, 0.34, 0.06, 0.03)} material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })} position={[x, 0.85, -3.44]} />
      ))}
      {/* Hat tabelası + tavan klimaları */}
      <mesh geometry={rbox(1.2, 0.2, 0.08, 0.04)} material={mat('#ffd23f', 0.4, { emissive: '#ffd23f', emissiveIntensity: 0.7 })} position={[0, 1.98, 3.4]} />
      <mesh geometry={rbox(0.95, 0.15, 1.4, 0.05)} material={mat('#d7d4cc', 0.55)} position={[0, 2.0, 1.9]} />
      <mesh geometry={rbox(0.95, 0.15, 1.1, 0.05)} material={mat('#d7d4cc', 0.55)} position={[0, 2.0, -2.1]} />
      {/* Aynalar */}
      {[-1.02, 1.02].map((x) => (
        <mesh key={`m${x}`} geometry={rbox(0.06, 0.26, 0.16, 0.02)} material={mat('#3a3f45', 0.7)} position={[x, 1.62, 3.25]} />
      ))}
      {plate && (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.44, 3.56]} />
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.44, -3.46]} rotation={[0, Math.PI, 0]} />
        </>
      )}
      <Wheel x={-0.86} z={2.75} r={0.34} />
      <Wheel x={0.86} z={2.75} r={0.34} />
      <Wheel x={-0.86} z={0.85} r={0.34} />
      <Wheel x={0.86} z={0.85} r={0.34} />
      <Wheel x={-0.86} z={-2.6} r={0.34} />
      <Wheel x={0.86} z={-2.6} r={0.34} />
    </group>
  )
}

// Araç üstü uyarı rozetleri: yakıt azaldı / bakım geldi — sadece gerektiğinde
// belirir, görüntüyü kirletmez. Glyph'ler lucide (Fuel/Wrench) path'lerinden çizilir.
const BADGE_GLYPHS: Record<string, string[]> = {
  fuel: [
    'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5',
    'M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16',
    'M2 21h13',
    'M3 9h11',
  ],
  wrench: [
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z',
  ],
}
const badgeMatCache = new Map<string, THREE.SpriteMaterial>()
function badgeMaterial(glyph: 'fuel' | 'wrench', crit: boolean): THREE.SpriteMaterial {
  const key = `${glyph}|${crit}`
  let m = badgeMatCache.get(key)
  if (!m) {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const color = crit ? '#f87171' : '#fbbf24'
    // Koyu cam rozet zemini + renkli halka
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 56, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(12, 14, 18, 0.88)'
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = color
    ctx.stroke()
    // Glyph: 24x24 path'i ortala ve büyüt
    const scale = 64 / 24
    ctx.save()
    ctx.translate(size / 2 - 32, size / 2 - 32)
    ctx.scale(scale, scale)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    for (const d of BADGE_GLYPHS[glyph]) ctx.stroke(new Path2D(d))
    ctx.restore()
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    badgeMatCache.set(key, m)
  }
  return m
}

// Araç sınıfına göre rozet yüksekliği (tavanın üstü)
function badgeYOf(kind: string): number {
  return kind === 'bus' || kind === 'artic' || kind === 'ebus' ? 2.9 : kind === 'vito' ? 2.1 : 2.4
}

// Store'daki aracı sahnede sürer; seferdeyken (ekran dışı) gizlenir
export function Vehicle({ vehicleId }: { vehicleId: number }) {
  const group = useRef<THREE.Group>(null)
  const badges = useRef<THREE.Group>(null)
  const old = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.old ?? false)
  const plate = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.plate ?? '')
  const kind = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.kind ?? 'dolmus')
  // Uyarı kodu: yakıt (0 tam / 1 azaldı / 2 bitti) × 10 + yıpranma — sadece
  // eşik değişince re-render tetikler, dolum sırasında her frame çalışmaz
  const badgeCode = useGame((s) => {
    const v = s.vehicles.find((veh) => veh.id === vehicleId)
    if (!v) return 0
    const sp = specOf(v.kind ?? 'dolmus')
    const fuelLvl = v.fuel < sp.fuelPerTrip ? 2 : v.fuel < sp.tank * 0.25 ? 1 : 0
    const wearLvl = v.wear >= 100 ? 2 : v.wear >= 75 ? 1 : 0
    return fuelLvl * 10 + wearLvl
  })
  const fuelLvl = Math.floor(badgeCode / 10)
  const wearLvl = badgeCode % 10
  const badgeY = badgeYOf(kind)

  useFrame((state) => {
    const v = useGame.getState().vehicles.find((veh) => veh.id === vehicleId)
    if (!v || !group.current) return
    const g = group.current
    if (v.state === 'onTrip') {
      g.visible = false
      return
    }
    g.visible = true
    if (v.path) {
      const { x, z, angle } = pointAt(v.path, v.dist)
      g.position.set(x, 0, z)
      g.rotation.y = angle
    } else {
      // Parkta: burnu servis yoluna dönük bekler
      const [x, z] = spotPos(v.spotIdx)
      g.position.set(x, 0, z)
      g.rotation.y = 0
    }
    // Rozetler hafifçe süzülür
    if (badges.current) {
      badges.current.position.y = badgeY + Math.sin(state.clock.elapsedTime * 2.4) * 0.06
    }
  })

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation()
        const s = useGame.getState()
        s.selectVehicle(s.selectedVehicle === vehicleId ? null : vehicleId)
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'default')}
    >
      {kind === 'vito' ? (
        <VitoMesh plate={plate || undefined} />
      ) : kind === 'artic' ? (
        <ArticBusMesh plate={plate || undefined} />
      ) : kind === 'bus' || kind === 'ebus' ? (
        <BusMesh plate={plate || undefined} electric={kind === 'ebus'} />
      ) : (
        <MinibusMesh body={old ? '#ece5d4' : undefined} plate={plate || undefined} />
      )}
      {(fuelLvl > 0 || wearLvl > 0) && (
        <group ref={badges} position={[0, badgeY, 0]}>
          {fuelLvl > 0 && (
            <sprite
              material={badgeMaterial('fuel', fuelLvl >= 2)}
              position={[wearLvl > 0 ? -0.36 : 0, 0, 0]}
              scale={[0.62, 0.62, 1]}
            />
          )}
          {wearLvl > 0 && (
            <sprite
              material={badgeMaterial('wrench', wearLvl >= 2)}
              position={[fuelLvl > 0 ? 0.36 : 0, 0, 0]}
              scale={[0.62, 0.62, 1]}
            />
          )}
        </group>
      )}
    </group>
  )
}

// Rakip minibüsler: her esnafın kendi renk düzeni var — bizimkiyle karışmaz
const RIVAL_LIVERY = [
  { stripe: '#3f9d4f', body: '#efe9dc' },
  { stripe: '#c9803a', body: '#f2ead8' },
  { stripe: '#8a4fc9', body: '#eef0f4' },
  { stripe: '#c94f4f', body: '#f5efe2' },
  { stripe: '#2a9d8f', body: '#e9f0ea' },
]

export function RivalBus({ rivalId }: { rivalId: number }) {
  const group = useRef<THREE.Group>(null)
  const plate = useGame((s) => s.rivals.find((r) => r.id === rivalId)?.plate ?? '')
  const livery = RIVAL_LIVERY[rivalId % RIVAL_LIVERY.length]

  useFrame(() => {
    const r = useGame.getState().rivals.find((rv) => rv.id === rivalId)
    if (!group.current) return
    const g = group.current
    if (!r || r.state === 'away' || !r.path) {
      g.visible = false
      return
    }
    g.visible = true
    const { x, z, angle } = pointAt(r.path, r.dist)
    g.position.set(x, 0, z)
    g.rotation.y = angle
  })

  return (
    <group ref={group} visible={false}>
      <MinibusMesh stripe={livery.stripe} body={livery.body} plate={plate || undefined} />
    </group>
  )
}
