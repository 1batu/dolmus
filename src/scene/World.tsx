import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildRoadGeometry, curve, outwardNormal, STOP_TS } from '../game/route'
import { useGame } from '../game/store'
import { Minibus } from './Minibus'
import { Stop } from './Stop'

// Mahalle dolgusu: sabit yerleşimli pastel evler (deterministik, asset yok)
const BUILDINGS: Array<{ x: number; z: number; w: number; d: number; h: number; c: string }> = [
  { x: -18, z: -6, w: 6, d: 5, h: 4, c: '#f4a259' },
  { x: -6, z: 4, w: 5, d: 6, h: 5.5, c: '#e76f51' },
  { x: 8, z: -5, w: 7, d: 5, h: 3.5, c: '#8ab6d6' },
  { x: 20, z: 5, w: 5, d: 5, h: 6, c: '#c8963e' },
  { x: 2, z: 10, w: 6, d: 4, h: 3, c: '#b5838d' },
  { x: -20, z: 8, w: 4, d: 6, h: 4.5, c: '#7d9d72' },
  { x: 14, z: 9, w: 4, d: 4, h: 4, c: '#f0c987' },
  { x: -50, z: -28, w: 7, d: 6, h: 5, c: '#9a8c98' },
  { x: 50, z: 26, w: 6, d: 7, h: 4, c: '#e29578' },
  { x: -48, z: 26, w: 5, d: 5, h: 3.5, c: '#84a59d' },
  { x: 50, z: -26, w: 6, d: 5, h: 5.5, c: '#d4a373' },
]

const TREES: Array<[number, number]> = [
  [-12, -12], [16, 12], [-26, 2], [26, -8], [0, -14], [-44, 10], [44, -12], [-38, -26], [38, 28],
]

function SimTicker() {
  useFrame((_, dt) => {
    useGame.getState().tick(Math.min(dt, 0.1))
  })
  return null
}

// Yol orta çizgisi kesikleri
function LaneDashes() {
  const dashes = useMemo(() => {
    const arr: Array<{ pos: THREE.Vector3; angle: number }> = []
    const count = 48
    for (let i = 0; i < count; i++) {
      const tp = i / count
      const tangent = curve.getTangentAt(tp)
      arr.push({ pos: curve.getPointAt(tp), angle: Math.atan2(tangent.x, tangent.z) })
    }
    return arr
  }, [])
  return (
    <>
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.pos.x, 0.04, d.pos.z]} rotation={[-Math.PI / 2, 0, d.angle]}>
          <planeGeometry args={[0.18, 1.1]} />
          <meshStandardMaterial color="#f2e9d8" />
        </mesh>
      ))}
    </>
  )
}

// Durak önü cep (koyu asfalt yaması)
function StopBays() {
  return (
    <>
      {STOP_TS.map((tp, i) => {
        const p = curve.getPointAt(tp)
        const n = outwardNormal(tp)
        const tangent = curve.getTangentAt(tp)
        const pos = p.clone().addScaledVector(n, 1.6)
        return (
          <mesh
            key={i}
            position={[pos.x, 0.03, pos.z]}
            rotation={[-Math.PI / 2, 0, Math.atan2(tangent.x, tangent.z)]}
          >
            <planeGeometry args={[2.4, 6]} />
            <meshStandardMaterial color="#4a4f55" />
          </mesh>
        )
      })}
    </>
  )
}

export function World() {
  const roadGeo = useMemo(() => buildRoadGeometry(), [])
  // Sadece filo büyüyünce re-render; id listesi o anda state'ten okunur
  const busCount = useGame((s) => s.buses.length)
  const busIds = useMemo(
    () => useGame.getState().buses.map((b) => b.id),
    [busCount],
  )

  return (
    <>
      <SimTicker />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[45, 70, 25]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />

      {/* Zemin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[180, 130]} />
        <meshStandardMaterial color="#94c47d" />
      </mesh>

      {/* Yol */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial color="#5b6067" />
      </mesh>
      <LaneDashes />
      <StopBays />

      {BUILDINGS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]} castShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} />
          </mesh>
          <mesh position={[0, b.h + 0.25, 0]}>
            <boxGeometry args={[b.w + 0.5, 0.5, b.d + 0.5]} />
            <meshStandardMaterial color="#8c5e58" />
          </mesh>
        </group>
      ))}

      {TREES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.18, 0.24, 1.4, 6]} />
            <meshStandardMaterial color="#7a5a3a" />
          </mesh>
          <mesh position={[0, 2, 0]} castShadow>
            <coneGeometry args={[1.1, 2.4, 7]} />
            <meshStandardMaterial color="#5f9e55" />
          </mesh>
        </group>
      ))}

      {STOP_TS.map((_, i) => (
        <Stop key={i} index={i} />
      ))}

      {busIds.map((id) => (
        <Minibus key={id} busId={id} />
      ))}
    </>
  )
}
