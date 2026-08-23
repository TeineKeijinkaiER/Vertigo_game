import type { CaseDef } from '../types'

/** 症例6：前庭神経炎（左） ── 中。AVSでありHINTSが有効な唯一の場面 */
export const case06: CaseDef = {
  id: 6,
  title: '前庭神経炎（左）',
  category: 'peripheral',
  categoryLabel: '末梢性',
  age: '45歳',
  gender: '男性',
  chiefComplaint:
    '「昨日の昼から、ずっと世界が回っています。じっとしていても止まりません。もう3回吐きました」ストレッチャー上で目を閉じ、動くのを嫌がっている。',
  vitals: '血圧 156/92　脈拍 88・整　SpO2 98%（room air）　体温 36.8℃　意識清明（会話は可能だが顔面蒼白）',

  findings: {
    hx_course:
      '昨日の午後、突然、激しい回転性めまいが出現した。前触れはなかった。発症から24時間以上、めまいは途切れることなく持続している。頭を動かすと一過性に増強するが、頭位を戻しても消えない。特定の体位で誘発されるのではなく、常に存在している。過去に同様のめまい発作はない。',
    hx_assoc: '嘔吐を3回。頭痛・複視・しびれ・脱力・構音障害・嚥下障害はない。難聴・耳鳴・耳閉感もない。',
    hx_past: '1週間前に発熱と咽頭痛を伴う感冒様症状があった。高血圧症。喫煙なし。体内にデバイスは入っていない。',
    hx_meds: 'アムロジピン 5mg/日。抗生物質・抗ウイルス薬は内服していない。',

    eye_spont:
      '座位で右向きの水平回旋性眼振を認める。方向は不変で、仰臥位でも持続する。Alexanderの法則に従い右方注視で増強する。',
    eye_frenzel: 'Frenzel眼鏡下で眼振はさらに明瞭となり、振幅が増大する。方向は右向きのまま変わらない。',
    eye_fixation: '固視により眼振は明らかに減弱する。固視を外すと増強する（末梢性のパターン）。',
    eye_gaze: '右方注視で眼振増強、左方注視では方向は変わらず振幅のみ減少。方向不変性の水平眼振。',
    eye_dh_r: '右Dix-Hallpike：後半規管由来の回旋眼振は誘発されない。自発眼振がそのまま持続する。',
    eye_dh_l: '左Dix-Hallpike：後半規管由来の回旋眼振は誘発されない。自発眼振がそのまま持続する。',
    eye_roll_r: '右耳下：BPPV様の短時間眼振は誘発されない。自発眼振が頭位に関わらず持続する。',
    eye_roll_l: '左耳下：BPPV様の短時間眼振は誘発されない。自発眼振が頭位に関わらず持続する。',
    eye_hit:
      'HIT：左側陽性。左方への急速頭位変換で、明らかな補償性サッケード（掻き戻し眼運動）が観察される。右側は陰性。',
    eye_skew: '交代遮蔽で垂直方向のずれを認めない。Test of Skew：陰性。',

    ex_cpss: 'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。',
    ex_ataxia:
      'Grade 2：起立させると左に大きく傾き、支持なしでは歩けない。ただし倒れ方は一方向（左）で、介助すれば数歩は歩ける。',
    ex_fnf: '指鼻試験：左右とも正常。過指なし。',
    ex_hks: '踵膝脛試験：左右とも正常。',
    ex_rapid: '回内回外運動：左右とも正常。',
    ex_diplopia: '眼球運動は全方向で正常。複視なし。',
    ex_face: '顔面の感覚は左右差なし。両側同時に触れても差を認めない。',
    ex_swallow: '水を飲ませても咳込みなし。軟口蓋の挙上は左右対称。「あー」と発声させても嗄声はない。',
    ex_horner: '瞳孔不同なし、眼瞼下垂なし、顔面の発汗低下もない。Horner徴候：陰性。',
    ex_hearing: '耳元で指をこすった音を左右とも同様に聴取できる。聴力低下はない。',
    ex_limb: '四肢に脱力はなく、感覚も正常。',

    tx_fluid: '生食の輸液を開始した。嘔吐による脱水の補正を兼ねる。',
    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与。10分ほどで「少し楽になった」と話す。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与。嘔気が和らぎ、水分を口にできるようになった。',
    tx_rehab: '前庭リハビリテーションについて説明した。症状が落ち着き次第、早期に開始する方針とした。',
  },

  nystagmus: {
    eye_spont: {
      horizontal: 5,
      torsional: 5,
      frequency: 3,
      caption: '右向き水平回旋性眼振（固視により減弱している）',
    },
    eye_frenzel: {
      frenzel: true,
      horizontal: 10,
      torsional: 9,
      frequency: 3.2,
      caption: '固視を外すと振幅が増大。向きは右向きのまま変わらない',
    },
    eye_fixation: {
      horizontal: 5,
      torsional: 5,
      frequency: 3,
      caption: '固視で減弱する ＝ 末梢性のパターン',
    },
    eye_gaze: {
      horizontal: 8,
      torsional: 6,
      frequency: 3.2,
      gazeOffset: 14,
      caption: '右方注視で増強（Alexanderの法則）。方向は不変',
    },
    eye_dh_r: { horizontal: 5, torsional: 5, frequency: 3, caption: '自発眼振がそのまま持続。頭位性眼振は誘発されない' },
    eye_dh_l: { horizontal: 5, torsional: 5, frequency: 3, caption: '自発眼振がそのまま持続。頭位性眼振は誘発されない' },
    eye_roll_r: { horizontal: 5, torsional: 5, frequency: 3, caption: '頭位に関わらず同じ眼振が続く' },
    eye_roll_l: { horizontal: 5, torsional: 5, frequency: 3, caption: '頭位に関わらず同じ眼振が続く' },
  },

  redFlagActions: [],

  required: [
    'hx_course',
    'hx_assoc',
    'hx_past',
    'eye_spont',
    'eye_gaze',
    'eye_hit',
    'eye_skew',
    'ex_cpss',
    'ex_ataxia',
    'ex_hearing',
    'tx_fluid',
    'as_dx',
    'im_criteria',
  ],
  recommended: ['eye_frenzel', 'eye_fixation', 'ex_fnf', 'ex_swallow', 'ex_face', 'tx_primperan', 'tx_atarax'],
  penalties: [],

  vestibularType: 'AVS',
  subtype: 'sub_vn',
  ataxiaGrade: 2,

  // 高血圧というリスク因子はあり、失調もGrade 2。ただし眼振は方向不変で固視により減弱し、
  // 神経所見は陰性、倒れ方は一方向。HINTSも末梢性パターン。
  criteria: [true, false, false, true],

  // AVSでHINTSが末梢性で揃えば必須ではないが、Grade 2の失調があり撮る判断も十分妥当
  imagingIndicated: false,
  imagingPreferred: 'mri',
  ctResult: '頭部CT：頭蓋内出血なし。後頭蓋窩はアーチファクトが強く、微小病変の評価は困難。',
  mriResult: 'DWIで明らかな高信号域を認めない。後頭蓋窩にも急性期梗塞を示唆する所見なし。',
  day2:
    '第2病日。めまいは依然として続いているが、嘔吐は止まり、水分と食事を口にできるようになった。介助すれば数歩は歩ける。\n\n昨日と同じく、眼振は右向き方向不変のまま。新たな神経所見は出現していない。',
  // 帰宅が減点になるのは「中枢性の見逃し」ではなく、嘔吐で経口摂取できず起立も困難だから
  dischargeAfterNegativeOk: false,

  diagnosis: {
    correct: '前庭神経炎',
    side: 'L',
    options: ['前庭神経炎', '小脳梗塞（PICA領域）', 'メニエール病', '後半規管BPPV'],
  },

  maneuver: null,

  treatment: {
    required: ['tx_fluid', 'tx_rehab'],
    forbidden: [],
  },

  disposition: {
    correct: ['dp_admit'],
    forbidden: [
      { id: 'dp_home', points: -12, reason: '嘔吐で経口摂取できず起立も困難。支持療法のため入院が必要' },
      { id: 'dp_consult', points: -5, reason: 'HINTSが末梢性パターンで揃っており、脳神経外科コンサルトは過剰' },
    ],
  },

  endings: {
    best:
      '輸液と制吐薬で嘔気が落ち着き、患者はようやく水を飲めるようになった。HINTSは3項目とも末梢性パターン。ステロイドを開始し、経過観察入院とした。\n\n第2病日から前庭リハビリを開始。第5病日には介助なしで廊下を歩けるようになり、退院。1か月後の外来では「まっすぐ歩けます」と笑った。\n\n「あのとき先生が、ちゃんと目を見てくれたので」',
    good:
      '診断は正しく、支持療法で症状は改善した。ただしステロイドや早期の前庭リハビリまでは踏み込まなかった。\n\n退院後も数週間ふらつきが残り、職場復帰までに1か月を要した。前庭代償には時間がかかったが、最終的には後遺症なく回復している。',
    bad:
      '診断が違っていた。それでも輸液と制吐薬で症状は軽快し、患者は数日で自然に回復した。\n\n後日、耳鼻科で「前庭神経炎でしたね」と説明を受けた。幸い転帰は良好だったが、初日にHITを取っていれば、その場で診断がついていた。',
    worst:
      '一歩も歩けない患者を、そのまま帰宅させてしまった。\n\nその夜、患者はトイレに立とうとして転倒。翌朝、家族に付き添われて再来した。幸い頭部外傷はなかったが、脱水と電解質異常で結局入院となった。\n\n「歩けない患者を歩かせて帰す」──それは、診断以前の問題だった。',
  },

  keyPoints: [
    '24時間以上持続し安静時も続くめまい ＝ AVS。HINTSが有効なのはこの場面だけ',
    '方向不変性の水平回旋性自発眼振（健側向き速相）は末梢性前庭障害の典型',
    'HIT陽性（患側）は末梢性前庭障害の最も特異的な所見。中枢性梗塞ではHITは通常陰性',
    '固視で眼振が減弱するのは末梢性のパターン',
    '起立歩行では一方向（患側）に傾く程度。小脳失調のように転倒するほどではない',
    'HINTSが末梢性パターンで揃えばMRIは必須ではない。ただし不確実ならMRIを撮る',
  ],
  explanation:
    '前庭神経炎は、ウイルス感染に続発する前庭神経の急性炎症と考えられています。激しい持続性回転性めまいと嘔吐で患者は全く動けなくなります。診断の鍵はHead Impulse Testで、患側への急速頭位変換で補償性サッケードが出現します。HINTS（HIT陽性＋方向不変眼振＋Skew陰性）が揃えば末梢性の確率が極めて高くなります。治療は初期のステロイドと早期の前庭リハビリテーションです。本例では上気道感染の先行歴がウイルス性病因を強く支持します。',
  mriNote:
    'HINTSが末梢性パターンで完全に揃えばMRIは必須ではありません。ただしHINTSが不完全・不確実な場合、あるいは起立歩行のふらつきが一方向を超えて強い場合は、頭部MRI（DWI）を施行すべきです。',
}
