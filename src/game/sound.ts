// Minik WebAudio sentez efektleri — ses dosyası yok, her şey osilatör.
let ctx: AudioContext | null = null
let muted =
  typeof localStorage !== 'undefined' && localStorage.getItem('dolmus-muted') === '1'

export function isMuted(): boolean {
  return muted
}

export function toggleMute(): boolean {
  muted = !muted
  try {
    localStorage.setItem('dolmus-muted', muted ? '1' : '0')
  } catch {
    /* yoksay */
  }
  return muted
}

export type SfxKind = 'coin' | 'horn' | 'ding'

export function sfx(kind: SfxKind) {
  if (muted) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    const now = ctx.currentTime
    if (kind === 'coin') {
      o.type = 'square'
      o.frequency.setValueAtTime(880, now)
      o.frequency.setValueAtTime(1318, now + 0.06)
      g.gain.setValueAtTime(0.045, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
      o.start(now)
      o.stop(now + 0.17)
    } else if (kind === 'horn') {
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(300, now)
      o.frequency.setValueAtTime(300, now + 0.1)
      g.gain.setValueAtTime(0.035, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      o.start(now)
      o.stop(now + 0.24)
    } else {
      o.type = 'sine'
      o.frequency.setValueAtTime(1047, now)
      o.frequency.setValueAtTime(1568, now + 0.1)
      g.gain.setValueAtTime(0.06, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      o.start(now)
      o.stop(now + 0.52)
    }
  } catch {
    // ses motoru yoksa sessizce devam
  }
}
