import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildBppvPracticeOpenPayload,
  buildPayload,
  formatJst,
  isValidGasUrl,
  sendBppvPracticeOpen,
  sendResult,
} from './send'
import { __setTelemetryUrlForTest } from './config'
import type { PlayResult } from '../profile/types'

const play: PlayResult = {
  caseId: 4,
  caseTitle: '水平半規管型BPPV　右',
  category: 'bppv',
  rank: 'S',
  score: 97,
  ending: 'best',
  fromRandom: true,
}

const GOOD_URL = 'https://script.google.com/macros/s/AKfycbwABC123/exec'

describe('isValidGasUrl', () => {
  it('Apps Script の exec URL を受け入れる', () => {
    expect(isValidGasUrl(GOOD_URL)).toBe(true)
  })

  it('空文字は受け付けない', () => {
    expect(isValidGasUrl('')).toBe(false)
  })

  it('別ホストは受け付けない', () => {
    expect(isValidGasUrl('https://example.com/collect')).toBe(false)
  })

  it('exec で終わらない URL は受け付けない', () => {
    expect(isValidGasUrl('https://script.google.com/macros/s/AKfycbwABC123/dev')).toBe(false)
  })
})

describe('buildPayload', () => {
  it('設計書の列をすべて埋める', () => {
    const p = buildPayload({
      play,
      roleId: 'pgy2',
      maneuverPerfect: true,
      diagnosisCorrect: true,
      sideCorrect: true,
      completedAt: 1_700_000_000_000,
      pageUrl: 'https://example.github.io/Vertigo/',
    })

    expect(p).toEqual({
      kind: 'game_result',
      completedAt: '2023-11-15 07:13:20',
      roleId: 'pgy2',
      roleName: 'PGY2',
      caseId: 4,
      caseTitle: '水平半規管型BPPV　右',
      category: 'bppv',
      rank: 'S',
      score: 97,
      endingTier: 'best',
      diagnosisCorrect: true,
      sideCorrect: true,
      maneuverPerfect: true,
      fromRandom: true,
      appVersion: 'vertigo-v1.0',
      pageUrl: 'https://example.github.io/Vertigo/',
    })
  })

  it('職種未選択でも組み立てられる', () => {
    const p = buildPayload({
      play,
      roleId: '',
      maneuverPerfect: null,
      diagnosisCorrect: false,
      sideCorrect: false,
      completedAt: 1,
      pageUrl: 'x',
    })
    expect(p.roleId).toBe('')
    expect(p.roleName).toBe('未選択')
    expect(p.maneuverPerfect).toBeNull()
  })
})

describe('sendResult', () => {
  const payload = buildPayload({
    play,
    roleId: 'pgy1',
    maneuverPerfect: null,
    diagnosisCorrect: true,
    sideCorrect: true,
    completedAt: 1,
    pageUrl: 'x',
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    __setTelemetryUrlForTest(null)
  })

  it('URL が未設定なら送らない', async () => {
    __setTelemetryUrlForTest('')
    await sendResult(payload)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('URL の形式が違えば送らない', async () => {
    __setTelemetryUrlForTest('https://example.com/collect')
    await sendResult(payload)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendBeacon が使えればそれで送る', async () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    __setTelemetryUrlForTest(GOOD_URL)

    await sendResult(payload)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe(GOOD_URL)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendBeacon が失敗したら fetch に落とす', async () => {
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) })
    __setTelemetryUrlForTest(GOOD_URL)

    await sendResult(payload)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(GOOD_URL)
  })

  it('送信が失敗しても投げない', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    __setTelemetryUrlForTest(GOOD_URL)

    await expect(sendResult(payload)).resolves.toBeUndefined()
  })
})

describe('formatJst', () => {
  it('日本時刻の "YYYY-MM-DD HH:mm:ss" にする', () => {
    // 1_700_000_000_000 = 2023-11-14T22:13:20Z → JST 2023-11-15 07:13:20
    expect(formatJst(1_700_000_000_000)).toBe('2023-11-15 07:13:20')
  })

  it('UTC から日付をまたぐ時刻も繰り上げる', () => {
    expect(formatJst(Date.UTC(2026, 7, 25, 16, 5, 9))).toBe('2026-08-26 01:05:09')
  })

  it('月日と時分秒をゼロ詰めする', () => {
    expect(formatJst(Date.UTC(2026, 0, 2, 0, 0, 0))).toBe('2026-01-02 09:00:00')
  })
})

describe('buildBppvPracticeOpenPayload', () => {
  it('開いた事実だけを列に詰める（型や左右は持たない）', () => {
    const p = buildBppvPracticeOpenPayload({
      roleId: 'student',
      openedAt: 1_700_000_000_000,
      pageUrl: 'https://example.github.io/Vertigo/',
    })

    expect(p).toEqual({
      kind: 'bppv_practice_open',
      openedAt: '2023-11-15 07:13:20',
      roleId: 'student',
      roleName: '医学生',
      appVersion: 'vertigo-v1.0',
      pageUrl: 'https://example.github.io/Vertigo/',
    })
  })

  it('職種未選択でも組み立てられる', () => {
    const p = buildBppvPracticeOpenPayload({ roleId: '', openedAt: 1, pageUrl: 'x' })
    expect(p.roleId).toBe('')
    expect(p.roleName).toBe('未選択')
  })
})

describe('sendBppvPracticeOpen', () => {
  const payload = buildBppvPracticeOpenPayload({ roleId: 'pgy1', openedAt: 1, pageUrl: 'x' })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    __setTelemetryUrlForTest(null)
  })

  it('URL が未設定なら送らない', async () => {
    __setTelemetryUrlForTest('')
    await sendBppvPracticeOpen(payload)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendBeacon が使えればそれで送る', async () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    __setTelemetryUrlForTest('https://script.google.com/macros/s/AKfycbwABC123/exec')

    await sendBppvPracticeOpen(payload)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })
})
