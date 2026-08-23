import type { CaseDef } from '../types'

/**
 * 症例2：後半規管BPPV（左）
 *
 * 症例1の左右対称形。美容院のシャンプー台という典型的な誘発シチュエーションを聴き出せるか。
 * 左Dix-Hallpikeでの反時計回り（患者から見て）上向き回旋眼振＝左後半規管。
 */
export const case02: CaseDef = {
  id: 2,
  title: '後半規管BPPV（左）',
  category: 'bppv',
  categoryLabel: 'BPPV',
  age: '48歳',
  gender: '女性',
  chiefComplaint:
    '「3日前、美容院で髪を洗ってもらっているときに、急に天井が回りました。それからは寝るときや上を向くたびに回ります。1分もしないで治まるんですが」',
  vitals: '血圧 128/78　脈拍 72・整　SpO2 99%（room air）　体温 36.5℃　意識清明',

  findings: {
    hx_course:
      '3日前、美容院のシャンプー台で後頭部を下げた姿勢をとった際に回転性めまいが出現。以降、仰臥位になるとき、頭を後ろに反らすときに誘発される。1回のめまいは1分以内で消える。同様のめまいは初めて。',
    hx_assoc: '嘔気は中等度。嘔吐なし。頭痛・複視・しびれ・脱力・構音障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past: '2型糖尿病。骨粗鬆症。BPPVの既往はない。喫煙歴なし。体内にデバイスは入っていない。',
    hx_meds: 'メトホルミン 500mg/日、アレンドロン酸 35mg/週。抗凝固薬は内服していない。',

    eye_spont: '座位・仰臥位とも、自然頭位では眼振を認めない。',
    eye_frenzel: 'Frenzel眼鏡下（固視を外した状態）でも自発眼振を認めない。',
    eye_fixation: '固視の有無で変化する眼振はない。',
    eye_gaze: '左右30°注視で眼振を認めない。',
    eye_dh_r: '右Dix-Hallpike：陰性。眼振は誘発されない。',
    eye_dh_l:
      '左Dix-Hallpike：3秒ほどの潜時をおいて上向き回旋眼振（患者から見て反時計回り）が出現。強い回転性めまいを伴い、約20秒で疲労し消退した。再度施行すると眼振は減弱する。',
    eye_roll_r: '右耳下（右側臥位）：明らかな水平眼振は誘発されない。',
    eye_roll_l: '左耳下（左側臥位）：明らかな水平眼振は誘発されない。',
    eye_hit: 'HIT：陰性（補償性サッケードなし）。……本例は体位で誘発される短時間のめまい（t-EVS）であり、HITは解釈できない。',
    eye_skew: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。',

    ex_cpss: 'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。',
    ex_ataxia: 'Grade 0：発作間欠期は歩行失調を認めない。ふらつきなく独歩可能。',
    ex_fnf: '指鼻試験：左右とも正常。',
    ex_hks: '踵膝脛試験：左右とも正常。',
    ex_rapid: '回内回外運動：左右とも正常。',
    ex_diplopia: '眼球運動は全方向で正常。複視なし。',
    ex_face: '顔面の感覚は左右差なし。両側同時に触れても差を認めない。',
    ex_swallow: '水を飲ませても咳込みなし。軟口蓋の挙上は左右対称。「あー」と発声させても嗄声はない。',
    ex_horner: '瞳孔不同なし、眼瞼下垂なし、顔面の発汗低下もない。Horner徴候：陰性。',
    ex_hearing: '耳元で指をこすった音を左右とも同様に聴取できる。聴力低下はない。',
    ex_limb: '四肢に脱力はなく、感覚も正常。',

    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。……ただし本例のめまいは1分以内に自然に消える。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。嘔気が和らいだ。',
  },

  nystagmus: {
    eye_frenzel: { frenzel: true, caption: 'Frenzel眼鏡下でも眼振なし' },
    eye_dh_l: {
      // 上向き＋患者から見て反時計回りの回旋。潜時3秒、約20秒で疲労
      vertical: 5,
      torsional: -14,
      frequency: 3,
      latencySec: 3,
      durationSec: 20,
      caption: '左Dix-Hallpike：潜時のある上向き回旋眼振（患者から見て反時計回り）',
    },
  },

  redFlagActions: [],

  required: [
    'hx_course',
    'hx_assoc',
    'eye_spont',
    'eye_gaze',
    'eye_dh_r',
    'eye_dh_l',
    'eye_roll_r',
    'eye_roll_l',
    'ex_cpss',
    'ex_ataxia',
    'as_dx',
    'im_criteria',
  ],
  recommended: ['hx_past', 'hx_meds', 'eye_frenzel', 'ex_hearing', 'ex_fnf'],
  penalties: [
    { id: 'eye_hit', points: -3, reason: 'Head Impulse TestはAVSでのみ意味を持つ。t-EVSに実施しても解釈できない' },
  ],

  vestibularType: 't-EVS',
  subtype: 'sub_pc_bppv',
  ataxiaGrade: 0,

  criteria: [false, false, false, false],

  imagingIndicated: false,
  imagingPreferred: null,
  ctResult: '頭部CT：頭蓋内出血なし。……そもそもこの所見で画像を撮る必要はなかった。',
  mriResult: 'DWIで明らかな高信号域を認めない。……そもそもこの所見でMRIを撮る必要はなかった。',
  day2: null,
  dischargeAfterNegativeOk: true,

  diagnosis: {
    correct: '後半規管BPPV',
    side: 'L',
    asksSide: true,
  },

  maneuver: { kind: 'epley', side: 'L' },

  disposition: {
    correct: ['dp_home'],
    forbidden: [
      { id: 'dp_admit', points: -5, reason: '典型的なBPPVで入院は不要（医療資源の適正利用）' },
      { id: 'dp_consult', points: -8, reason: '典型的なBPPVに脳神経外科コンサルトは不要' },
    ],
  },

  endings: {
    best:
      'Epley法を左に施行すると、眼振は消えた。再検してもめまいは誘発されない。\n\n「美容院のせいだったんですね」\n\n患者は笑って起き上がった。頭を後ろに反らす姿勢は当分避けるよう伝え、帰宅とした。',
    good:
      '診断は正しかった。ただし耳石置換法まで踏み込まず、経過観察となって帰宅した。\n\n症状は1〜2週間で自然に軽快したが、その間は仰向けに寝るのが怖かったという。',
    bad:
      '診断は違っていたが、重篤な事態には至らなかった。\n\n数日後、耳鼻科で左Dix-Hallpikeを行い左後半規管BPPVと診断。Epley法1回で治癒した。',
    worst:
      '「めまい症」として点滴だけをして帰した。\n\n1週間後、患者は仰向けになるたびのめまいに耐えかねて別の病院を受診し、その場でEpley法を受けて治った。\n\n──頭位変換で誘発される1分以内のめまい。Dix-Hallpikeを、片側だけで終わらせていなかったか。',
  },

  keyPoints: [
    '美容院のシャンプー台・歯科の診療台・頭後屈位は後半規管BPPVの典型的な誘発場面',
    '後半規管は矢状面の動き（起き上がる・横になる・上下を向く）で誘発される。寝返りだけで強く回るなら水平半規管を疑う',
    'Dix-Hallpikeは必ず左右とも行う。片側だけでは患側を取り違える',
    '左Dix-Hallpikeで反時計回り（患者から見て）の上向き回旋眼振 ＝ 左後半規管',
    '再検で眼振が減弱する（疲労性）のは末梢性の特徴。中枢性眼振では通常認めない',
    'BPPVの既往がなくても、頭位依存性の短時間めまいなら頭位変換試験を行う',
  ],
  explanation:
    '後半規管BPPVは頭を後ろに反らす姿勢でも誘発され、美容院のシャンプー台や歯科の診療台が典型的なきっかけです。誘発の状況を具体的に聴き出せるかが診断の入口になります。\n\n左Dix-Hallpikeでの反時計回り（患者から見て）上向き回旋眼振は左後半規管を示します。回旋成分は常に患側＝下にした耳のほうへ向かうと覚えておくと、左右の判定を間違えません。治療は左のEpley法です。\n\nBPPVは女性・高齢に多く、骨粗鬆症やビタミンD低下との関連も報告されています。本例のように既往がなくても、誘発の状況が典型的なら頭位変換試験を行ってください。',
  mriNote: '典型的なt-EVSで、4条件のいずれにも該当しません。画像は不要です。',
}
