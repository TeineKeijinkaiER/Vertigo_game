import type { CaseDef } from '../types'

/** 症例1：後半規管BPPV（右） ── 易。MRIを「撮らない」判断を学ぶ教材 */
export const case01: CaseDef = {
  id: 1,
  title: '後半規管BPPV（右）',
  category: 'bppv',
  categoryLabel: 'BPPV',
  age: '62歳',
  gender: '女性',
  chiefComplaint:
    '「今朝、布団の中で右に寝返りを打った瞬間、天井がぐるぐる回りました。30秒ほどで治まりましたが、今日はもう3回目です」',
  vitals: '血圧 142/84　脈拍 78・整　SpO2 98%（room air）　体温 36.4℃　意識清明',

  findings: {
    hx_course:
      '今朝の起床時、布団の中で右に寝返りを打った瞬間に回転性めまいが出現。「長くても30秒くらいで、じっとしていれば治まります」。寝返り・起き上がり・頭の後屈で誘発され、今日すでに2〜3回。2年前にも同様のめまいがあり、耳鼻科で「左の耳石症」と言われ治療で治ったという。',
    hx_assoc: '嘔気は軽度。嘔吐なし。頭痛・複視・しびれ・脱力・構音障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past: '高血圧症（5年）。2年前に左後半規管BPPVの既往（耳石置換法で治癒）。喫煙歴なし。体内にデバイスは入っていない。',
    hx_meds: 'アムロジピン 5mg/日。抗血小板薬・抗凝固薬は内服していない。',

    eye_spont: '座位・仰臥位とも、自然頭位では眼振を認めない。',
    eye_frenzel: 'Frenzel眼鏡下（固視を外した状態）でも自発眼振を認めない。',
    eye_fixation: '固視の有無で変化する眼振はない。',
    eye_gaze: '左右30°注視で眼振を認めない。',
    eye_dh_r:
      '右Dix-Hallpike：2〜3秒の潜時をおいて上向き回旋眼振（患者から見て時計回り）が出現。強い回転性めまいを伴い、約15〜20秒で疲労し消退した。',
    eye_dh_l: '左Dix-Hallpike：陰性。眼振は誘発されない。',
    eye_roll_r: '右耳下（右側臥位）：明らかな水平眼振は誘発されない。',
    eye_roll_l: '左耳下（左側臥位）：明らかな水平眼振は誘発されない。',
    eye_hit: 'HIT：陰性（補償性サッケードなし）。……ただし本例は体位で誘発される短時間のめまい（t-EVS）であり、HITは解釈できない。',
    eye_skew: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。脳幹病変を否定する材料になる。',

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

    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。……ただし本例のめまいは30秒で自然に消える。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。軽度の嘔気は和らいだ。',
  },

  nystagmus: {
    eye_frenzel: { frenzel: true, caption: 'Frenzel眼鏡下でも眼振なし' },
    eye_dh_r: {
      // 上向き＋患者から見て時計回りの回旋。潜時2.5秒、約18秒で疲労
      vertical: 5,
      torsional: 14,
      frequency: 3,
      latencySec: 2.5,
      durationSec: 18,
      caption: '右Dix-Hallpike：潜時のある上向き回旋眼振（患者から見て時計回り）',
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

  // Dix-Hallpikeが明確に陽性で潜時・疲労性まで揃っている。ここまで典型的なら画像は不要
  imagingIndicated: false,
  imagingPreferred: null,
  ctResult: '頭部CT：頭蓋内出血なし。……そもそもこの所見で画像を撮る必要はなかった。',
  mriResult: 'DWIで明らかな高信号域を認めない。……そもそもこの所見でMRIを撮る必要はなかった。',
  day2: null,
  dischargeAfterNegativeOk: true,

  diagnosis: {
    correct: '後半規管BPPV',
    side: 'R',
    asksSide: true,
  },

  maneuver: { kind: 'epley', side: 'R' },


  disposition: {
    correct: ['dp_home'],
    forbidden: [
      { id: 'dp_admit', points: -5, reason: '典型的なBPPVで入院は不要（医療資源の適正利用）' },
      { id: 'dp_consult', points: -8, reason: '典型的なBPPVに脳神経外科コンサルトは不要' },
    ],
  },

  endings: {
    best:
      'Epley法を1回で眼振は消えた。再検してもめまいは誘発されない。\n\n「先生、世界が止まりました」\n\n患者は自分の足で立ち上がり、娘さんと並んで帰っていく。翌週の外来でも再発はなかった。',
    good:
      '診断は正しかった。ただし耳石置換法まで踏み込まず、「安静に」とだけ言われて帰宅した。\n\n症状は数週間かけて自然に軽快したが、その間に階段でふらつく場面があった。',
    bad:
      '診断は違っていたが、重篤な事態には至らなかった。\n\n1週間後、別の医師がDix-Hallpikeで右後半規管BPPVと診断。Epley法1回で治癒した。',
    worst:
      '不要な検査が重ねられ、原因は分からないまま帰された。\n\n数日後、患者は近医で「耳石症です」と言われ、その場で治った。「あの晩の検査は何だったのでしょうか」',
  },

  keyPoints: [
    '頭位変換で誘発される1分以内の回転性めまい ＝ BPPV（t-EVS）',
    'Dix-Hallpikeで潜時・疲労性のある上向き回旋眼振 ＝ 後半規管BPPV',
    '右Dix-Hallpikeで時計回り（患者から見て）＝ 右が患側。回旋は患側へ向かう',
    'HITはAVSでのみ意味を持つ。t-EVSに実施しても解釈できない',
    '治療の主役はEpley法。Brandt-Daroff運動に再発予防の効果は確立していない',
  ],
  explanation:
    '後半規管BPPVは全BPPVの80〜90%を占めます。Dix-Hallpikeでの上向き回旋眼振は後半規管の興奮性刺激を示し、回旋成分は患側（下にした耳）へ向かいます。治療はEpley法が第一選択で、多くは1〜2回で治癒します。\n\n再発は1年で15〜30%。ただしEpley後の安静・体位制限にもBrandt-Daroff運動にも再発を減らす効果は示されていません。再発時の自己治療として渡し、再受診を勧めるのが実際的です。',
  mriNote:
    '典型的なt-EVSで、4条件のいずれにも該当しません。画像は不要です。',
}
