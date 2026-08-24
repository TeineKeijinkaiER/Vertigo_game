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

/**
 * 末梢前庭障害（前庭神経炎・メニエール病の発作期）の自発眼振は、水平半規管由来の
 * 水平成分と前半規管由来の回旋成分が合成されるため、水平回旋混合性になる。
 * 純粋水平性は末梢性の典型像ではないうえ、前庭神経炎とメニエール病を「回旋成分の
 * 有無」で描き分けると、実在しない鑑別点を教えてしまう。
 *
 * 水平半規管BPPV（category: 'bppv'）は水平半規管単独の刺激なので純粋水平性が正しく、
 * この規則の対象外。中枢性（category: 'central'）も方向可変性の純粋水平などを取りうる。
 */
describe('末梢性症例の眼振', () => {
  const peripheral = CASES.filter((c) => c.category === 'peripheral')

  it('水平成分をもつ眼振には回旋成分を伴う', () => {
    for (const c of peripheral) {
      for (const [actionId, spec] of Object.entries(c.nystagmus ?? {})) {
        if (!spec.horizontal) continue
        expect(spec.torsional, `症例${c.id} ${actionId}：末梢性の眼振は水平回旋混合性で描く`).toBeTruthy()
      }
    }
  })

  // 自発眼振が出ている時期の末梢性めまいでは、眼振は頭位を変えても同じ向きに打ち続ける
  // （体位で誘発されるBPPVとの決定的な違い）。頭位検査の眼振を定義し忘れると
  // 「眼振なし」として静止した眼が描かれ、自発眼振の所見文と矛盾する。
  it('自発眼振があれば頭位検査でも同じ向きに打ち続ける', () => {
    const positional = ['eye_dh_r', 'eye_dh_l', 'eye_roll_r', 'eye_roll_l']
    for (const c of peripheral) {
      const spont = c.nystagmus?.eye_spont
      if (!spont?.horizontal) continue
      for (const actionId of positional) {
        const spec = c.nystagmus?.[actionId]
        expect(spec?.horizontal, `症例${c.id} ${actionId}：自発眼振は頭位を変えても持続する`).toBeTruthy()
        expect(
          Math.sign(spec?.horizontal ?? 0),
          `症例${c.id} ${actionId}：自発眼振と向きが食い違っている`,
        ).toBe(Math.sign(spont.horizontal))
      }
    }
  })

  // 患側の機能低下でも過興奮でも、水平成分と回旋成分は同じ耳へ向かって打つ。
  // 符号が食い違っていれば、どちらかの向きを取り違えている。
  it('水平成分と回旋成分は同じ向きに打つ', () => {
    for (const c of peripheral) {
      for (const [actionId, spec] of Object.entries(c.nystagmus ?? {})) {
        if (!spec.horizontal || !spec.torsional) continue
        expect(
          Math.sign(spec.torsional),
          `症例${c.id} ${actionId}：水平と回旋の向きが逆を向いている`,
        ).toBe(Math.sign(spec.horizontal))
      }
    }
  })
})
