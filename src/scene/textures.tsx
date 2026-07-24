import * as THREE from 'three'

// Prosedürel dokular: her şey canvas'ta çizilir, dosya yok.
// Deterministik görünüm için basit LCG rastgelesi kullanılır.
function makeTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, rnd: () => number) => void,
  repeat: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  let seed = 1337
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  draw(ctx, rnd)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.anisotropy = 4
  return tex
}

// Asfalt: koyu zemin + agrega benekleri + soluk tekerlek izleri
export const asphaltTex = makeTexture(
  256,
  256,
  (ctx, rnd) => {
    ctx.fillStyle = '#565b62'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i++) {
      const v = 70 + Math.floor(rnd() * 50)
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 7},${0.25 + rnd() * 0.3})`
      ctx.fillRect(rnd() * 256, rnd() * 256, 1.4, 1.4)
    }
    // tekerlek izi bantları
    ctx.fillStyle = 'rgba(30,32,36,0.14)'
    ctx.fillRect(0, 58, 256, 22)
    ctx.fillRect(0, 176, 256, 22)
  },
  [26, 1],
)

// Beton: açık zemin + panel derzleri + leke
export const concreteTex = makeTexture(
  256,
  256,
  (ctx, rnd) => {
    ctx.fillStyle = '#b9bcb4'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2000; i++) {
      const v = 160 + Math.floor(rnd() * 40)
      ctx.fillStyle = `rgba(${v},${v},${v - 6},${0.2 + rnd() * 0.25})`
      ctx.fillRect(rnd() * 256, rnd() * 256, 1.6, 1.6)
    }
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(90,92,88,0.35)'
      const oil = rnd()
      ctx.beginPath()
      ctx.ellipse(rnd() * 256, rnd() * 256, 6 + oil * 14, 4 + oil * 8, rnd() * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(70,72,70,0.5)'
    ctx.lineWidth = 1.6
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 256)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, x)
      ctx.lineTo(256, x)
      ctx.stroke()
    }
  },
  [10, 4],
)

// Çim: iki ton yeşil benek + seyrek toprak lekesi
export const grassTex = makeTexture(
  256,
  256,
  (ctx, rnd) => {
    ctx.fillStyle = '#94c47d'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 3200; i++) {
      const g = rnd()
      ctx.fillStyle =
        g > 0.6 ? `rgba(120,168,96,${0.3 + rnd() * 0.3})` : `rgba(160,204,132,${0.25 + rnd() * 0.3})`
      ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2.6)
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(150,132,92,0.18)'
      ctx.beginPath()
      ctx.ellipse(rnd() * 256, rnd() * 256, 8 + rnd() * 16, 5 + rnd() * 9, rnd() * 3, 0, Math.PI * 2)
      ctx.fill()
    }
  },
  [22, 16],
)

// Cephe: sıva dokusu + hafif kirlenme (beyaz çizilir, malzeme rengiyle çarpılır)
export const facadeTex = makeTexture(128, 128, (ctx, rnd) => {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 1400; i++) {
    const v = 225 + Math.floor(rnd() * 30)
    ctx.fillStyle = `rgba(${v},${v},${v},${0.35 + rnd() * 0.3})`
    ctx.fillRect(rnd() * 128, rnd() * 128, 1.5, 1.5)
  }
  // alt kuşak kirlenmesi
  const g = ctx.createLinearGradient(0, 96, 0, 128)
  g.addColorStop(0, 'rgba(140,140,140,0)')
  g.addColorStop(1, 'rgba(140,140,140,0.35)')
  ctx.fillStyle = g
  ctx.fillRect(0, 96, 128, 32)
})

// Araç altı kontakt gölgesi: radyal siyah degrade
const shadowCanvas = document.createElement('canvas')
shadowCanvas.width = 128
shadowCanvas.height = 128
{
  const ctx = shadowCanvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62)
  g.addColorStop(0, 'rgba(0,0,0,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
}
export const contactShadowTex = new THREE.CanvasTexture(shadowCanvas)

const shadowGeo = new THREE.PlaneGeometry(1, 1)
const shadowMat = new THREE.MeshBasicMaterial({
  map: contactShadowTex,
  transparent: true,
  depthWrite: false,
})

// Araç/nesne altına serilen yumuşak gölge
export function ContactShadow({ w = 2.4, d = 4.4 }: { w?: number; d?: number }) {
  return (
    <mesh
      geometry={shadowGeo}
      material={shadowMat}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.015, 0]}
      scale={[w, d, 1]}
    />
  )
}
