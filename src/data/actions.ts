import type { ActionDef, ActionGroup, DispositionDef } from './types'

export const ACTION_GROUPS: { id: ActionGroup; label: string }[] = [
  { id: 'history', label: 'きく' },
  { id: 'eye', label: 'めをみる' },
  { id: 'neuro', label: 'しらべる' },
  { id: 'assess', label: 'みたてる' },
  { id: 'study', label: 'けんさ' },
  { id: 'tx', label: 'てあて' },
]

/**
 * 全症例共通のコマンドマスタ。
 * 症例データは「このコマンドを叩いたら何が返るか」だけを持つ。
 * 粗い診察と細かい診察を別コマンドに分けているのが要点
 * （裸眼 / Frenzel、普通歩行 / 継ぎ足歩行、顔面感覚 片側ずつ / 両側同時）。
 */
export const ACTIONS: ActionDef[] = [
  // ── きく（問診）
  { id: 'hx_onset', group: 'history', label: '発症のしかた', fallback: '「急に始まりました」と話す。' },
  { id: 'hx_duration', group: 'history', label: 'めまいの持続時間', fallback: '「どのくらいか、はっきりしません」と話す。' },
  { id: 'hx_trigger', group: 'history', label: '誘発される状況', hint: '体位・動作', fallback: '特定の誘発状況ははっきりしない。' },
  { id: 'hx_course', group: 'history', label: 'これまでの経過', hint: '反復性', fallback: '今回が初めてだと話す。' },
  { id: 'hx_assoc', group: 'history', label: '随伴症状', hint: '嘔気・頭痛・複視・しびれ', fallback: '嘔気以外の随伴症状は訴えない。' },
  { id: 'hx_ear', group: 'history', label: '耳の症状', hint: '難聴・耳鳴・耳閉感', fallback: '難聴・耳鳴・耳閉感はないと話す。' },
  { id: 'hx_past', group: 'history', label: '既往歴・リスク因子', fallback: '特記すべき既往はないと話す。' },
  { id: 'hx_device', group: 'history', label: '体内デバイスの有無', hint: 'ペースメーカーなど', fallback: '体内に金属やデバイスは入っていないと話す。' },
  { id: 'hx_meds', group: 'history', label: '内服薬', fallback: '常用薬はないと話す。' },
  { id: 'hx_social', group: 'history', label: '生活歴', hint: '喫煙・飲酒', fallback: '喫煙・飲酒の習慣はない。' },
  { id: 'hx_witness', group: 'history', label: '家族から話を聞く', fallback: '付き添いはおらず、追加の情報は得られない。' },

  // ── めをみる（眼振）
  { id: 'eye_spont', group: 'eye', label: '自発眼振（裸眼）', fallback: '座位・仰臥位とも、裸眼では明らかな眼振を認めない。' },
  { id: 'eye_frenzel', group: 'eye', label: '自発眼振（Frenzel眼鏡下）', hint: '固視を外す', fallback: 'Frenzel眼鏡下でも眼振を認めない。' },
  { id: 'eye_fixation', group: 'eye', label: '固視による眼振の変化', fallback: '固視の有無で変化する眼振はない。' },
  { id: 'eye_gaze', group: 'eye', label: '注視眼振（左右30°）', fallback: '左右30°注視で眼振を認めない。' },
  { id: 'eye_dh_r', group: 'eye', label: 'Dix-Hallpike（右）', fallback: '右Dix-Hallpikeで眼振は誘発されない。' },
  { id: 'eye_dh_l', group: 'eye', label: 'Dix-Hallpike（左）', fallback: '左Dix-Hallpikeで眼振は誘発されない。' },
  { id: 'eye_roll_r', group: 'eye', label: 'Supine Head Roll（右耳下）', fallback: '右耳下で明らかな水平眼振は誘発されない。' },
  { id: 'eye_roll_l', group: 'eye', label: 'Supine Head Roll（左耳下）', fallback: '左耳下で明らかな水平眼振は誘発されない。' },
  { id: 'eye_hit', group: 'eye', label: 'Head Impulse Test', fallback: 'HIT：陰性（補償性サッケードを認めない）。' },
  { id: 'eye_skew', group: 'eye', label: 'Test of Skew（交代遮蔽）', fallback: '交代遮蔽で垂直方向のずれを認めない。' },

  // ── しらべる（神経・全身）
  { id: 'nr_vitals', group: 'neuro', label: 'バイタルサイン', fallback: 'バイタルは安定している。' },
  { id: 'nr_cpss', group: 'neuro', label: 'CPSS', hint: '顔面・上肢・言語', fallback: 'CPSS：正常（0点）。' },
  { id: 'nr_fnf', group: 'neuro', label: '指鼻試験', fallback: '指鼻試験：左右とも正常。' },
  { id: 'nr_hks', group: 'neuro', label: '踵膝脛試験', fallback: '踵膝脛試験：左右とも正常。' },
  { id: 'nr_rapid', group: 'neuro', label: '回内回外', fallback: '回内回外運動：左右とも正常。' },
  { id: 'nr_gait', group: 'neuro', label: '起立・普通歩行', fallback: '独立歩行可能。明らかなふらつきはない。' },
  { id: 'nr_tandem', group: 'neuro', label: '継ぎ足歩行', hint: '一直線歩行', fallback: '継ぎ足歩行：可能。' },
  { id: 'nr_romberg_o', group: 'neuro', label: 'Romberg（開眼）', fallback: '開眼での立位保持は安定している。' },
  { id: 'nr_romberg_c', group: 'neuro', label: 'Romberg（閉眼）', fallback: '閉眼でも著明な動揺は認めない。' },
  { id: 'nr_onefoot', group: 'neuro', label: '片足立ち', fallback: '片足立ち：左右とも保持可能。' },
  { id: 'nr_diplopia', group: 'neuro', label: '複視・眼球運動', fallback: '眼球運動は全方向で正常。複視なし。' },
  { id: 'nr_face_alt', group: 'neuro', label: '顔面感覚（片側ずつ）', fallback: '顔面の感覚は左右とも正常。' },
  { id: 'nr_face_sim', group: 'neuro', label: '顔面感覚（両側同時刺激）', fallback: '両側同時刺激でも左右差を認めない。' },
  { id: 'nr_swallow', group: 'neuro', label: '嚥下・咽頭反射・嗄声', fallback: '嚥下は正常。咽頭反射も左右差なし。嗄声なし。' },
  { id: 'nr_horner', group: 'neuro', label: 'Horner徴候', hint: '瞳孔・眼瞼', fallback: '瞳孔不同・眼瞼下垂を認めない。' },
  { id: 'nr_hearing', group: 'neuro', label: '聴力（音叉）', fallback: '聴力は左右とも正常。' },
  { id: 'nr_limb', group: 'neuro', label: '四肢の筋力・感覚', fallback: '四肢の筋力・感覚とも正常。' },
  { id: 'nr_orthostatic', group: 'neuro', label: '起立試験（血圧）', fallback: '起立後3分の血圧低下は認めない。' },

  // ── みたてる（画面を開いて自分で判断する。所見テキストは返らない）
  { id: 'as_grace', group: 'assess', label: 'めまいのタイプを分類する', hint: 'GRACE-3', fallback: '' },
  { id: 'as_criteria', group: 'assess', label: '画像検査の適応を考える', hint: 'HOWTO 4条件', fallback: '' },

  // ── けんさ
  // 夜間ERで研修医が本当に判断すべきなのは「MRIを撮るか撮らないか」の一点に尽きる。
  { id: 'st_mri', group: 'study', label: '頭部MRIを撮る', hint: 'DWI', fallback: 'DWIで明らかな高信号域を認めない。' },

  // ── てあて
  { id: 'tx_fluid', group: 'tx', label: '輸液を開始する', fallback: '輸液を開始した。' },
  { id: 'tx_atarax', group: 'tx', label: 'アタラックスP DIV', hint: '25mg+生食50mL 15分', fallback: 'アタラックスP 25mg + 生食50mLを15分で投与した。' },
  { id: 'tx_primperan', group: 'tx', label: 'プリンペラン DIV', hint: '1A+生食50mL 15分', fallback: 'プリンペラン1A + 生食50mLを15分で投与した。' },
  // 耳石置換法はここから手技を組み立てるミニゲームに入る
  { id: 'tx_maneuver', group: 'tx', label: '耳石置換法をおこなう', hint: '手技を組み立てる', fallback: '' },
  { id: 'tx_steroid', group: 'tx', label: 'ステロイドを投与する', fallback: 'ステロイドの投与を開始した。' },
  { id: 'tx_oral', group: 'tx', label: '内服を処方する', fallback: 'めまい・嘔気に対する内服を処方した。' },
  { id: 'tx_rehab', group: 'tx', label: '前庭リハビリを指導する', fallback: '前庭リハビリテーションの方法を説明し、自宅で行うよう指導した。' },
  { id: 'tx_fall', group: 'tx', label: '転倒予防を指導する', fallback: '起床時の動作をゆっくり行うこと、手すりを使うことを指導した。' },
]

export const ACTION_MAP = new Map(ACTIONS.map((a) => [a.id, a]))

/**
 * 方針。夜間ERを想定しているため耳鼻科は選択肢に置かない。
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

/** GRACE-3 のめまい3分類 */
export const VESTIBULAR_TYPES: { id: 'AVS' | 's-EVS' | 't-EVS'; label: string; hint: string }[] = [
  { id: 'AVS', label: 'AVS', hint: '急に始まり安静時も24時間以上持続' },
  { id: 's-EVS', label: 's-EVS', hint: 'きっかけなく数分〜数時間、反復' },
  { id: 't-EVS', label: 't-EVS', hint: '体位で誘発、数秒〜数分、反復' },
]

/** 画面を開いて判断するコマンド（所見テキストを返さない） */
export const MODAL_ACTIONS = ['as_grace', 'as_criteria', 'tx_maneuver']
