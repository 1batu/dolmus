import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAYOUT, spotPos } from '../game/paths'
import { useGame } from '../game/store'
import { Vehicle } from './Vehicle'
import {
  CarMesh,
  PassengerMesh,
  StreetLamp,
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
      {/* Kuyruk */}
      {Array.from({ length: queue }, (_, i) => (
        <group key={i} position={[-3.5 + (i % 10) * 0.74, 0.22, -0.5 + Math.floor(i / 10) * 1.0]}>
          <PassengerMesh color={PASSENGER_COLORS[i % PASSENGER_COLORS.length]} />
        </group>
      ))}
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
]
const PINE_TREES: Array<[number, number, number]> = [
  [-40, 26, 1.1], [50, 26, 1.0], [-52, -4, 1.2], [46, -14, 0.9], [-14, 27, 1.0],
]
const LAMPS: Array<[number, boolean]> = [
  [-60, false], [-30, true], [12, false], [40, true], [70, false],
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

      {vehicleIds.map((id) => (
        <Vehicle key={id} vehicleId={id} />
      ))}
    </>
  )
}
