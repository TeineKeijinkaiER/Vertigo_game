import { beforeEach, describe, expect, it } from 'vitest'
import type { PlayResult, Profile } from './types'
import {
  clearedSummary,
  clearOf,
  defaultProfile,
  filterHistory,
  HISTORY_LIMIT,
  isCleared,
  loadProfile,
  parseProfile,
  recordResult,
  saveProfile,
  STORAGE_KEY,
} from './storage'

const play = (over: Partial<PlayResult> = {}): PlayResult => ({
  caseId: 1,
  caseTitle: '後半規管型BPPV　右',
  category: 'bppv',
  rank: 'A',
  score: 88,
  ending: 'best',
  fromRandom: false,
  ...over,
})

describe('parseProfile', () => {
  it('null なら既定値を返す', () => {
    expect(parseProfile(null)).toEqual(defaultProfile())
  })

  it('壊れた JSON でも投げずに既定値を返す', () => {
    expect(parseProfile('{ not json')).toEqual(defaultProfile())
  })

  it('schemaVersion が違えば既定値を返す', () => {
    const old = JSON.stringify({ ...defaultProfile(), schemaVersion: 99, muted: true })
    expect(parseProfile(old)).toEqual(defaultProfile())
  })

  it('未知の roleId は未選択に落とす', () => {
    const raw = JSON.stringify({ ...defaultProfile(), roleId: 'wizard' })
    expect(parseProfile(raw).roleId).toBe('')
  })

  it('既知の roleId と muted は保つ', () => {
    const raw = JSON.stringify({ ...defaultProfile(), roleId: 'pgy2', muted: true })
    const p = parseProfile(raw)
    expect(p.roleId).toBe('pgy2')
    expect(p.muted).toBe(true)
  })

  it('clears と history が配列・オブジェクトでなければ空にする', () => {
    const raw = JSON.stringify({ ...defaultProfile(), clears: 'x', history: 'y' })
    const p = parseProfile(raw)
    expect(p.clears).toEqual({})
    expect(p.history).toEqual([])
  })
})

describe('isCleared', () => {
  it('S と A はクリア', () => {
    expect(isCleared('S')).toBe(true)
    expect(isCleared('A')).toBe(true)
  })

  it('B 以下はクリアではない', () => {
    expect(isCleared('B')).toBe(false)
    expect(isCleared('C')).toBe(false)
    expect(isCleared('D')).toBe(false)
  })
})

describe('recordResult', () => {
  it('初回プレイでその回の結果から ClearRecord を作る', () => {
    const p = recordResult(defaultProfile(), play({ rank: 'C', score: 60 }), 1000)
    expect(p.clears[1]).toEqual({
      firstClearedAt: null,
      bestRank: 'C',
      bestScore: 60,
      plays: 1,
    })
  })

  it('A 以上で firstClearedAt が入る', () => {
    const p = recordResult(defaultProfile(), play({ rank: 'A', score: 88 }), 1000)
    expect(p.clears[1].firstClearedAt).toBe(new Date(1000).toISOString())
  })

  it('firstClearedAt は二度目以降のクリアで上書きしない', () => {
    const first = recordResult(defaultProfile(), play({ rank: 'A', score: 88 }), 1000)
    const second = recordResult(first, play({ rank: 'S', score: 99 }), 5000)
    expect(second.clears[1].firstClearedAt).toBe(new Date(1000).toISOString())
  })

  it('bestRank と bestScore はスコアを厳密に上回ったときだけ更新する', () => {
    const a = recordResult(defaultProfile(), play({ rank: 'A', score: 88 }), 1000)
    const same = recordResult(a, play({ rank: 'S', score: 88 }), 2000)
    expect(same.clears[1].bestRank).toBe('A')
    expect(same.clears[1].bestScore).toBe(88)

    const better = recordResult(same, play({ rank: 'S', score: 96 }), 3000)
    expect(better.clears[1].bestRank).toBe('S')
    expect(better.clears[1].bestScore).toBe(96)
  })

  it('スコアが下がっても plays は増える', () => {
    const a = recordResult(defaultProfile(), play({ score: 88 }), 1000)
    const b = recordResult(a, play({ rank: 'D', score: 20 }), 2000)
    expect(b.clears[1].plays).toBe(2)
    expect(b.clears[1].bestScore).toBe(88)
  })

  it('元の Profile を書き換えない', () => {
    const base = defaultProfile()
    recordResult(base, play(), 1000)
    expect(base.clears).toEqual({})
    expect(base.history).toEqual([])
  })

  it('履歴を新しい順に積み、職種を記録する', () => {
    const base = { ...defaultProfile(), roleId: 'pgy1' as const }
    const a = recordResult(base, play({ caseId: 1 }), 1000)
    const b = recordResult(a, play({ caseId: 2 }), 2000)
    expect(b.history.map((h) => h.caseId)).toEqual([2, 1])
    expect(b.history[0].ts).toBe(2000)
    expect(b.history[0].roleId).toBe('pgy1')
  })

  it(`履歴は ${HISTORY_LIMIT} 件を超えたら古いものから捨てる`, () => {
    let p = defaultProfile()
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      p = recordResult(p, play({ caseId: i }), i + 1)
    }
    expect(p.history).toHaveLength(HISTORY_LIMIT)
    expect(p.history[0].caseId).toBe(HISTORY_LIMIT + 4)
    expect(p.history[HISTORY_LIMIT - 1].caseId).toBe(5)
  })
})

describe('clearOf', () => {
  it('記録の無い症例は undefined', () => {
    expect(clearOf(defaultProfile(), 99)).toBeUndefined()
  })

  it('記録のある症例は ClearRecord を返す', () => {
    const p = recordResult(defaultProfile(), play({ caseId: 7 }), 1000)
    expect(clearOf(p, 7)?.plays).toBe(1)
  })
})

describe('clearedSummary', () => {
  it('クリア数と ☆ 数を数える', () => {
    let p = defaultProfile()
    p = recordResult(p, play({ caseId: 1, rank: 'S', score: 99 }), 1000)
    p = recordResult(p, play({ caseId: 2, rank: 'A', score: 86 }), 2000)
    p = recordResult(p, play({ caseId: 3, rank: 'C', score: 55 }), 3000)
    expect(clearedSummary(p)).toEqual({ cleared: 2, starred: 1 })
  })
})

describe('filterHistory', () => {
  it("'all' なら全件返す", () => {
    let p = defaultProfile()
    p = recordResult(p, play({ caseId: 1, category: 'bppv' }), 1000)
    p = recordResult(p, play({ caseId: 2, category: 'central' }), 2000)
    expect(filterHistory(p.history, 'all')).toHaveLength(2)
  })

  it('カテゴリを指定すると絞り込む', () => {
    let p = defaultProfile()
    p = recordResult(p, play({ caseId: 1, category: 'bppv' }), 1000)
    p = recordResult(p, play({ caseId: 2, category: 'central' }), 2000)
    const only = filterHistory(p.history, 'central')
    expect(only).toHaveLength(1)
    expect(only[0].caseId).toBe(2)
  })
})

describe('loadProfile / saveProfile', () => {
  beforeEach(() => localStorage.clear())

  it('保存した内容を読み戻せる', () => {
    const p: Profile = { ...defaultProfile(), roleId: 'nurse', muted: true }
    saveProfile(p)
    expect(loadProfile()).toEqual(p)
  })

  it('保存が無ければ既定値を返す', () => {
    expect(loadProfile()).toEqual(defaultProfile())
  })

  it('保存先のキーは vertigo_profile_v1', () => {
    saveProfile(defaultProfile())
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})
