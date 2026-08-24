import { describe, expect, it } from 'vitest'
import { scoreGame } from './scoring'
import { initialState } from './state'
import { case01 } from '../data/cases/case01'
import { case06 } from '../data/cases/case06'
import type { ManeuverAttempt } from '../data/maneuvers'

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

/**
 * 症例1は右後半規管BPPVで、正解はEpley（右）。
 * 治らなかった手技は、頭位を何度も変えた分だけ患者の嘔気を強めるので減点する。
 */
describe('scoreGame：治らなかった耳石置換法', () => {
  const attempt = (over: Partial<ManeuverAttempt> = {}): ManeuverAttempt => ({
    kind: 'epley',
    side: 'R',
    answers: [],
    perfect: true,
    ...over,
  })

  const withManeuver = (maneuver: ManeuverAttempt | null) => ({
    ...initialState,
    performed: maneuver ? ['tx_maneuver'] : [],
    maneuver,
  })

  const maneuverDeduction = (c: typeof case01, maneuver: ManeuverAttempt | null) =>
    scoreGame(c, withManeuver(maneuver)).deductions.find((d) => d.label === '耳石置換法')

  it('正しい手技で治れば減点しない', () => {
    expect(maneuverDeduction(case01, attempt())).toBeUndefined()
  })

  it('患側を誤れば減点する', () => {
    expect(maneuverDeduction(case01, attempt({ side: 'L' }))?.points).toBe(-4)
  })

  it('手技の種類を誤れば減点する', () => {
    expect(maneuverDeduction(case01, attempt({ kind: 'lempert' }))?.points).toBe(-4)
  })

  it('型と患側が正しくても手順を誤れば治らないので減点する', () => {
    expect(maneuverDeduction(case01, attempt({ perfect: false }))?.points).toBe(-4)
  })

  it('適応のない症例に施行すれば減点する', () => {
    // 症例6は前庭神経炎で、耳石置換法の適応がない（maneuver: null）
    expect(maneuverDeduction(case06, attempt())?.points).toBe(-4)
  })

  it('そもそも施行しなければ減点しない', () => {
    expect(maneuverDeduction(case01, null)).toBeUndefined()
  })

  it('嘔気を強めたことを減点理由に書く', () => {
    expect(maneuverDeduction(case01, attempt({ side: 'L' }))?.reason).toContain('嘔気')
  })
})
