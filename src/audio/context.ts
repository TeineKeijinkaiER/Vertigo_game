/**
 * AudioContext は効果音と BGM で1つを共有する。
 * iOS Safari は最初のユーザー操作まで suspended のままなので、
 * タイトルのタップで unlockAudio() を呼ぶ。
 */
let ctx: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

export function unlockAudio(): void {
  const c = getAudioContext()
  if (c && c.state === 'suspended') void c.resume()
}

/** 単音を今すぐ鳴らす。BGM の1ステップ分に使う */
export function playNote(freq: number, dur: number, wave: OscillatorType, gain: number): void {
  const c = getAudioContext()
  if (!c || freq <= 0) return
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, c.currentTime)
  amp.gain.setValueAtTime(0, c.currentTime)
  amp.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  osc.connect(amp).connect(c.destination)
  osc.start(c.currentTime)
  osc.stop(c.currentTime + dur + 0.02)
}
