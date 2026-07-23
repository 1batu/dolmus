import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAYOUT, spotPos } from '../game/paths'
import { useGame } from '../game/store'
import { Vehicle } from './Vehicle'
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

// Ana yol: asfalt + kenar bantları + orta şerit kesikleri
function Road() {
  const dashes = useMemo(() => Array.from({ length: 24 }, (_, i) => -88 + i * 7.6), [])
  return (
    <group>
      <mesh position={[0, 0.02, LAYOUT.roadZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, LAYOUT.roadHalf * 2]} />
        <meshStandardMaterial color="#565b62" />
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
  kind: 'sedan' | 'hatch' | 'pickup'
}> = [
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 12, offset: -70, color: '#4caf6e', kind: 'sedan' },
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 14, offset: -10, color: '#e6b23a', kind: 'hatch' },
  { lane: LAYOUT.laneNearZ, dir: 1, speed: 11, offset: 45, color: '#5a8fd6', kind: 'pickup' },
  { lane: LAYOUT.laneFarZ, dir: -1, speed: 13, offset: 60, color: '#d95f5f', kind: 'hatch' },
  { lane: LAYOUT.laneFarZ, dir: -1, speed: 10, offset: 0, color: '#7bc47f', kind: 'pickup' },
  { lane: LAYOUT.laneFarZ, dir: -1, speed: 15, offset: -55, color: '#9a7fd6', kind: 'sedan' },
]

function AmbientTraffic() {
  const refs = useRef<Array<THREE.Group | null>>([])
  useFrame((state) => {
    const tNow = state.clock.elapsedTime
    AMBIENT_CARS.forEach((car, i) => {
      const g = refs.current[i]
      if (!g) return
      const span = 190
      const x = ((((car.offset + car.dir * car.speed * tNow) % span) + span * 1.5) % span) - 95
      g.position.set(x, 0, car.lane)
      g.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2
    })
  })
  return (
    <>
      {AMBIENT_CARS.map((car, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)}>
          <CarMesh color={car.color} kind={car.kind} />
        </group>
      ))}
    </>
  )
}

// Park yeri: beyaz çizgili cep + tekerlek takozu
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
  const queue = useGame((s) => s.queue)
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
      {/* Cam arkalık */}
      <mesh geometry={rbox(8.2, 1.3, 0.07, 0.03)} material={glassMat()} position={[0, 1.1, -1.55]} />
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
      {/* Kuyruk: saçağın önünde, araç kapısına doğru dizilir (görünürlük için açıkta) */}
      {Array.from({ length: queue }, (_, i) => (
        <group
          key={i}
          position={[-3.6 + (i % 10) * 0.76, 0, 2.5 + Math.floor(i / 10) * 0.95]}
          rotation={[0, (i % 5) * 0.35 - 0.7, 0]}
        >
          <PassengerMesh color={PASSENGER_COLORS[i % PASSENGER_COLORS.length]} variant={i} />
        </group>
      ))}
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

// Yazıhane: terminal ofisi — saçaklı çatı, kapı, çerçeveli pencere, klima
function Office() {
  return (
    <group position={[-22, 0, 0]}>
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
      <mesh geometry={rbox(2.6, 0.16, 0.15, 0.04)} material={mat('#f4f2ec', 0.4)} position={[0, 3.45, 1.72]} />
      {/* Klima */}
      <mesh geometry={rbox(0.9, 0.5, 0.35, 0.05)} material={mat('#c9cdd2', 0.5)} position={[-2.35, 2.2, 0.6]} />
      {/* Basamak */}
      <mesh geometry={rbox(1.3, 0.14, 0.6, 0.04)} material={mat('#b3b8bd', 0.8)} position={[-0.9, 0.07, 2.05]} />
    </group>
  )
}

const BLOB_TREES: Array<[number, number, number]> = [
  [-32, -8, 1.1], [-28, 12, 0.9], [34, -8, 1.2], [40, 6, 1.0], [22, -10, 0.85], [-45, 14, 1.15],
  [-62, 26.5, 0.8], [-14, 26.5, 0.85], [34, 26.5, 0.8], [66, 26.5, 0.9],
]
const PINE_TREES: Array<[number, number, number]> = [
  [-52, -4, 1.2], [46, -14, 0.9], [-38, -14, 1.0], [58, -6, 1.1],
]
const LAMPS: Array<[number, boolean]> = [
  [-60, false], [-30, true], [12, false], [40, true], [70, false],
]

// Mahalle silueti: terminalin arkasında, çitin gerisinde (kamera +z'den bakar,
// karşı tarafa koyulursa sahneyi kapatır — buraya değil!)
const APARTMENTS = [
  { x: -52, z: -16, w: 10, floors: 4, color: '#d8b48f', awning: '#c94f4f', seed: 1 },
  { x: -36, z: -14.5, w: 9, floors: 5, color: '#c9cfd4', awning: '#3a6b5a', seed: 2 },
  { x: -21, z: -16.5, w: 8, floors: 3, color: '#e3c1b0', awning: '#3a5a8a', seed: 3 },
  { x: -6, z: -14, w: 10, floors: 5, color: '#cfd8b8', awning: '#c94f4f', seed: 4 },
  { x: 10, z: -16, w: 9, floors: 4, color: '#e8d9b8', awning: '#7a4a8a', seed: 5 },
  { x: 26, z: -14.5, w: 8, floors: 3, color: '#d4c3d8', awning: '#3a6b5a', seed: 6 },
  { x: 42, z: -16.5, w: 10, floors: 5, color: '#c9b8a5', awning: '#c98a3a', seed: 7 },
  { x: 58, z: -14, w: 9, floors: 4, color: '#dfc9c0', awning: '#3a5a8a', seed: 8 },
]

export function World() {
  const spots = useGame((s) => s.spots)
  const vehicleCount = useGame((s) => s.vehicles.length)
  const vehicleIds = useMemo(
    () => useGame.getState().vehicles.map((v) => v.id),
    [vehicleCount],
  )

  return (
    <>
      <SimTicker />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#dff2ff', '#b9d8a2', 0.5]} />
      <directionalLight
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

      {/* Zemin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[190, 140]} />
        <meshStandardMaterial color="#94c47d" />
      </mesh>

      {/* Terminal betonu */}
      <mesh position={[6, 0.01, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[62, 21]} />
        <meshStandardMaterial color="#b9bcb4" />
      </mesh>
      {/* Giriş yolu */}
      <mesh position={[LAYOUT.entranceX, 0.015, 14.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 4.2]} />
        <meshStandardMaterial color="#b9bcb4" />
      </mesh>

      <Road />
      <AmbientTraffic />
      <Peron />
      <Office />
      <FuelPump />

      {Array.from({ length: spots }, (_, i) => (
        <ParkingSpot key={i} index={i} />
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
        <group key={a.x} position={[a.x, 0, a.z]}>
          <Apartment w={a.w} floors={a.floors} color={a.color} awning={a.awning} seed={a.seed} />
        </group>
      ))}

      {/* Terminal arka çiti */}
      <mesh geometry={rbox(63, 0.72, 0.2, 0.04)} material={mat('#c9ccc4', 0.8)} position={[6, 0.36, -8.4]} />
      {Array.from({ length: 11 }, (_, i) => (
        <mesh
          key={`fp${i}`}
          geometry={rbox(0.28, 1.0, 0.28, 0.05)}
          material={mat('#aeb2ab', 0.8)}
          position={[-24 + i * 6.2, 0.5, -8.4]}
        />
      ))}

      {vehicleIds.map((id) => (
        <Vehicle key={id} vehicleId={id} />
      ))}
    </>
  )
}
