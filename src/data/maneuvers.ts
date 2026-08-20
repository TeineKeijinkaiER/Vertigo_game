import type { Side } from './types'

/**
 * 耳石置換法を「選ぶ」のではなく「組み立てさせる」ためのデータ。
 * HOWTO の耳石置換法の表に完全に準拠している。
 *
 *   後半規管BPPV            → Epley法
 *   水平半規管・向地性      → Lempert法（患側と反対方向へ360°）
 *                             Gufoni法（健側へ倒れ、顔を下向き）
 *   水平半規管・背地性      → Gufoni法（患側へ倒れ、顔を上向き）
 */

export type ManeuverKind = 'epley' | 'lempert' | 'gufoni_geo' | 'gufoni_apo'

export const MANEUVER_KINDS: { id: ManeuverKind; label: string; hint: string }[] = [
  { id: 'epley', label: 'Epley法', hint: '後半規管BPPV' },
  { id: 'lempert', label: 'Lempert法', hint: '水平半規管・向地性' },
  { id: 'gufoni_geo', label: 'Gufoni法（向地性）', hint: '水平半規管・向地性' },
  { id: 'gufoni_apo', label: 'Gufoni法（背地性）', hint: '水平半規管・背地性' },
]

/** 手技のステップで示す頭位のイラスト種別 */
export type Pose =
  | 'sitting'
  | 'supine'
  | 'head_hanging_r'
  | 'head_hanging_l'
  | 'sidelying_r'
  | 'sidelying_l'
  | 'face_down'
  | 'face_up'
  | 'rotate_r'
  | 'rotate_l'

export interface StepOption {
  label: string
  /** 'affected' = 患側、'healthy' = 健側、それ以外はそのままの値 */
  value: string
  pose: Pose
}

export interface ManeuverStep {
  question: string
  options: StepOption[]
  correct: string
}

/**
 * 手技と患側から手順の問題を組み立てる。
 * value は 'affected' / 'healthy' で持ち、イラストだけ左右を解決する。
 */
export function buildSteps(kind: ManeuverKind, side: Exclude<Side, null>): ManeuverStep[] {
  const affected = side
  const healthy: 'R' | 'L' = side === 'R' ? 'L' : 'R'
  const poseFor = (s: 'R' | 'L', kindOfPose: 'hang' | 'side' | 'rotate'): Pose => {
    if (kindOfPose === 'hang') return s === 'R' ? 'head_hanging_r' : 'head_hanging_l'
    if (kindOfPose === 'side') return s === 'R' ? 'sidelying_r' : 'sidelying_l'
    return s === 'R' ? 'rotate_r' : 'rotate_l'
  }
  const jp = (s: 'R' | 'L') => (s === 'R' ? '右' : '左')

  // 選択肢は常に「右」「左」の順で出し、どちらが正解かは患側で決まる
  const lr = (kindOfPose: 'hang' | 'side' | 'rotate'): StepOption[] => [
    { label: '右', value: 'R', pose: poseFor('R', kindOfPose) },
    { label: '左', value: 'L', pose: poseFor('L', kindOfPose) },
  ]

  switch (kind) {
    case 'epley':
      return [
        {
          question: '①　どちらを下にして頭を懸垂位にしますか',
          options: lr('hang'),
          correct: affected,
        },
        {
          question: `②　頭を${jp(affected)}に45°回したまま、体をどちらへ90°回しますか`,
          options: lr('side'),
          correct: healthy,
        },
        {
          question: '③　さらに体をどちらへ90°回しますか',
          options: [
            { label: `同じ方向（${jp(healthy)}）へ`, value: 'same', pose: poseFor(healthy, 'side') },
            { label: `逆方向（${jp(affected)}）へ戻す`, value: 'back', pose: poseFor(affected, 'side') },
          ],
          correct: 'same',
        },
        {
          question: '④　最後はどうしますか',
          options: [
            { label: 'ゆっくり起坐させる', value: 'sit', pose: 'sitting' },
            { label: 'すぐに立ち上がらせる', value: 'stand', pose: 'sitting' },
          ],
          correct: 'sit',
        },
      ]

    case 'lempert':
      return [
        {
          question: '①　どちらを上にした側臥位から始めますか',
          options: lr('side'),
          correct: affected,
        },
        {
          question: '②　どちらの方向へ90°ずつ回していきますか',
          options: [
            { label: `${jp(healthy)}方向へ（健側へ）`, value: 'healthy', pose: poseFor(healthy, 'rotate') },
            { label: `${jp(affected)}方向へ（患側へ）`, value: 'affected', pose: poseFor(affected, 'rotate') },
          ],
          correct: 'healthy',
        },
        {
          question: '③　合計で何度回しますか',
          options: [
            { label: '180°', value: '180', pose: 'supine' },
            { label: '360°', value: '360', pose: 'supine' },
          ],
          correct: '360',
        },
      ]

    case 'gufoni_geo':
      return [
        {
          question: '①　どちらに倒しますか',
          options: lr('side'),
          correct: healthy,
        },
        {
          question: '②　そのまま顔をどちらに向けますか',
          options: [
            { label: '下（床）に向ける', value: 'down', pose: 'face_down' },
            { label: '上（天井）に向ける', value: 'up', pose: 'face_up' },
          ],
          correct: 'down',
        },
      ]

    case 'gufoni_apo':
      return [
        {
          question: '①　どちらに倒しますか',
          options: lr('side'),
          correct: affected,
        },
        {
          question: '②　そのまま顔をどちらに向けますか',
          options: [
            { label: '下（床）に向ける', value: 'down', pose: 'face_down' },
            { label: '上（天井）に向ける', value: 'up', pose: 'face_up' },
          ],
          correct: 'up',
        },
      ]
  }
}

export interface ManeuverAttempt {
  kind: ManeuverKind
  side: 'R' | 'L'
  /** 各ステップで選んだ値 */
  answers: string[]
  /** 手技・患側・全手順がすべて正しいか */
  perfect: boolean
}
