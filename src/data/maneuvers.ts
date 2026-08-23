import type { PoseImageId } from './poseImages'
import type { Side } from './types'

/**
 * 耳石置換法を「選ぶ」のではなく「組み立てさせる」ためのデータ。
 *
 * 手順は以下に準拠している。
 *   ・HOWTO（当院めまい患者対応）の耳石置換法の表
 *   ・hc-bppv.pdf（小川恭生「外側半規管型良性発作性頭位めまい症」東医大誌 74(2), 2016）
 *
 * PDF の記載:
 *   Lempert（Barbecue rotation）… 仰臥位から開始し、まず体は動かさず頭だけを患側へ90°回して
 *     誘発を確認したのち正中へ戻す。そこから頭部を健側方向へ90度ずつ回転。
 *     患側上（健側下）頭位 → 体ごとうつ伏せ → さらに90度で患側下 → 坐位に戻す。
 *     各頭位は30〜60秒維持。原法は270度、Baloh は360度。
 *   Gufoni（半規管結石症＝向地性）… 坐位から健側方向へすばやく倒して側臥位とし、
 *     頭部を下方に45度回転、数分維持して坐位に戻す。
 *   Gufoni（クプラ結石症＝背地性）… 坐位から患側方向へすばやく側臥位とし、
 *     頭部を上方に45度回転、数分維持して坐位に戻す。
 *
 * Gufoni は坐位から始めるのが自明なので、開始体位は問わず、倒す方向から組み立てさせる。
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
  /** 選択肢のイラスト */
  image: PoseImageId
}

export interface ManeuverStep {
  question: string
  options: StepOption[]
  correct: string
}

type LR = 'R' | 'L'

const jp = (s: LR) => (s === 'R' ? '右' : '左')
const other = (s: LR): LR => (s === 'R' ? 'L' : 'R')

const headTurn = (s: LR): PoseImageId => (s === 'R' ? 'headroll_r90' : 'headroll_l90')
const dhHang = (s: LR): PoseImageId => (s === 'R' ? 'dh_hang_r' : 'dh_hang_l')
const epCross = (s: LR): PoseImageId => (s === 'R' ? 'ep_cross_r' : 'ep_cross_l')
const gufoniFall = (s: LR): PoseImageId => (s === 'R' ? 'gufoni_fall_r' : 'gufoni_fall_l')
const lempertRoll = (s: LR): PoseImageId => (s === 'R' ? 'lempert_roll_r' : 'lempert_roll_l')
const sideDown = (s: LR): PoseImageId => (s === 'R' ? 'side_r_facedown' : 'side_l_facedown')
const sideUp = (s: LR): PoseImageId => (s === 'R' ? 'side_r_faceup' : 'side_l_faceup')

export function buildSteps(kind: ManeuverKind, affected: LR, answers: string[]): ManeuverStep[] {
  const healthy = other(affected)

  switch (kind) {
    case 'epley': {
      const crossSide = (answers[1] as LR | undefined) ?? healthy
      return [
        {
          question: '①　坐位で頭を45°回し、どちらを下にして懸垂位にしますか',
          options: [
            { label: '右を下に', value: 'R', image: dhHang('R') },
            { label: '左を下に', value: 'L', image: dhHang('L') },
          ],
          correct: affected,
        },
        {
          question: '②　懸垂位のまま、体は動かさずに頭だけをどちらへ90°回しますか',
          options: [
            { label: '右へ回す', value: 'R', image: epCross('L') },
            { label: '左へ回す', value: 'L', image: epCross('R') },
          ],
          correct: healthy,
        },
        {
          question: '③　次に体ごと側臥位にします。鼻はどちらに向けますか',
          options: [
            { label: '鼻を床に向ける', value: 'down', image: sideDown(crossSide) },
            { label: '鼻を天井に向ける', value: 'up', image: sideUp(crossSide) },
          ],
          correct: 'down',
        },
        {
          question: '④　最後はどうしますか',
          options: [
            { label: 'ゆっくり起坐させる', value: 'sit', image: 'sit_up' },
            { label: 'そのまま仰臥位に戻す', value: 'supine', image: 'supine' },
          ],
          correct: 'sit',
        },
      ]
    }

    case 'lempert':
      return [
        {
          question: '①　仰臥位のまま、体は動かさずに頭だけをどちらへ90°回して誘発を確認しますか',
          options: [
            { label: jp(affected) + 'へ回す（患側へ）', value: 'affected', image: headTurn(affected) },
            { label: jp(healthy) + 'へ回す（健側へ）', value: 'healthy', image: headTurn(healthy) },
          ],
          correct: 'affected',
        },
        {
          question: '②　頭を正中に戻したあと、体ごとどちらの方向へ90°ずつ回転していきますか',
          options: [
            { label: jp(healthy) + '方向へ（健側へ）', value: 'healthy', image: lempertRoll(healthy) },
            { label: jp(affected) + '方向へ（患側へ）', value: 'affected', image: lempertRoll(affected) },
          ],
          correct: 'healthy',
        },
      ]

    case 'gufoni_geo': {
      const fallen = (answers[0] as LR | undefined) ?? healthy
      return [
        {
          question: '①　坐位からどちらへすばやく倒して側臥位にしますか',
          options: [
            { label: '右へ倒す', value: 'R', image: gufoniFall('R') },
            { label: '左へ倒す', value: 'L', image: gufoniFall('L') },
          ],
          correct: healthy,
        },
        {
          question: '②　そのまま頭部をどちらへ45°回しますか',
          options: [
            { label: '下方（床）へ45°', value: 'down', image: sideDown(fallen) },
            { label: '上方（天井）へ45°', value: 'up', image: sideUp(fallen) },
          ],
          correct: 'down',
        },
      ]
    }

    case 'gufoni_apo': {
      const fallen = (answers[0] as LR | undefined) ?? affected
      return [
        {
          question: '①　坐位からどちらへすばやく倒して側臥位にしますか',
          options: [
            { label: '右へ倒す', value: 'R', image: gufoniFall('R') },
            { label: '左へ倒す', value: 'L', image: gufoniFall('L') },
          ],
          correct: affected,
        },
        {
          question: '②　そのまま頭部をどちらへ45°回しますか',
          options: [
            { label: '下方（床）へ45°', value: 'down', image: sideDown(fallen) },
            { label: '上方（天井）へ45°', value: 'up', image: sideUp(fallen) },
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
