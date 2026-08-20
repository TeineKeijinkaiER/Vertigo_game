/**
 * v0.1 は効果音のみ（BGM は v0.2）。
 * Web Audio API で合成するため音源ファイルは不要。
 * iOS Safari は最初のユーザー操作まで AudioContext が suspended なので、
 * タイトル画面のタップで unlock() を呼ぶ。
 */

let ctx: AudioContext | null = null
let enabled = true

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

export function setSoundEnabled(v: boolean): void {
  enabled = v
}

export function isSoundEnabled(): boolean {
  return enabled
}

type Wave = OscillatorType

function tone(freq: number, start: number, dur: number, wave: Wave, gain: number): void {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, c.currentTime + start)
  amp.gain.setValueAtTime(0, c.currentTime + start)
  amp.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.008)
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  osc.connect(amp).connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur + 0.02)
}

function play(notes: [freq: number, at: number, dur: number][], wave: Wave = 'square', gain = 0.06): void {
  if (!enabled) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  for (const [f, at, d] of notes) tone(f, at, d, wave, gain)
}

/** カーソル移動 */
export function sfxCursor(): void {
  play([[880, 0, 0.05]], 'square', 0.035)
}

/** 決定 */
export function sfxConfirm(): void {
  play(
    [
      [880, 0, 0.05],
      [1318, 0.05, 0.09],
    ],
    'square',
    0.05,
  )
}

/** キャンセル・戻る */
export function sfxCancel(): void {
  play([[440, 0, 0.08]], 'triangle', 0.05)
}

/** 所見が陽性だったとき */
export function sfxFinding(): void {
  play(
    [
      [660, 0, 0.07],
      [990, 0.07, 0.07],
      [1320, 0.14, 0.12],
    ],
    'square',
    0.05,
  )
}

/** 勝利ファンファーレ */
export function sfxFanfare(): void {
  play(
    [
      [523, 0.0, 0.12],
      [659, 0.12, 0.12],
      [784, 0.24, 0.12],
      [1046, 0.36, 0.32],
      [784, 0.72, 0.1],
      [1046, 0.82, 0.5],
    ],
    'square',
    0.06,
  )
}

/** 全滅ジングル */
export function sfxGameOver(): void {
  play(
    [
      [392, 0.0, 0.22],
      [370, 0.24, 0.22],
      [349, 0.48, 0.22],
      [330, 0.72, 0.7],
    ],
    'triangle',
    0.07,
  )
}
