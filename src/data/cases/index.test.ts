import { describe, expect, it } from 'vitest'
import { CASES, CASE_MAP, caseTitle } from './index'

describe('caseTitle', () => {
  it('患側のある診断は全角スペースで左右を付ける', () => {
    const c = { ...CASES[0], diagnosis: { correct: '後半規管型BPPV', side: 'R' as const } }
    expect(caseTitle(c)).toBe('後半規管型BPPV　右')
  })

  it('患側が null の診断は診断名だけ', () => {
    const c = { ...CASES[0], diagnosis: { correct: '前庭性片頭痛', side: null } }
    expect(caseTitle(c)).toBe('前庭性片頭痛')
  })

  it('全症例で空文字にならない', () => {
    for (const c of CASES) expect(caseTitle(c).length).toBeGreaterThan(0)
  })

  it('CASE_MAP は全症例を引ける', () => {
    for (const c of CASES) expect(CASE_MAP.get(c.id)).toBe(c)
  })
})
