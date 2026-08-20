import type { PoseKey } from '../components/BodyPose'
import type { Side } from './types'

/**
 * 耳石置換法を「選ぶ」のではなく「組み立てさせる」ためのデータ。
 * HOWTO の耳石置換法の表に準拠している。
 *
 *   後半規管BPPV        → Epley法
 *   水平半規管・向地性  → Lempert法（患側と反対方向へ360°）
 *                         Gufoni法（健側へ倒れ、顔を下向き）
 *   水平半規管・背地性  → Gufoni法（患側へ倒れ、顔を上向き）
 */

export type ManeuverKind = 'epley' | 'lempert' | 'gufoni_geo' | 'gufoni_apo'

export const MANEUVER_KINDS: { id: ManeuverKind; label: string; hint: string }[] = [
  { id: 'epley', label: 'Epley法', hint: '後半規管BPPV' },
  { id: 'lempert', label: 'Lempert法', hint: '水平半規管・向地性' },
  { id: 'gufoni_geo', label: 'Gufoni法（向地性）', hint: '水平半規管・向地性' },
  { id: 'gufoni_apo', label: 'Gufoni法（背地性）', hint: '水平半規管・背地性' },
]

export interface StepOption {
  label: string
  value: string
  /** 選択肢のイラストとして再生する体位の列 */
  seq: PoseKey[]
}

export interface ManeuverStep {
  question: string
  options: StepOption[]
  correct: string
}

type LR = 'R' | 'L'

const side = (s: LR): PoseKey => (s === 'R' ? 'side_r' : 'side_l')
const sideDown = (s: LR): PoseKey => (s === 'R' ? 'side_r_facedown' : 'side_l_facedown')
const sideUp = (s: LR): PoseKey => (s === 'R' ? 'side_r_faceup' : 'side_l_faceup')
const hang = (s: LR): PoseKey => (s === 'R' ? 'hang_r' : 'hang_l')
const sitTurn = (s: LR): PoseKey => (s === 'R' ? 'sitting_turn_r' : 'sitting_turn_l')
const jp = (s: LR) => (s === 'R' ? '右' : '左')
const other = (s: LR): LR => (s === 'R' ? 'L' : 'R')

/**
 * 手技・患側・ここまでの回答から、次に問う手順を組み立てる。
 * 途中の選択によってイラストが変わるので、回答を受け取って毎回組み直す。
 */
export function buildSteps(kind: ManeuverKind, affected: LR, answers: string[]): ManeuverStep[] {
  const healthy = other(affected)

  switch (kind) {
    case 'epley': {
      const rolled = (answers[1] as LR | undefined) ?? healthy
      return [
        {
          question: '①　どちらを下にして頭を懸垂位にしますか',
          options: [
            { label: '右', value: 'R', seq: [sitTurn('R'), hang('R')] },
            { label: '左', value: 'L', seq: [sitTurn('L'), hang('L')] },
          ],
          correct: affected,
        },
        {
          question: `②　頭を${jp(affected)}に45°回したまま、体をどちらへ90°回しますか`,
          options: [
            { label: '右へ', value: 'R', seq: [hang(affected), side('R')] },
            { label: '左へ', value: 'L', seq: [hang(affected), side('L')] },
          ],
          correct: healthy,
        },
        {
          question: '③　さらにどうしますか',
          options: [
            { label: '同じ方向へ回して顔を下に向ける', value: 'same', seq: [side(rolled), sideDown(rolled)] },
            { label: '仰臥位に戻す', value: 'back', seq: [side(rolled), 'supine'] },
          ],
          correct: 'same',
        },
        {
          question: '④　最後はどうしますか',
          options: [
            { label: 'ゆっくり起坐させる', value: 'sit', seq: [sideDown(rolled), 'sitting'] },
            { label: 'すぐに立ち上がらせる', value: 'stand', seq: ['sitting'] },
          ],
          correct: 'sit',
        },
      ]
    }

    case 'lempert':
      return [
        {
          question: '①　どちらを下にした側臥位から始めますか',
          options: [
            { label: '右を下に', value: 'R', seq: ['supine', side('R')] },
            { label: '左を下に', value: 'L', seq: ['supine', side('L')] },
          ],
          // 患側を上にする ＝ 健側を下にする
          correct: healthy,
        },
        {
          question: '②　どちらの方向へ90°ずつ回していきますか',
          options: [
            {
              label: `${jp(healthy)}方向へ（健側へ）`,
              value: 'healthy',
              seq: [side(healthy), 'supine', side(affected)],
            },
            {
              label: `${jp(affected)}方向へ（患側へ）`,
              value: 'affected',
              seq: [side(affected), 'supine', side(healthy)],
            },
          ],
          correct: 'healthy',
        },
        {
          question: '③　合計で何度回しますか',
          options: [
            { label: '180°', value: '180', seq: [side(healthy), 'supine'] },
            { label: '360°', value: '360', seq: [side(healthy), 'supine', side(affected), 'supine'] },
          ],
          correct: '360',
        },
      ]

    case 'gufoni_geo': {
      const fallen = (answers[0] as LR | undefined) ?? healthy
      return [
        {
          question: '①　どちらに倒しますか',
          options: [
            { label: '右へ倒す', value: 'R', seq: ['supine', side('R')] },
            { label: '左へ倒す', value: 'L', seq: ['supine', side('L')] },
          ],
          correct: healthy,
        },
        {
          question: '②　そのまま顔をどちらに向けますか',
          options: [
            { label: '下（床）に向ける', value: 'down', seq: [side(fallen), sideDown(fallen)] },
            { label: '上（天井）に向ける', value: 'up', seq: [side(fallen), sideUp(fallen)] },
          ],
          correct: 'down',
        },
      ]
    }

    case 'gufoni_apo': {
      const fallen = (answers[0] as LR | undefined) ?? affected
      return [
        {
          question: '①　どちらに倒しますか',
          options: [
            { label: '右へ倒す', value: 'R', seq: ['supine', side('R')] },
            { label: '左へ倒す', value: 'L', seq: ['supine', side('L')] },
          ],
          correct: affected,
        },
        {
          question: '②　そのまま顔をどちらに向けますか',
          options: [
            { label: '下（床）に向ける', value: 'down', seq: [side(fallen), sideDown(fallen)] },
            { label: '上（天井）に向ける', value: 'up', seq: [side(fallen), sideUp(fallen)] },
          ],
          correct: 'up',
        },
      ]
    }
  }
}

export interface ManeuverAttempt {
  kind: ManeuverKind
  side: LR
  answers: string[]
  /** 手技・患側・全手順がすべて正しいか */
  perfect: boolean
}

export type { Side }
