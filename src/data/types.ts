/** 症例カテゴリ */
export type Category = 'bppv' | 'peripheral' | 'central'

/** GRACE-3 のめまい分類 */
export type VestibularType = 'AVS' | 's-EVS' | 't-EVS'

/** 患側 */
export type Side = 'R' | 'L' | null

/** 診察コマンドの大分類 */
export type ActionGroup = 'history' | 'eye' | 'neuro' | 'tx'

export interface ActionDef {
  id: string
  group: ActionGroup
  label: string
  /** メニューに出すときの短い補足 */
  hint?: string
  /** 全症例共通の既定所見（症例側に定義がなければこれを返す） */
  fallback: string
}

/** 検査（画像・生理・血液） */
export interface StudyDef {
  id: string
  label: string
  hint?: string
  fallback: string
}

/** 方針 */
export interface DispositionDef {
  id: string
  label: string
  hint?: string
}

/** 治療 */
export interface TreatmentDef {
  id: string
  group: 'maneuver' | 'drug' | 'protocol' | 'advice'
  label: string
}

/** HOWTO の MRI 適応 4 条件 */
export interface ImagingCriterion {
  id: string
  question: string
}

export interface StudyResult {
  text: string
  /** この検査だけで診断が確定するか */
  diagnostic: boolean
}

export interface CaseDef {
  id: number
  title: string
  category: Category
  categoryLabel: string
  age: string
  gender: string
  /** 導入で提示する主訴（1〜2文） */
  chiefComplaint: string
  vitals: string

  /** コマンドID → 所見テキスト。未定義なら ActionDef.fallback */
  findings: Record<string, string>
  /** 中枢性を示唆する所見が返るコマンド（結果画面の赤旗可視化に使用） */
  redFlagActions: string[]

  /** 実施すべき診察（未実施で減点） */
  required: string[]
  /** 実施すると加点（必須ではない） */
  recommended: string[]
  /** 実施すると減点 */
  penalties: { id: string; points: number; reason: string }[]

  vestibularType: VestibularType

  /** HOWTO 4 条件の正解（true = 「はい」） */
  criteria: [boolean, boolean, boolean, boolean]

  /**
   * 画像検査に対する立ち位置。
   * - 'indicated'   : 撮るべき。撮らないと減点
   * - 'optional'    : 撮っても撮らなくてもよい（高齢・リスク因子ありで念のため撮るのは妥当）。減点しない
   * - 'unnecessary' : 典型的な末梢性で不要。撮ると軽く減点
   */
  imagingStance: 'indicated' | 'optional' | 'unnecessary'

  /**
   * 画像陰性のあと「末梢性めまい」として帰宅させることが許容されるか。
   * 失調がなく中枢性の可能性が高くない症例では true（帰宅が正解）。
   * 失調や中枢性所見が揃っている症例では false（帰宅は見逃しであり最悪の転帰）。
   */
  dischargeAfterNegativeOk: boolean

  /** この症例で出しておきたい検査（imagingStance が 'indicated' のとき採点に使う） */
  imagingExpected: string[]
  /** 検査ID → 結果 */
  studyResults: Record<string, StudyResult>
  /** 検査で減点されるもの */
  studyPenalties: { id: string; points: number; reason: string }[]

  /** 入院して翌日に再検した場合の所見。null なら第2日なし */
  day2: StudyResult | null

  diagnosis: {
    correct: string
    side: Side
    /** 選択肢（correct を含む） */
    options: string[]
    /** 患側を問うか */
    asksSide: boolean
  }

  treatment: {
    required: string[]
    forbidden: { id: string; points: number; reason: string }[]
  }

  disposition: {
    correct: string[]
    /** 選んではいけない方針 */
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
