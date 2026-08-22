import { MANEUVERS, interpolatePose, lempertPoseAt, mirrorPose, type ManeuverId, type RigPose } from './poses'
import { fitCameraToPoses, type Framing, type View } from './scene'
import * as THREE from 'three'

export type FilmStep = {
  maneuver: ManeuverId
  pose: string
  mirror?: boolean
  /** このキーポーズを見せる時間 */
  holdMs: number
}

export type FilmSpec = {
  caption: string
  view: View
  framing: Framing
  /** キーポーズ間に挟む中間フレーム数 */
  tweens: number
  /** 中間フレームの1コマあたりの時間 */
  tweenMs: number
  steps: FilmStep[]
}

const step = (maneuver: ManeuverId, pose: string, holdMs: number, mirror = false): FilmStep =>
  mirror ? { maneuver, pose, holdMs, mirror } : { maneuver, pose, holdMs }

export const FILMS_SPEC = {
  headroll: {
    caption: '仰臥位のまま、頭だけを左右へ90°ずつ回す。体は動かさない',
    view: 'cranial', framing: 'upper', tweens: 4, tweenMs: 90,
    steps: [
      step('supine-roll', 'roll-neutral', 700),
      step('supine-roll', 'roll-right-45', 200),
      step('supine-roll', 'roll-right', 1400),
      step('supine-roll', 'roll-right-45', 200),
      step('supine-roll', 'roll-neutral', 700),
      step('supine-roll', 'roll-left-45', 200),
      step('supine-roll', 'roll-left', 1400),
      step('supine-roll', 'roll-left-45', 200),
      step('supine-roll', 'roll-neutral', 700),
    ],
  },
  dix_hallpike_r: {
    caption: '頭を患者右へ45°回したまま、素早く仰臥位にして頭を台の端から下げる',
    view: 'lateral', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('dix-hallpike', 'dix-yaw', 1100),
      step('dix-hallpike', 'dix-hang', 1800),
      step('dix-hallpike', 'dix-yaw', 900),
    ],
  },
  dix_hallpike_l: {
    caption: '頭を患者左へ45°回したまま、素早く仰臥位にして頭を台の端から下げる',
    view: 'lateral', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('dix-hallpike', 'dix-yaw', 1100, true),
      step('dix-hallpike', 'dix-hang', 1800, true),
      step('dix-hallpike', 'dix-yaw', 900, true),
    ],
  },
  epley_r: {
    caption: '右後半規管のEpley法。頭部の回旋と体幹のログロールを分けて行う',
    view: 'lateral', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('epley', 'epley-start', 1000),
      step('epley', 'epley-hang-right', 1500),
      step('epley', 'epley-hang-left', 1500),
      step('epley', 'epley-roll', 1600),
      step('epley', 'epley-rise', 1500),
    ],
  },
  epley_l: {
    caption: '左後半規管のEpley法。頭部の回旋と体幹のログロールを分けて行う',
    view: 'lateral', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('epley', 'epley-start', 1000, true),
      step('epley', 'epley-hang-right', 1500, true),
      step('epley', 'epley-hang-left', 1500, true),
      step('epley', 'epley-roll', 1600, true),
      step('epley', 'epley-rise', 1500, true),
    ],
  },
  gufoni_geo_r: {
    caption: '右向地性のGufoni法。健側（患者左）へ倒し、鼻を床へ45°回す',
    view: 'front', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('gufoni-geotropic', 'gufoni-g-start', 1000),
      step('gufoni-geotropic', 'gufoni-g-fall', 1500),
      step('gufoni-geotropic', 'gufoni-g-down', 1600),
      step('gufoni-geotropic', 'gufoni-g-return', 1200),
    ],
  },
  gufoni_geo_l: {
    caption: '左向地性のGufoni法。健側（患者右）へ倒し、鼻を床へ45°回す',
    view: 'front', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('gufoni-geotropic', 'gufoni-g-start', 1000, true),
      step('gufoni-geotropic', 'gufoni-g-fall', 1500, true),
      step('gufoni-geotropic', 'gufoni-g-down', 1600, true),
      step('gufoni-geotropic', 'gufoni-g-return', 1200, true),
    ],
  },
  gufoni_apo_r: {
    caption: '右背地性のGufoni–Appiani法。患側（患者右）へ倒し、鼻を天井へ45°回す',
    view: 'front', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('gufoni-apogeotropic', 'gufoni-a-start', 1000),
      step('gufoni-apogeotropic', 'gufoni-a-fall', 1500),
      step('gufoni-apogeotropic', 'gufoni-a-up', 1600),
      step('gufoni-apogeotropic', 'gufoni-a-return', 1200),
    ],
  },
  gufoni_apo_l: {
    caption: '左背地性のGufoni–Appiani法。患側（患者左）へ倒し、鼻を天井へ45°回す',
    view: 'front', framing: 'full', tweens: 4, tweenMs: 110,
    steps: [
      step('gufoni-apogeotropic', 'gufoni-a-start', 1000, true),
      step('gufoni-apogeotropic', 'gufoni-a-fall', 1500, true),
      step('gufoni-apogeotropic', 'gufoni-a-up', 1600, true),
      step('gufoni-apogeotropic', 'gufoni-a-return', 1200, true),
    ],
  },
  lempert_r: {
    caption: 'Lempert法（右患側）。患側（右）を下にして始め、頭と体を一体で90°ずつ360°回して起坐する',
    view: 'cranial', framing: 'upper', tweens: 4, tweenMs: 110,
    steps: [
      step('lempert', 'lempert-0-supine', 1500),
      step('lempert', 'lempert-1-affected', 1500),
      step('lempert', 'lempert-2-supine', 1500),
      step('lempert', 'lempert-3-healthy', 1500),
      step('lempert', 'lempert-4-prone', 1500),
      step('lempert', 'lempert-5-affected', 1500),
      step('lempert', 'lempert-6-sit', 1500),
    ],
  },
  lempert_l: {
    caption: 'Lempert法（左患側）。患側（左）を下にして始め、頭と体を一体で90°ずつ360°回して起坐する',
    view: 'cranial', framing: 'upper', tweens: 4, tweenMs: 110,
    steps: [
      step('lempert', 'lempert-0-supine', 1500, true),
      step('lempert', 'lempert-1-affected', 1500, true),
      step('lempert', 'lempert-2-supine', 1500, true),
      step('lempert', 'lempert-3-healthy', 1500, true),
      step('lempert', 'lempert-4-prone', 1500, true),
      step('lempert', 'lempert-5-affected', 1500, true),
      step('lempert', 'lempert-6-sit', 1500, true),
    ],
  },
} as const satisfies Record<string, FilmSpec>

