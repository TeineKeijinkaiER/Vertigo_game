import type { ActionDef, ActionGroup, DispositionDef, ImagingCriterion, StudyDef, TreatmentDef } from './types'

export const ACTION_GROUPS: { id: ActionGroup; label: string }[] = [
  { id: 'history', label: 'きく' },
  { id: 'eye', label: 'めをみる' },
  { id: 'neuro', label: 'しらべる' },
  { id: 'tx', label: 'てあて' },
]

/**
 * 全症例共通のコマンドマスタ。
 * 症例データは「このコマンドを叩いたら何が返るか」だけを持つ。
 * 粗い診察と細かい診察を別コマンドに分けているのが要点
 * （裸眼 / Frenzel、普通歩行 / 継ぎ足歩行、顔面感覚 片側ずつ / 両側同時、片腕 / 両上肢血圧）。
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
  { id: 'eye_skew', group: 'eye', label: 'Test of Skew（交代遮蔽）', fallback: '交代遮蔽で垂直方向の眼球のずれを認めない。' },

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
  { id: 'nr_bp_both', group: 'neuro', label: '両上肢の血圧・橈骨動脈', fallback: '両上肢の血圧に有意差なし。橈骨動脈は左右とも良好に触知。' },
  { id: 'nr_orthostatic', group: 'neuro', label: '起立試験（血圧）', fallback: '起立後3分の血圧低下は認めない。' },

  // ── てあて（診察中の対症療法）
  { id: 'tx_fluid', group: 'tx', label: '輸液を開始する', fallback: '輸液を開始した。' },
  { id: 'tx_atarax', group: 'tx', label: 'アタラックスP DIV', hint: '25mg+生食50mL 15分', fallback: 'アタラックスP 25mg + 生食50mLを15分で投与した。' },
  { id: 'tx_primperan', group: 'tx', label: 'プリンペラン DIV', hint: '1A+生食50mL 15分', fallback: 'プリンペラン1A + 生食50mLを15分で投与した。' },
]

export const ACTION_MAP = new Map(ACTIONS.map((a) => [a.id, a]))

/** HOWTO「画像検査の適応」の4条件 */
export const IMAGING_CRITERIA: ImagingCriterion[] = [
  { id: 'c1', question: 'リスクファクターのある症例の突然発症である' },
  { id: 'c2', question: '眼振が末梢性として矛盾する（方向・固視による減弱など）' },
  { id: 'c3', question: '中枢性を疑わせる随伴症状や神経所見がある' },
  { id: 'c4', question: '起立時・歩行時のふらつきが強い' },
]

export const STUDIES: StudyDef[] = [
  { id: 'st_blood', label: '血液検査', fallback: '特記すべき異常を認めない。' },
  { id: 'st_ecg', label: '心電図', fallback: '洞調律。ST-T変化なし。' },
  { id: 'st_ct', label: '頭部CT', fallback: '頭蓋内出血を認めない。明らかな低吸収域も指摘できない。' },
  { id: 'st_mri', label: '頭部MRI（DWI）', fallback: 'DWIで明らかな高信号域を認めない。' },
  { id: 'st_mra', label: 'MRA（頭蓋内血管）', fallback: '主幹動脈に明らかな狭窄・閉塞を認めない。' },
  { id: 'st_cta', label: 'CTA（頸部〜頭蓋内）', fallback: '解離所見・有意狭窄を認めない。' },
  { id: 'st_audio', label: '純音聴力検査', fallback: '聴力は正常範囲。' },
  { id: 'st_echo', label: '心エコー', fallback: '明らかな塞栓源を指摘できない。' },
]

export const STUDY_MAP = new Map(STUDIES.map((s) => [s.id, s]))

export const DISPOSITIONS: DispositionDef[] = [
  { id: 'dp_home', label: '帰宅（内服処方）', hint: 'セファドール・五苓散・トラベルミン' },
  { id: 'dp_ent', label: '耳鼻科へ紹介（外来）' },
  { id: 'dp_observe', label: '経過観察入院', hint: '翌日にMRIを再検する' },
  { id: 'dp_admit', label: '緊急入院・脳卒中プロトコル' },
  { id: 'dp_consult', label: '神経内科・脳神経外科に緊急コンサルト' },
]

export const DISPOSITION_MAP = new Map(DISPOSITIONS.map((d) => [d.id, d]))

export const TREATMENTS: TreatmentDef[] = [
  { id: 'tr_epley_r', group: 'maneuver', label: 'Epley法（右）' },
  { id: 'tr_epley_l', group: 'maneuver', label: 'Epley法（左）' },
  { id: 'tr_lempert_r', group: 'maneuver', label: 'Lempert法（右）' },
  { id: 'tr_lempert_l', group: 'maneuver', label: 'Lempert法（左）' },
  { id: 'tr_gufoni_geo_r', group: 'maneuver', label: 'Gufoni法 向地性（右）' },
  { id: 'tr_gufoni_geo_l', group: 'maneuver', label: 'Gufoni法 向地性（左）' },
  { id: 'tr_gufoni_apo_r', group: 'maneuver', label: 'Gufoni法 背地性（右）' },
  { id: 'tr_gufoni_apo_l', group: 'maneuver', label: 'Gufoni法 背地性（左）' },
  { id: 'tr_steroid', group: 'drug', label: 'ステロイド（PSL 1mg/kg）' },
  { id: 'tr_antiplatelet', group: 'drug', label: '抗血小板療法（アスピリン100mg/日）' },
  { id: 'tr_anticoag', group: 'drug', label: '抗凝固療法の開始・再開' },
  { id: 'tr_triptan', group: 'drug', label: 'トリプタン製剤' },
  { id: 'tr_isobide', group: 'drug', label: 'イソバイド・ベタヒスチン' },
  { id: 'tr_home_rx', group: 'drug', label: '帰宅処方（セファドール・五苓散・トラベルミン）' },
  { id: 'tr_stroke_protocol', group: 'protocol', label: '脳卒中プロトコルを起動' },
  { id: 'tr_swallow_eval', group: 'protocol', label: '嚥下評価・誤嚥予防' },
  { id: 'tr_bp_control', group: 'protocol', label: '血圧・血糖・脂質の管理' },
  { id: 'tr_vestibular_rehab', group: 'advice', label: '前庭リハビリを指導' },
  { id: 'tr_brandt_daroff', group: 'advice', label: 'Brandt-Daroff運動を指導' },
  { id: 'tr_fall_prevention', group: 'advice', label: '転倒予防を指導' },
  { id: 'tr_smoking', group: 'advice', label: '禁煙指導' },
]

export const TREATMENT_MAP = new Map(TREATMENTS.map((t) => [t.id, t]))
