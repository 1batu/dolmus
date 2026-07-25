import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LAYOUT, PERON_STOPS, spotPos } from '../game/paths'
import { CONFIG, clockOf } from '../game/config'
import { useGame } from '../game/store'
import { RivalBus, Vehicle, plateGeo, plateMaterial } from './Vehicle'
import { asphaltTex, concreteTex, grassTex } from './textures'
import {
  Apartment,
  CarMesh,
  PassengerMesh,
  StreetLamp,
  TrashBin,
  TreeBlob,
  TreePine,
  cyl,
  glassMat,
  mat,
  rbox,
} from './models'

const PASSENGER_COLORS = ['#e07a5f', '#3d8bfd', '#f2cc8f', '#81b29a', '#b56576', '#6d597a']

function SimTicker() {
  useFrame((_, dt) => {
    useGame.getState().tick(Math.min(dt, 0.1))
  })
  return null
}

// Gece/gündüz döngüsü: oyun saatine göre güneş, ortam ışığı ve gökyüzü
const DAY_SKY = new THREE.Color('#cfe8c2')
const NIGHT_SKY = new THREE.Color('#141d33')
const DAY_SUN = new THREE.Color('#ffffff')
const NIGHT_SUN = new THREE.Color('#5a6fa8')
const DUSK_SUN = new THREE.Color('#ffb46b')
const RAIN_SKY = new THREE.Color('#78838f')

// 0 = gece, 1 = gündüz; 05-07 şafak, 18-21 gün batımı
function dayFactor(hour: number): number {
  if (hour >= 7 && hour < 18) return 1
  if (hour >= 5 && hour < 7) return (hour - 5) / 2
  if (hour >= 18 && hour < 21) return 1 - (hour - 18) / 3
  return 0
}

// Gece yanan tesis ışıkları: peron, pompa, yazıhane + saha projektörleri
const NIGHT_LIGHTS: Array<{ pos: [number, number, number]; intensity: number; distance: number }> = [
  { pos: [-12, 3.0, 4], intensity: 60, distance: 18 }, // peron saçak altı
  { pos: [-0.5, 3.2, 4.5], intensity: 50, distance: 15 }, // pompa saçağı
  { pos: [-29.5, 3.2, 11.2], intensity: 25, distance: 12 }, // yazıhane önü (giriş yanı)
  { pos: [0.8, 6.2, -3.8], intensity: 140, distance: 34 }, // saha projektörü 1 (park batı ucu)
  { pos: [46, 6.2, -3.8], intensity: 140, distance: 34 }, // saha projektörü 2 (park doğu ucu)
]

function NightLights() {
  const refs = useRef<Array<THREE.PointLight | null>>([])
  useFrame(() => {
    const nf = 1 - dayFactor(clockOf(useGame.getState().time).hour)
    refs.current.forEach((l, i) => {
      if (l) l.intensity = NIGHT_LIGHTS[i].intensity * nf
    })
  })
  return (
    <>
      {NIGHT_LIGHTS.map((l, i) => (
        <pointLight
          key={i}
          ref={(el) => void (refs.current[i] = el)}
          position={l.pos}
          intensity={0}
          distance={l.distance}
          color="#ffdfa3"
        />
      ))}
      {/* Projektör direkleri: park sıralarının iki ucunda, manevra alanı dışında */}
      {[0.8, 46].map((x) => (
        <group key={x} position={[x, 0, -3.8]}>
          <mesh geometry={cyl(0.09, 0.13, 6.4, 10)} material={mat('#5d646b', 0.6, { metal: 0.3 })} position={[0, 3.2, 0]} castShadow />
          <mesh
            geometry={rbox(0.7, 0.3, 0.45, 0.06)}
            material={mat('#3a4046', 0.5, { metal: 0.3 })}
            position={[0, 6.35, 0.3]}
            rotation={[0.5, 0, 0]}
          />
          <mesh
            geometry={rbox(0.6, 0.08, 0.36, 0.03)}
            material={mat('#fff3c9', 0.3, { emissive: '#ffe89a', emissiveIntensity: 1 })}
            position={[0, 6.28, 0.42]}
            rotation={[0.5, 0, 0]}
          />
        </group>
      ))}
    </>
  )
}

function DayNight() {
  const dir = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const scene = useThree((s) => s.scene)
  const sky = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const st = useGame.getState()
    const { hour } = clockOf(st.time)
    const f = dayFactor(hour)
    const raining = st.rainUntil > st.time

    if (dir.current) {
      dir.current.intensity = (0.12 + 1.28 * f) * (raining ? 0.7 : 1)
      // Alacakaranlıkta güneş turunculaşır
      const dusk = f > 0 && f < 1 ? Math.sin(f * Math.PI) : 0
      dir.current.color.lerpColors(NIGHT_SUN, DAY_SUN, f).lerp(DUSK_SUN, dusk * 0.6)
    }
    if (amb.current) amb.current.intensity = 0.16 + 0.39 * f
    if (hemi.current) hemi.current.intensity = 0.12 + 0.38 * f
    sky.lerpColors(NIGHT_SKY, DAY_SKY, f)
    if (raining) sky.lerp(RAIN_SKY, 0.45)
    scene.background = sky
    // Uzaklık sisi: sahneye derinlik katar, gökyüzüyle aynı tona akar
    if (!scene.fog) scene.fog = new THREE.Fog(sky, 130, 320)
    ;(scene.fog as THREE.Fog).color.copy(sky)
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0.55} />
      <hemisphereLight ref={hemi} args={['#dff2ff', '#b9d8a2', 0.5]} />
      <directionalLight
        ref={dir}
        position={[45, 70, 25]}
        intensity={1.4}
        castShadow
        shadow-bias={-0.0002}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
    </>
  )
}

// Yol malzemesi modül seviyesinde: yağmurda ıslak parlaklığa geçer
const roadMaterial = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95 })

// Yağmur: nokta partikülleri + asfaltın ıslanması
function RainFX() {
  const points = useRef<THREE.Points>(null)
  const N = 700
  const data = useMemo(() => {
    const positions = new Float32Array(N * 3)
    const speeds = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      positions[i * 3] = -80 + Math.random() * 170
      positions[i * 3 + 1] = Math.random() * 42
      positions[i * 3 + 2] = -28 + Math.random() * 60
      speeds[i] = 26 + Math.random() * 18
    }
    return { positions, speeds }
  }, [])
  const rainMat = useMemo(
    () =>
      new THREE.PointsMaterial({ color: '#aac4e0', size: 0.16, transparent: true, opacity: 0.65 }),
    [],
  )
  useFrame((_, dt) => {
    const s = useGame.getState()
    const raining = s.rainUntil > s.time
    if (points.current) points.current.visible = raining
    // Islak asfalt: pürüzlülük düşer, renk koyulaşır
    const targetRough = raining ? 0.35 : 0.95
    roadMaterial.roughness += (targetRough - roadMaterial.roughness) * Math.min(1, dt * 2)
    if (!raining || !points.current) return
    const pos = points.current.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      let y = pos.getY(i) - data.speeds[i] * dt
      if (y < 0) y = 40 + Math.random() * 4
      pos.setY(i, y)
    }
    pos.needsUpdate = true
  })
  return (
    <points ref={points} visible={false} material={rainMat}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
    </points>
  )
}

