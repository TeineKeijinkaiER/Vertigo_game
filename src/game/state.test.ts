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

  it('SET_SUBTYPE_SIDE で鑑別の患側を記録する', () => {
    const s = reducer(initialState, { type: 'SET_SUBTYPE_SIDE', value: 'R' })
    expect(s.subtypeSideAnswer).toBe('R')
  })

  it('患側を問わない鑑別に選び直すと SET_SUBTYPE_SIDE の回答を破棄する', () => {
    const withSide = reducer(
      reducer(initialState, { type: 'SET_SUBTYPE', value: 'sub_pc_bppv' }),
      { type: 'SET_SUBTYPE_SIDE', value: 'R' },
    )
    expect(withSide.subtypeSideAnswer).toBe('R')

    const switched = reducer(withSide, { type: 'SET_SUBTYPE', value: 'sub_stroke' })
    expect(switched.subtypeSideAnswer).toBeNull()
  })

  it('患側が必要な鑑別どうしを選び直しても患側の回答は残す', () => {
    const withSide = reducer(
      reducer(initialState, { type: 'SET_SUBTYPE', value: 'sub_pc_bppv' }),
      { type: 'SET_SUBTYPE_SIDE', value: 'R' },
    )
    const switched = reducer(withSide, { type: 'SET_SUBTYPE', value: 'sub_hc_geo' })
    expect(switched.subtypeSideAnswer).toBe('R')
  })

  it('SET_VESTIBULAR で分類をやり直すと鑑別と患側を両方白紙に戻す', () => {
    const withSide = reducer(
      reducer(initialState, { type: 'SET_SUBTYPE', value: 'sub_pc_bppv' }),
      { type: 'SET_SUBTYPE_SIDE', value: 'L' },
    )
    const redone = reducer(withSide, { type: 'SET_VESTIBULAR', value: 't-EVS' })
    expect(redone.subtypeAnswer).toBeNull()
    expect(redone.subtypeSideAnswer).toBeNull()
  })
})
