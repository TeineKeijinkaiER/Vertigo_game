/**
 * 体位の定義。
 *
 * 動きの回転軸ごとに、破綻しない視点は1つに決まる。
 *   坐位↔仰臥位・頭部懸垂位（左右軸）  → 側面から見る
 *   頭の回旋・体幹のロール（体軸）      → 頭側から見る
 *   坐位から左右に倒れる（前後軸）      → 正面から見る
 * そのため体位ごとにどの図で描くかを持たせ、手技の途中で図を切り替える。
 *
 * yaw は画面基準（+ = 画面の右を向く）。
 *   正面図・頭側図では患者の右が画面の左なので、
 *   「頭を患者の右へ向ける」は yaw = -90 になる。
 *   側面図では体が画面の左を向いているので、正対で yaw = -90。
 */

export type SceneKind = 'side' | 'front' | 'axial' | 'head'

export interface Pose {
  scene: SceneKind
  /** 側面図：体幹角度。90 = 坐位、0 = 仰臥位 */
  trunk: number
  /** 側面図：頸部後屈。頭部懸垂位で正の値 */
  ext: number
  /** 側面図：患者の右側から見る（左右反転して描く） */
  fromRight: boolean
  /** 正面図：体の傾き。患者から見て + = 右へ倒れる */
  tilt: number
  /** 頭側図：胸郭断面の回転。患者から見て + = 右が下 */
  roll: number
  /** 頭の向き（画面基準） */
  yaw: number
  label: string
}

const P = (label: string, o: Partial<Omit<Pose, 'label'>>): Pose => ({
  scene: 'axial',
  trunk: 0,
  ext: 0,
  fromRight: false,
  tilt: 0,
  roll: 0,
  yaw: 0,
  label,
  ...o,
})

export const POSES = {
  // ── 側面図（Dix-Hallpike / Epley の前半）
  // 患側から見る。右の検査では全体を左右反転して描くので、yaw は同じ値でよい。
  // 体は画面の左を向いているため、頭を検者側へ45°回すと yaw = -45。
  dh_sit_r: P('坐位・頭を右へ45°', { scene: 'side', trunk: 90, fromRight: true, yaw: -45 }),
  dh_sit_l: P('坐位・頭を左へ45°', { scene: 'side', trunk: 90, yaw: -45 }),
  dh_hang_r: P('仰臥位・頭部懸垂位（右耳が下）', { scene: 'side', ext: 38, fromRight: true, yaw: -45 }),
  dh_hang_l: P('仰臥位・頭部懸垂位（左耳が下）', { scene: 'side', ext: 38, yaw: -45 }),
  /** Epley 第2段階：懸垂位のまま頭だけ反対側へ回す。顔が向こうを向く */
  ep_cross_r: P('懸垂位のまま頭を左へ90°', { scene: 'side', ext: 38, fromRight: true, yaw: -135 }),
  ep_cross_l: P('懸垂位のまま頭を右へ90°', { scene: 'side', ext: 38, yaw: -135 }),
  side_sit: P('ゆっくり起坐させる', { scene: 'side', trunk: 90, yaw: -90 }),

  // ── 正面図（Gufoni の倒れる動き）。検者と向かい合うので yaw = 0
  fr_sit: P('正面を向いた坐位', { scene: 'front', trunk: 90 }),
  fr_fall_r: P('右へ倒して右側臥位', { scene: 'front', trunk: 90, tilt: 90 }),
  fr_fall_l: P('左へ倒して左側臥位', { scene: 'front', trunk: 90, tilt: -90 }),

  // ── 頭側図。患者の右は画面の左なので、右を向くと yaw は負になる
  ax_supine: P('仰臥位', { scene: 'axial' }),
  ax_side_r: P('右側臥位（右が下）', { scene: 'axial', roll: 90, yaw: -90 }),
  ax_side_l: P('左側臥位（左が下）', { scene: 'axial', roll: -90, yaw: 90 }),
  ax_prone: P('腹臥位（うつ伏せ）', { scene: 'axial', roll: 180, yaw: 180 }),
  ax_side_r_up: P('右側臥位・顔を上（天井）へ45°', { scene: 'axial', roll: 90, yaw: -45 }),
  ax_side_r_down: P('右側臥位・顔を下（床）へ45°', { scene: 'axial', roll: 90, yaw: -135 }),
  ax_side_l_up: P('左側臥位・顔を上（天井）へ45°', { scene: 'axial', roll: -90, yaw: 45 }),
  ax_side_l_down: P('左側臥位・顔を下（床）へ45°', { scene: 'axial', roll: -90, yaw: 135 }),

  // ── 頭部のみ（Supine Head Roll）
  head_front: P('仰臥位・正面', { scene: 'head' }),
  head_r: P('頭を右へ90°（右耳が下）', { scene: 'head', yaw: -90 }),
  head_l: P('頭を左へ90°（左耳が下）', { scene: 'head', yaw: 90 }),
} satisfies Record<string, Pose>

export type PoseKey = keyof typeof POSES