// Ana yol: asfalt + kenar bantları + orta şerit kesikleri
function Road() {
  const dashes = useMemo(() => Array.from({ length: 24 }, (_, i) => -88 + i * 7.6), [])
  return (
    <group>
      <mesh
        position={[0, 0.02, LAYOUT.roadZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={roadMaterial}
        receiveShadow
      >
        <planeGeometry args={[190, LAYOUT.roadHalf * 2]} />
      </mesh>
      {/* Kenar çizgileri */}
      {[-LAYOUT.roadHalf + 0.25, LAYOUT.roadHalf - 0.25].map((oz) => (
        <mesh key={oz} position={[0, 0.035, LAYOUT.roadZ + oz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[190, 0.16]} />
          <meshStandardMaterial color="#dcd8cc" />
        </mesh>
      ))}
      {dashes.map((x) => (
        <mesh key={x} position={[x, 0.04, LAYOUT.roadZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.2]} />
          <meshStandardMaterial color="#f2d34e" />
        </mesh>
      ))}
      {/* Yaya geçidi */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`z${i}`} position={[-6, 0.045, 17.1 + i * 0.82]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.48]} />
          <meshStandardMaterial color="#e8e4d8" />
        </mesh>
      ))}
      {/* Karşı kaldırım */}
      <mesh position={[0, 0.015, 25.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, 3.6]} />
        <meshStandardMaterial color="#c6c9c1" />
      </mesh>
    </group>
  )
}

// Ambiyans trafiği: dekoratif arabalar, iki yönde akar (simülasyona dahil değil)
const AMBIENT_CARS: Array<{
  lane: number
  dir: 1 | -1
  speed: number
  offset: number
  color: string
  kind: 'sedan' | 'hatch' | 'pickup' | 'taxi'
}> = [
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 12, offset: -70, color: '#4caf6e', kind: 'sedan' },
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 14, offset: -10, color: '#e6b23a', kind: 'hatch' },
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 11, offset: 45, color: '#5a8fd6', kind: 'pickup' },
  { lane: LAYOUT.laneFarZ, dir: -1, speed: 13, offset: 60, color: '#d95f5f', kind: 'hatch' },
  { lane: LAYOUT.laneFarZ, dir: -1, speed: 10, offset: 0, color: '#7bc47f', kind: 'pickup' },
  { lane: LAYOUT.laneFarZ, dir: -1, speed: 15, offset: -55, color: '#9a7fd6', kind: 'sedan' },
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 13, offset: 85, color: '#e8c53a', kind: 'taxi' },
  // Arka sokak: yavaş mahalle trafiği
  // Arka sokak 7 birim geride: şeritler yol ortasında akar, kaldırım kenarındaki
  // park halindeki araçlara değmez
  { lane: -18.65, dir: 1, speed: 7, offset: 25, color: '#8a9aa8', kind: 'sedan' },
  { lane: -20.35, dir: -1, speed: 6, offset: -40, color: '#c98a3a', kind: 'hatch' },
]

function AmbientTraffic() {
  const refs = useRef<Array<THREE.Group | null>>([])
  // İşletilen her taksi sahnedeki trafiğe sarı taksi olarak katılır.
  // 'd' = gündüzcü (gece durakta dinlenir), 'n' = gece vardiyalı (24 saat yolda)
  const taxiShiftKey = useGame((s) =>
    s.taxis
      .filter((tx) => tx.mode === 'operate' && tx.hasCar)
      .map((tx) => (tx.nightShift ? 'n' : 'd'))
      .join(''),
  )
  // Kiradaki rent-a-car araçları da müşterinin elinde şehirde dolaşır
  const rentedCount = useGame((s) => s.rentals.filter((r) => r.rentDaysLeft > 0).length)
  const cars = useMemo(
    () => [
      ...AMBIENT_CARS,
      ...taxiShiftKey.split('').filter(Boolean).map((shift, i) => ({
        lane: i % 2 === 0 ? LAYOUT.laneNearZ : LAYOUT.laneFarZ,
        dir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
        speed: 11 + (i % 4),
        offset: 18 + i * 31,
        color: '#e8c53a',
        kind: 'taxi' as const,
        resty: shift === 'd', // gündüzcü gece durakta dinlenir; vardiyalı 24 saat yolda
        taxiIdx: i, // gündüz bekleme sırası TaxiStand ile aynı formülden hesaplanır
      })),
      ...Array.from({ length: rentedCount }, (_, i) => ({
        lane: i % 2 === 0 ? LAYOUT.laneFarZ : LAYOUT.laneNearZ,
        dir: (i % 2 === 0 ? -1 : 1) as 1 | -1,
        speed: 10 + (i % 5),
        offset: 7 + i * 23,
        color: ['#d9dde2', '#8d9aa8', '#3c4c60'][i % 3],
        kind: 'sedan' as const,
      })),
    ],
    [taxiShiftKey, rentedCount],
  )
  useFrame((state) => {
    const tNow = state.clock.elapsedTime
    const hour = clockOf(useGame.getState().time).hour
    const night = hour < CONFIG.nightEndHour || hour >= 23
    cars.forEach((car, i) => {
      const g = refs.current[i]
      if (!g) return
      // Duraktaki taksi trafikte görünmez: gündüzcü gece, sırası gelen gündüz bekler
      const taxiIdx = (car as { taxiIdx?: number }).taxiIdx
      const restingAtNight = night && (car as { resty?: boolean }).resty
      const waitingByDay =
        taxiIdx != null && !night && (Math.floor(hour) + taxiIdx * 3) % 7 === 0
      if (restingAtNight || waitingByDay) {
        g.visible = false
        return
      }
      g.visible = true
      const span = 190
      const x = ((((car.offset + car.dir * car.speed * tNow) % span) + span * 1.5) % span) - 95
      g.position.set(x, 0, car.lane)
      g.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2
    })
  })
  return (
    <>
      {cars.map((car, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)}>
          <CarMesh color={car.color} kind={car.kind} />
        </group>
      ))}
    </>
  )
}

