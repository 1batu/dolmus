import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pointAt, vehicleSpotPos } from '../game/paths'
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

// İstanbul hat minibüsü: Sprinter tabanlı dolmuş silueti — kısa burun, dev ön
// cam, kubbeli tavan, sürgülü kapı, hat rengi kuşak. Beyaz kasa + mavi şerit
// (Kadıköy havası); rakipler kendi şerit/kasa rengiyle gelir.
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
      {/* Alt gövde: uzun kasa */}
      <mesh geometry={rbox(1.7, 0.95, 3.6, 0.14)} material={mat(body, 0.35)} position={[0, 0.82, -0.15]} castShadow />
      {/* Tavan kubbesi: yuvarlak hatlı van tavanı */}
      <mesh geometry={rbox(1.58, 0.62, 3.45, 0.26)} material={mat(body, 0.4)} position={[0, 1.42, -0.2]} castShadow />
      {/* Kısa burun: öne alçalan kaput */}
      <mesh geometry={rbox(1.6, 0.52, 0.85, 0.16)} material={mat(body, 0.35)} position={[0, 0.62, 1.65]} rotation={[0.07, 0, 0]} castShadow />
      {/* Dev ön cam: A-sütunundan tavana yatık */}
      <mesh geometry={rbox(1.48, 0.85, 0.07, 0.03)} material={mat(GLASS, 0.12)} position={[0, 1.28, 1.38]} rotation={[-0.38, 0, 0]} />
      {/* Yan cam bandı + gövde rengi payandalar (3 pencere okunur) */}
      {[-0.845, 0.845].map((x) => (
        <mesh key={`g${x}`} geometry={rbox(0.05, 0.42, 2.75, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.34, -0.35]} />
      ))}
      {[-0.855, 0.855].map((x) =>
        [0.35, -0.65].map((z) => (
          <mesh key={`p${x},${z}`} geometry={rbox(0.045, 0.44, 0.09, 0.02)} material={mat(body, 0.4)} position={[x, 1.34, z]} />
        )),
      )}
      {/* Sürgülü yolcu kapısı (sağ ön): ray + kapı çizgisi */}
      <mesh geometry={rbox(0.04, 0.8, 0.06, 0.02)} material={mat('#c9c6bd', 0.5)} position={[0.855, 0.82, 0.95]} />
      <mesh geometry={rbox(0.03, 0.05, 1.15, 0.01)} material={mat('#c9c6bd', 0.5)} position={[0.86, 1.06, 0.35]} />
      {/* Etek + plastik tamponlar */}
      <mesh geometry={rbox(1.74, 0.24, 3.95, 0.1)} material={mat(BUMPER, 0.6)} position={[0, 0.38, 0.05]} />
      <mesh geometry={rbox(1.62, 0.28, 0.22, 0.08)} material={mat('#9aa1a8', 0.7)} position={[0, 0.44, 2.05]} />
      {/* Hat şeridi: çift bant — kalın kuşak + ince çizgi */}
      <mesh geometry={rbox(1.72, 0.14, 3.62, 0.05)} material={mat(stripe, 0.4)} position={[0, 0.72, -0.15]} />
      <mesh geometry={rbox(1.71, 0.045, 3.6, 0.02)} material={mat(stripe, 0.4)} position={[0, 0.92, -0.15]} />
      {/* Arka cam */}
      <mesh geometry={rbox(1.28, 0.44, 0.06, 0.03)} material={mat(GLASS, 0.15)} position={[0, 1.4, -1.94]} />
      {/* Farlar: köşeye tırmanan büyük far grubu + ızgara */}
      {[-0.58, 0.58].map((x) => (
        <mesh
          key={`h${x}`}
          geometry={rbox(0.32, 0.22, 0.07, 0.04)}
          material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })}
          position={[x, 0.72, 2.06]}
          rotation={[0.07, 0, 0]}
        />
      ))}
      <mesh geometry={rbox(0.7, 0.13, 0.06, 0.03)} material={mat('#3a3f45', 0.7)} position={[0, 0.6, 2.09]} />
      {/* Sinyaller */}
      {[-0.76, 0.76].map((x) => (
        <mesh
          key={`s${x}`}
          geometry={rbox(0.1, 0.09, 0.06, 0.03)}
          material={mat('#e8923a', 0.4, { emissive: '#e8923a', emissiveIntensity: 0.3 })}
          position={[x, 0.52, 2.05]}
        />
      ))}
      {/* Plakalar: araç kendi plakasını taşır */}
      {plate ? (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.44, 2.12]} />
          <mesh
            geometry={plateGeo}
            material={plateMaterial(plate)}
            position={[0, 0.48, -1.99]}
            rotation={[0, Math.PI, 0]}
          />
        </>
      ) : (
        <>
          <mesh geometry={rbox(0.36, 0.11, 0.03, 0.01)} material={mat('#f4f2ec', 0.4)} position={[0, 0.44, 2.11]} />
          <mesh geometry={rbox(0.36, 0.11, 0.03, 0.01)} material={mat('#f4f2ec', 0.4)} position={[0, 0.48, -1.98]} />
        </>
      )}
      {/* Stoplar: dikey köşe stopları */}
      {[-0.62, 0.62].map((x) => (
        <mesh
          key={`t${x}`}
          geometry={rbox(0.16, 0.42, 0.06, 0.03)}
          material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })}
          position={[x, 0.88, -1.96]}
        />
      ))}
      {/* Aynalar: uzun kollu van aynası */}
      {[-0.92, 0.92].map((x) => (
        <group key={`m${x}`} position={[x, 1.32, 1.28]}>
          <mesh geometry={rbox(0.18, 0.05, 0.05, 0.02)} material={mat('#3a3f45', 0.7)} position={[x > 0 ? 0.07 : -0.07, 0, 0]} />
          <mesh geometry={rbox(0.05, 0.24, 0.14, 0.02)} material={mat('#3a3f45', 0.7)} position={[x > 0 ? 0.17 : -0.17, -0.09, 0]} />
        </group>
      ))}
      {/* Hat tabelası: ön camın üstünde */}
      <mesh
        geometry={rbox(0.95, 0.17, 0.08, 0.04)}
        material={mat('#ffd23f', 0.4, { emissive: '#ffd23f', emissiveIntensity: 0.7 })}
        position={[0, 1.68, 1.25]}
        rotation={[-0.1, 0, 0]}
      />
      {/* Tavan havalandırması */}
      <mesh geometry={rbox(0.5, 0.07, 0.7, 0.03)} material={mat(body, 0.5)} position={[0, 1.76, -0.8]} />
      <Wheel x={-0.78} z={1.35} />
      <Wheel x={0.78} z={1.35} />
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

