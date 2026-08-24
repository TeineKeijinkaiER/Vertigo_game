import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './state'

describe('reducer', () => {
  it('START_CASE は fromRandom を保持する', () => {
    const s = reducer(initialState, { type: 'START_CASE', caseId: 3, fromRandom: true })
    expect(s.phase).toBe('brief')
    expect(s.caseId).toBe(3)
    expect(s.fromRandom).toBe(true)
  })

  it('START_CASE は前の症例の記録を持ち越さない', () => {
    const dirty = {
      ...initialState,
      performed: ['ex_ataxia'],
      diagnosisAnswer: 'BPPV',
      fromRandom: true,
    }
    const s = reducer(dirty, { type: 'START_CASE', caseId: 1, fromRandom: false })
    expect(s.performed).toEqual([])
    expect(s.diagnosisAnswer).toBeNull()
    expect(s.fromRandom).toBe(false)
  })

  it("GOTO で learn へ行ける", () => {
    expect(reducer(initialState, { type: 'GOTO', phase: 'learn' }).phase).toBe('learn')
  })

  it('RESET は診察途中の状態を破棄してタイトルへ戻す', () => {
    const playing = reducer(initialState, { type: 'START_CASE', caseId: 1, fromRandom: true })
    expect(reducer(playing, { type: 'RESET' })).toEqual(initialState)
  })
})
