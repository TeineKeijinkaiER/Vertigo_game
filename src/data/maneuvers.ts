import type { PoseKey } from '../components/PoseFigure'
import type { Side } from './types'

/**
 * 耳石置換法を「選ぶ」のではなく「組み立てさせる」ためのデータ。
 *
 * 手順は以下の資料に準拠している。
 *   ・HOWTO（当院めまい患者対応）の耳石置換法の表
 *   ・hc-bppv.pdf（小川恭生「外側半規管型良性発作性頭位めまい症」東医大誌 74(2), 2016）
 *
 * PDF の記載（重要）:
 *   Lempert（Barbecue rotation）
 *     仰臥位からスタートし、頭部を健側方向に90度ずつ回転させる。
 *     続いて患側上（健側下）頭位 → 体ごとうつ伏せ → さらに90度回して患側下頭位 → 坐位に戻す。
 *     各頭位は30〜60秒維持する。Lempert原法は270度、Balohは360度。
 *   Gufoni法（半規管結石症＝向地性）
 *     坐位から健側方向にすばやく傾かせ側臥位とし、その後頭部を下方に45度回転させ、
 *     数分間維持して坐位に戻す。
 *   Gufoni法（クプラ結石症＝背地性）
 *     坐位から患側方向にすばやく側臥位とし、その後頭部を上方に45度回転させ、
 *     数分間維持して坐位に戻す。
 *
 * Epley法（後半規管型）は Dix-Hallpike 陽性の頭位から、
 *   懸垂位のまま頭だけを健側へ回す → 体ごと健側の側臥位にして鼻を床へ向ける → 起坐、
 * という順序である。頭の回旋と体のロールを混同しないことが要点。
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

const jp = (s: LR) => (s === 'R' ? '右' : '左')
const other = (s: LR): LR => (s === 'R' ? 'L' : 'R')

const sitTurn = (s: LR): PoseKey => (s === 'R' ? 'sitting_turn_r' : 'sitting_turn_l')
const hang = (s: LR): PoseKey => (s === 'R' ? 'hang_r' : 'hang_l')
const hangCross = (s: LR): PoseKey => (s === 'R' ? 'hang_cross_r' : 'hang_cross_l')
const side = (s: LR): PoseKey => (s === 'R' ? 'side_r' : 'side_l')
const sideDown = (s: LR): PoseKey => (s === 'R' ? 'side_r_facedown' : 'side_l_facedown')
const sideUp = (s: LR): PoseKey => (s === 'R' ? 'side_r_faceup' : 'side_l_faceup')
const roll = (s: LR): PoseKey => (s === 'R' ? 'roll_r' : 'roll_l')

export function buildSteps(kind: ManeuverKind, affected: LR, answers: string[]): ManeuverStep[] {
  const healthy = other(affected)

  switch (kind) {
    case 'epley': {
      const hangSide = (answers[0] as LR | undefined) ?? affected
      const crossSide = (answers[1] as LR | undefined) ?? healthy
      return [
        {
          question: '①　坐位で頭を45°回し、どちらを下にして懸垂位にしますか',
          options: [
            { label: '右を下に', value: 'R', seq: [sitTurn('R'), hang('R')] },
            { label: '左を下に', value: 'L', seq: [sitTurn('L'), hang('L')] },
          ],
          correct: affected,
        },
        {
          question: '②　懸垂位のまま、体は動かさずに頭だけをどちらへ90°回しますか',
          options: [
            { label: '右へ回す', value: 'R', seq: [hang(hangSide), hangCross('R')] },
            { label: '左へ回す', value: 'L', seq: [hang(hangSide), hangCross('L')] },
          ],
          correct: healthy,
        },
        {
          question: '③　次に体ごと側臥位にします。鼻はどちらに向けますか',
          options: [
            { label: '鼻を床に向ける', value: 'down', seq: [hangCross(crossSide), sideDown(crossSide)] },
            { label: '鼻を天井に向ける', value: 'up', seq: [hangCross(crossSide), sideUp(crossSide)] },
          ],
          correct: 'down',
        },
        {
          question: '④　最後はどうしますか',
          options: [
            { label: 'ゆっくり起坐させる', value: 'sit', seq: [sideDown(crossSide), 'sitting'] },
            { label: 'そのまま仰臥位に戻す', value: 'supine', seq: [sideDown(crossSide), 'supine'] },
          ],
          correct: 'sit',
        },
      ]
    }

    case 'lempert':
      // PDF 図7：仰臥位 → 健側方向へ90°ずつ → 腹臥位 → 患側下 → 坐位
      return [
        {
          question: '①　どの体位から始めますか',
          options: [
            { label: '仰臥位から', value: 'supine', seq: ['supine'] },
            { label: '坐位から', value: 'sitting', seq: ['sitting'] },
          ],
          correct: 'supine',
        },
        {
          question: '②　仰臥位から、どちらの方向へ90°ずつ回していきますか',
          options: [
            {
              label: `${jp(healthy)}方向へ（健側へ）`,
              value: 'healthy',
              seq: ['supine', roll(healthy), side(healthy)],
            },
            {
              label: `${jp(affected)}方向へ（患側へ）`,
              value: 'affected',
              seq: ['supine', roll(affected), side(affected)],
            },
          ],
          correct: 'healthy',
        },
        {
          question: '③　側臥位の次はどうしますか',
          options: [
            { label: '同じ方向へ回して腹臥位にする', value: 'prone', seq: [side(healthy), 'prone'] },
            { label: '仰臥位へ戻す', value: 'back', seq: [side(healthy), 'supine'] },
          ],
          correct: 'prone',
        },
        {
          question: '④　合計で何度回しますか',
          options: [
            { label: '180°でやめる', value: '180', seq: ['supine', side(healthy), 'prone'] },
            { label: '270〜360°まで回す', value: '360', seq: ['supine', side(healthy), 'prone', side(affected), 'sitting'] },
          ],
          correct: '360',
        },
      ]

    case 'gufoni_geo': {
      // PDF 図9：坐位 → 健側へ倒して側臥位 → 頭部を下方に45° → 坐位
      const fallen = (answers[1] as LR | undefined) ?? healthy
      return [
        {
          question: '①　どの体位から始めますか',
          options: [
            { label: '坐位から', value: 'sitting', seq: ['sitting'] },
            { label: '仰臥位から', value: 'supine', seq: ['supine'] },
          ],
          correct: 'sitting',
        },
        {
          question: '②　坐位からどちらへすばやく倒して側臥位にしますか',
          options: [
            { label: '右へ倒す', value: 'R', seq: ['sitting', side('R')] },
            { label: '左へ倒す', value: 'L', seq: ['sitting', side('L')] },
          ],
          correct: healthy,
        },
        {
          question: '③　そのまま頭部をどちらへ45°回しますか',
          options: [
            { label: '下方（床）へ45°', value: 'down', seq: [side(fallen), sideDown(fallen)] },
            { label: '上方（天井）へ45°', value: 'up', seq: [side(fallen), sideUp(fallen)] },
          ],
          correct: 'down',
        },
      ]
    }

    case 'gufoni_apo': {
      // PDF 図10：坐位 → 患側へ倒して側臥位 → 頭部を上方に45° → 坐位
      const fallen = (answers[1] as LR | undefined) ?? affected
      return [
        {
          question: '①　どの体位から始めますか',
          options: [
            { label: '坐位から', value: 'sitting', seq: ['sitting'] },
            { label: '仰臥位から', value: 'supine', seq: ['supine'] },
          ],
          correct: 'sitting',
        },
        {
          question: '②　坐位からどちらへすばやく倒して側臥位にしますか',
          options: [
            { label: '右へ倒す', value: 'R', seq: ['sitting', side('R')] },
            { label: '左へ倒す', value: 'L', seq: ['sitting', side('L')] },
          ],
          correct: affected,
        },
        {
          question: '③　そのまま頭部をどちらへ45°回しますか',
          options: [
            { label: '下方（床）へ45°', value: 'down', seq: [side(fallen), sideDown(fallen)] },
            { label: '上方（天井）へ45°', value: 'up', seq: [side(fallen), sideUp(fallen)] },
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
  perfect: boolean
}

export type { Side }
