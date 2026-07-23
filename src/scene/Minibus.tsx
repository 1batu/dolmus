import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { curve } from '../game/route'
import { useGame } from '../game/store'

// Klasik beyaz gövde + mavi şerit minibüs — tamamı prosedürel, sıfır asset
export function Minibus({ busId }: { busId: number }) {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const bus = useGame.getState().buses.find((b) => b.id === busId)
    if (!bus || !group.current) return
    const p = curve.getPointAt(bus.t)
    const tangent = curve.getTangentAt(bus.t)
    group.current.position.set(p.x, 0, p.z)
    group.current.rotation.y = Math.atan2(tangent.x, tangent.z)
  })

  return (
    <group ref={group}>
      {/* Gövde */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.7, 1.3, 3.6]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>
      {/* Mavi şerit */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.74, 0.22, 3.62]} />
        <meshStandardMaterial color="#1e5fb4" />
      </mesh>
      {/* Camlar */}
      <mesh position={[0, 1.18, 0.1]}>
        <boxGeometry args={[1.74, 0.42, 2.9]} />
        <meshStandardMaterial color="#26323d" />
      </mesh>
      {/* Ön cam */}
      <mesh position={[0, 1.1, 1.55]}>
        <boxGeometry args={[1.5, 0.5, 0.55]} />
        <meshStandardMaterial color="#26323d" />
      </mesh>
      {/* Tabela: hat ışığı */}
      <mesh position={[0, 1.62, 1.2]}>
        <boxGeometry args={[0.9, 0.18, 0.3]} />
        <meshStandardMaterial color="#ffd23f" emissive="#ffd23f" emissiveIntensity={0.6} />
      </mesh>
      {/* Tekerlekler */}
      {[
        [-0.8, 1.15],
        [0.8, 1.15],
        [-0.8, -1.15],
        [0.8, -1.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.24, 12]} />
          <meshStandardMaterial color="#22262a" />
        </mesh>
      ))}
    </group>
  )
}
