import { getAudioContext, playNote } from './context'
import { TRACKS, type TrackId } from './tracks'

/**
 * BGM のステップシーケンサ。
 *
 * setInterval を使う。requestAnimationFrame はタブが非表示のときに止まり、
 * バックグラウンドに回した瞬間に曲が固まってしまう。
 *
 * 停止・切替のたびに generation を進め、古いループのコールバックは
 * 自分の世代を見て黙って抜ける。setInterval の解除が間に合わなくても
 * 二重に鳴らない。
 */
let timerId = 0
let generation = 0
let step = 0
let playing: TrackId | null = null

export function currentTrack(): TrackId | null {
  return playing
}

export function stopMusic(): void {
  generation += 1
  if (timerId) {
    window.clearInterval(timerId)
    timerId = 0
  }
  step = 0
  playing = null
}

export function startMusic(id: TrackId): void {
  if (playing === id) return
  stopMusic()

  const c = getAudioContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const track = TRACKS[id]
  const mine = ++generation
  playing = id
  step = 0

  const tick = () => {
    if (mine !== generation) return
    for (const v of track.voices) {
      const freq = v.notes[step % v.notes.length]
      if (freq > 0) playNote(freq, (track.intervalMs / 1000) * v.hold, v.wave, v.gain)
    }
    step += 1
  }

  tick()
  timerId = window.setInterval(tick, track.intervalMs)
}