// Servis sprinteri: gerçek panelvan silueti — kısa eğimli burun, dev ön cam,
// yüksek düz tavan, uzun slab gövde, arka çift kapı. Okul/personel servisi:
// beyaz kasa + turuncu kuşak, plastik gri etek.
export function SprinterMesh({ plate, body = '#f4f3ee' }: { plate?: string; body?: string }) {
  const belt = '#e0862e'
  const trim = '#3a3f45'
  return (
    <group>
      <ContactShadow w={2.4} d={5.4} />
      {/* Ana kasa: uzun, yüksek panelvan gövdesi (kabinden arkaya tek hacim) */}
      <mesh geometry={rbox(1.66, 1.42, 3.6, 0.2)} material={mat(body, 0.35)} position={[0, 1.06, -0.5]} castShadow />
      {/* Tavan kubbesi: yüksek tavan hattı öne, ön cam üstüne kadar uzanır */}
      <mesh geometry={rbox(1.54, 0.3, 4.0, 0.14)} material={mat(body, 0.4)} position={[0, 1.82, -0.32]} castShadow />
      {/* Kaput: kısa ve alçak, öne hafif eğimli burun */}
      <mesh geometry={rbox(1.58, 0.52, 1.0, 0.18)} material={mat(body, 0.35)} position={[0, 0.62, 1.85]} rotation={[0.06, 0, 0]} castShadow />
      {/* A-sütunu geçişi: kaputtan tavana dolan hacim */}
      <mesh geometry={rbox(1.6, 0.9, 0.7, 0.16)} material={mat(body, 0.35)} position={[0, 1.25, 1.35]} castShadow />
      {/* Dev ön cam: panelvan usulü yatık, tavana kadar */}
      <mesh geometry={rbox(1.5, 0.95, 0.07, 0.03)} material={mat(GLASS, 0.12)} position={[0, 1.45, 1.6]} rotation={[-0.42, 0, 0]} />
      {/* Sürücü kapı camları */}
      {[-0.84, 0.84].map((x) => (
        <mesh key={`d${x}`} geometry={rbox(0.05, 0.44, 0.75, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.42, 0.82]} />
      ))}
      {/* Servis camları: yolcu bölmesi boyunca cam bandı */}
      {[-0.845, 0.845].map((x) => (
        <mesh key={`w${x}`} geometry={rbox(0.05, 0.42, 2.55, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.44, -0.95]} />
      ))}
      {/* Plastik etek + tamponlar: Sprinter'ın gri kuşağı */}
      <mesh geometry={rbox(1.7, 0.24, 4.55, 0.1)} material={mat('#9aa1a8', 0.7)} position={[0, 0.36, 0]} />
      <mesh geometry={rbox(1.62, 0.3, 0.24, 0.08)} material={mat('#9aa1a8', 0.7)} position={[0, 0.45, 2.32]} />
      {/* Turuncu servis kuşağı: kasa boyunca */}
      <mesh geometry={rbox(1.68, 0.13, 3.62, 0.05)} material={mat(belt, 0.4)} position={[0, 0.78, -0.5]} />
      {/* Sürgülü kapı rayı (sağ, camların altında) */}
      <mesh geometry={rbox(0.03, 0.05, 2.0, 0.01)} material={mat('#c9c6bd', 0.5)} position={[0.845, 1.12, -0.9]} />
      {/* Arka çift kapı: dikey ayrım çizgisi + camlar */}
      <mesh geometry={rbox(0.03, 1.5, 0.05, 0.01)} material={mat('#c9c6bd', 0.5)} position={[0, 1.15, -2.31]} />
      {[-0.4, 0.4].map((x) => (
        <mesh key={`r${x}`} geometry={rbox(0.6, 0.42, 0.05, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.5, -2.31]} />
      ))}
      {/* Izgara + farlar: köşeleri tavana tırmanan büyük far grubu */}
      <mesh geometry={rbox(0.9, 0.16, 0.07, 0.03)} material={mat(trim, 0.7)} position={[0, 0.78, 2.36]} />
      {[-0.62, 0.62].map((x) => (
        <mesh
          key={`h${x}`}
          geometry={rbox(0.3, 0.26, 0.07, 0.04)}
          material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })}
          position={[x, 0.85, 2.34]}
          rotation={[0.06, 0, 0]}
        />
      ))}
      {/* Stoplar: arka köşelerde dikey */}
      {[-0.72, 0.72].map((x) => (
        <mesh
          key={`t${x}`}
          geometry={rbox(0.14, 0.5, 0.05, 0.03)}
          material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })}
          position={[x, 1.0, -2.32]}
        />
      ))}
      {/* Aynalar: uzun kollu kamyonet aynası */}
      {[-0.92, 0.92].map((x) => (
        <group key={`m${x}`} position={[x, 1.42, 1.28]}>
          <mesh geometry={rbox(0.2, 0.05, 0.05, 0.02)} material={mat(trim, 0.7)} position={[x > 0 ? 0.08 : -0.08, 0, 0]} />
          <mesh geometry={rbox(0.05, 0.28, 0.16, 0.02)} material={mat(trim, 0.7)} position={[x > 0 ? 0.2 : -0.2, -0.08, 0]} />
        </group>
      ))}
      {/* Tepe servis lambası: "OKUL TAŞITI" havası */}
      <mesh
        geometry={rbox(0.66, 0.11, 0.28, 0.05)}
        material={mat(belt, 0.4, { emissive: belt, emissiveIntensity: 0.45 })}
        position={[0, 2.02, 1.15]}
      />
      {plate && (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.5, 2.4]} />
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.5, -2.34]} rotation={[0, Math.PI, 0]} />
        </>
      )}
      <Wheel x={-0.76} z={1.55} r={0.3} />
      <Wheel x={0.76} z={1.55} r={0.3} />
      <Wheel x={-0.76} z={-1.45} r={0.3} />
      <Wheel x={0.76} z={-1.45} r={0.3} />
    </group>
  )
}

