import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
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
