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
      '今朝の起床時、布団の中で右に寝返りを打った瞬間、突然の回転性めまいが出現した。「長くても30秒くらいで、じっとしていれば治まります」。寝返り、起き上がり、頭を後ろに反らす動作で誘発され、今日はすでに2〜3回繰り返している。2年前にも同じようなめまいがあり、耳鼻科で「左の耳石症」と言われ、頭を動かす治療で治ったという。',
    hx_assoc: '嘔気は軽度。嘔吐なし。頭痛・複視・しびれ・脱力・構音障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past: '高血圧症（5年）。2年前に左後半規管BPPVの既往（耳石置換法で治癒）。喫煙歴なし。体内にデバイスは入っていない。',
    hx_meds: 'アムロジピン 5mg/日。抗血小板薬・抗凝固薬は内服していない。',

    eye_spont: '座位・仰臥位とも、自然頭位では眼振を認めない。',
    eye_frenzel: 'Frenzel眼鏡下（固視を外した状態）でも自発眼振を認めない。',
    eye_fixation: '固視の有無で変化する眼振はない。',
    eye_gaze: '左右30°注視で眼振を認めない。',
    eye_dh_r:
      '右Dix-Hallpike：頭位変換の2〜3秒後に潜時をおいて、上向き成分優位の回旋眼振（患者から見て時計回り）が出現。患者は強い回転性めまいを訴える。約15〜20秒で疲労し消退した。そのままゆっくり坐位に戻すと、数秒の潜時ののち、懸垂位とは逆向きの眼振（下向き成分優位で、回旋は患者から見て反時計回り）が5〜10秒ほどみられ、患者は軽いめまいを訴えた。',
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

    tx_fluid: '輸液を開始した。患者はやや落ち着いた様子。',
    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。……ただし本例のめまいは30秒で自然に消える。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。軽度の嘔気は和らいだ。',
    tx_rehab: 'Brandt-Daroff運動のやり方を紙に書いて渡し、朝晩に行うよう指導した。再発予防になることも説明した。',
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
    options: ['後半規管BPPV', '水平半規管BPPV（向地性）', '前庭神経炎', 'メニエール病'],
  },

  maneuver: { kind: 'epley', side: 'R' },

  treatment: {
    required: ['tx_rehab'],
    forbidden: [{ id: 'tx_steroid', points: -5, reason: 'BPPVにステロイドの適応はない' }],
  },

  disposition: {
    correct: ['dp_home'],
    forbidden: [
      { id: 'dp_admit', points: -5, reason: '典型的なBPPVで入院は不要（医療資源の適正利用）' },
      { id: 'dp_consult', points: -8, reason: '典型的なBPPVに脳神経外科コンサルトは不要' },
    ],
  },

  endings: {
    best:
      'Epley法を1回施行すると、眼振はすっと消えた。もう一度Dix-Hallpikeを行っても、めまいは誘発されない。\n\n「先生、世界が止まりました」\n\n患者は自分の足でしっかりと立ち上がった。Brandt-Daroff運動の紙を握りしめ、娘さんと並んで帰っていく。翌週の耳鼻科外来でも、再発はなかった。',
    good:
      '診断は正しかった。しかし耳石置換法まで踏み込まなかったため、患者は「めまいが出たら安静に」とだけ言われて帰宅した。\n\n症状は数日〜数週間かけて自然に軽快したが、その間に一度、階段でふらついて手すりにつかまる場面があったという。',
    bad:
      '診断が違っていた。それでも重篤な事態には至らず、患者はめまいを抱えたまま帰宅した。\n\n1週間後、別の医師がDix-Hallpikeを行い、右後半規管BPPVと診断。Epley法で1回で治癒した。「もっと早く治せたのに」と患者は漏らした。',
    worst:
      '不要な検査と処置が重ねられ、患者は長時間を救急外来で過ごした。挙句、めまいの原因は分からないまま帰された。\n\n数日後、患者は近医で「耳石症です」と言われ、その場で治った。「あの晩の検査は何だったのでしょうか」',
  },

  keyPoints: [
    '頭位変換で誘発される1分以内の回転性めまいは、まずBPPV（t-EVS）を考える',
    'Dix-Hallpikeで潜時・疲労性のある上向き回旋眼振が出れば後半規管BPPVが確定的',
    '右Dix-Hallpikeで時計回り（患者から見て）の上向き回旋眼振 ＝ 右後半規管',
    'Head Impulse TestはAVSでのみ意味を持つ。t-EVSに実施しても解釈できない',
    'ただしTest of Skewは脳幹所見の診察なので、t-EVSでも行ってよい',
    '神経所見陰性・聴力正常なら中枢性・蝸牛病変は考えにくく、画像は不要',
  ],
  explanation:
    '後半規管BPPVは全BPPVの80〜90%を占める最頻のBPPVで、耳石が後半規管内に遊離することで発症します。典型像は起床時・仰臥位からの起坐時・頭後傾位で誘発される回転性めまいです。Dix-Hallpike法での上向き回旋眼振は後半規管の興奮性刺激（カナリシウム型）を示し、眼振の回旋成分は患側（下にした耳側）に向かいます。治療はEpley法が第一選択で、多くは1〜2回で治癒します。再発は30%程度と報告されており、Brandt-Daroff運動による再発予防指導が重要です。',
  mriNote:
    '本例のような典型的なt-EVSでは画像検査は不要です。HOWTOの4条件（リスクのある突然発症／末梢性として矛盾する眼振／中枢性を疑う随伴症状・神経所見／強いふらつき）のいずれにも該当しません。',
}