// Solo otobüs (12 m): İstanbul halk otobüsü — 2020 sonrası birleşik SARI livery
// (İETT/ÖHO), koyu etek, boydan cam bandı, çift kapı, tavan klima.
// electric: yeşil şerit + tavan batarya paketi, egzozsuz (e-Kent havası).
const IETT_YELLOW = '#f2c231'
export function BusMesh({ plate, electric = false, body = IETT_YELLOW }: { plate?: string; electric?: boolean; body?: string }) {
  const stripe = electric ? '#2e9e5b' : '#c93a3a'
  return (
    <group>
      <ContactShadow w={2.7} d={6.2} />
      {/* Ana kasa: alçak taban + kubbeli tavan (Kent LF silueti) */}
      <mesh geometry={rbox(1.9, 1.3, 5.4, 0.16)} position={[0, 1.05, 0]} material={mat(body, 0.4)} castShadow />
      <mesh geometry={rbox(1.78, 0.5, 5.28, 0.24)} material={mat(body, 0.45)} position={[0, 1.88, 0]} castShadow />
      {/* Ön maske: hafif öne eğik panel — tek parça cam altına iner */}
      <mesh geometry={rbox(1.86, 1.0, 0.5, 0.14)} material={mat(body, 0.4)} position={[0, 0.85, 2.55]} rotation={[0.05, 0, 0]} castShadow />
      {/* Etek + tampon */}
      <mesh geometry={rbox(1.94, 0.3, 5.5, 0.1)} material={mat('#3a3f45', 0.65)} position={[0, 0.42, 0]} />
      {/* Tekerlek davlumbazları: koyu kemer plakaları */}
      {[1.95, -1.7].map((z) =>
        [-0.945, 0.945].map((x) => (
          <mesh key={`a${x},${z}`} geometry={rbox(0.05, 0.52, 1.0, 0.04)} material={mat('#22262b', 0.8)} position={[x, 0.45, z]} />
        )),
      )}
      {/* İşletme şeridi */}
      <mesh geometry={rbox(1.92, 0.2, 5.42, 0.06)} material={mat(stripe, 0.4)} position={[0, 0.72, 0]} />
      {/* Boydan yan cam bandı + payandalar */}
      {[-0.94, 0.94].map((x) => (
        <mesh key={x} geometry={rbox(0.05, 0.6, 4.5, 0.03)} material={mat(GLASS, 0.15)} position={[x, 1.5, -0.2]} />
      ))}
      {[-0.95, 0.95].map((x) =>
        [1.0, -0.3, -1.6].map((z) => (
          <mesh key={`wp${x},${z}`} geometry={rbox(0.045, 0.62, 0.08, 0.02)} material={mat(body, 0.45)} position={[x, 1.5, z]} />
        )),
      )}
      {/* Tek parça yatık ön cam: tavandan tampona (low-floor şehir otobüsü) */}
      <mesh geometry={rbox(1.72, 1.15, 0.07, 0.03)} material={mat(GLASS, 0.1)} position={[0, 1.52, 2.72]} rotation={[-0.16, 0, 0]} />
      <mesh geometry={rbox(1.56, 0.5, 0.06, 0.03)} material={mat(GLASS, 0.15)} position={[0, 1.55, -2.68]} />
      {/* Yolcu kapıları (sağ taraf: ön + orta) — camlı çift kanat */}
      {[1.75, -0.85].map((z) => (
        <group key={z}>
          <mesh geometry={rbox(0.045, 1.35, 0.85, 0.03)} material={mat('#242f3a', 0.25)} position={[0.955, 1.08, z]} />
          <mesh geometry={rbox(0.05, 1.3, 0.03, 0.01)} material={mat('#6b7178', 0.5)} position={[0.958, 1.08, z]} />
        </group>
      ))}
      {/* Farlar: alçak köşe grupları + sinyaller */}
      {[-0.68, 0.68].map((x) => (
        <mesh key={`h${x}`} geometry={rbox(0.34, 0.2, 0.07, 0.04)} material={mat('#fff6d8', 0.3, { emissive: '#ffedb0', emissiveIntensity: 0.5 })} position={[x, 0.6, 2.78]} />
      ))}
      {[-0.88, 0.88].map((x) => (
        <mesh key={`s${x}`} geometry={rbox(0.1, 0.12, 0.06, 0.03)} material={mat('#e8923a', 0.4, { emissive: '#e8923a', emissiveIntensity: 0.3 })} position={[x, 0.6, 2.76]} />
      ))}
      {/* Arka motor kapağı: havalandırma ızgarası */}
      <mesh geometry={rbox(1.5, 0.55, 0.06, 0.03)} material={mat('#2a2f35', 0.75)} position={[0, 0.85, -2.72]} />
      {[0.68, 0.85, 1.02].map((y) => (
        <mesh key={`v${y}`} geometry={rbox(1.4, 0.04, 0.06, 0.01)} material={mat('#454c53', 0.6)} position={[0, y, -2.73]} />
      ))}
      {/* Stoplar */}
      {[-0.72, 0.72].map((x) => (
        <mesh key={`t${x}`} geometry={rbox(0.2, 0.4, 0.06, 0.03)} material={mat('#c93a3a', 0.4, { emissive: '#c93a3a', emissiveIntensity: 0.4 })} position={[x, 1.25, -2.72]} />
      ))}
      {/* Hat göstergesi: koyu kasa içinde turuncu LED matris (İETT usulü) */}
      <mesh geometry={rbox(1.5, 0.28, 0.1, 0.03)} material={mat('#15181c', 0.6)} position={[0, 2.02, 2.52]} />
      <mesh geometry={rbox(1.2, 0.14, 0.08, 0.02)} material={mat('#e87a1a', 0.4, { emissive: '#ff9524', emissiveIntensity: 0.9 })} position={[0, 2.02, 2.55]} />
      {/* Tavan: klima + (elektrikliyse) batarya paketi, değilse egzoz bacası */}
      <mesh geometry={rbox(1.1, 0.18, 1.7, 0.06)} material={mat('#d7d4cc', 0.55)} position={[0, 2.18, 0.7]} />
      {electric ? (
        <mesh geometry={rbox(1.25, 0.2, 2.4, 0.07)} material={mat('#2e9e5b', 0.45)} position={[0, 2.18, -1.3]} />
      ) : (
        <mesh geometry={rbox(0.16, 0.3, 0.16, 0.04)} material={mat('#2a2f35', 0.7)} position={[-0.6, 2.2, -2.3]} />
      )}
      {/* Aynalar: kulak tipi öne uzanan */}
      {[-1.02, 1.02].map((x) => (
        <group key={`m${x}`} position={[x, 1.9, 2.6]}>
          <mesh geometry={rbox(0.05, 0.32, 0.05, 0.02)} material={mat('#3a3f45', 0.7)} rotation={[0, 0, x > 0 ? -0.35 : 0.35]} />
          <mesh geometry={rbox(0.06, 0.28, 0.16, 0.02)} material={mat('#3a3f45', 0.7)} position={[x > 0 ? 0.08 : -0.08, -0.2, 0.06]} />
        </group>
      ))}
      {plate && (
        <>
          <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.4, 2.82]} />
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

// Körüklü otobüs (18 m): iki kasa + akordiyon körük, üç dingil — İstanbul sarısı
export function ArticBusMesh({ plate, body = IETT_YELLOW }: { plate?: string; body?: string }) {
  const stripe = '#b84a4a'
  return (
    <group>
      <ContactShadow w={2.7} d={7.8} />
      {/* Ön kasa + kubbeli tavan */}
      <mesh geometry={rbox(1.9, 1.3, 3.6, 0.16)} material={mat(body, 0.4)} position={[0, 1.05, 1.7]} castShadow />
      <mesh geometry={rbox(1.78, 0.5, 3.5, 0.24)} material={mat(body, 0.45)} position={[0, 1.88, 1.7]} castShadow />
      {/* Arka kasa + kubbeli tavan */}
      <mesh geometry={rbox(1.9, 1.3, 2.7, 0.16)} material={mat(body, 0.4)} position={[0, 1.05, -2.05]} castShadow />
      <mesh geometry={rbox(1.78, 0.5, 2.6, 0.24)} material={mat(body, 0.45)} position={[0, 1.88, -2.05]} castShadow />
      {/* Tekerlek davlumbazları */}
      {[2.75, 0.85, -2.6].map((z) =>
        [-0.945, 0.945].map((x) => (
          <mesh key={`a${x},${z}`} geometry={rbox(0.05, 0.52, 1.0, 0.04)} material={mat('#22262b', 0.8)} position={[x, 0.45, z]} />
        )),
      )}
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
      {/* Tek parça yatık ön cam: tavandan tampona */}
      <mesh geometry={rbox(1.72, 1.15, 0.07, 0.03)} material={mat(GLASS, 0.1)} position={[0, 1.52, 3.46]} rotation={[-0.16, 0, 0]} />
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
      {/* Hat göstergesi (LED matris) + tavan klimaları */}
      <mesh geometry={rbox(1.4, 0.26, 0.08, 0.03)} material={mat('#15181c', 0.6)} position={[0, 1.98, 3.4]} />
      <mesh geometry={rbox(1.15, 0.13, 0.07, 0.02)} material={mat('#e87a1a', 0.4, { emissive: '#ff9524', emissiveIntensity: 0.9 })} position={[0, 1.98, 3.42]} />
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
  return kind === 'bus' || kind === 'artic' || kind === 'ebus'
    ? 2.9
    : kind === 'vito'
      ? 2.1
      : kind === 'sprinter'
        ? 2.6
        : 2.4
}

// Reklam giydirme kampanyaları: uydurma markalar — gövde rengi + yan panel yazısı
export const WRAPS = [
  { color: '#e2543a', brand: 'EFSANE KOLONYA', text: '#fff4e8' },
  { color: '#2f8f5b', brand: 'BEREKET UN', text: '#f2f7ee' },
  { color: '#3b6bc9', brand: 'YILDIZ SİGORTA', text: '#eef3fc' },
  { color: '#c9a227', brand: 'GÜNEŞ TURŞULARI', text: '#231d0d' },
]
const wrapMatCache = new Map<number, THREE.MeshBasicMaterial>()
function wrapPanelMaterial(idx: number): THREE.MeshBasicMaterial {
  let m = wrapMatCache.get(idx)
  if (!m) {
    const w = WRAPS[idx % WRAPS.length]
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = w.color
    ctx.fillRect(0, 0, 512, 96)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 5
    ctx.strokeRect(6, 6, 500, 84)
    ctx.fillStyle = w.text
    ctx.font = '900 44px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(w.brand, 256, 52)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    m = new THREE.MeshBasicMaterial({ map: tex })
    wrapMatCache.set(idx, m)
  }
  return m
}

// Giydirilmiş aracın yan reklam panelleri (araç sınıfına göre boyut/konum)
function WrapPanels({ kind, wrap }: { kind: string; wrap: number }) {
  if (wrap <= 0) return null
  const idx = (wrap - 1) % WRAPS.length
  const dims =
    kind === 'bus' || kind === 'ebus'
      ? { x: 0.97, y: 1.05, z: -0.2, w: 3.4, h: 0.6 }
      : kind === 'artic'
        ? { x: 0.97, y: 1.05, z: 1.55, w: 2.6, h: 0.6 }
        : kind === 'vito'
          ? { x: 0.84, y: 0.95, z: -0.3, w: 2.0, h: 0.4 }
          : kind === 'sprinter'
            ? { x: 0.86, y: 1.02, z: -0.5, w: 3.1, h: 0.42 }
            : { x: 0.88, y: 1.0, z: -0.2, w: 2.3, h: 0.5 }
  return (
    <>
      <mesh material={wrapPanelMaterial(idx)} position={[dims.x, dims.y, dims.z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[dims.w, dims.h]} />
      </mesh>
      <mesh material={wrapPanelMaterial(idx)} position={[-dims.x, dims.y, dims.z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[dims.w, dims.h]} />
      </mesh>
    </>
  )
}

// Store'daki aracı sahnede sürer; seferdeyken (ekran dışı) gizlenir
export function Vehicle({ vehicleId }: { vehicleId: number }) {
  const group = useRef<THREE.Group>(null)
  const badges = useRef<THREE.Group>(null)
  const old = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.old ?? false)
  const plate = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.plate ?? '')
  const kind = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.kind ?? 'dolmus')
  const wrap = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.wrap ?? 0)
  // Giydirilmiş araç kampanya rengine boyanır (vito siyah kalır, sadece panel takar)
  const wrapBody = wrap > 0 && kind !== 'vito' ? WRAPS[(wrap - 1) % WRAPS.length].color : undefined
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
      // Parkta: burnu servis yoluna dönük bekler (sprinter kendi otoparkında)
      const [x, z] = vehicleSpotPos(v.kind, v.spotIdx)
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
      ) : kind === 'sprinter' ? (
        <SprinterMesh plate={plate || undefined} body={wrapBody} />
      ) : kind === 'artic' ? (
        <ArticBusMesh plate={plate || undefined} body={wrapBody} />
      ) : kind === 'bus' || kind === 'ebus' ? (
        <BusMesh plate={plate || undefined} electric={kind === 'ebus'} body={wrapBody} />
      ) : (
        <MinibusMesh body={wrapBody ?? (old ? '#ece5d4' : undefined)} plate={plate || undefined} />
      )}
      <WrapPanels kind={kind} wrap={wrap} />
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