// Park yeri: beyaz çizgili cep + tekerlek takozu
// Türkçe tabela: canvas doku, ışıksız materyal — gece de okunur
const signCache = new Map<string, THREE.MeshBasicMaterial>()
function signMaterial(text: string, bg: string, fg = '#ffffff'): THREE.MeshBasicMaterial {
  const key = `${text}|${bg}|${fg}`
  let m = signCache.get(key)
  if (!m) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 112
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 512, 112)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 6
    ctx.strokeRect(8, 8, 496, 96)
    ctx.fillStyle = fg
    let size = 58
    ctx.font = `900 ${size}px system-ui, sans-serif`
    while (ctx.measureText(text).width > 450 && size > 20) {
      size -= 4
      ctx.font = `900 ${size}px system-ui, sans-serif`
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 256, 60)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    m = new THREE.MeshBasicMaterial({ map: tex })
    signCache.set(key, m)
  }
  return m
}

function Sign({ text, bg, w = 2.2, h = 0.48, pos, fg }: { text: string; bg: string; w?: number; h?: number; pos: [number, number, number]; fg?: string }) {
  return (
    <mesh position={pos} material={signMaterial(text, bg, fg)}>
      <planeGeometry args={[w, h]} />
    </mesh>
  )
}

function ParkingSpot({ index }: { index: number }) {
  const [x, z] = spotPos(index)
  const w = 3.2
  const d = 5.4
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#a4a8ab" />
      </mesh>
      {[-w / 2, w / 2].map((ox) => (
        <mesh key={ox} position={[ox, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.14, d]} />
          <meshStandardMaterial color="#f0ece0" />
        </mesh>
      ))}
      <mesh position={[0, 0.05, -d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.14]} />
        <meshStandardMaterial color="#f0ece0" />
      </mesh>
      <mesh geometry={rbox(1.6, 0.14, 0.22, 0.05)} material={mat('#c9b458', 0.8)} position={[0, 0.08, -1.9]} />
    </group>
  )
}

// Biniş peronu: çelik ayaklı modern saçak, cam arkalık, bank, kuyruk
function Peron() {
  // Kuyruk peronlara bölünür: ana peron kendi payını gösterir, kalanı ek duraklarda
  const queue = useGame((s) => Math.ceil(s.queue / Math.max(1, s.perons)))
  return (
    <group position={[LAYOUT.peronX, 0, 4]}>
      {/* Platform */}
      <mesh geometry={rbox(9.2, 0.22, 3.6, 0.06)} material={mat('#9aa0a7', 0.8)} position={[0, 0.11, 0]} receiveShadow />
      {/* Saçak */}
      <mesh geometry={rbox(8.8, 0.12, 2.9, 0.05)} material={mat('#f4f2ec', 0.5)} position={[0, 2.62, -0.2]} castShadow />
      {[-1.35, 1.0].map((oz) =>
        [-3.9, 3.9].map((ox) => (
          <mesh
            key={`${ox},${oz}`}
            geometry={cyl(0.06, 0.06, 2.5, 10)}
            material={mat('#8f969e', 0.5, { metal: 0.4 })}
            position={[ox, 1.35, oz]}
          />
        )),
      )}
      {/* Kırmızı alın bandı */}
      <mesh geometry={rbox(8.85, 0.2, 0.12, 0.04)} material={mat('#d94f4f', 0.5)} position={[0, 2.56, 1.28]} />
      {/* Cam arkalık + yan paneller */}
      <mesh geometry={rbox(8.2, 1.3, 0.07, 0.03)} material={glassMat()} position={[0, 1.1, -1.55]} />
      {[-4.32, 4.32].map((ox) => (
        <mesh key={ox} geometry={rbox(0.07, 1.3, 2.4, 0.03)} material={glassMat()} position={[ox, 1.1, -0.3]} />
      ))}
      {/* Hat panosu */}
      <mesh geometry={rbox(1.7, 0.95, 0.06, 0.03)} material={mat('#f4f2ec', 0.5)} position={[0, 1.45, -1.5]} />
      <mesh geometry={rbox(1.7, 0.24, 0.07, 0.03)} material={mat('#2160c4', 0.45)} position={[0, 1.82, -1.5]} />
      {/* Oturak sırası */}
      <group position={[-2.2, 0, -0.95]}>
        {[0, 0.68, 1.36, 2.04].map((ox) => (
          <group key={ox} position={[ox, 0, 0]}>
            <mesh geometry={rbox(0.55, 0.09, 0.5, 0.04)} material={mat('#2160c4', 0.5)} position={[0, 0.58, 0]} castShadow />
            <mesh geometry={rbox(0.55, 0.45, 0.07, 0.03)} material={mat('#2160c4', 0.5)} position={[0, 0.85, -0.24]} />
          </group>
        ))}
        <mesh geometry={rbox(2.8, 0.08, 0.12, 0.03)} material={mat('#6f757c', 0.6)} position={[1.0, 0.42, 0]} />
      </group>
      {/* Bank */}
      <group position={[2.6, 0, -0.9]}>
        <mesh geometry={rbox(2.4, 0.1, 0.55, 0.04)} material={mat('#c89a6b', 0.7)} position={[0, 0.62, 0]} castShadow />
        {[-1.0, 1.0].map((ox) => (
          <mesh key={ox} geometry={rbox(0.1, 0.4, 0.5, 0.03)} material={mat('#6f757c', 0.6)} position={[ox, 0.42, 0]} />
        ))}
      </group>
      {/* Durak tabelası */}
      <group position={[-4.7, 0, 1.1]}>
        <mesh geometry={cyl(0.05, 0.05, 2.4, 8)} material={mat('#8f969e', 0.5, { metal: 0.4 })} position={[0, 1.2, 0]} />
        <mesh geometry={rbox(0.9, 0.65, 0.09, 0.06)} material={mat('#2160c4', 0.4, { emissive: '#2160c4', emissiveIntensity: 0.15 })} position={[0, 2.55, 0]} />
        <mesh geometry={rbox(0.7, 0.1, 0.1, 0.03)} material={mat('#f4f2ec', 0.5)} position={[0, 2.55, 0.01]} />
      </group>
      {/* Çöp kutusu */}
      <group position={[4.2, 0, 1.3]}>
        <TrashBin />
      </group>
      {/* Kuyruk: ilk sıra platformda, taşanlar öne dizilir (azami 30 figür çizilir) */}
      {Array.from({ length: Math.min(queue, 30) }, (_, i) => {
        const row = Math.floor(i / 10)
        const rowZ = row === 0 ? 1.05 : row === 1 ? 2.3 : 3.15
        return (
          <group
            key={i}
            position={[-3.6 + (i % 10) * 0.76 + (row % 2) * 0.3, row === 0 ? 0.22 : 0, rowZ]}
            rotation={[0, (i % 5) * 0.35 - 0.7, 0]}
          >
            <PassengerMesh color={PASSENGER_COLORS[i % PASSENGER_COLORS.length]} variant={i} />
          </group>
        )
      })}
    </group>
  )
}

