import { Canvas } from '@react-three/fiber'
import { World } from './scene/World'
import { HUD } from './ui/HUD'

export default function App() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#cfe8c2]">
      <Canvas
        shadows
        orthographic
        camera={{ position: [70, 62, 64], zoom: 16, near: -200, far: 500 }}
        onCreated={({ camera }) => camera.lookAt(10, 0, 4)}
      >
        <World />
      </Canvas>
      <HUD />
    </div>
  )
}
