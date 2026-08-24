import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./context', () => ({
  getAudioContext: vi.fn(() => ({ state: 'running', resume: vi.fn() })),
  unlockAudio: vi.fn(),
  playNote: vi.fn(),
}))

import { playNote } from './context'
import { currentTrack, startMusic, stopMusic } from './music'

describe('music', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(playNote).mockClear()
  })

  afterEach(() => {
    stopMusic()
    vi.useRealTimers()
  })

  it('startMusic で鳴りはじめ、currentTrack が分かる', () => {
    startMusic('opening')
    expect(currentTrack()).toBe('opening')
    expect(playNote).toHaveBeenCalled()
  })

  it('stopMusic のあとは時間を進めても鳴らない', () => {
    startMusic('opening')
    stopMusic()
    vi.mocked(playNote).mockClear()

    vi.advanceTimersByTime(5000)

    expect(playNote).not.toHaveBeenCalled()
    expect(currentTrack()).toBeNull()
  })

  it('同じ曲を二度呼んでも鳴りはじめ直さない', () => {
    startMusic('opening')
    vi.mocked(playNote).mockClear()

    startMusic('opening')

    expect(playNote).not.toHaveBeenCalled()
    expect(currentTrack()).toBe('opening')
  })

  it('曲を切り替えると古いループは止まる', () => {
    startMusic('opening')
    startMusic('exam')
    expect(currentTrack()).toBe('exam')

    vi.mocked(playNote).mockClear()
    // exam は intervalMs 300。1000ms でおよそ3ステップぶん。
    // opening (200ms) が生きていれば、これより多く鳴ってしまう。
    vi.advanceTimersByTime(1000)

    const calls = vi.mocked(playNote).mock.calls.length
    // exam は2声。3〜4ステップ分で最大 8 回。opening が混ざれば超える。
    expect(calls).toBeLessThanOrEqual(8)
    expect(calls).toBeGreaterThan(0)
  })
})