// Terminal pompası: "Doldur" basınca araçlar buraya yanaşır
function FuelPump() {
  return (
    <group position={[-1.1, 0, 4.5]}>
      {/* Ada */}
      <mesh geometry={rbox(0.95, 0.18, 4.4, 0.05)} material={mat('#b3b8bd', 0.8)} position={[0, 0.09, 0]} receiveShadow />
      {/* Pompalar */}
      {[-1.1, 1.1].map((oz) => (
        <group key={oz} position={[0, 0, oz]}>
          <mesh geometry={rbox(0.42, 1.05, 0.34, 0.06)} material={mat('#d23f3f', 0.5)} position={[0, 0.7, 0]} castShadow />
          <mesh geometry={rbox(0.3, 0.26, 0.06, 0.03)} material={mat('#242f3a', 0.3)} position={[0, 0.95, 0.16]} />
          <mesh geometry={rbox(0.44, 0.12, 0.36, 0.04)} material={mat('#f4f2ec', 0.5)} position={[0, 1.28, 0]} />
          <mesh geometry={rbox(0.08, 0.3, 0.1, 0.03)} material={mat('#2a2f35', 0.7)} position={[0.24, 0.85, 0]} />
        </group>
      ))}
      {/* Saçak */}
      <mesh geometry={rbox(3.2, 0.12, 5.6, 0.05)} material={mat('#f4f2ec', 0.5)} position={[0.2, 3.05, 0]} castShadow />
      <mesh geometry={rbox(3.25, 0.22, 0.12, 0.04)} material={mat('#2160c4', 0.45)} position={[0.2, 2.98, 2.82]} />
      {[-2.5, 2.5].map((oz) => (
        <mesh key={oz} geometry={cyl(0.07, 0.07, 3.0, 10)} material={mat('#8f969e', 0.5, { metal: 0.4 })} position={[0, 1.5, oz]} />
      ))}
      {/* Fiyat totemi */}
      <group position={[0, 0, -3.5]}>
        <mesh geometry={rbox(0.5, 2.2, 0.24, 0.05)} material={mat('#2160c4', 0.5)} position={[0, 1.1, 0]} castShadow />
        <mesh geometry={rbox(0.42, 0.5, 0.26, 0.04)} material={mat('#f4f2ec', 0.4, { emissive: '#f4f2ec', emissiveIntensity: 0.2 })} position={[0, 1.7, 0]} />
        <mesh geometry={rbox(0.42, 0.3, 0.26, 0.04)} material={mat('#d23f3f', 0.5)} position={[0, 2.15, 0]} />
      </group>
    </group>
  )
}

// İnşa edilen tesisler: arka şeritte sıralanır, satın alınınca belirir
function TerminalBuildings() {
  const buildings = useGame((s) => s.buildings)
  return (
    <>
      {buildings.bufe && (
        <group position={[-12, 0, -13]}>
          {/* Büfe: kepenkli satış penceresi + tente */}
          <mesh geometry={rbox(3.2, 2.5, 2.4, 0.08)} material={mat('#e0c9a0', 0.7)} position={[0, 1.25, 0]} castShadow />
          <mesh geometry={rbox(3.6, 0.24, 2.8, 0.06)} material={mat('#7a5a3a', 0.8)} position={[0, 2.6, 0]} />
          <mesh geometry={rbox(1.8, 1.0, 0.12, 0.04)} material={mat('#2f3b46', 0.3)} position={[0, 1.35, 1.21]} />
          <mesh geometry={rbox(2.0, 0.1, 0.5, 0.03)} material={mat('#c9cdd2', 0.6)} position={[0, 0.85, 1.35]} />
          <mesh
            geometry={rbox(2.6, 0.07, 1.0, 0.03)}
            material={mat('#d23f3f', 0.6)}
            position={[0, 2.15, 1.6]}
            rotation={[0.3, 0, 0]}
            castShadow
          />
          <Sign text="BÜFE" bg="#d9a03a" w={2.2} h={0.45} pos={[0, 2.9, 1.12]} />
        </group>
      )}
      {buildings.cayOcagi && (
        <group position={[-19, 0, -13]}>
          {/* Çay ocağı: küçük kulübe + baca */}
          <mesh geometry={rbox(2.3, 2.2, 2.0, 0.08)} material={mat('#b56b4a', 0.7)} position={[0, 1.1, 0]} castShadow />
          <mesh geometry={rbox(2.7, 0.2, 2.4, 0.06)} material={mat('#6f4a33', 0.8)} position={[0, 2.3, 0]} />
          <mesh geometry={cyl(0.12, 0.12, 0.9, 8)} material={mat('#4a4f55', 0.7)} position={[0.7, 2.8, -0.5]} />
          <mesh geometry={rbox(1.0, 0.9, 0.12, 0.04)} material={mat('#2f3b46', 0.3)} position={[-0.3, 1.25, 1.01]} />
          <Sign text="ÇAY OCAĞI" bg="#c94f4f" w={1.8} h={0.4} pos={[0, 2.55, 0.97]} />
        </group>
      )}
      {buildings.tamirhane && (
        <group position={[22, 0, -13.2]}>
          {/* Tamirhane: geniş garaj + sürgülü kapı */}
          <mesh geometry={rbox(6.4, 3.4, 4.2, 0.1)} material={mat('#9aa1a8', 0.75)} position={[0, 1.7, 0]} castShadow />
          <mesh geometry={rbox(7.0, 0.3, 4.6, 0.08)} material={mat('#5d646b', 0.8)} position={[0, 3.5, 0]} />
          <mesh geometry={rbox(4.2, 2.5, 0.14, 0.04)} material={mat('#3a4046', 0.6)} position={[-0.6, 1.35, 2.11]} />
          {[0.6, 1.1, 1.6, 2.1].map((y) => (
            <mesh key={y} geometry={rbox(4.1, 0.05, 0.16, 0.02)} material={mat('#565d64', 0.6)} position={[-0.6, y, 2.12]} />
          ))}
          <mesh geometry={rbox(1.2, 1.0, 0.12, 0.04)} material={mat('#8fb8d4', 0.25)} position={[2.4, 1.6, 2.11]} />
          <Sign text="TAMİRHANE" bg="#2160c4" w={3.0} h={0.5} pos={[0, 3.85, 1.98]} />
        </group>
      )}
      {buildings.sarj && (
        <group position={[-4, 0, -13]}>
          {/* Şarj istasyonu: beton zemin + iki şarj ünitesi + saçak */}
          <mesh geometry={rbox(3.6, 0.12, 2.6, 0.04)} material={mat('#b3b8bd', 0.8)} position={[0, 0.06, 0]} receiveShadow />
          {[-1.0, 1.0].map((x) => (
            <group key={x} position={[x, 0, -0.5]}>
              <mesh geometry={rbox(0.5, 1.5, 0.34, 0.08)} material={mat('#eef1f4', 0.45)} position={[0, 0.85, 0]} castShadow />
              <mesh geometry={rbox(0.36, 0.4, 0.06, 0.03)} material={mat('#17b8a6', 0.3, { emissive: '#17b8a6', emissiveIntensity: 0.8 })} position={[0, 1.15, 0.18]} />
              <mesh geometry={rbox(0.1, 0.16, 0.08, 0.03)} material={mat('#2a2f35', 0.7)} position={[0.18, 0.7, 0.16]} />
              {/* Kablo */}
              <mesh geometry={cyl(0.03, 0.03, 0.6, 6)} material={mat('#22262b', 0.8)} position={[0.24, 0.45, 0.2]} rotation={[0.4, 0, 0.3]} />
            </group>
          ))}
          <mesh geometry={rbox(3.4, 0.1, 2.0, 0.04)} material={mat('#eef1f4', 0.5)} position={[0, 2.35, -0.3]} castShadow />
          {[-1.5, 1.5].map((x) => (
            <mesh key={x} geometry={cyl(0.06, 0.06, 2.3, 8)} material={mat('#8f969e', 0.5, { metal: 0.4 })} position={[x, 1.15, -1.1]} />
          ))}
          <Sign text="ŞARJ İSTASYONU" bg="#0d9488" w={2.4} h={0.42} pos={[0, 2.2, 0.74]} />
        </group>
      )}
      {buildings.solar && (
        <group position={[3, 0, -13]}>
          {/* Güneş paneli dizisi + depo bataryası */}
          {[-1.3, 0.1, 1.5].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh geometry={cyl(0.05, 0.05, 0.8, 6)} material={mat('#6f767e', 0.6, { metal: 0.4 })} position={[0, 0.4, 0]} />
              <mesh geometry={rbox(1.25, 0.06, 1.7, 0.02)} material={mat('#1d3a6b', 0.25, { metal: 0.5 })} position={[0, 0.85, 0]} rotation={[-0.5, 0, 0]} castShadow />
            </group>
          ))}
          <mesh geometry={rbox(0.9, 0.9, 0.6, 0.06)} material={mat('#e8eaed', 0.5)} position={[2.7, 0.45, 0]} castShadow />
          <Sign text="GÜNEŞ ENERJİSİ" bg="#2e9e5b" w={0.86} h={0.24} pos={[2.7, 0.62, 0.32]} />
        </group>
      )}
      {buildings.yakitTanki && (
        <group position={[-26, 0, -13]}>
          {/* Akaryakıt tankı: yatay silindir + sehpalar + boru + dolum noktası */}
          {[-1.1, 1.1].map((x) => (
            <mesh key={x} geometry={rbox(0.5, 0.6, 1.5, 0.05)} material={mat('#9aa1a8', 0.8)} position={[x, 0.3, 0]} />
          ))}
          <mesh geometry={cyl(0.95, 0.95, 4.2, 20)} material={mat('#cfd4d9', 0.4, { metal: 0.5 })} position={[0, 1.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
          {/* Kapak + emniyet vanası */}
          <mesh geometry={cyl(0.3, 0.3, 0.3, 12)} material={mat('#d23f3f', 0.5)} position={[0, 2.35, 0]} />
          <mesh geometry={cyl(0.06, 0.06, 1.2, 8)} material={mat('#6f767e', 0.6, { metal: 0.4 })} position={[1.6, 0.6, 0.9]} rotation={[0.5, 0, 0]} />
          {/* Uyarı şeridi + tabela */}
          <mesh geometry={rbox(4.0, 0.14, 0.05, 0.02)} material={mat('#d9a03a', 0.5)} position={[0, 0.9, 1.02]} />
          <Sign text="MOTORİN" bg="#d23f3f" w={2.4} h={0.5} pos={[0, 1.5, 1.0]} />
        </group>
      )}
    </>
  )
}

