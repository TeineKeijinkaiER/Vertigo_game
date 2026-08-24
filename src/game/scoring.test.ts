import { describe, expect, it } from 'vitest'
import { scoreGame } from './scoring'
import { initialState } from './state'
import { case01 } from '../data/cases/case01'

function stateWithSubtype(subtypeAnswer: string | null, subtypeSideAnswer: 'R' | 'L' | null) {
  return {
    ...initialState,
    performed: ['as_dx'],
    vestibularAnswer: 't-EVS' as const,
    subtypeAnswer,
    subtypeSideAnswer,
  }
}

describe('scoreGame：鑑別の患側', () => {
  it('鑑別と患側が両方正しければ満点', () => {
    const result = scoreGame(case01, stateWithSubtype('sub_pc_bppv', 'R'))
    const line = result.lines.find((l) => l.label === '鑑別の患側')
    expect(line?.earned).toBe(5)
    expect(line?.max).toBe(5)
  })

  it('鑑別は正しいが患側が違えば0点', () => {
    const result = scoreGame(case01, stateWithSubtype('sub_pc_bppv', 'L'))
    const line = result.lines.find((l) => l.label === '鑑別の患側')
    expect(line?.earned).toBe(0)
    expect(line?.notes[0]).toContain('右')
  })

  it('鑑別を外していれば患側が合っていても0点', () => {
    const result = scoreGame(case01, stateWithSubtype('sub_stroke', 'R'))
    const line = result.lines.find((l) => l.label === '鑑別の患側')
    expect(line?.earned).toBe(0)
  })

  it('患側を問わない鑑別が正解の症例では行を出さない', () => {
    const vmCase = { ...case01, subtype: 'sub_vm' }
    const result = scoreGame(vmCase, stateWithSubtype('sub_vm', null))
    expect(result.lines.some((l) => l.label === '鑑別の患側')).toBe(false)
  })
})