/**
 * Lempert法の [bodyDegrees, faceDegrees] のペア。①と⑤は同じ向きだが値が違い、
 * 補間の向きを決める。①③は体幹が 0 のまま顔だけが動く。
 */
export const LEMPERT_ANGLES = [
  [0, 0], [0, -90], [0, 0], [0, 90], [180, 180], [270, 270],
] as const

export type FilmId = keyof typeof FILMS_SPEC
export const FILM_IDS = Object.keys(FILMS_SPEC) as FilmId[]

/**
 * 左患側フィルムは右患側フィルムの全フレームをそのまま鏡像にして作る。
 * キーポーズだけでなく補間の途中フレームも鏡像にすることで、
 * 手技の左右反転が自動的に成り立つ（lempert_l で採った方式を共通化したもの）
 */
const MIRROR_SOURCE: Partial<Record<FilmId, FilmId>> = {
  dix_hallpike_l: 'dix_hallpike_r',
  epley_l: 'epley_r',
  gufoni_geo_l: 'gufoni_geo_r',
  gufoni_apo_l: 'gufoni_apo_r',
  lempert_l: 'lempert_r',
}

function poseOf(item: FilmStep): RigPose {
  const found = MANEUVERS[item.maneuver].poses.find((pose) => pose.id === item.pose)
  if (!found) throw new Error(`ポーズが見つからない: ${item.maneuver}/${item.pose}`)
  return item.mirror ? mirrorPose(found) : found
}