// Reklam panosu: ana yol kenarında dev pano — reklam her gün değişir
const BILLBOARD_ADS: Array<{ brand: string; slogan: string; bg: string; fg?: string }> = [
  { brand: 'EFSANE KOLONYA', slogan: '80 DERECE FERAHLIK', bg: '#e2543a' },
  { brand: 'BEREKET UN', slogan: 'HAMURUN HASI', bg: '#2f8f5b' },
  { brand: 'YILDIZ SİGORTA', slogan: 'KAZAYA KARŞI YILDIZ KALKAN', bg: '#3b6bc9' },
  { brand: 'GÜNEŞ TURŞULARI', slogan: 'ÇITIR ÇITIR', bg: '#c9a227', fg: '#231d0d' },
  { brand: 'DOLMUŞ!', slogan: 'HATTIN KRALI SENSİN', bg: '#171a1f' },
]

function Billboard() {
  const built = useGame((s) => s.buildings.billboard)
  // Reklam kampanyası her oyun günü döner (değer eşitliği: günde bir render)
  const adIdx = useGame((s) => clockOf(s.time).day % BILLBOARD_ADS.length)
  if (!built) return null
  const ad = BILLBOARD_ADS[adIdx]
  return (
    <group position={[33, 0, 15.4]}>
      {/* Ayaklar + platform */}
      {[-2.6, 2.6].map((ox) => (
        <mesh key={ox} geometry={cyl(0.14, 0.18, 3.6, 10)} material={mat('#5d646b', 0.6, { metal: 0.4 })} position={[ox, 1.8, 0]} castShadow />
      ))}
      <mesh geometry={rbox(7.6, 0.14, 0.5, 0.04)} material={mat('#8f969e', 0.6, { metal: 0.3 })} position={[0, 3.6, 0]} />
      {/* Pano gövdesi + reklam yüzü (yola ve kameraya bakar) */}
      <mesh geometry={rbox(7.4, 3.0, 0.24, 0.05)} material={mat('#2a2f35', 0.6)} position={[0, 5.3, 0]} castShadow />
      <Sign text={ad.brand} bg={ad.bg} fg={ad.fg} w={7.0} h={1.7} pos={[0, 5.8, 0.14]} />
      <Sign text={ad.slogan} bg={ad.bg} fg={ad.fg} w={7.0} h={0.9} pos={[0, 4.45, 0.14]} />
      {/* Tepe aydınlatması */}
      <mesh geometry={rbox(1.2, 0.08, 0.3, 0.03)} material={mat('#fff3c9', 0.3, { emissive: '#ffe89a', emissiveIntensity: 0.6 })} position={[0, 7.0, 0.2]} />
    </group>
  )
}

