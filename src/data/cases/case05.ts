import type { CaseDef } from '../types'

/**
 * 症例5：水平半規管クプラ結石症（背地性型・左）
 *
 * 背地性眼振は中枢性でも出るため、末梢性と決めつけられない。
 * 患側判定も向地性と逆で、眼振の「弱い」側が患側になる。
 * 治療は Gufoni 法（背地性型）＝患側に倒れて顔を上に向ける。
 */
export const case05: CaseDef = {
  id: 5,
  title: '水平半規管クプラ結石症（背地性型・左）',
  category: 'bppv',
  categoryLabel: 'BPPV',
  age: '58歳',
  gender: '女性',
  chiefComplaint:
    '「一昨日の夜、寝返りを打ってから、寝返りのたびにぐるぐる回るようになりました。左でも右でも回ります。1分くらい続いて、なかなか治まりません」',
  vitals: '血圧 138/82　脈拍 74・整　SpO2 98%（room air）　体温 36.5℃　意識清明',

  findings: {
    hx_course:
      '2日前の就寝時、左向きに寝返りを打った際に回転性めまいが出現。以降、仰臥位から左右いずれに頭位変換してもめまいが誘発される。1回の発作は1分程度で、BPPVにしてはやや長い。じっとしていればめまいはない。',
    hx_assoc: '嘔気は中等度。嘔吐なし。頭痛・複視・しびれ・脱力・構音障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past: '高血圧症。片頭痛（月1回程度）。喫煙歴なし。体内にデバイスは入っていない。',
    hx_meds: 'バルサルタン 80mg/日。片頭痛の頓服薬は所持しているが今回は服用していない。',

    eye_spont: '座位・仰臥位とも、自然頭位では眼振を認めない。',
    eye_frenzel: 'Frenzel眼鏡下でも自発眼振を認めない。',
    eye_fixation: '固視の有無で変化する眼振はない。',
    eye_gaze: '左右30°注視で眼振を認めない。',
    eye_dh_r: '右Dix-Hallpike：上向き回旋眼振は誘発されない。後半規管由来の所見はない。',
    eye_dh_l: '左Dix-Hallpike：上向き回旋眼振は誘発されない。',
    eye_roll_r:
      '右耳下（右側臥位）：強い水平背地性眼振（患者から見て左向き＝上になった側へ向かう）を誘発。持続は40〜60秒と長く、疲労性に乏しい。',
    eye_roll_l:
      '左耳下（左側臥位）：水平背地性眼振（患者から見て右向き）を誘発するが、右耳下に比べて明らかに弱い。',
    eye_hit: 'HIT：陰性（補償性サッケードなし）。……本例は体位で誘発される短時間のめまい（t-EVS）であり、HITは解釈できない。',
    eye_skew: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。背地性眼振に対して中枢性を否定する材料になる。',

    ex_cpss: 'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。',
    ex_ataxia: 'Grade 0：発作間欠期は歩行失調を認めない。独歩可能でふらつきもない。',
    ex_fnf: '指鼻試験：左右とも正常。',
    ex_hks: '踵膝脛試験：左右とも正常。',
    ex_rapid: '回内回外運動：左右とも正常。',
    ex_diplopia: '眼球運動は全方向で正常。複視なし。',
    ex_face: '顔面の感覚は左右差なし。両側同時に触れても差を認めない。',
    ex_swallow: '水を飲ませても咳込みなし。軟口蓋の挙上は左右対称。「あー」と発声させても嗄声はない。',
    ex_horner: '瞳孔不同なし、眼瞼下垂なし、顔面の発汗低下もない。Horner徴候：陰性。',
    ex_hearing: '耳元で指をこすった音を左右とも同様に聴取できる。聴力低下はない。',
    ex_limb: '四肢に脱力はなく、感覚も正常。',

    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。嘔気が和らいだ。',
  },

  nystagmus: {
    eye_frenzel: { frenzel: true, caption: 'Frenzel眼鏡下でも自発眼振なし' },
    eye_roll_r: {
      // 右耳下で左向き（＝上になった側へ向かう）背地性眼振。健側で強い
      horizontal: -11,
      frequency: 3,
      durationSec: 50,
      caption: '右耳下：強い水平背地性眼振（患者から見て左向き）。持続が長く疲労しにくい',
    },
    eye_roll_l: {
      horizontal: 5,
      frequency: 2.6,
      durationSec: 45,
      caption: '左耳下：水平背地性眼振（右向き）。右耳下より明らかに弱い ＝ 左が患側',
    },
  },

  redFlagActions: [],

  required: [
    'hx_course',
    'hx_assoc',
    'eye_spont',
    'eye_dh_r',
    'eye_dh_l',
    'eye_roll_r',
    'eye_roll_l',
    'eye_skew',
    'ex_cpss',
    'ex_ataxia',
    'as_dx',
    'im_criteria',
  ],
  recommended: ['hx_past', 'hx_meds', 'eye_frenzel', 'eye_gaze', 'ex_fnf', 'ex_hearing'],
  penalties: [
    { id: 'eye_hit', points: -3, reason: 'Head Impulse TestはAVSでのみ意味を持つ。t-EVSに実施しても解釈できない' },
  ],

  vestibularType: 't-EVS',
  subtype: 'sub_hc_bppv',
  ataxiaGrade: 0,

  // 背地性眼振そのものが「末梢性として完全には矛盾しない、とは言い切れない」所見。
  // 中枢性を意識させるため2番目を該当とする。
  criteria: [false, true, false, false],

  // 背地性眼振では中枢性の除外が必要。撮らなくてもよいが、撮る判断も妥当
  imagingIndicated: false,
  imagingOptional: true,
  imagingPreferred: 'mri',
  ctResult: '頭部CT：頭蓋内出血なし。後頭蓋窩はアーチファクトが強く評価困難。',
  mriResult: 'DWIで明らかな高信号域を認めない。後頭蓋窩にも急性期梗塞を示唆する所見なし。',
  day2: null,
  dischargeAfterNegativeOk: true,

  diagnosis: {
    correct: '水平半規管BPPV（背地性・クプラ結石）',
    side: 'L',
    asksSide: true,
  },

  // 背地性型は Gufoni法（患側に倒れて顔を上向き）
  maneuver: { kind: 'gufoni_apo', side: 'L' },


  disposition: {
    correct: ['dp_home'],
    forbidden: [
      { id: 'dp_admit', points: -5, reason: '神経所見も失調もなく、入院は不要（医療資源の適正利用）' },
      { id: 'dp_consult', points: -8, reason: '中枢性を示す所見はなく、脳神経外科コンサルトは不要' },
    ],
  },

  endings: {
    best:
      'Gufoni法（背地性）を左に施行した。患側の左へ倒し、鼻を天井に向けて保持する。\n\nHead Rollを再検すると、背地性だった眼振が向地性に変わっていた。クプラから耳石が外れたのである。続けて向地性型の手技を行うと、めまいは消えた。\n\n患者はその場で寝返りを打ってみせ、何も起きないことを確かめて帰っていった。',
    good:
      '診断は正しかったが、耳石置換法まで踏み込まず経過観察となった。\n\nクプラ結石症は向地性型より自然軽快が遅く、症状は2週間ほど続いた。',
    bad:
      '診断は違っていたが、重篤な事態には至らなかった。\n\n後日、耳鼻科でHead Rollを行い左のクプラ結石症と診断。Gufoni法（背地性）で軽快した。',
    worst:
      '背地性眼振を前に判断が定まらないまま、原因は分からず帰された。\n\n数日後、近医で「耳石が半規管の壁にくっついています」と説明を受け、その場で治療されて治った。\n\n──Head Rollで眼振の向きと強さを左右で比べる。それだけで、患側は分かったはずだった。',
  },

  keyPoints: [
    'Head Rollで背地性眼振（上になった側へ向かう）＝ クプラ結石症',
    '背地性の患側判定は向地性と逆。眼振が「弱い」側が患側',
    '背地性は持続が長く（40〜60秒）、疲労性に乏しい',
    '治療はGufoni法（背地性）＝ 患側に倒れて顔を天井へ向ける',
    '背地性水平眼振は中枢性でも出る。神経所見と失調の確認を省略しない',
  ],
  explanation:
    'クプラ結石症は、耳石が半規管腔を遊離するのではなくクプラに付着した状態です。このため背地性眼振となり、向地性型より持続が長く疲労しにくくなります。患側判定は逆で、患側を下にしたときの眼振が弱くなります。本例は左耳下が弱く、左が患側です。\n\nGufoni法（背地性）は患側へ倒れて顔を上に向け、クプラから耳石を外して向地性型に変えることを狙います。向地性に変われば成功で、続けて向地性型の手技を行います。',
  mriNote:
    '背地性眼振は末梢性と決めつけられず、「眼振が末梢性として矛盾する」に該当しうるため、画像を考慮する判断は妥当です。ただし神経所見陰性・失調Grade 0なら、撮らずに耳石置換法へ進むのも誤りではありません。',
}
