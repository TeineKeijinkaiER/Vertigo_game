import type { CaseDef } from '../types'

/**
 * 症例4：水平半規管BPPV（右・向地性型）＋ ペースメーカー植込み後
 *
 * 70歳・高血圧・不整脈というリスク因子が並び、反射的にMRIを撮りたくなる。
 * しかし体内デバイスを問診していれば、MRIが禁忌であることに気づけるはずである。
 * 教育目的は「撮る前に禁忌を確認する」こと。
 * 治療は Lempert 法または Gufoni 法（向地性）で、耳石置換法の組み立てを問う。
 */
export const case04: CaseDef = {
  id: 4,
  title: '水平半規管BPPV（右・向地性型）',
  category: 'bppv',
  categoryLabel: 'BPPV',
  age: '70歳',
  gender: '女性',
  chiefComplaint:
    '「今朝、布団の中で寝返りを打ったら、ぐるぐる回りました。右を向いても左を向いても回るんです。1分もしないうちに治まるのですが、怖くて動けなくて」',
  vitals: '血圧 152/88　脈拍 72・整（ペーシング調律）　SpO2 97%（room air）　体温 36.3℃　意識清明',

  findings: {
    hx_course:
      '今朝、布団の中で寝返りを打った瞬間に回転性めまいが出現。「30秒から1分くらいで、じっとしていれば治まります」。寝返りで誘発され、右を向いたときのほうが強い。同様のめまいは初めてで、今日すでに4〜5回。',
    hx_assoc: '嘔気は軽度。嘔吐なし。頭痛・複視・しびれ・脱力・構音障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past:
      '高血圧症。甲状腺機能低下症。3年前に完全房室ブロックに対して恒久的ペースメーカーを植込んでいる。左前胸部に手術痕があり、皮下に硬い箱状のものが触れる。\n\n手帳を確認すると、MRI非対応の機種である。',
    hx_meds: 'アムロジピン 5mg/日、レボチロキシンナトリウム 50μg/日。抗凝固薬は内服していない。',

    eye_spont: '座位・仰臥位とも、自然頭位では眼振を認めない。',
    eye_frenzel: 'Frenzel眼鏡下（固視を外した状態）でも自発眼振を認めない。',
    eye_fixation: '固視の有無で変化する眼振はない。',
    eye_gaze: '左右30°注視で眼振を認めない。',
    eye_dh_r: '右Dix-Hallpike：上向き回旋眼振は誘発されない。後半規管由来の所見はない。',
    eye_dh_l: '左Dix-Hallpike：上向き回旋眼振は誘発されない。',
    eye_roll_r:
      '右耳下（右側臥位）：強い水平向地性眼振（患者から見て右向き＝下になった側へ向かう）が誘発された。約25秒で疲労し消退。患者は強い回転性めまいを訴える。',
    eye_roll_l:
      '左耳下（左側臥位）：水平向地性眼振（患者から見て左向き）が誘発されるが、右耳下に比べて振幅・速度とも明らかに弱い。',
    eye_hit: 'HIT：陰性（補償性サッケードなし）。……本例は体位で誘発される短時間のめまい（t-EVS）であり、HITは解釈できない。',
    eye_skew: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。',

    ex_cpss: 'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。',
    ex_ataxia: 'Grade 0：歩行失調を認めない。年齢相応のやや慎重な歩き方だが、独歩可能でふらつきもない。',
    ex_fnf: '指鼻試験：左右とも正常。',
    ex_hks: '踵膝脛試験：左右とも正常。',
    ex_rapid: '回内回外運動：左右とも正常。',
    ex_diplopia: '眼球運動は全方向で正常。複視なし。',
    ex_face: '顔面の感覚は左右差なし。両側同時に触れても差を認めない。',
    ex_swallow: '水を飲ませても咳込みなし。軟口蓋の挙上は左右対称。「あー」と発声させても嗄声はない。',
    ex_horner: '瞳孔不同なし、眼瞼下垂なし、顔面の発汗低下もない。Horner徴候：陰性。',
    ex_hearing: '耳元で指をこすった音を左右とも同様に聴取できる。聴力低下はない。',
    ex_limb: '四肢に脱力はなく、感覚も正常。',

    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。めまいの不安が和らいだ様子。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。軽度の嘔気は和らいだ。',
  },

  nystagmus: {
    eye_frenzel: { frenzel: true, caption: 'Frenzel眼鏡下でも自発眼振なし' },
    eye_roll_r: {
      // 右耳下で右向き（＝下になった側へ向かう）向地性眼振。患側で強い
      horizontal: 11,
      frequency: 3.5,
      durationSec: 25,
      caption: '右耳下：強い水平向地性眼振（患者から見て右向き）',
    },
    eye_roll_l: {
      horizontal: -5,
      frequency: 3,
      durationSec: 20,
      caption: '左耳下：水平向地性眼振（左向き）。右耳下より明らかに弱い',
    },
  },

  redFlagActions: [],

  required: [
    'hx_course',
    'hx_assoc',
    'hx_past',
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
  recommended: ['hx_meds', 'eye_frenzel', 'eye_gaze', 'ex_fnf', 'ex_hearing'],
  penalties: [
    { id: 'eye_hit', points: -3, reason: 'Head Impulse TestはAVSでのみ意味を持つ。t-EVSに実施しても解釈できない' },
  ],

  vestibularType: 't-EVS',
  subtype: 'sub_hc_geo',
  ataxiaGrade: 0,

  // 高齢・高血圧・不整脈というリスク因子はあるが、眼振は典型的な頭位性で
  // 神経所見も歩行も正常。4条件のいずれにも該当しない。
  criteria: [false, false, false, false],

  imagingIndicated: false,
  imagingPreferred: null,
  mriContraindicated: '3年前に植込まれた恒久的ペースメーカーはMRI非対応機種であり、撮影は禁忌である。',
  ctResult:
    '頭部CT：頭蓋内出血なし。明らかな低吸収域も指摘できない。……ただし、この所見でそもそも画像を撮る必要はなかった。',
  mriResult:
    '……MRI室から放射線技師が飛んできた。\n\n「先生、この患者さんペースメーカー入っています。手帳を見ましたか。MRI非対応の機種です。撮れません」\n\n患者はすでに検査着に着替え、ストレッチャーでMRI室の前まで運ばれていた。',
  day2: null,
  dischargeAfterNegativeOk: true,

  diagnosis: {
    correct: '水平半規管BPPV（向地性）',
    side: 'R',
    asksSide: true,
  },

  // 向地性型は Lempert 法（患側と反対方向へ360°）が第一選択。
  // Gufoni 法（向地性）も同等に妥当なので、どちらを選んでも正解として扱う。
  maneuver: { kind: 'lempert', side: 'R' },
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
      '耳石置換法を終えると、めまいはぴたりと止まった。\n\n「先生、ペースメーカーのこと、ちゃんと聞いてくれたんですね」\n\n息子さんが言った。「前に別の病院で、危うくMRIに入れられそうになって」',
    good:
      '診断は正しく、MRIも避けられた。ただし耳石置換法まで踏み込まず、「様子を見ましょう」と言われて帰宅した。\n\n自然軽快するまでの間、夜中のトイレでふらついて壁に手をついたという。',
    bad:
      '診断は違っていたが、幸い重篤な事態には至らなかった。\n\n1週間後、別の医師がHead Rollで右水平半規管BPPVと診断し、1回で治癒した。',
    worst:
      'あなたはMRIをオーダーした。70歳、高血圧、不整脈。中枢性を否定したかった。\n\n患者は検査着に着替え、MRI室の前まで運ばれ──そこで技師に止められた。\n\n「先生、この患者さんペースメーカーです。MRI非対応の機種ですよ」\n\n磁場に入っていれば、ペーシング不全やリード先端の発熱を起こし得た。完全房室ブロックの患者には致命的である。\n\n前胸部には手術痕があり、手帳もバッグにあった。\n\n──「体内にデバイスはありますか」\nその一言を、聞いていなかった。',
  },

  keyPoints: [
    'Head Rollで水平向地性眼振 ＝ 水平半規管BPPV。向地性では眼振の強い側が患側',
    'Dix-Hallpike陰性・Head Roll陽性の組み合わせが水平半規管由来を示す',
    '向地性の治療はLempert法（健側方向へ360°）またはGufoni法（健側へ倒れ顔を下向き）',
    'MRIをオーダーする前に、必ず体内デバイスの有無を確認する',
    '高齢・高血圧・不整脈というリスク因子だけで反射的に画像を撮らない',
  ],
  explanation:
    '水平半規管BPPVは全BPPVの10〜20%。Head Rollで水平眼振が誘発され、Dix-Hallpikeは陰性です。向地性では眼振の強い側が患側で、本例は右です。\n\n治療はLempert法（仰臥位から健側方向へ90°ずつ、各30〜60秒保持で270〜360°）またはGufoni法（向地性）。どちらでも構いません。\n\nこの症例の核心は、MRIの前に禁忌を確認することです。リスク因子は並んでいますが所見は典型的な頭位性で、そもそもこの患者にMRIは撮れません。',
  mriNote:
    '4条件のいずれにも該当せず、MRIの適応はありません。加えてMRI非対応のペースメーカーは禁忌で、撮影すればペーシング不全やリード先端の発熱を起こし得ます。禁忌の確認が先です。',
}