// Taksi durağı: terminal girişinin yanında — işletilen taksiler gece burada
// dinlenir, gündüz şehir trafiğine çıkar (AmbientTraffic)
function TaxiStand() {
  const ownedCabs = useGame((s) => s.taxis.filter((tx) => tx.hasCar).length)
  // Gece (23-06) gündüzcü taksiler durakta; gece vardiyalılar yolda kalır.
  // Gündüz de yolcu bulamayan taksi durakta bekler: her taksi ~7 saatte 1 saat,
  // sıralı (i×3 kaydırma). Değer eşitliği: saat sınırında bir kez değişir
  const restingCabs = useGame((s) => {
    const h = clockOf(s.time).hour
    const night = h < CONFIG.nightEndHour || h >= 23
    const ops = s.taxis.filter((tx) => tx.mode === 'operate' && tx.hasCar)
    if (night) return ops.filter((tx) => !tx.nightShift).length
    const hh = Math.floor(h)
    return ops.filter((_, i) => (hh + i * 3) % 7 === 0).length
  })
  if (ownedCabs === 0) return null
  return (
    <group position={[-13, 0, 14.9]}>
      {/* Cep zemini */}
      <mesh geometry={rbox(7.6, 0.08, 3.0, 0.03)} material={mat('#8f959b', 0.85)} position={[0, 0.04, 0]} receiveShadow />
      {/* Tabela */}
      <mesh geometry={cyl(0.05, 0.05, 2.4, 8)} material={mat('#6f767e', 0.6, { metal: 0.4 })} position={[-3.4, 1.2, -1.2]} />
      <mesh geometry={rbox(1.5, 0.5, 0.12, 0.05)} material={mat('#c9a227', 0.5)} position={[-3.4, 2.3, -1.2]} />
      <Sign text="TAKSİ" bg="#e8b820" fg="#111111" w={1.4} h={0.44} pos={[-3.4, 2.3, -1.13]} />
      {/* Gece dinlenen taksiler */}
      {Array.from({ length: Math.min(restingCabs, 3) }, (_, i) => (
        <group key={i} position={[-1.6 + i * 2.3, 0, 0.2]} rotation={[0, Math.PI / 2 + (i % 2) * 0.08, 0]} scale={0.8}>
          <CarMesh color="#e8c53a" kind="taxi" />
        </group>
      ))}
    </group>
  )
}

// Ek peron durakları (2. ve 3.): servis yolunun kuzey cebinde küçük saçaklı duraklar
function ExtraPerons() {
  const perons = useGame((s) => s.perons)
  // Her ek durak kuyruğun kendi payını gösterir (azami 10 figür)
  const perPeron = useGame((s) =>
    Math.min(10, Math.floor(s.queue / Math.max(1, s.perons))),
  )
  if (perons <= 1) return null
  return (
    <>
      {PERON_STOPS.slice(1, perons).map((stop, i) => (
        <group key={i} position={[stop[0], 0, 12.1]}>
          {/* Platform */}
          <mesh geometry={rbox(6.0, 0.22, 1.6, 0.04)} material={mat('#c9cdd2', 0.8)} position={[0, 0.11, 0]} receiveShadow />
          {/* Saçak + direkler */}
          <mesh geometry={rbox(5.6, 0.1, 1.5, 0.04)} material={mat('#f4f2ec', 0.5)} position={[0, 2.5, 0]} castShadow />
          {[-2.4, 2.4].map((ox) => (
            <mesh key={ox} geometry={cyl(0.06, 0.06, 2.3, 8)} material={mat('#8f969e', 0.5, { metal: 0.4 })} position={[ox, 1.25, 0.4]} />
          ))}
          {/* Cam arkalık + bank */}
          <mesh geometry={rbox(5.2, 0.9, 0.06, 0.03)} material={mat('#2f3b46', 0.25)} position={[0, 1.15, 0.65]} />
          <mesh geometry={rbox(3.6, 0.08, 0.4, 0.03)} material={mat('#7a5a3a', 0.7)} position={[0, 0.55, 0.35]} />
          {/* Durak tabelası */}
          <Sign text={`PERON ${i + 2}`} bg="#2160c4" w={1.4} h={0.4} pos={[0, 2.75, -0.7]} />
          {/* Cep çizgisi: araç yanaşma alanı */}
          <mesh position={[0, 0.03, -2.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.4, 0.16]} />
            <meshStandardMaterial color="#e8d44d" />
          </mesh>
          {/* Bu durağın bekleyen yolcuları */}
          {Array.from({ length: perPeron }, (_, p) => (
            <group
              key={p}
              position={[-2.3 + (p % 8) * 0.66 + (i % 2) * 0.2, 0.22, 0.05 - Math.floor(p / 8) * 0.55]}
              rotation={[0, ((p + i) % 5) * 0.35 - 0.7, 0]}
            >
              <PassengerMesh color={PASSENGER_COLORS[(p + i * 3) % PASSENGER_COLORS.length]} variant={p + i * 7} />
            </group>
          ))}
        </group>
      ))}
    </>
  )
}

// Rent-a-car: yazıhanenin arkasındaki otopark — plakalı sedanlar, boştakiler
// burada bekler, kiradakiler trafiğe karışır (AmbientTraffic)
function RentACarLot() {
  const rentalOffice = useGame((s) => s.rentalOffice)
  // Boştaki araçların plaka listesi: sadece filo/kira durumu değişince re-render
  const idleKey = useGame((s) =>
    s.rentals.filter((r) => r.rentDaysLeft <= 0).map((r) => r.plate).join(','),
  )
  if (!rentalOffice) return null
  const idlePlates = idleKey ? idleKey.split(',') : []
  const colors = ['#d9dde2', '#8d9aa8', '#b84a4a', '#3c4c60', '#5a7a52']
  return (
    <group position={[-29.5, 0, -2.5]}>
      {/* Otopark zemini + cep çizgileri (3 sıra × 5 araç) */}
      <mesh geometry={rbox(9.0, 0.1, 8.2, 0.03)} material={mat('#8f959b', 0.85)} position={[0.4, 0.05, 0]} receiveShadow />
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) => (
          <mesh
            key={`ln${row}-${col}`}
            position={[-2.6 + col * 1.45, 0.11, 2.6 - row * 2.7]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.08, 2.3]} />
            <meshStandardMaterial color="#f0ece0" />
          </mesh>
        )),
      )}
      {/* Tabela */}
      <mesh geometry={cyl(0.05, 0.05, 2.6, 8)} material={mat('#6f767e', 0.6, { metal: 0.4 })} position={[4.4, 1.3, 3.6]} />
      <mesh geometry={rbox(2.1, 0.56, 0.12, 0.05)} material={mat('#0f766e', 0.5)} position={[4.4, 2.5, 3.6]} />
      <Sign text="OTO KİRALAMA" bg="#0d9488" w={2.0} h={0.5} pos={[4.4, 2.5, 3.67]} />
      {/* Boştaki kiralık araçlar: plakalı, cep cebe dizili */}
      {idlePlates.slice(0, 15).map((plate, i) => {
        const row = Math.floor(i / 5)
        const col = i % 5
        return (
          <group
            key={plate}
            position={[-1.9 + col * 1.45, 0, 2.6 - row * 2.7]}
            rotation={[0, (i % 3) * 0.06 - 0.06, 0]}
            scale={0.72}
          >
            <CarMesh color={colors[i % colors.length]} kind="sedan" />
            <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.32, 1.55]} scale={0.8} />
            <mesh geometry={plateGeo} material={plateMaterial(plate)} position={[0, 0.32, -1.55]} rotation={[0, Math.PI, 0]} scale={0.8} />
          </group>
        )
      })}
    </group>
  )
}

