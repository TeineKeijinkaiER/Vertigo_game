import type { CaseDef } from '../types'
import { case01 } from './case01'
import { case02 } from './case02'
import { case03 } from './case03'
import { case04 } from './case04'
import { case05 } from './case05'
import { case06 } from './case06'
import { case07 } from './case07'
import { case08 } from './case08'
import { case09 } from './case09'
import { case11 } from './case11'
import { case12 } from './case12'
import { case19 } from './case19'

/**
 * 症例は id 順に並べる。
 * BPPV群は後半規管（左右）・水平半規管向地性（左右）・クプラ結石（左右）を網羅する。
 *   1 後半規管R ／ 2 後半規管L ／ 3 水平向地性L ／ 4 水平向地性R ／ 5 クプラL ／ 12 クプラR
 * 末梢性（6・7）／その他（8：前庭性片頭痛）／中枢性（9・11・19）。
 */
export const CASES: CaseDef[] = [
  case01,
  case02,
  case03,
  case04,
  case05,
  case12,
  case06,
  case07,
  case08,
  case09,
  case11,
  case19,
]

export const CASE_MAP = new Map(CASES.map((c) => [c.id, c]))

export const CATEGORY_LABELS: Record<CaseDef['category'], string> = {
  bppv: 'BPPV',
  peripheral: '末梢性',
  central: '中枢性',
  other: 'その他',
}

/**
 * 一覧・履歴・送信データで使う症例の表示名。
 * 症例選択画面の従来の表記に揃えてあるので、`CaseDef.title` ではなく
 * 診断名＋患側を使う。
 */
export function caseTitle(c: CaseDef): string {
  const side = c.diagnosis.side === 'R' ? '　右' : c.diagnosis.side === 'L' ? '　左' : ''
  return `${c.diagnosis.correct}${side}`
}
