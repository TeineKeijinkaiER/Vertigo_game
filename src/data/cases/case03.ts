import type { CaseDef } from '../types'

/**
 * 症例3：水平半規管BPPV（左・向地性型）
 *
 * 症例4の左右対称形。向地性型では眼振の強い側が患側になる。
 * 治療は Lempert 法（健側方向へ360°）または Gufoni 法（向地性）。
 */
export const case03: CaseDef = {
  id: 3,
  title: '水平半規管BPPV（左・向地性型）',
  category: 'bppv',
  categoryLabel: 'BPPV',
  age: '55歳',
  gender: '男性',
  chiefComplaint:
    '「昨日の夜、寝返りを打った瞬間にぐるぐる回りました。右を向いても左を向いても回りますが、左を向いたときのほうがひどいです。30秒くらいで治まります」',
  vitals: '血圧 134/80　脈拍 70・整　SpO2 98%（room air）　体温 36.4℃　意識清明',

  findings: {
    hx_course:
      '昨夜、寝返りを打った際に回転性めまいが出現。左右どちらに寝返っても誘発されるが、左を向いたときのほうが強い。1回のめまいは30〜40秒で消える。同様のめまいは初めてで、今朝までに数回繰り返している。',
    hx_assoc: '嘔気は軽度。嘔吐なし。頭痛・複視・しびれ・脱力・構音障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past: '脂質異常症。1か月前に左の中耳炎を治療し、治癒している。喫煙歴なし。体内にデバイスは入っていない。',
    hx_meds: 'アトルバスタチン 10mg/日。抗凝固薬は内服していない。',

    eye_spont: '座位・仰臥位とも、自然頭位では眼振を認めない。',
    eye_frenzel: 'Frenzel眼鏡下でも自発眼振を認めない。',
    eye_fixation: '固視の有無で変化する眼振はない。',
    eye_gaze: '左右30°注視で眼振を認めない。',
    eye_dh_r: '右Dix-Hallpike：上向き回旋眼振は誘発されない。後半規管由来の所見はない。',
    eye_dh_l: '左Dix-Hallpike：上向き回旋眼振は誘発されない。',
    eye_roll_r:
      '右耳下（右側臥位）：水平向地性眼振（患者から見て右向き）が誘発されるが、左耳下に比べて振幅・速度とも明らかに弱い。',
    eye_roll_l:
      '左耳下（左側臥位）：強い水平向地性眼振（患者から見て左向き＝下になった側へ向かう）が誘発された。約30秒で疲労し消退。強い回転性めまいを伴う。',
    eye_hit: 'HIT：陰性（補償性サッケードなし）。……本例は体位で誘発される短時間のめまい（t-EVS）であり、HITは解釈できない。',
    eye_skew: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。',

    ex_cpss: 'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。',
    ex_ataxia: 'Grade 0：発作間欠期は歩行失調を認めない。独歩可能でふらつきもない。',
    ex_fnf: '指鼻試験：左右とも正常。',
    ex_hks: '踵膝脛試験：左右とも正常。',
    ex_rapid: '回内回外運動：左右とも正常。',
    ex_diplopia: '眼球運動は全方向で正常。複視なし。',
    ex_face: '顔面の感覚は左右差なし。両側同時に触れても差を認めない。',
    ex_swallow: '水を飲ませても咳込みなし。軟口蓋の挙上は左右対称。「あー」と発声させても嗄声はない。',
    ex_horner: '瞳孔不同なし、眼瞼下垂なし、顔面の発汗低下もない。Horner徴候：陰性。',
    ex_hearing: '耳元で指をこすった音を左右とも同様に聴取できる。中耳炎後の左耳も含めて聴力低下はない。',
    ex_limb: '四肢に脱力はなく、感覚も正常。',

    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。軽度の嘔気は和らいだ。',
  },

  nystagmus: {
    eye_frenzel: { frenzel: true, caption: 'Frenzel眼鏡下でも自発眼振なし' },
    eye_roll_l: {
      // 左耳下で左向き（＝下になった側へ向かう）向地性眼振。患側で強い
      horizontal: -11,
      frequency: 3.5,
      durationSec: 30,
      caption: '左耳下：強い水平向地性眼振（患者から見て左向き）',
    },
    eye_roll_r: {
      horizontal: 5,
      frequency: 3,
      durationSec: 22,
      caption: '右耳下：水平向地性眼振（右向き）。左耳下より明らかに弱い',
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
  subtype: 'sub_hc_geo',
  ataxiaGrade: 0,

  criteria: [false, false, false, false],

  imagingIndicated: false,
  imagingPreferred: null,
  ctResult: '頭部CT：頭蓋内出血なし。……そもそもこの所見で画像を撮る必要はなかった。',
  mriResult: 'DWIで明らかな高信号域を認めない。……そもそもこの所見でMRIを撮る必要はなかった。',
  day2: null,
  dischargeAfterNegativeOk: true,

  diagnosis: {
    correct: '水平半規管BPPV（向地性）',
    side: 'L',
  },

  maneuver: { kind: 'lempert', side: 'L' },
  maneuverAlternatives: ['gufoni_geo'],

  disposition: {
    correct: ['dp_home'],
    forbidden: [
      { id: 'dp_admit', points: -5, reason: '典型的なBPPVで入院は不要（医療資源の適正利用）' },
      { id: 'dp_consult', points: -8, reason: '典型的なBPPVに脳神経外科コンサルトは不要' },
    ],
  },

  endings: {
    best:
      '耳石置換法を終えると、めまいはぴたりと止まった。Head Rollを再検しても眼振は誘発されない。\n\n「これで安心して寝返りが打てます」\n\n中耳炎後の耳石剥離が誘因になり得ることを説明し、耳鼻科での再評価を勧めて帰宅とした。',
    good:
      '診断は正しかったが、耳石置換法まで踏み込まず経過観察となった。\n\n向地性型は自然軽快しやすく、症状は1週間ほどで治まったが、その間は寝返りのたびにめまいに耐えることになった。',
    bad:
      '診断は違っていたが、重篤な事態には至らなかった。\n\n後日、耳鼻科でHead Rollを行い左水平半規管BPPVと診断。1回の耳石置換法で治癒した。',
    worst:
      'Dix-Hallpikeが陰性だったところで診察を切り上げ、「原因不明のめまい」として帰宅させた。\n\n数日後、近医でHead Rollを行い、その場で治療されて治った。\n\n──Dix-Hallpike陰性は、BPPVの否定ではない。Head Rollまで行ったか。',
  },

  keyPoints: [
    '仰臥位での寝返り（水平面の動き）で誘発され、起き上がりでは出にくい ＝ 水平半規管型',
    'Dix-Hallpike陰性でもBPPVは否定できない。必ずHead Rollまで行う',
    'Head Rollで水平向地性眼振 ＝ 水平半規管BPPV（カナリシウム型）',
    '向地性では眼振の強い側が患側。本例は左耳下で強く、左が患側',
    '治療はLempert法（健側方向へ360°）またはGufoni法（健側へ倒れ顔を下向き）',
    '中耳炎や頭部外傷のあとは耳石が剥離しやすく、BPPVの誘因になり得る',
  ],
  explanation:
    '水平半規管は仰臥位でほぼ水平に寝ているため、寝返り（水平面の動き）で誘発されます。左右どちらの頭位でもめまいが出るのも特徴で、起き上がりや頭後屈が主体なら後半規管を疑います。Dix-Hallpikeが陰性でも、Head Rollを行わなければ拾えません。\n\n向地性眼振は半規管腔内に遊離した耳石（カナリシウム型）によるもので、患側を下にしたときに眼振が強くなります。本例は左耳下で強く、左が患側です。治療はLempert法（仰臥位から健側方向へ90°ずつ、各30〜60秒保持で270〜360°）またはGufoni法（向地性）。どちらでも構いません。',
  mriNote: '典型的なt-EVSで、4条件のいずれにも該当しません。画像は不要です。',
}