// Yazıhane: terminal ofisi — saçaklı çatı, kapı, çerçeveli pencere, klima
function Office() {
  return (
    // Giriş kapısının hemen yanı: gelen araç önce yazıhanenin önünden geçer
    <group position={[-29.5, 0, 9]}>
      <mesh geometry={rbox(4.6, 2.9, 3.6, 0.1)} material={mat('#ece3d2', 0.7)} position={[0, 1.45, 0]} castShadow />
      {/* Çatı */}
      <mesh geometry={rbox(5.3, 0.28, 4.3, 0.08)} material={mat('#5a4634', 0.8)} position={[0, 3.0, 0]} castShadow />
      {/* Kapı */}
      <mesh geometry={rbox(0.95, 1.9, 0.1, 0.04)} material={mat('#7a5a3a', 0.7)} position={[-0.9, 1.0, 1.81]} />
      <mesh geometry={rbox(0.12, 0.12, 0.12, 0.05)} material={mat('#d9b23a', 0.4, { metal: 0.5 })} position={[-0.55, 1.0, 1.88]} />
      {/* Pencere */}
      <mesh geometry={rbox(1.5, 1.05, 0.12, 0.04)} material={mat('#f4f2ec', 0.5)} position={[0.95, 1.55, 1.8]} />
      <mesh geometry={rbox(1.3, 0.85, 0.1, 0.03)} material={mat('#8fb8d4', 0.2)} position={[0.95, 1.55, 1.84]} />
      {/* Tabela bandı */}
      <mesh geometry={rbox(3.6, 0.6, 0.14, 0.05)} material={mat('#2160c4', 0.4, { emissive: '#2160c4', emissiveIntensity: 0.2 })} position={[0, 3.45, 1.7]} />
      <Sign text="YAZIHANE" bg="#2160c4" w={3.2} h={0.52} pos={[0, 3.45, 1.78]} />
      {/* Klima */}
      <mesh geometry={rbox(0.9, 0.5, 0.35, 0.05)} material={mat('#c9cdd2', 0.5)} position={[-2.35, 2.2, 0.6]} />
      {/* Basamak */}
      <mesh geometry={rbox(1.3, 0.14, 0.6, 0.04)} material={mat('#b3b8bd', 0.8)} position={[-0.9, 0.07, 2.05]} />
    </group>
  )
}

const BLOB_TREES: Array<[number, number, number]> = [
  [-42, -8, 1.1], [-42, 13, 0.9], [52, -6, 1.2], [52, 8, 1.0], [-46, -3, 0.85], [-45, 14, 1.15],
  [-62, 26.5, 0.8], [-14, 26.5, 0.85], [34, 26.5, 0.8], [66, 26.5, 0.9],
]
const PINE_TREES: Array<[number, number, number]> = [
  [-52, -4, 1.2], [50, -15.5, 0.9], [-40, -18, 1.0], [58, -6, 1.1],
]
const LAMPS: Array<[number, boolean]> = [
  [-60, false], [-30, true], [12, false], [40, true], [70, false],
]

// Mahalle silueti: terminalin arkasında, kendi sokağına cepheli (kamera +z'den
// bakar, karşı tarafa koyulursa sahneyi kapatır — buraya değil!)
const APARTMENTS = [
  { x: -52, z: -20, w: 10, floors: 4, color: '#d8b48f', awning: '#c94f4f', seed: 1 },
  { x: -36, z: -19.5, w: 9, floors: 5, color: '#c9cfd4', awning: '#3a6b5a', seed: 2 },
  { x: -21, z: -20.5, w: 8, floors: 3, color: '#e3c1b0', awning: '#3a5a8a', seed: 3 },
  { x: -6, z: -19, w: 10, floors: 5, color: '#cfd8b8', awning: '#c94f4f', seed: 4 },
  { x: 10, z: -20, w: 9, floors: 4, color: '#e8d9b8', awning: '#7a4a8a', seed: 5 },
  { x: 26, z: -19.5, w: 8, floors: 3, color: '#d4c3d8', awning: '#3a6b5a', seed: 6 },
  { x: 42, z: -20.5, w: 10, floors: 5, color: '#c9b8a5', awning: '#c98a3a', seed: 7 },
  { x: 58, z: -19, w: 9, floors: 4, color: '#dfc9c0', awning: '#3a5a8a', seed: 8 },
]

// Arka sokakta park etmiş araçlar
const PARKED_CARS: Array<{ x: number; z: number; rot: number; color: string; kind: 'sedan' | 'hatch' | 'pickup' | 'taxi' }> = [
  // Kaldırım kenarına yanaşık: seyir şeritlerinden uzak
  { x: -42, z: -10.15, rot: Math.PI / 2, color: '#b0b6bd', kind: 'sedan' },
  { x: -12, z: -10.15, rot: Math.PI / 2, color: '#7a4a3a', kind: 'hatch' },
  { x: 6, z: -15.0, rot: -Math.PI / 2, color: '#4a6b8a', kind: 'sedan' },
  { x: 34, z: -10.15, rot: Math.PI / 2, color: '#e8c53a', kind: 'taxi' },
  { x: 52, z: -15.0, rot: -Math.PI / 2, color: '#5a7a52', kind: 'pickup' },
]

// Mahalle sokağı: asfalt + iki taraflı kaldırım + ara sokak
function BackStreet() {
  return (
    <group>
      <mesh position={[0, 0.02, -12.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, 5]} />
        <meshStandardMaterial color="#5f646b" />
      </mesh>
      {/* Kaldırımlar */}
      <mesh position={[0, 0.025, -9.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, 1.6]} />
        <meshStandardMaterial color="#c6c9c1" />
      </mesh>
      <mesh position={[0, 0.025, -16]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, 2.4]} />
        <meshStandardMaterial color="#c6c9c1" />
      </mesh>
      {/* Ara sokak: apartman arası -z yönüne uzanır */}
      <mesh position={[18.2, 0.019, -22]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.6, 16]} />
        <meshStandardMaterial color="#5f646b" />
      </mesh>
      {PARKED_CARS.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.rot, 0]}>
          <CarMesh color={c.color} kind={c.kind} />
        </group>
      ))}
    </group>
  )
}

