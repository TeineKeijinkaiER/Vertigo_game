import type { CaseDef } from '../types'
import { case01 } from './case01'
import { case06 } from './case06'
import { case19 } from './case19'

/**
 * v0.1 プロトタイプは3症例のみ。
 * 易（BPPV・画像不要）／中（AVS・HINTSが効く）／難（眼振なし・初回DWI陰性）を1本ずつ。
 */
export const CASES: CaseDef[] = [case01, case06, case19]

export const CASE_MAP = new Map(CASES.map((c) => [c.id, c]))

export const CATEGORY_LABELS: Record<CaseDef['category'], string> = {
  bppv: 'BPPV',
  peripheral: '末梢性',
  central: '中枢性',
}
