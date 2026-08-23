import type { ActionDef, ActionGroup, DispositionDef } from './types'

export const ACTION_GROUPS: { id: ActionGroup; label: string }[] = [
  { id: 'history', label: 'きく' },
  { id: 'eye', label: 'めをみる' },
  { id: 'exam', label: 'しんさつ' },
  { id: 'imaging', label: 'がぞうけんさ' },
  { id: 'assess', label: 'かんべつ' },
  { id: 'tx', label: 'てあて' },
]

/**
 * 全症例共通のコマンドマスタ。
 * 症例データは「このコマンドを叩いたら何が返るか」だけを持つ。
 *
 * 問診はまとめて4項目に絞った。研修医に考えさせたいのは眼振と失調であり、
 * 問診の刻み方で迷わせるのは目的ではない。
 */
export const ACTIONS: ActionDef[] = [
  // ── きく（問診）
  {
    id: 'hx_course',
    group: 'history',
    label: 'めまいの経過',
    hint: '発症・持続時間・誘発・反復',
    fallback: '「急に始まりました」と話すが、持続時間や誘発状況ははっきりしない。',
  },
  {
    id: 'hx_assoc',
    group: 'history',
    label: '随伴症状',
    hint: '嘔気・頭痛・耳症状・神経症状',
    fallback: '嘔気以外の随伴症状はない。難聴・耳鳴・耳閉感もない。',
  },
  {
    id: 'hx_past',
    group: 'history',
    label: '既往歴・リスク因子',
    hint: '喫煙・体内デバイスを含む',
    fallback: '特記すべき既往はない。喫煙歴なし。体内に金属やデバイスは入っていない。',
  },
  { id: 'hx_meds', group: 'history', label: '内服薬', fallback: '常用薬はない。' },

  // ── めをみる（眼振）
  { id: 'eye_spont', group: 'eye', label: '自発眼振（裸眼）', fallback: '座位・仰臥位とも、裸眼では明らかな眼振を認めない。' },
  {
    id: 'eye_frenzel',
    group: 'eye',
    label: '自発眼振（Frenzel眼鏡下）',
    hint: '固視を外す',
    fallback: 'Frenzel眼鏡下でも眼振を認めない。',
  },
  { id: 'eye_fixation', group: 'eye', label: '固視による眼振の変化', fallback: '固視の有無で変化する眼振はない。' },
  { id: 'eye_gaze', group: 'eye', label: '注視眼振（左右30°）', fallback: '左右30°注視で眼振を認めない。' },
  { id: 'eye_dh_r', group: 'eye', label: 'Dix-Hallpike（右）', fallback: '右Dix-Hallpikeで眼振は誘発されない。' },
  { id: 'eye_dh_l', group: 'eye', label: 'Dix-Hallpike（左）', fallback: '左Dix-Hallpikeで眼振は誘発されない。' },
  { id: 'eye_roll_r', group: 'eye', label: 'Supine Head Roll（右耳下）', fallback: '右耳下で明らかな水平眼振は誘発されない。' },
  { id: 'eye_roll_l', group: 'eye', label: 'Supine Head Roll（左耳下）', fallback: '左耳下で明らかな水平眼振は誘発されない。' },
  { id: 'eye_hit', group: 'eye', label: 'Head Impulse Test', fallback: 'HIT：陰性（補償性サッケードを認めない）。' },
  { id: 'eye_skew', group: 'eye', label: 'Test of Skew（交代遮蔽）', fallback: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。' },

  // ── しんさつ（神経・全身）
  {
    id: 'ex_cpss',
    group: 'exam',
    label: 'CPSS',
    hint: 'Barré徴候・口角下垂・構音障害',
    fallback: 'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。',
  },
  {
    id: 'ex_ataxia',
    group: 'exam',
    label: '起立・歩行（失調グレード）',
    hint: 'Grade 0〜3',
    fallback: 'Grade 0：歩行失調を認めない。独歩可能で、ふらつきもない。',
  },
  { id: 'ex_fnf', group: 'exam', label: '指鼻試験', fallback: '指鼻試験：左右とも正常。' },
  { id: 'ex_hks', group: 'exam', label: '踵膝脛試験', fallback: '踵膝脛試験：左右とも正常。' },
  { id: 'ex_rapid', group: 'exam', label: '回内回外', fallback: '回内回外運動：左右とも正常。' },
  { id: 'ex_diplopia', group: 'exam', label: '複視・眼球運動', fallback: '眼球運動は全方向で正常。複視なし。' },
  {
    id: 'ex_face',
    group: 'exam',
    label: '顔面の感覚',
    hint: '両側同時に触って左右差をみる',
    fallback: '顔面の感覚は左右差なし。両側同時刺激でも差を認めない。',
  },
  {
    id: 'ex_swallow',
    group: 'exam',
    label: '嚥下・発声',
    hint: '水飲み・軟口蓋の挙上・嗄声',
    fallback: '水を飲ませても咳込みなし。軟口蓋の挙上は左右対称。「あー」と発声させても嗄声はない。',
  },
  {
    id: 'ex_horner',
    group: 'exam',
    label: 'Horner徴候',
    hint: '縮瞳・眼瞼下垂・顔面の発汗低下',
    fallback: '瞳孔不同なし、眼瞼下垂なし、顔面の発汗低下もない。Horner徴候：陰性。',
  },
  {
    id: 'ex_hearing',
    group: 'exam',
    label: '聴力',
    hint: '指のこすり音',
    fallback: '耳元で指をこすった音を左右とも同様に聴取できる。聴力低下はない。',
  },
  { id: 'ex_limb', group: 'exam', label: '四肢の脱力・感覚', fallback: '四肢に脱力はなく、感覚も正常。' },

  // ── がぞうけんさ
  {
    id: 'im_criteria',
    group: 'imaging',
    label: '画像検査の適応を考える',
    hint: 'HOWTO 4条件',
    fallback: '',
  },
  { id: 'im_ct', group: 'imaging', label: '頭部CTを撮る', fallback: '頭蓋内出血を認めない。明らかな低吸収域も指摘できない。' },
  { id: 'im_mri', group: 'imaging', label: '頭部MRIを撮る', hint: 'DWI', fallback: 'DWIで明らかな高信号域を認めない。' },

  // ── かんべつ（分類 → 疾患名の順に絞る）
  { id: 'as_dx', group: 'assess', label: 'めまいを分類する', hint: 'GRACE-3', fallback: '' },

  // ── てあて
  {
    id: 'tx_atarax',
    group: 'tx',
    label: 'アタラックスP DIV',
    hint: '1A（25mg）+生食50mL 15分',
    fallback: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。',
  },
  {
    id: 'tx_primperan',
    group: 'tx',
    label: 'プリンペラン DIV',
    hint: '1A（10mg）+生食50mL 15分',
    fallback: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。',
  },
  { id: 'tx_maneuver', group: 'tx', label: '耳石置換法をおこなう', hint: '手技を組み立てる', fallback: '' },
]

export const ACTION_MAP = new Map(ACTIONS.map((a) => [a.id, a]))

/** 画面を開いて判断するコマンド（所見テキストを返さない） */
export const MODAL_ACTIONS = ['as_dx', 'im_criteria', 'tx_maneuver']

/**
 * 方針。時間外の救急外来を想定しているため、耳鼻科は選択肢に置かない。
 */
export const DISPOSITIONS: DispositionDef[] = [
  { id: 'dp_home', label: '帰宅させる', hint: '内服処方・翌日以降に外来' },
  { id: 'dp_admit', label: '入院させる', hint: '経過観察・翌日に再検' },
  { id: 'dp_consult', label: '脳神経外科にコンサルト', hint: '緊急' },
]

export const DISPOSITION_MAP = new Map(DISPOSITIONS.map((d) => [d.id, d]))

/** HOWTO「画像検査の適応」の4条件。当てはまるものを選ばせる */
export const IMAGING_CRITERIA = [
  'リスクファクターのある症例の突然発症である',
  '眼振が末梢性として矛盾する（方向・固視による減弱など）',
  '中枢性を疑わせる随伴症状や神経所見がある',
  '起立時・歩行時のふらつきが強い',
]

/** 失調のグレード（起立歩行での評価） */
export const ATAXIA_GRADES = [
  { grade: 0, label: 'Grade 0', desc: '歩行失調なし' },
  { grade: 1, label: 'Grade 1', desc: 'ふらつくが独歩可能' },
  { grade: 2, label: 'Grade 2', desc: '立位で高度のふらつき、または支持なしでは歩けない' },
  { grade: 3, label: 'Grade 3', desc: '支持なしでは立位保持不能' },
]

export const ATAXIA_NOTE =
  'Grade 2以上は脳卒中に対して感度93%・特異度61%、Grade 3は感度67%・特異度100%。起立歩行は指鼻試験より感度が高い。'

/** GRACE-3 のめまい3分類。どれにも当てはまらないという選択肢も用意する */
export type VestibularChoice = 'AVS' | 's-EVS' | 't-EVS' | 'none'

export const VESTIBULAR_TYPES: { id: VestibularChoice; label: string; hint: string }[] = [
  { id: 'AVS', label: 'AVS', hint: '急に始まり安静時も24時間以上持続' },
  { id: 's-EVS', label: 's-EVS', hint: 'きっかけなく数分〜数時間、反復' },
  { id: 't-EVS', label: 't-EVS', hint: '体位で誘発、数秒〜数分、反復' },
  { id: 'none', label: 'どれにも当てはまらない', hint: '' },
]

/** 分類を選んだあとに進む、より細かい鑑別 */
export const SUBTYPES: Record<Exclude<VestibularChoice, 'none'>, { id: string; label: string; hint?: string }[]> = {
  AVS: [
    { id: 'sub_vn', label: '前庭神経炎', hint: 'HIT陽性・方向不変・Skew陰性' },
    { id: 'sub_stroke', label: '脳卒中（小脳・脳幹）', hint: 'HIT陰性・方向可変・失調' },
    { id: 'sub_ssnhl', label: '突発性難聴に伴うめまい', hint: '難聴を伴う' },
  ],
  's-EVS': [
    { id: 'sub_meniere', label: 'メニエール病', hint: '20分〜数時間・低音感音難聴' },
    { id: 'sub_vm', label: '前庭性片頭痛', hint: '片頭痛既往・光音過敏' },
    { id: 'sub_tia', label: '椎骨脳底動脈TIA', hint: '血管リスク・発作間欠期は正常' },
  ],
  't-EVS': [
    { id: 'sub_pc_bppv', label: '後半規管BPPV', hint: 'Dix-Hallpike陽性' },
    { id: 'sub_hc_geo', label: '水平半規管BPPV（向地性）', hint: 'Head Roll陽性・強い側が患側' },
    { id: 'sub_hc_apo', label: '水平半規管BPPV（背地性）', hint: 'クプラ結石・弱い側が患側' },
  ],
}

/**
 * 最終診断の選択肢。症例ごとの4択ではなく、全症例の鑑別を並べたマスタから選ばせる。
 * 見出しごとに分けて表示する。
 */
export const ALL_DIAGNOSES: { group: string; items: string[] }[] = [
  {
    group: 'BPPV（t-EVS）',
    items: ['後半規管BPPV', '水平半規管BPPV（向地性）', '水平半規管BPPV（背地性・クプラ結石）'],
  },
  {
    group: '末梢性',
    items: ['前庭神経炎', 'メニエール病', '突発性難聴に伴うめまい', '末梢性前庭障害（軽度）'],
  },
  {
    group: '中枢性',
    items: ['小脳梗塞（PICA領域）', '小脳出血', '延髄外側症候群（Wallenberg）', '椎骨脳底動脈TIA'],
  },
  {
    group: 'その他',
    items: ['前庭性片頭痛'],
  },
]

export const SUBTYPE_LABEL = new Map(
  Object.values(SUBTYPES)
    .flat()
    .map((s) => [s.id, s.label]),
)