export function World() {
  const spots = useGame((s) => s.spots)
  const vehicleCount = useGame((s) => s.vehicles.length)
  const vehicleIds = useMemo(
    () => useGame.getState().vehicles.map((v) => v.id),
    [vehicleCount],
  )
  // Rakip kimlikleri: değer eşitliği sayesinde sadece havuz değişince re-render
  const rivalIdKey = useGame((s) => s.rivals.map((r) => r.id).join(','))
  const rivalIds = useMemo(
    () => (rivalIdKey ? rivalIdKey.split(',').map(Number) : []),
    [rivalIdKey],
  )

  return (
    <>
      <SimTicker />
      <DayNight />
      <NightLights />
      <RainFX />

      {/* Zemin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, 140]} />
        <meshStandardMaterial map={grassTex} roughness={1} />
      </mesh>

      {/* Terminal betonu: iki park sırası + tesis şeridi + doğu servis koridoru */}
      <mesh position={[8, 0.01, -1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[86, 28]} />
        <meshStandardMaterial map={concreteTex} roughness={0.9} />
      </mesh>
      {/* Giriş (batı) ve çıkış (doğu) yolları */}
      {[LAYOUT.gateInX, LAYOUT.gateOutX].map((x) => (
        <mesh key={x} position={[x, 0.015, 14.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 4.2]} />
          <meshStandardMaterial color="#b9bcb4" />
        </mesh>
      ))}
      {/* Kapılar: portal + yön plakası (yeşil giriş, kırmızı çıkış) */}
      {[
        { x: LAYOUT.gateInX, plate: '#3f9d4f', label: 'GİRİŞ' },
        { x: LAYOUT.gateOutX, plate: '#d23f3f', label: 'ÇIKIŞ' },
      ].map((gate) => (
        <group key={gate.x} position={[gate.x, 0, 12.2]}>
          {[-2.9, 2.9].map((ox) => (
            <mesh key={ox} geometry={rbox(0.28, 3.4, 0.28, 0.06)} material={mat('#8f969e', 0.5, { metal: 0.3 })} position={[ox, 1.7, 0]} castShadow />
          ))}
          <mesh geometry={rbox(6.4, 0.5, 0.32, 0.08)} material={mat('#2160c4', 0.45)} position={[0, 3.55, 0]} castShadow />
          <Sign text={gate.label} bg={gate.plate} w={1.3} h={0.38} pos={[0, 3.55, 0.19]} />
        </group>
      ))}

      <Road />
      <ExtraPerons />
      <TaxiStand />
      <Billboard />
      {/* Mahalle, genişleyen terminale yer açmak için 7 birim geride */}
      <group position={[0, 0, -7]}>
        <BackStreet />
      </group>
      <AmbientTraffic />
      <Peron />
      <Office />
      <FuelPump />
      <TerminalBuildings />
      <RentACarLot />

      {Array.from({ length: spots }, (_, i) => (
        <ParkingSpot key={i} index={i} />
      ))}

      {/* Servis yolu işaretleri: kesikli orta çizgi + doğu yönü okları (çıkış o tarafta) */}
      {Array.from({ length: 22 }, (_, i) => (
        <mesh key={`al${i}`} position={[-21 + i * 3, 0.03, LAYOUT.aisleZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.16]} />
          <meshStandardMaterial color="#e8e4d8" />
        </mesh>
      ))}
      {[-8, 10, 28].map((x) => (
        <mesh key={`ar${x}`} position={[x, 0.035, LAYOUT.aisleZ - 1.6]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <circleGeometry args={[0.55, 3]} />
          <meshStandardMaterial color="#e8e4d8" />
        </mesh>
      ))}
      {/* Yaya geçidi: peron çıkışından park alanına */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`zb${i}`} position={[-16.5, 0.03, 5.8 + i * 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.45]} />
          <meshStandardMaterial color="#e8e4d8" />
        </mesh>
      ))}
      {/* Park sırası tabelaları */}
      {[
        { z: 0, label: 'PARK A' },
        { z: -7.6, label: 'PARK B' },
      ].map((row) => (
        <group key={row.label} position={[0.8, 0, row.z]}>
          <mesh geometry={cyl(0.05, 0.05, 2.0, 8)} material={mat('#6f767e', 0.6, { metal: 0.4 })} position={[0, 1.0, 0]} />
          <Sign text={row.label} bg="#2e7d4f" w={1.3} h={0.4} pos={[0.03, 2.1, 0]} />
        </group>
      ))}

      {BLOB_TREES.map(([x, z, s], i) => (
        <group key={`b${i}`} position={[x, 0, z]}>
          <TreeBlob scale={s} />
        </group>
      ))}
      {PINE_TREES.map(([x, z, s], i) => (
        <group key={`p${i}`} position={[x, 0, z]}>
          <TreePine scale={s} />
        </group>
      ))}
      {LAMPS.map(([x, flip], i) => (
        <group key={`l${i}`} position={[x, 0, flip ? LAYOUT.roadZ + LAYOUT.roadHalf + 0.8 : LAYOUT.roadZ - LAYOUT.roadHalf - 0.8]}>
          <StreetLamp flip={!flip} />
        </group>
      ))}

      {/* Mahalle silueti: terminal arkası apartman sırası */}
      {APARTMENTS.map((a) => (
        <group key={a.x} position={[a.x, 0, a.z - 7]}>
          <Apartment w={a.w} floors={a.floors} color={a.color} awning={a.awning} seed={a.seed} />
        </group>
      ))}

      {/* Terminal arka çiti */}
      <mesh geometry={rbox(86, 0.72, 0.2, 0.04)} material={mat('#c9ccc4', 0.8)} position={[8, 0.36, -15.5]} />
      {Array.from({ length: 15 }, (_, i) => (
        <mesh
          key={`fp${i}`}
          geometry={rbox(0.28, 1.0, 0.28, 0.05)}
          material={mat('#aeb2ab', 0.8)}
          position={[-34 + i * 6.0, 0.5, -15.5]}
        />
      ))}

      {/* Tamirhane servis parkı: ağır arızalı araç burada tamir bekler */}
      <group position={[28.5, 0, -13]}>
        <mesh geometry={rbox(8.4, 0.08, 4.0, 0.03)} material={mat('#8f959b', 0.85)} position={[0, 0.04, 0]} receiveShadow />
        {[-4.0, 4.0].map((ox) => (
          <mesh key={ox} position={[ox, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.14, 3.8]} />
            <meshStandardMaterial color="#e8d44d" />
          </mesh>
        ))}
        <mesh geometry={cyl(0.05, 0.05, 2.2, 8)} material={mat('#6f767e', 0.6, { metal: 0.4 })} position={[0, 1.1, 2.3]} />
        <Sign text="SERVİS ALANI" bg="#c9a227" fg="#111111" w={1.9} h={0.42} pos={[0, 2.1, 2.37]} />
      </group>

      {vehicleIds.map((id) => (
        <Vehicle key={id} vehicleId={id} />
      ))}
      {rivalIds.map((id) => (
        <RivalBus key={id} rivalId={id} />
      ))}
    </>
  )
}
