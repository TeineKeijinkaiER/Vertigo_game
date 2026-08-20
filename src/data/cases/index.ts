import type { CaseDef } from '../types'
import { case01 } from './case01'
import { case04 } from './case04'
import { case05 } from './case05'
import { case06 } from './case06'
import { case07 } from './case07'
import { case09 } from './case09'
import { case11 } from './case11'
import { case19 } from './case19'

/**
 * 症例は id 順に並べる。
 * BPPV群（1・4・5）／末梢性（6・7）／中枢性（9・11・19）。
 */
export const CASES: CaseDef[] = [case01, case04, case05, case06, case07, case09, case11, case19]

export const CASE_MAP = new Map(CASES.map((c) => [c.id, c]))

export const CATEGORY_LABELS: Record<CaseDef['category'], string> = {
  bppv: 'BPPV',
  peripheral: '末梢性',
  central: '中枢性',
}
