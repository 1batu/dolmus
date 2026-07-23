import { useMemo } from 'react'
import { curve, outwardNormal, STOP_TS } from '../game/route'
import { useGame } from '../game/store'

const PASSENGER_COLORS = ['#e07a5f', '#3d8bfd', '#f2cc8f', '#81b29a', '#b56576', '#6d597a']

// Durak: tabela + saçak + bekleyen yolcu kuyruğu
export function Stop({ index }: { index: number }) {
  const queue = useGame((s) => s.queues[index])

  const { pos, angle } = useMemo(() => {
    const tp = STOP_TS[index]
    const p = curve.getPointAt(tp)
    const n = outwardNormal(tp)
    const tangent = curve.getTangentAt(tp)
    return {
      pos: p.clone().addScaledVector(n, 3.6),
      angle: Math.atan2(tangent.x, tangent.z),
    }
  }, [index])

  return (
    <group position={pos} rotation={[0, angle, 0]}>
      {/* Saçak */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[1.6, 0.12, 3.2]} />
        <meshStandardMaterial color="#d94f4f" />
      </mesh>
      {[-1.4, 1.4].map((z) => (
        <mesh key={z} position={[0.6, 1.1, z]}>
          <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
          <meshStandardMaterial color="#666c73" />
        </mesh>
      ))}
      {/* Tabela */}
      <mesh position={[-0.6, 1.9, -1.7]}>
        <boxGeometry args={[0.08, 0.7, 0.7]} />
        <meshStandardMaterial color="#1e5fb4" />
      </mesh>
      <mesh position={[-0.6, 0.75, -1.7]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
        <meshStandardMaterial color="#666c73" />
      </mesh>
      {/* Kuyruk: bekleyen her yolcu bir kapsül */}
      {queue.map((p, i) => (
        <group key={p.id} position={[0.9, 0, -0.9 + i * 0.55]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <capsuleGeometry args={[0.18, 0.5, 4, 8]} />
            <meshStandardMaterial color={PASSENGER_COLORS[p.id % PASSENGER_COLORS.length]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
