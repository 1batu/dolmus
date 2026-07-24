import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pointAt, spotPos } from '../game/paths'
import { useGame } from '../game/store'
import { rbox, mat, Wheel } from './models'

const BODY = '#f7f6f1'
const STRIPE = '#2160c4'
const GLASS = '#242f3a'
const BUMPER = '#b6bac0'

// Plaka dokusu: beyaz zemin + mavi TR bandı + siyah koyu punto (plaka başına önbellekli)
const plateMatCache = new Map<string, THREE.MeshBasicMaterial>()
function plateMaterial(plate: string): THREE.MeshBasicMaterial {
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
    ctx.font = 'bold 38px monospace'
    ctx.fillText(plate, 145, 46)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    m = new THREE.MeshBasicMaterial({ map: tex })
    plateMatCache.set(plate, m)
  }
  return m
}

const plateGeo = new THREE.PlaneGeometry(0.72, 0.18)

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

// Store'daki aracı sahnede sürer; seferdeyken (ekran dışı) gizlenir
export function Vehicle({ vehicleId }: { vehicleId: number }) {
  const group = useRef<THREE.Group>(null)
  const old = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.old ?? false)
  const plate = useGame((s) => s.vehicles.find((v) => v.id === vehicleId)?.plate ?? '')

  useFrame(() => {
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
  })

  return (
    <group ref={group}>
      <MinibusMesh body={old ? '#ece5d4' : undefined} plate={plate || undefined} />
    </group>
  )
}

// Rakip minibüs: yeşil şeritli, hafif kirli gövde — hattın diğer esnafı
export function RivalBus({ rivalId }: { rivalId: number }) {
  const group = useRef<THREE.Group>(null)
  const plate = useGame((s) => s.rivals.find((r) => r.id === rivalId)?.plate ?? '')

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
      <MinibusMesh stripe="#3f9d4f" body="#efe9dc" plate={plate || undefined} />
    </group>
  )
}
