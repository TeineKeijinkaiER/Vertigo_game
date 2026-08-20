/**
 * 頭部の作図。
 *
 * 顔のパーツを座標で手描きすると、向きが変わるたびに位置がずれて
 * どちらを向いているのか読めなくなる。そこで頭を球として扱い、
 * 各パーツを「方位角・仰角」で定義して、向き（ヨー角）から座標を計算する。
 * これで、どの角度でも目・鼻・口・耳の位置関係が崩れない。
 *
 * ヨー角 yaw は画面基準で持つ。
 *   0   = こちらを向いている（正面）
 *   +90 = 画面の右を向いている
 *   -90 = 画面の左を向いている
 *   180 = 向こうを向いている（後頭部）
 * 患者の右がどちらに描かれるかは図によって変わるので、
 * 体位の定義側で画面基準の値に直してから渡す。
 */

const rad = (d: number) => (d * Math.PI) / 180

export interface Projected {
  x: number
  y: number
  /** 顔の手前側にあり、見えているか */
  visible: boolean
  /** 手前にあるほど 1 に近い。奥行きによる縮みに使う */
  depth: number
}

/** 球面上の一点を、ヨー角 yaw だけ回した状態で投影する */
export function project(az: number, el: number, yaw: number, r: number): Projected {
  const a = rad(az + yaw)
  const e = rad(el)
  const x = r * Math.cos(e) * Math.sin(a)
  const y = -r * Math.sin(e)
  const z = Math.cos(e) * Math.cos(a)
  return { x, y, visible: z > 0.1, depth: Math.max(0, z) }
}

/** 顔のパーツ（方位角・仰角）。方位角は顔の正面を 0 とし、+ が患者の左 */
export const PARTS = {
  eyeR: { az: -24, el: 12 },
  eyeL: { az: 24, el: 12 },
  nose: { az: 0, el: -2 },
  mouth: { az: 0, el: -26 },
  earR: { az: -98, el: -3 },
  earL: { az: 98, el: -3 },
} as const

/**
 * 肌が見えている領域の輪郭。
 *
 * 髪と顔の境界は方位角 ±90° の大円で、投影すると楕円になる。
 * 円弧フラグの計算で取り違えないよう、点を並べて経路を作る。
 * 上から下、下から上と一筆書きになる順に並べること。
 * （逆にすると顔の真ん中に縦線が入る）
 */
export function facePath(yaw: number, r: number): string {
  const s = Math.sin(rad(yaw)) >= 0 ? 1 : -1
  const azT = s > 0 ? yaw - 90 : yaw + 90
  const pts: string[] = []
  const N = 26
  // 境界線を 上 → 下 へ
  for (let i = 0; i <= N; i++) {
    const e = rad(90 - (180 * i) / N)
    const x = r * Math.cos(e) * Math.sin(rad(azT))
    const y = -r * Math.sin(e)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  // 顔側の外周を 下 → 上 へ戻る
  for (let i = 0; i <= N; i++) {
    const b = rad(-90 + (180 * i) / N)
    const x = s * r * Math.cos(b)
    const y = -r * Math.sin(b)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

/**
 * 鼻。3点を球面上に置いて投影するので、正面では下向きの三角、
 * 横顔では輪郭の外へ突き出す三角になる。
 */
export function nosePath(yaw: number, r: number): string {
  const tip = project(0, -4, yaw, r * 1.13)
  const a = project(-9, 8, yaw, r)
  const b = project(9, 8, yaw, r)
  return `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)} Z`
}

/** 鼻が見えているか */
export function noseVisible(yaw: number): boolean {
  return Math.cos(rad(yaw)) > -0.25
}
