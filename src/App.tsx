import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { World } from './scene/World'
import { HUD } from './ui/HUD'

// Kamera gezintisi: sürükle = kaydır, tekerlek/pinch = yakınlaş, çift tık = başa dön.
// İzometrik açı sabit kalır — sadece bakılan nokta ve zoom değişir.
const CAM_OFFSET = new THREE.Vector3(60, 62, 60) // kamera, hedefin hep bu kadar uzağında
const HOME_TARGET = new THREE.Vector3(10, 0, 4)
const HOME_ZOOM = 16

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const target = HOME_TARGET.clone()
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDist = 0

    const apply = () => {
      // Sahne sınırları: mahalleden çok uzağa kaçma
      target.x = THREE.MathUtils.clamp(target.x, -55, 75)
      target.z = THREE.MathUtils.clamp(target.z, -45, 45)
      target.y = 0
      camera.position.copy(target).add(CAM_OFFSET)
      camera.lookAt(target)
    }
    const setZoom = (z: number) => {
      const cam = camera as THREE.OrthographicCamera
      cam.zoom = THREE.MathUtils.clamp(z, 7, 42)
      cam.updateProjectionMatrix()
    }

    // Ekran pikselini zemin düzlemine çevir: yatayda kameranın sağı,
    // dikeyde sağın zemindeki dikeyi (izometrik pan böyle doğal durur)
    const pan = (dx: number, dy: number) => {
      const zoom = (camera as THREE.OrthographicCamera).zoom
      const dir = target.clone().sub(camera.position).setY(0).normalize()
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).negate()
      target.addScaledVector(right, dx / zoom)
      target.addScaledVector(dir, (dy / zoom) * 1.7) // dikey piksel, eğik açıda daha çok yol alır
      apply()
    }

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        pan(-(e.clientX - prev.x), -(e.clientY - prev.y))
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist > 0) {
          setZoom((camera as THREE.OrthographicCamera).zoom * (dist / pinchDist))
        }
        pinchDist = dist
      }
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinchDist = 0
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((camera as THREE.OrthographicCamera).zoom * (e.deltaY < 0 ? 1.12 : 0.89))
    }
    const onDblClick = () => {
      target.copy(HOME_TARGET)
      setZoom(HOME_ZOOM)
      apply()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointerleave', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('dblclick', onDblClick)
    apply()
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointerleave', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('dblclick', onDblClick)
    }
  }, [camera, gl])
  return null
}

export default function App() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#cfe8c2]">
      <Canvas
        shadows
        orthographic
        camera={{ position: [70, 62, 64], zoom: 16, near: -200, far: 500 }}
        onCreated={({ camera }) => camera.lookAt(10, 0, 4)}
        // Mobil: dokunma jestleri tarayıcıya değil kameraya gitsin (sürükle/pinch)
        style={{ touchAction: 'none' }}
      >
        <CameraRig />
        <World />
        {/* Sinematik dokunuş: ışıklar parlar, kenarlar hafif kararır */}
        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.75} mipmapBlur />
          <Vignette offset={0.22} darkness={0.5} />
        </EffectComposer>
      </Canvas>
      <HUD />
    </div>
  )
}
