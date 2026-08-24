import { describe, expect, it } from 'vitest'
import { CASES, CASE_MAP, caseTitle } from './index'
import type { CaseDef, NystagmusSpec } from '../types'

/** gazeOpposite に入れた反対方向の注視も含めて、その症例が実際に描く眼振をすべて並べる */
function drawnSpecs(c: CaseDef): [string, NystagmusSpec][] {
  return Object.entries(c.nystagmus ?? {}).flatMap(([actionId, spec]): [string, NystagmusSpec][] =>
    spec.gazeOpposite
      ? [
          [actionId, spec],
          [`${actionId}（反対方向の注視）`, spec.gazeOpposite],
        ]
      : [[actionId, spec]],
  )
}

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

/** 頭位変換で所見をとる眼の診察コマンド */
const POSITIONAL_EYE_ACTIONS = ['eye_dh_r', 'eye_dh_l', 'eye_roll_r', 'eye_roll_l']

/**
 * 自発眼振が出ている患者では、眼振は頭位を変えても打ち続ける。体位で誘発される
 * BPPVとの決定的な違いなので、頭位検査こそ眼振を見せる場面になる。
 * 頭位検査の眼振を定義し忘れると「眼振なし」として静止した眼が描かれ、所見文と食い違う。
 *
 * 向きが不変か頭位で変わるかは末梢性か中枢性かで異なるため、ここでは有無だけを見る。
 * 裸眼で見えない微細な自発眼振（症例11）は eye_spont に水平成分を持たないので対象外。
 */
describe('自発眼振のある症例', () => {
  const withSpontaneous = CASES.filter((c) => c.nystagmus?.eye_spont?.horizontal)

  it('頭位検査でも眼振を描く', () => {
    expect(withSpontaneous.length).toBeGreaterThan(0)
    for (const c of withSpontaneous) {
      for (const actionId of POSITIONAL_EYE_ACTIONS) {
        expect(
          c.nystagmus?.[actionId]?.horizontal,
          `症例${c.id} ${actionId}：自発眼振が続くはずなのに「眼振なし」で静止した眼を描いている`,
        ).toBeTruthy()
      }
    }
  })
})

/**
 * 注視眼振は左右30°の両方を見て、向きが変わるかどうかで中枢性を疑う診察。
 * 片方の注視しか描かないと、キャプションの主張を絵で確認できない。
 *
 * 方向可変の症例だけ2枚にすると、枚数を見ただけで中枢性と分かって答えが漏れる。
 * 末梢性も2枚描き、向きが変わらず振幅だけ変わること（Alexanderの法則）を見せる。
 */
describe('注視眼振', () => {
  const withGaze = CASES.filter((c) => c.nystagmus?.eye_gaze?.horizontal)

  it('左右どちらの注視も描く', () => {
    expect(withGaze.length).toBeGreaterThan(0)
    for (const c of withGaze) {
      expect(
        c.nystagmus?.eye_gaze?.gazeOpposite,
        `症例${c.id}：片方の注視しか描いていない。枚数の違いで中枢性かどうかが漏れる`,
      ).toBeTruthy()
    }
  })

  it('2枚は互いに逆を向いた注視である', () => {
    for (const c of withGaze) {
      const gaze = c.nystagmus?.eye_gaze
      if (!gaze?.gazeOpposite) continue
      expect(
        Math.sign(gaze.gazeOpposite.gazeOffset ?? 0),
        `症例${c.id}：2枚とも同じ方向を注視している`,
      ).toBe(-Math.sign(gaze.gazeOffset ?? 0))
    }
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
      for (const [actionId, spec] of drawnSpecs(c)) {
        if (!spec.horizontal) continue
        expect(spec.torsional, `症例${c.id} ${actionId}：末梢性の眼振は水平回旋混合性で描く`).toBeTruthy()
      }
    }
  })

  // 末梢性の自発眼振は方向不変で、頭位を変えても同じ向きに打つ。
  // 中枢性は頭位で向きが変わりうるので、この規則は末梢性だけに課す。
  it('自発眼振は頭位検査でも同じ向きに打つ', () => {
    for (const c of peripheral) {
      const spont = c.nystagmus?.eye_spont
      if (!spont?.horizontal) continue
      for (const actionId of POSITIONAL_EYE_ACTIONS) {
        const horizontal = c.nystagmus?.[actionId]?.horizontal
        if (!horizontal) continue
        expect(
          Math.sign(horizontal),
          `症例${c.id} ${actionId}：自発眼振と向きが食い違っている`,
        ).toBe(Math.sign(spont.horizontal))
      }
    }
  })

  // 患側の機能低下でも過興奮でも、水平成分と回旋成分は同じ耳へ向かって打つ。
  // 符号が食い違っていれば、どちらかの向きを取り違えている。
  it('水平成分と回旋成分は同じ向きに打つ', () => {
    for (const c of peripheral) {
      for (const [actionId, spec] of drawnSpecs(c)) {
        if (!spec.horizontal || !spec.torsional) continue
        expect(
          Math.sign(spec.torsional),
          `症例${c.id} ${actionId}：水平と回旋の向きが逆を向いている`,
        ).toBe(Math.sign(spec.horizontal))
      }
    }
  })
})
