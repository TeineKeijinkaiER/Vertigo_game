import type { PoseKey } from '../components/PoseFigure'
import type { Side } from './types'

/**
 * 耳石置換法を「選ぶ」のではなく「組み立てさせる」ためのデータ。
 *
 * 手順は以下に準拠している。
 *   ・HOWTO（当院めまい患者対応）の耳石置換法の表
 *   ・hc-bppv.pdf（小川恭生「外側半規管型良性発作性頭位めまい症」東医大誌 74(2), 2016）
 *
 * PDF の記載:
 *   Lempert（Barbecue rotation）… 仰臥位から開始し、頭部を健側方向へ90度ずつ回転。
 *     患側上（健側下）頭位 → 体ごとうつ伏せ → さらに90度で患側下 → 坐位に戻す。
 *     各頭位は30〜60秒維持。原法は270度、Baloh は360度。
 *   Gufoni（半規管結石症＝向地性）… 坐位から健側方向へすばやく倒して側臥位とし、
 *     頭部を下方に45度回転、数分維持して坐位に戻す。
 *   Gufoni（クプラ結石症＝背地性）… 坐位から患側方向へすばやく側臥位とし、
 *     頭部を上方に45度回転、数分維持して坐位に戻す。
 *
 * Epley（後半規管型）… Dix-Hallpike 陽性の頭位から、懸垂位のまま頭だけを健側へ回し、
 *   その後に体ごと側臥位にして鼻を床へ向け、最後に起坐する。
 *   頭の回旋と体のロールを混同しないことが要点。
 *
 * イラストは動きの回転軸に合わせて視点を変える。
 *   坐位↔仰臥位・頭部懸垂位 → 側面図（患側から見る）
 *   坐位から左右へ倒れる     → 正面図
 *   頭の回旋・体幹のロール   → 頭側図
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

// 側面図（患側から見る）
const dhSit = (s: LR): PoseKey => (s === 'R' ? 'dh_sit_r' : 'dh_sit_l')
const dhHang = (s: LR): PoseKey => (s === 'R' ? 'dh_hang_r' : 'dh_hang_l')
const epCross = (s: LR): PoseKey => (s === 'R' ? 'ep_cross_r' : 'ep_cross_l')
// 正面図（坐位から左右へ倒す）
const frFall = (s: LR): PoseKey => (s === 'R' ? 'fr_fall_r' : 'fr_fall_l')
// 頭側図（側臥位と顔の向き）
const axSide = (s: LR): PoseKey => (s === 'R' ? 'ax_side_r' : 'ax_side_l')
const axSideUp = (s: LR): PoseKey => (s === 'R' ? 'ax_side_r_up' : 'ax_side_l_up')
const axSideDown = (s: LR): PoseKey => (s === 'R' ? 'ax_side_r_down' : 'ax_side_l_down')

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
            { label: '右を下に', value: 'R', seq: [dhSit('R'), dhHang('R')] },
            { label: '左を下に', value: 'L', seq: [dhSit('L'), dhHang('L')] },
          ],
          correct: affected,
        },
        {
          question: '②　懸垂位のまま、体は動かさずに頭だけをどちらへ90°回しますか',
          options: [
            { label: '右へ回す', value: 'R', seq: [dhHang(hangSide), epCross('L')] },
            { label: '左へ回す', value: 'L', seq: [dhHang(hangSide), epCross('R')] },
          ],
          correct: healthy,
        },
        {
          question: '③　次に体ごと側臥位にします。鼻はどちらに向けますか',
          options: [
            { label: '鼻を床に向ける', value: 'down', seq: [axSide(crossSide), axSideDown(crossSide)] },
            { label: '鼻を天井に向ける', value: 'up', seq: [axSide(crossSide), axSideUp(crossSide)] },
          ],
          correct: 'down',
        },
        {
          question: '④　最後はどうしますか',
          options: [
            { label: 'ゆっくり起坐させる', value: 'sit', seq: [axSideDown(crossSide), 'ax_supine', 'side_sit'] },
            { label: 'そのまま仰臥位に戻す', value: 'supine', seq: [axSideDown(crossSide), 'ax_supine'] },
          ],
          correct: 'sit',
        },
      ]
    }

    case 'lempert':
      return [
        {
          question: '①　どの体位から始めますか',
          options: [
            { label: '仰臥位から', value: 'supine', seq: ['ax_supine'] },
            { label: '坐位から', value: 'sitting', seq: ['fr_sit'] },
          ],
          correct: 'supine',
        },
        {
          question: '②　仰臥位から、どちらの方向へ90°ずつ回していきますか',
          options: [
            { label: jp(healthy) + '方向へ（健側へ）', value: 'healthy', seq: ['ax_supine', axSide(healthy)] },
            { label: jp(affected) + '方向へ（患側へ）', value: 'affected', seq: ['ax_supine', axSide(affected)] },
          ],
          correct: 'healthy',
        },
        {
          question: '③　側臥位の次はどうしますか',
          options: [
            { label: '同じ方向へ回して腹臥位にする', value: 'prone', seq: [axSide(healthy), 'ax_prone'] },
            { label: '仰臥位へ戻す', value: 'back', seq: [axSide(healthy), 'ax_supine'] },
          ],
          correct: 'prone',
        },
        {
          question: '④　合計で何度回しますか',
          options: [
            { label: '180°でやめる', value: '180', seq: ['ax_supine', axSide(healthy), 'ax_prone'] },
            {
              label: '270〜360°まで回す',
              value: '360',
              seq: ['ax_supine', axSide(healthy), 'ax_prone', axSide(affected), 'ax_supine'],
            },
          ],
          correct: '360',
        },
      ]

    case 'gufoni_geo': {
      const fallen = (answers[1] as LR | undefined) ?? healthy
      return [
        {
          question: '①　どの体位から始めますか',
          options: [
            { label: '坐位から', value: 'sitting', seq: ['fr_sit'] },
            { label: '仰臥位から', value: 'supine', seq: ['ax_supine'] },
          ],
          correct: 'sitting',
        },
        {
          question: '②　坐位からどちらへすばやく倒して側臥位にしますか',
          options: [
            { label: '右へ倒す', value: 'R', seq: ['fr_sit', frFall('R')] },
            { label: '左へ倒す', value: 'L', seq: ['fr_sit', frFall('L')] },
          ],
          correct: healthy,
        },
        {
          question: '③　そのまま頭部をどちらへ45°回しますか',
          options: [
            { label: '下方（床）へ45°', value: 'down', seq: [axSide(fallen), axSideDown(fallen)] },
            { label: '上方（天井）へ45°', value: 'up', seq: [axSide(fallen), axSideUp(fallen)] },
          ],
          correct: 'down',
        },
      ]
    }

    case 'gufoni_apo': {
      const fallen = (answers[1] as LR | undefined) ?? affected
      return [
        {
          question: '①　どの体位から始めますか',
          options: [
            { label: '坐位から', value: 'sitting', seq: ['fr_sit'] },
            { label: '仰臥位から', value: 'supine', seq: ['ax_supine'] },
          ],
          correct: 'sitting',
        },
        {
          question: '②　坐位からどちらへすばやく倒して側臥位にしますか',
          options: [
            { label: '右へ倒す', value: 'R', seq: ['fr_sit', frFall('R')] },
            { label: '左へ倒す', value: 'L', seq: ['fr_sit', frFall('L')] },
          ],
          correct: affected,
        },
        {
          question: '③　そのまま頭部をどちらへ45°回しますか',
          options: [
            { label: '下方（床）へ45°', value: 'down', seq: [axSide(fallen), axSideDown(fallen)] },
            { label: '上方（天井）へ45°', value: 'up', seq: [axSide(fallen), axSideUp(fallen)] },
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
