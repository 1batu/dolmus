import { Canvas } from '@react-three/fiber'
import { World } from './scene/World'
import { HUD } from './ui/HUD'

export default function App() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#cfe8c2]">
      <Canvas
        shadows
        orthographic
        camera={{ position: [60, 62, 60], zoom: 13, near: -200, far: 500 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <World />
      </Canvas>
      <HUD />
    </div>
  )
}
