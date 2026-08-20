import type { ManeuverKind } from './maneuvers'

/**
 * 眼振の動的表示の仕様。
 * 向きはすべて「患者から見た向き」で書く（cases.md の記載に合わせる）。
 * 画面は検者が患者を正面から見た図なので、描画側で左右と回旋を反転する。
 */
export interface NystagmusSpec {
  /** 速相の向きと振幅(px)。+ = 患者の右向き、- = 患者の左向き */
  horizontal?: number
  /** 速相の向きと振幅(px)。+ = 上向き（upbeat）、- = 下向き（downbeat） */
  vertical?: number
  /** 速相の回旋量(度)。+ = 患者から見て時計回り */
  torsional?: number
  /** 打つ速さ（回/秒）。0 なら眼振なし */
  frequency?: number
  /** 潜時(秒)。Dix-Hallpike陽性例で使う */
  latencySec?: number
  /** 出現から疲労して消えるまでの時間(秒)。省略すると持続性 */
  durationSec?: number
  /** 注視方向のずれ(px)。+ = 患者の右方注視 */
  gazeOffset?: number
  /** Frenzel眼鏡下の図として描く */
  frenzel?: boolean
  /** 図の下に出す一行キャプション */
  caption?: string
}

export type Category = 'bppv' | 'peripheral' | 'central'
export type VestibularType = 'AVS' | 's-EVS' | 't-EVS'
export type Side = 'R' | 'L' | null

export type ActionGroup = 'history' | 'eye' | 'neuro' | 'assess' | 'study' | 'tx'

export interface ActionDef {
  id: string
  group: ActionGroup
  label: string
  hint?: string
  /** 全症例共通の既定所見（症例側に定義がなければこれを返す） */
  fallback: string
}

export interface DispositionDef {
  id: string
  label: string
  hint?: string
}

export interface CaseDef {
  id: number
  title: string
  category: Category
  categoryLabel: string
  age: string
  gender: string
  chiefComplaint: string
  vitals: string

  /** コマンドID → 所見テキスト。未定義なら ActionDef.fallback */
  findings: Record<string, string>
  /** コマンドID → 眼振の動的表示。眼の診察コマンドで未定義なら「眼振なし」として描画 */
  nystagmus?: Record<string, NystagmusSpec>
  /** 中枢性を示唆する所見が返るコマンド（結果画面の赤旗可視化に使用） */
  redFlagActions: string[]

  required: string[]
  recommended: string[]
  /** 実施すると減点されるコマンド */
  penalties: { id: string; points: number; reason: string }[]

  vestibularType: VestibularType

  /** HOWTO 4条件の正解（true = 当てはまる） */
  criteria: [boolean, boolean, boolean, boolean]

  /**
   * MRIに対する立ち位置。
   * - 'indicated'      : 撮るべき。撮らないと減点
   * - 'optional'       : 撮っても撮らなくてもよい。減点しない
   * - 'unnecessary'    : 典型的な末梢性で不要。撮ると軽く減点
   * - 'contraindicated': 禁忌。撮ると大幅減点
   */
  mriStance: 'indicated' | 'optional' | 'unnecessary' | 'contraindicated'
  /** MRIが禁忌である理由（ペースメーカーなど）。'contraindicated' のとき必須 */
  mriContraindication?: string
  /** MRIを撮ったときに返る所見 */
  mriResult: string
  /** 入院して翌日に再検した場合の所見。null なら第2病日の展開なし */
  day2: string | null

  /**
   * 画像陰性のあと末梢性として帰宅させることが許容されるか。
   * 失調がなく中枢性の可能性が高くない症例では true。
   */
  dischargeAfterNegativeOk: boolean

  diagnosis: {
    correct: string
    side: Side
    options: string[]
    asksSide: boolean
  }

  /** 耳石置換法の正解。適応がない症例は null */
  maneuver: { kind: ManeuverKind; side: 'R' | 'L' } | null

  treatment: {
    required: string[]
    forbidden: { id: string; points: number; reason: string }[]
  }

  disposition: {
    correct: string[]
    forbidden: { id: string; points: number; reason: string }[]
  }

  endings: {
    best: string
    good: string
    bad: string
    worst: string
  }

  keyPoints: string[]
  explanation: string
  mriNote: string
}
