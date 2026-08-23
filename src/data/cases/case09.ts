import type { CaseDef } from '../types'

/**
 * 症例9：延髄外側症候群（Wallenberg・右）
 *
 * 中枢性の典型像。Test of Skew 陽性、Horner徴候、嚥下障害、交叉性感覚障害が揃う。
 * CPSSは正常のまま（後循環に不感度）である点が教育の核。
 */
export const case09: CaseDef = {
  id: 9,
  title: '延髄外側症候群（Wallenberg・右）',
  category: 'central',
  categoryLabel: '中枢性',
  age: '78歳',
  gender: '男性',
  chiefComplaint:
    '「今朝起きたら、天井が回って立てなくなりました。声が出しにくくて、水を飲むとむせます」ストレッチャー上で、右の顔と左半身の感覚がおかしいと訴えている。',
  vitals: '血圧 172/94　脈拍 88・不整　SpO2 96%（room air）　体温 36.6℃　意識清明',

  findings: {
    hx_course:
      '今朝、起床直後に突然、激しい回転性めまいと嘔吐が出現。発症時刻ははっきりしている。めまいは持続性で、頭位変換で軽減せず数時間続いている。立位はまったく取れない。',
    hx_assoc:
      '嘔吐を数回。「右の顔と、左の手足の感じがおかしい」と訴える。声がかすれ、水を飲むとむせる。頭痛は後頸部にやや強い。「物が斜めに傾いて見える」とも言う。難聴・耳鳴・耳閉感はない。',
    hx_past: '心房細動（3年）。高血圧症。脂質異常症。喫煙は50年前に中止。体内にデバイスは入っていない。',
    hx_meds: 'アピキサバン 5mg 1日2回（抗凝固薬）、アムロジピン 5mg/日、アトルバスタチン 20mg/日。',

    eye_spont:
      '座位で水平・垂直混合性の眼振を認める。Frenzel眼鏡下でも減弱しない。固視をしても止まらない。',
    eye_frenzel: 'Frenzel眼鏡下でも眼振は減弱しない。固視の有無で振幅が変わらないのは中枢性のパターンである。',
    eye_fixation: '固視をしても眼振は減弱しない。末梢性であれば固視で抑制されるはずである。',
    eye_gaze:
      '右方注視で右向き眼振、左方注視で左向き眼振。注視方向によって眼振の向きが変わる（方向可変性）。垂直成分も混在する。',
    eye_dh_r: '右Dix-Hallpike：一貫した後半規管由来の眼振は認めない。頭位変換で中枢性眼振の向きが変化する。',
    eye_dh_l: '左Dix-Hallpike：一貫した後半規管由来の眼振は認めない。',
    eye_roll_r: '右耳下：一貫した半規管由来の眼振パターンではない。眼振の向きが変化する。',
    eye_roll_l: '左耳下：一貫した半規管由来の眼振パターンではない。',
    eye_hit: 'HIT：陰性（補償性サッケードを認めない）。前庭機能は保たれている。中枢性を強く示唆する所見である。',
    eye_skew:
      '交代遮蔽を行うと、遮蔽を外した眼が垂直方向に戻る動きを示す。右眼が下方へ偏位している。Test of Skew：陽性。',

    ex_cpss:
      'CPSS：正常（0点）。Barré徴候なし、口角下垂なし、構音障害なし。\n\n……CPSSは前循環梗塞のスクリーニングであり、後循環には不感度である。',
    ex_ataxia: 'Grade 3：支持なしでは立位を保持できない。起立させると右へ崩れ落ち、二人がかりで支える必要があった。',
    ex_fnf: '指鼻試験：右上肢で過指を認める。左は正常。',
    ex_hks: '踵膝脛試験：右下肢で不正確。左は正常。',
    ex_rapid: '回内回外運動：右でぎこちない。',
    ex_diplopia:
      '眼球運動は全方向で可能。核・核間性の障害はない。\n\nただし本人は「物が斜めに傾いて見える。ときどき上下に二重に見える」と訴える。Test of Skewで捉えた垂直方向のずれ（眼球傾斜反応）を、患者はこう表現する。',
    ex_face:
      '両側同時に触れると、右の顔面で温痛覚が明らかに鈍い。一方、体幹・四肢は左側で鈍い。\n\n右の顔面と左の半身──交叉性の感覚障害である。',
    ex_swallow:
      '水を飲ませると強くむせ込む。軟口蓋の挙上は右で不良で、口蓋垂が左へ引かれる（カーテン徴候）。「あー」と発声させると明らかな嗄声を認める。',
    ex_horner: '右の縮瞳と軽度の眼瞼下垂を認める。右顔面の発汗も低下している。Horner徴候：右陽性。',
    ex_hearing: '耳元で指をこすった音を左右とも同様に聴取できる。聴力低下はない。',
    ex_limb: '四肢に麻痺はない。筋力は保たれている。感覚は左半身の温痛覚が低下している。',

    tx_atarax: 'アタラックスP 1A（25mg）+ 生食50mLを15分で投与した。',
    tx_primperan: 'プリンペラン 1A（10mg）+ 生食50mLを15分で投与した。嘔気はやや和らいだ。',
  },

  nystagmus: {
    eye_spont: {
      horizontal: 8,
      vertical: 4,
      frequency: 3,
      caption: '水平・垂直混合性の眼振。固視をしても減弱しない',
    },
    eye_frenzel: {
      frenzel: true,
      horizontal: 8,
      vertical: 4,
      frequency: 3,
      caption: 'Frenzel眼鏡下でも振幅が変わらない ＝ 中枢性のパターン',
    },
    eye_fixation: {
      horizontal: 8,
      vertical: 4,
      frequency: 3,
      caption: '固視で減弱しない。末梢性なら抑制されるはず',
    },
    eye_gaze: {
      horizontal: 10,
      vertical: 4,
      frequency: 3.2,
      gazeOffset: 14,
      caption: '注視方向で眼振の向きが変わる（方向可変性）＝ 中枢性',
    },
  },

  redFlagActions: ['eye_skew', 'eye_hit', 'eye_gaze', 'ex_ataxia', 'ex_face', 'ex_swallow', 'ex_horner', 'hx_past'],

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
    'ex_face',
    'ex_swallow',
    'as_dx',
    'im_criteria',
  ],
  recommended: ['hx_meds', 'eye_frenzel', 'eye_fixation', 'ex_horner', 'ex_fnf', 'ex_limb'],
  penalties: [],

  vestibularType: 'AVS',
  subtype: 'sub_stroke',
  ataxiaGrade: 3,

  // 全条件が該当する典型的な中枢性
  criteria: [true, true, true, true],

  imagingIndicated: true,
  imagingPreferred: 'mri',
  ctResult:
    '頭部CT：頭蓋内出血は認めない。延髄外側は後頭蓋窩のアーチファクトに埋もれ、梗塞巣は指摘できない。\n\n……CTで出血は否定できたが、この病変はCTでは写らない。',
  mriResult:
    '頭部MRI-DWI：右延髄外側に境界明瞭な高信号域を認める。MRAでは右椎骨動脈の遠位部に閉塞を認める。\n\n延髄外側症候群（Wallenberg症候群）の所見である。',
  day2: null,
  dischargeAfterNegativeOk: false,

  diagnosis: {
    correct: '延髄外側症候群（Wallenberg）',
    side: 'R',
    asksSide: true,
  },

  maneuver: null,


  disposition: {
    correct: ['dp_consult', 'dp_admit'],
    forbidden: [
      { id: 'dp_home', points: -20, reason: '急性期の脳幹梗塞である。嚥下障害があり、誤嚥性肺炎の危険も高い' },
    ],
  },

  endings: {
    best:
      'HIT陰性、方向可変性眼振、Test of Skew陽性。HINTSは3項目とも中枢性だった。交叉性感覚障害、Horner徴候、カーテン徴候。所見はすべて延髄外側を指していた。\n\n「後循環の脳梗塞を疑います。すぐに見てください」\n\nMRI-DWIで右延髄外側の高信号を確認し、脳卒中ユニットへ。絶食と経鼻胃管で誤嚥性肺炎は起きなかった。\n\n3か月後、患者は杖歩行で外来に現れた。「水が普通に飲めるようになりましたよ」',
    good:
      '中枢性と判断して入院させ、延髄外側梗塞が確認された。診断には到達した。\n\nただし嚥下障害の評価が遅れ、第2病日に誤嚥性肺炎を発症。入院は2週間延びた。\n\n──水を飲ませてむせたら、そこで食事は止める。',
    bad:
      '診断名は外したが、「何かおかしい」という感覚で専門科に相談した。\n\n脳神経外科がMRIをオーダーし、右延髄外側の梗塞が判明。患者を帰さなかったという一点が転帰を分けた。',
    worst:
      'CPSSは0点。麻痺もない。指鼻試験も、まあ大丈夫に見えた。\n\nあなたは「めまい症」として点滴をし、患者を帰宅させた。\n\n──その夜。\n\n患者は自宅で水を飲もうとしてむせ込み、呼吸状態が悪化した。翌朝、意識レベル低下と発熱で再搬送。両側の誤嚥性肺炎と右延髄外側の梗塞が確認され、集中治療室に入った。\n\nカルテには初診時のあなたの記載が残っている。\n「CPSS 0点、麻痺なし」\n\n──CPSSは後循環に不感度である。\n目の前の患者は、声がかすれ、水にむせ、支えなしでは立てなかった。',
  },

  keyPoints: [
    'CPSSは前循環のスクリーニング。0点でも後頭蓋窩病変は除外できない',
    'HIT陰性＋方向可変性眼振＋Skew陽性は中枢性の確率が極めて高い',
    'skew deviationは眼球傾斜反応の一部。「物が傾いて見える」の訴えを拾ったら交代遮蔽を行う',
    '右顔面と左半身という交叉性感覚障害は延髄外側に特徴的。両側同時に触れて比べる',
    'カーテン徴候・嗄声・むせは疑核の障害。嚥下評価を怠ると誤嚥性肺炎につながる',
    '失調Grade 3（支持なしで立位保持不能）は脳卒中に対して特異度100%',
  ],
  explanation:
    'Wallenberg症候群は、PICAまたは椎骨動脈の閉塞による延髄外側の梗塞です。「めまい＋交叉性感覚障害＋後部脳神経症状＋同側の失調」が典型で、本例はすべて揃っています。\n\n最大の教訓はCPSSが0点であることです。CPSSは前循環を拾うスケールで後循環には不感度であり、麻痺がないことは脳卒中を否定する根拠になりません。\n\n代わりに拾うのはHINTSの3項目、両側同時刺激で分かる交叉性感覚障害、Horner徴候、カーテン徴候と嗄声です。嚥下障害は診断の手がかりであると同時に、そのまま生命予後に直結します。',
  mriNote:
    '4条件すべてに該当し、適応は明白です。第一選択はMRI（DWI）。CTでは出血は否定できても、後頭蓋窩のアーチファクトでこの病変は写りません。',
}
