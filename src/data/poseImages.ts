/**
 * 体位イラストの画像。
 *
 * コードで描いた図では体位を正しく表現できなかったため、画像ファイルを
 * 差し込む方式にした。ファイルは public/poses/ に置く。
 * 置かれるまではプレースホルダが表示され、そこに必要な絵の内容が出る。
 *
 * 向きの決まりごと（すべての図に共通）
 *   患者を頭側または正面から見た図では、患者の右が画面の左になる。
 *   したがって「頭を患者の右へ向ける」＝画面では左を向く。
 */

export interface PoseImage {
  /** public/poses/ に置くファイル名 */
  file: string
  /** 図の下に出す姿勢名 */
  title: string
  /** どの絵が必要かの説明。画像が無いときはプレースホルダに出る */
  spec: string
}

export const POSE_IMAGES = {
  // ── Supine Head Roll の連続コマ（用意済み）
  headroll_c: {
    file: 'headroll-c.webp',
    title: '仰臥位・正面',
    spec: '仰臥位で顔が天井を向いている。頭部のみ。',
  },
  headroll_r45: {
    file: 'headroll-r45.webp',
    title: '頭を右へ45°',
    spec: '仰臥位のまま頭だけを患者の右（画面の左）へ45°向ける。',
  },
  headroll_r90: {
    file: 'headroll-r90.webp',
    title: '頭を右へ90°（右耳が下）',
    spec: '仰臥位のまま頭だけを患者の右（画面の左）へ90°向ける。',
  },
  headroll_l45: {
    file: 'headroll-l45.webp',
    title: '頭を左へ45°',
    spec: '仰臥位のまま頭だけを患者の左（画面の右）へ45°向ける。',
  },
  headroll_l90: {
    file: 'headroll-l90.webp',
    title: '頭を左へ90°（左耳が下）',
    spec: '仰臥位のまま頭だけを患者の左（画面の右）へ90°向ける。',
  },

  // ── 以下はまだ画像が無い。public/poses/ に置けばそのまま表示される
  sitting_front: {
    file: 'sitting-front.webp',
    title: '正面を向いた坐位',
    spec: '診察台に腰かけ、検者と向かい合って正面を向いている。正面から見た図。',
  },
  supine: {
    file: 'supine.webp',
    title: '仰臥位',
    spec: '診察台に仰向け。顔は天井を向く。頭の方から見た図。',
  },
  prone: {
    file: 'prone.webp',
    title: '腹臥位（うつ伏せ）',
    spec: '診察台にうつ伏せ。後頭部が見えている。頭の方から見た図。',
  },
  sit_up: {
    file: 'sit-up.webp',
    title: 'ゆっくり起坐させる',
    spec: '側臥位から検者が支えてゆっくり起こし、坐位に戻すところ。横から見た図。',
  },

  dh_sit_r: {
    file: 'dh-sit-right.webp',
    title: '坐位・頭を右へ45°',
    spec: '診察台に腰かけ、頭を患者の右へ45°回している。患者の右側から見た図なので顔が見える。',
  },
  dh_sit_l: {
    file: 'dh-sit-left.webp',
    title: '坐位・頭を左へ45°',
    spec: '同上の左向き。患者の左側から見た図（右向きの左右反転で可）。',
  },
  dh_hang_r: {
    file: 'dh-hang-right.webp',
    title: '仰臥位・頭部懸垂位（右耳が下）',
    spec: '頭を右へ45°回したまま仰臥位にし、頭を台の端から下げる。右耳が下を向く。患者の右側から見た図。',
  },
  dh_hang_l: {
    file: 'dh-hang-left.webp',
    title: '仰臥位・頭部懸垂位（左耳が下）',
    spec: '同上の左右反転。',
  },

  ep_cross_r: {
    file: 'epley-cross-right.webp',
    title: '懸垂位のまま頭を左へ90°',
    spec: '右のDix-Hallpike位から、体は動かさず頭だけを左へ90°回す。右耳が上を向く。横から見た図。',
  },
  ep_cross_l: {
    file: 'epley-cross-left.webp',
    title: '懸垂位のまま頭を右へ90°',
    spec: '同上の左右反転。',
  },

  side_r: {
    file: 'sidelying-right.webp',
    title: '右側臥位（右が下）',
    spec: '右を下にした側臥位。頭の方から見た図。患者の右が画面の左。',
  },
  side_l: { file: 'sidelying-left.webp', title: '左側臥位（左が下）', spec: '同上の左右反転。' },
  side_r_facedown: {
    file: 'sidelying-right-facedown.webp',
    title: '右側臥位・顔を下（床）へ45°',
    spec: '右側臥位から、さらに頭を回して鼻を床へ向けた状態。頭の方から見た図。',
  },
  side_l_facedown: {
    file: 'sidelying-left-facedown.webp',
    title: '左側臥位・顔を下（床）へ45°',
    spec: '同上の左右反転。',
  },
  side_r_faceup: {
    file: 'sidelying-right-faceup.webp',
    title: '右側臥位・顔を上（天井）へ45°',
    spec: '右側臥位から、さらに頭を回して鼻を天井へ向けた状態。頭の方から見た図。',
  },
  side_l_faceup: {
    file: 'sidelying-left-faceup.webp',
    title: '左側臥位・顔を上（天井）へ45°',
    spec: '同上の左右反転。',
  },

  gufoni_fall_r: {
    file: 'gufoni-fall-right.webp',
    title: '右へ倒して右側臥位',
    spec: '正面を向いた坐位から患者の右へすばやく倒して右側臥位になるところ。正面から見た図。倒れる向きを矢印で示す。',
  },
  gufoni_fall_l: { file: 'gufoni-fall-left.webp', title: '左へ倒して左側臥位', spec: '同上の左右反転。' },

  lempert_roll_r: {
    file: 'lempert-roll-right.webp',
    title: '仰臥位から右方向へ90°',
    spec: '仰臥位から患者の右方向へ体ごと90°回して側臥位にする。頭の方から見た図。回転方向を矢印で示す。',
  },
  lempert_roll_l: { file: 'lempert-roll-left.webp', title: '仰臥位から左方向へ90°', spec: '同上の左右反転。' },
  lempert_full: {
    file: 'lempert-360.webp',
    title: '270〜360°まで回す',
    spec: '仰臥位 → 側臥位 → 腹臥位 → 反対の側臥位 → 坐位 と一周する流れを1枚に並べた図。',
  },
  lempert_half: {
    file: 'lempert-180.webp',
    title: '180°でやめる',
    spec: '仰臥位 → 側臥位 → 腹臥位 で止めてしまう流れ。誤答の選択肢に使う。',
  },
} as const satisfies Record<string, PoseImage>

export type PoseImageId = keyof typeof POSE_IMAGES

/**
 * 連続コマとして再生する動き。
 * 静止画を並べてコマ送りするので、GIFを作らなくても動いて見える。
 */
export interface FilmFrame {
  id: PoseImageId
  /** このコマを見せる時間(ms) */
  ms: number
}

export const FILMS = {
  headroll_r: {
    caption: '仰臥位のまま、頭だけを右へ90°向ける（右耳が下）。体は動かさない',
    frames: [
      { id: 'headroll_c', ms: 800 },
      { id: 'headroll_r45', ms: 280 },
      { id: 'headroll_r90', ms: 1600 },
      { id: 'headroll_r45', ms: 280 },
    ],
  },
  headroll_l: {
    caption: '仰臥位のまま、頭だけを左へ90°向ける（左耳が下）。体は動かさない',
    frames: [
      { id: 'headroll_c', ms: 800 },
      { id: 'headroll_l45', ms: 280 },
      { id: 'headroll_l90', ms: 1600 },
      { id: 'headroll_l45', ms: 280 },
    ],
  },
} as const satisfies Record<string, { caption: string; frames: FilmFrame[] }>

export type FilmId = keyof typeof FILMS