export function filmKeyPoses(id: FilmId): RigPose[] {
  return (FILMS_SPEC[id] as FilmSpec).steps.map(poseOf)
}

const ease = (raw: number) => raw * raw * (3 - 2 * raw)

/**
 * Lempert法（右患側）の全フレーム。
 *
 * ①〜⑤の区間は、体軸まわりの回転角を ease-in-out で補間し、そのつど
 * lempertPoseAt を呼んで作る。関節ごとに向きベクトルを個別補間する
 * interpolatePose では、頭と体が一体で回る「一つの回転」であることが
 * 保証できない。最後の⑤→坐位だけは回転角で表せない体位なので、
 * 既存の interpolatePose を使う。
 */
function lempertRFrames(): RigPose[] {
  const spec = FILMS_SPEC.lempert_r
  const keys = filmKeyPoses('lempert_r')
  const frames: RigPose[] = []
  for (let index = 0; index < keys.length; index += 1) {
    frames.push(keys[index])
    if (index === keys.length - 1) break
    for (let tween = 1; tween <= spec.tweens; tween += 1) {
      const eased = ease(tween / (spec.tweens + 1))
      if (index < LEMPERT_ANGLES.length - 1) {
        const [fromBody, fromFace] = LEMPERT_ANGLES[index]
        const [toBody, toFace] = LEMPERT_ANGLES[index + 1]
        const target = keys[index + 1]
        const bodyDegrees = fromBody + (toBody - fromBody) * eased
        const faceDegrees = fromFace + (toFace - fromFace) * eased
        frames.push(lempertPoseAt(target.id, target.label, target.note, bodyDegrees, faceDegrees, spec.tweenMs))
      } else {
        frames.push(interpolatePose(keys[index], keys[index + 1], eased))
      }
    }
  }
  return frames
}

/** キーポーズと中間フレームを並べた全フレーム */
export function filmFrames(id: FilmId): RigPose[] {
  if (id === 'lempert_r') return lempertRFrames()
  const mirrorSource = MIRROR_SOURCE[id]
  if (mirrorSource) return filmFrames(mirrorSource).map(mirrorPose)
  const spec = FILMS_SPEC[id] as FilmSpec
  const keys = filmKeyPoses(id)
  const frames: RigPose[] = []
  for (let index = 0; index < keys.length; index += 1) {
    frames.push(keys[index])
    if (index === keys.length - 1) break
    for (let tween = 1; tween <= spec.tweens; tween += 1) {
      const raw = tween / (spec.tweens + 1)
      // ease-in-out。等速だと開始と停止が硬く見える
      const eased = raw * raw * (3 - 2 * raw)
      frames.push(interpolatePose(keys[index], keys[index + 1], eased))
    }
  }
  return frames
}

/** 各フレームの表示時間(ms) */
export function filmDurations(id: FilmId): number[] {
  const spec = FILMS_SPEC[id] as FilmSpec
  const keys = spec.steps
  const durations: number[] = []
  for (let index = 0; index < keys.length; index += 1) {
    durations.push(keys[index].holdMs)
    if (index === keys.length - 1) break
    for (let tween = 0; tween < spec.tweens; tween += 1) durations.push(spec.tweenMs)
  }
  return durations
}

/** フィルム全体で共有する固定カメラ */
export function filmCamera(camera: THREE.PerspectiveCamera, id: FilmId): void {
  const spec = FILMS_SPEC[id] as FilmSpec
  fitCameraToPoses(camera, filmKeyPoses(id), spec.view, spec.framing)
}
