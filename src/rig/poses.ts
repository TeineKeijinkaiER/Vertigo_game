import * as THREE from 'three'

export type ManeuverId =
  | 'dix-hallpike'
  | 'epley'
  | 'gufoni-geotropic'
  | 'gufoni-apogeotropic'
  | 'supine-roll'
  | 'basic-positions'

export type RigPose = {
  id: string
  label: string
  note: string
  holdMs: number
  joints: Record<string, THREE.Vector3>
  faceDirection: THREE.Vector3
  headUp: THREE.Vector3
  upperBodyOnly?: boolean
  /** 側臥位ポーズで、どちらへ倒れた結果かを記録する。下になる肩の検証に使う */
  fallSide?: 'left' | 'right'
}

export type Maneuver = {
  id: ManeuverId
  shortLabel: string
  title: string
  subtitle: string
  camera: 'posterior' | 'lateral'
  bedAxis: 'longitudinal' | 'transverse'
  pillow: 'shoulder' | 'none'
  poses: RigPose[]
}

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
export const unit = (vector: THREE.Vector3) => vector.clone().normalize()
export const step = (origin: THREE.Vector3, direction: THREE.Vector3, length: number) =>
  origin.clone().add(unit(direction).multiplyScalar(length))

export const HEAD_RADIUS = 0.29

export const LENGTHS = {
  chest: 0.68,
  neck: 0.34,
  head: 0.29,
  shoulderCenter: 0.84,
  shoulder: 0.30,
  hip: 0.16,
  upperArm: 0.48,
  forearm: 0.43,
  hand: 0.16,
  thigh: 0.76,
  shin: 0.70,
  foot: 0.24,
} as const

type PoseRecipe = {
  id: string
  label: string
  note: string
  holdMs?: number
  pelvis?: THREE.Vector3
  body: THREE.Vector3
  width?: THREE.Vector3
  head: THREE.Vector3
  face: THREE.Vector3
  headUp?: THREE.Vector3
  legs?: THREE.Vector3
  thighs?: THREE.Vector3
  shins?: THREE.Vector3
  arms?: THREE.Vector3
  forearms?: THREE.Vector3
  upperBodyOnly?: boolean
}

export function makePose(recipe: PoseRecipe): RigPose {
  const pelvis = recipe.pelvis?.clone() ?? V(0, 0.98, 0.42)
  const body = unit(recipe.body)
  const width = unit(recipe.width ?? V(1, 0, 0))
  const chest = step(pelvis, body, LENGTHS.chest)
  const neck = step(chest, body, LENGTHS.neck)
  const head = step(neck, recipe.head, LENGTHS.head)
  const shoulderCenter = step(pelvis, body, LENGTHS.shoulderCenter)
  const shoulderLeft = step(shoulderCenter, width, LENGTHS.shoulder)
  const shoulderRight = step(shoulderCenter, width.clone().negate(), LENGTHS.shoulder)
  const hipLeft = step(pelvis, width, LENGTHS.hip)
  const hipRight = step(pelvis, width.clone().negate(), LENGTHS.hip)
  const thighAxis = recipe.thighs ?? recipe.legs ?? V(0, -0.055, 0.998)
  const shinAxis = recipe.shins ?? recipe.legs ?? thighAxis
  const kneeLeft = step(hipLeft, thighAxis, LENGTHS.thigh)
  const kneeRight = step(hipRight, thighAxis, LENGTHS.thigh)
  const ankleLeft = step(kneeLeft, shinAxis, LENGTHS.shin)
  const ankleRight = step(kneeRight, shinAxis, LENGTHS.shin)
  const toeLeft = step(ankleLeft, shinAxis, LENGTHS.foot)
  const toeRight = step(ankleRight, shinAxis, LENGTHS.foot)
  const armAxis = recipe.arms ?? V(0.08, -0.72, 0.69)
  const forearmAxis = recipe.forearms ?? V(-0.03, -0.34, 0.94)
  const elbowLeft = step(shoulderLeft, armAxis, LENGTHS.upperArm)
  const elbowRight = step(shoulderRight, armAxis, LENGTHS.upperArm)
  const wristLeft = step(elbowLeft, forearmAxis, LENGTHS.forearm)
  const wristRight = step(elbowRight, forearmAxis, LENGTHS.forearm)
  const handLeft = step(wristLeft, forearmAxis, LENGTHS.hand)
  const handRight = step(wristRight, forearmAxis, LENGTHS.hand)

  return {
    id: recipe.id,
    label: recipe.label,
    note: recipe.note,
    holdMs: recipe.holdMs ?? 1100,
    faceDirection: unit(recipe.face),
    headUp: unit(recipe.headUp ?? recipe.head),
    upperBodyOnly: recipe.upperBodyOnly,
    joints: {
      pelvis, chest, neck, head, shoulderCenter, shoulderLeft, shoulderRight,
      hipLeft, hipRight, kneeLeft, kneeRight, ankleLeft, ankleRight,
      toeLeft, toeRight, elbowLeft, elbowRight, wristLeft, wristRight, handLeft, handRight,
    },
  }
}

const seated = (id: string, label: string, note: string, face = V(0, 0, 1)) => makePose({
  id, label, note, body: V(0, 1, 0), head: V(0, 1, 0), face,
  arms: V(-0.05, -0.83, 0.55), forearms: V(0.04, -0.43, 0.90),
})

const hanging = (id: string, label: string, note: string, face: THREE.Vector3) => makePose({
  id, label, note, holdMs: 1500, body: V(0, 0.36, -0.933), head: V(0, -0.707, -0.707),
  face, headUp: V(0, -0.707, -0.707), arms: V(0.06, -0.04, 0.996), forearms: V(-0.04, 0.02, 0.999),
})

const sideSeated = (id: string, label: string, note: string) => makePose({
  id, label, note, pelvis: V(0, 1.00, 0.88), body: V(0, 1, 0), head: V(0, 1, 0), face: V(0, 0, 1),
  thighs: V(0, -0.46, 0.89), shins: V(0, -1, 0), arms: V(0, -0.96, 0.28), forearms: V(0, -0.92, 0.38),
})

const epleySideSit = () => makePose({
  id: 'epley-rise', label: '5. 左向きのまま側方座位へ',
  note: '左側臥位からベッド側縁へ脚を下ろし、頭は左向きを保つ',
  pelvis: V(0.86, 1.00, 0.35), body: V(0, 1, 0), width: V(0, 0, -1),
  head: V(0, 1, 0), face: V(1, 0, 0), headUp: V(0, 1, 0),
  thighs: V(0.92, -0.38, 0), shins: V(0, -1, 0),
  arms: V(0.68, -0.72, 0), forearms: V(0.30, -0.95, 0),
})

function sideLying(id: string, label: string, note: string, direction: 1 | -1, nose: 'down' | 'up' | 'front') {
  const body = V(direction, 0, 0)
  // 転倒方向の肩が下になる。患者左が +X なので、左へ倒す(direction=+1)と左肩が -Y へ回る
  const width = V(0, -direction, 0)
  const face = nose === 'front' ? V(0, 0, 1) : nose === 'down' ? V(0, -1, 0.08) : V(0, 1, 0.08)
  const pose = makePose({
    id, label, note, holdMs: 1500, pelvis: V(0, 1.00, 0.88), body, width, head: body, face,
    // 鼻を床/天井へ向けるのは体軸まわりのロールであり、頭頂の向きは変わらない
    headUp: V(direction, 0, 0),
    thighs: V(-direction, 0, -0.05), shins: V(-direction, 0, -0.05),
    arms: V(-direction, 0.05, 0.15), forearms: V(-direction, 0.05, 0.12),
  })
  return { ...pose, fallSide: direction === 1 ? ('left' as const) : ('right' as const) }
}

const supine = (id: string, label: string, note: string, face: THREE.Vector3) => makePose({
  id, label, note, holdMs: 1300, pelvis: V(0, 1.00, 0.38), body: V(0, 0.12, -0.993),
  head: V(0, 0.50, -0.866), face, headUp: V(0, 0.50, -0.866),
  legs: V(0, 0.02, 1), arms: V(0.04, -0.02, 1), forearms: V(-0.04, 0.02, 1),
  upperBodyOnly: true,
})

const RIGHT = V(-Math.SQRT1_2, 0, Math.SQRT1_2)
const HANG_RIGHT = V(-0.64, 0.54, -0.54)
const HANG_LEFT = V(0.64, 0.54, -0.54)

export const MANEUVERS: Record<ManeuverId, Maneuver> = {
  'dix-hallpike': {
    id: 'dix-hallpike', shortLabel: 'Dix–Hallpike', title: 'Dix–Hallpike（右）',
    subtitle: '右45°回旋を保ったまま座位と懸垂位を往復', camera: 'posterior',
    bedAxis: 'longitudinal', pillow: 'shoulder',
    poses: [
      seated('dix-yaw', '1. 右45°座位', '頭部を患者右へ45°回旋し、この向きを保持', RIGHT),
      hanging('dix-hang', '2. 右45°懸垂位', '右45°回旋を保ったまま、肩を支持して頭部を後屈', HANG_RIGHT),
    ],
  },
  epley: {
    id: 'epley', shortLabel: 'Epley', title: 'Epley法（右後半規管）',
    subtitle: '頭部回旋と左側臥位への体幹ログロールを分離', camera: 'posterior',
    bedAxis: 'longitudinal', pillow: 'shoulder',
    poses: [
      seated('epley-start', '1. 右45°座位', '患側へ頭部を45°回旋', RIGHT),
      hanging('epley-hang-right', '2. 右Dix–Hallpike位', '回旋を保ったまま肩支持で後屈', HANG_RIGHT),
      hanging('epley-hang-left', '3. 頭部を左へ90°', '肩と骨盤は仰臥位のまま、頭部だけを反対側へ回旋', HANG_LEFT),
      makePose({ id: 'epley-roll', label: '4. 左側臥位・鼻下', note: '頭部と体幹を一体に左へログロール', holdMs: 1600,
        pelvis: V(0, 1.00, 0.38), body: V(0, 0.12, -0.993), width: V(0, -0.993, -0.12),
        head: V(0, 0.12, -0.993), face: V(0, -0.96, -0.28), headUp: V(0, 0.28, -0.96),
        legs: V(0, 0.02, 1), arms: V(0, 0.04, 1), forearms: V(0, 0.02, 1) }),
      epleySideSit(),
    ],
  },
  'gufoni-geotropic': {
    id: 'gufoni-geotropic', shortLabel: 'Gufoni 向地性', title: 'Gufoni法（右・向地性）',
    subtitle: '横長のベッド上で健側（左）へ倒し、その後に鼻を床へ', camera: 'lateral',
    bedAxis: 'transverse', pillow: 'none',
    poses: [
      sideSeated('gufoni-g-start', '1. ベッド端座位', '股関節と膝を屈曲し、下腿を下垂'),
      sideLying('gufoni-g-fall', '2. 健側へ側臥位', '右患側では患者左へ素早く倒す', 1, 'front'),
      sideLying('gufoni-g-down', '3. 鼻を床へ45°', '体幹を固定し、頭部だけを下向きへ回旋', 1, 'down'),
      sideSeated('gufoni-g-return', '4. 座位へ戻る', '頭部と体幹を支持して端座位へ'),
    ],
  },
  'gufoni-apogeotropic': {
    id: 'gufoni-apogeotropic', shortLabel: 'Appiani 背地性', title: 'Gufoni–Appiani法（右・背地性）',
    subtitle: '横長のベッド上で患側（右）へ倒し、鼻を天井へ向ける亜型', camera: 'lateral',
    bedAxis: 'transverse', pillow: 'none',
    poses: [
      sideSeated('gufoni-a-start', '1. ベッド端座位', '背地性亜型を明示して開始'),
      sideLying('gufoni-a-fall', '2. 患側へ側臥位', '右患側では患者右へ素早く倒す', -1, 'front'),
      sideLying('gufoni-a-up', '3. 鼻を天井へ45°', 'Appiani変法として頭部を上向きへ回旋', -1, 'up'),
      sideSeated('gufoni-a-return', '4. 座位へ戻る', '頭部と体幹を支持して端座位へ'),
    ],
  },
  'supine-roll': {
    id: 'supine-roll', shortLabel: 'Supine Head Roll', title: 'Supine Head Roll Test',
    subtitle: '枕なしの上半身モデルで、頭部約30°前屈と左右90°を表示', camera: 'posterior',
    bedAxis: 'longitudinal', pillow: 'none',
    poses: [
      supine('roll-neutral', '1. 仰臥位・正中', '頭部を約30°前屈して水平半規管面を整える', V(0, 0.50, 0.866)),
      supine('roll-right-45', '2. 右へ45°', '正中から患者右へ45°', V(-0.707, 0.354, 0.612)),
      supine('roll-right', '3. 右へ90°', '眼振を観察し、消退するまで保持', V(-1, 0, 0)),
      supine('roll-left-45', '4. 左へ45°', '正中から患者左へ45°', V(0.707, 0.354, 0.612)),
      supine('roll-left', '5. 左へ90°', '反対側の眼振方向と強度を観察', V(1, 0, 0)),
    ],
  },
  'basic-positions': {
    id: 'basic-positions', shortLabel: '基本体位', title: '基本体位',
    subtitle: '手技の選択肢で使う坐位・仰臥位・腹臥位・起坐', camera: 'lateral',
    bedAxis: 'longitudinal', pillow: 'none',
    poses: [
      // 正面座位。診察台に腰かけ検者と向かい合う
      makePose({
        id: 'sitting-front', label: '正面を向いた坐位', note: '診察台に腰かけ正面を向く',
        pelvis: V(0, 1.00, 0.88), body: V(0, 1, 0), head: V(0, 1, 0), face: V(0, 0, 1),
        thighs: V(0, -0.46, 0.89), shins: V(0, -1, 0),
        arms: V(0, -0.96, 0.28), forearms: V(0, -0.92, 0.38),
      }),
      // 全身仰臥位。supine() は上半身のみなので別に作る
      makePose({
        id: 'supine-full', label: '仰臥位', note: '診察台に仰向け。顔は天井を向く',
        holdMs: 1300, pelvis: V(0, 1.00, 0.38), body: V(0, 0.12, -0.993),
        head: V(0, 0.12, -0.993), face: V(0, 1, 0.08), headUp: V(0, 0.12, -0.993),
        legs: V(0, 0.02, 1), arms: V(0.10, -0.02, 0.995), forearms: V(-0.06, 0.02, 0.998),
      }),
      // 腹臥位。仰臥位から体軸まわりに180°ロールし、鼻を床へ
      makePose({
        id: 'prone', label: '腹臥位（うつ伏せ）', note: '診察台にうつ伏せ。後頭部が見えている',
        holdMs: 1300, pelvis: V(0, 1.00, 0.38), body: V(0, 0.12, -0.993), width: V(-1, 0, 0),
        head: V(0, 0.12, -0.993), face: V(0, -1, -0.08), headUp: V(0, 0.12, -0.993),
        legs: V(0, 0.02, 1), arms: V(0.10, 0.02, 0.995), forearms: V(-0.06, -0.02, 0.998),
      }),
      // 介助起坐。側臥位から支えて起こす途中
      makePose({
        id: 'sit-up', label: 'ゆっくり起坐させる', note: '側臥位から支えてゆっくり坐位へ戻す',
        holdMs: 1500, pelvis: V(0, 1.00, 0.72), body: V(0, 0.82, 0.57),
        head: V(0, 0.94, 0.34), face: V(0, 0.10, 0.995), headUp: V(0, 0.94, 0.34),
        thighs: V(0, -0.42, 0.91), shins: V(0, -0.98, 0.20),
        arms: V(0, -0.72, 0.69), forearms: V(0, -0.55, 0.84),
      }),
    ],
  },
}

export const TREE: Array<[string, string]> = [
  ['pelvis', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['pelvis', 'shoulderCenter'],
  ['shoulderCenter', 'shoulderLeft'], ['shoulderCenter', 'shoulderRight'],
  ['pelvis', 'hipLeft'], ['pelvis', 'hipRight'],
  ['shoulderLeft', 'elbowLeft'], ['elbowLeft', 'wristLeft'], ['wristLeft', 'handLeft'],
  ['shoulderRight', 'elbowRight'], ['elbowRight', 'wristRight'], ['wristRight', 'handRight'],
  ['hipLeft', 'kneeLeft'], ['kneeLeft', 'ankleLeft'], ['ankleLeft', 'toeLeft'],
  ['hipRight', 'kneeRight'], ['kneeRight', 'ankleRight'], ['ankleRight', 'toeRight'],
]

export function validateRig() {
  const all = Object.values(MANEUVERS).flatMap((item) => item.poses)
  const reference = all[0]
  for (const pose of all) {
    for (const [start, end] of TREE) {
      const expected = reference.joints[start].distanceTo(reference.joints[end])
      const actual = pose.joints[start].distanceTo(pose.joints[end])
      if (Math.abs(expected - actual) > 1e-8) throw new Error(`Bone length changed: ${pose.id} ${start}-${end}`)
    }
  }
  const dix = MANEUVERS['dix-hallpike']
  if (dix.poses.length !== 2 || dix.poses[0].faceDirection.x >= -0.6 || dix.poses[1].faceDirection.x >= -0.5) {
    throw new Error('Dix-Hallpike must keep right yaw in both seated and hanging poses')
  }
  const epleyRoll = MANEUVERS.epley.poses.find((pose) => pose.id === 'epley-roll')!
  if (epleyRoll.joints.shoulderLeft.y >= epleyRoll.joints.shoulderRight.y) {
    throw new Error('Epley log roll must place the anatomical left shoulder down')
  }
  const epleyRise = MANEUVERS.epley.poses.find((pose) => pose.id === 'epley-rise')!
  if (epleyRise.faceDirection.x < 0.9 || epleyRise.joints.kneeLeft.x <= epleyRise.joints.pelvis.x) {
    throw new Error('Epley rise must keep the head left and lower the legs over the side edge')
  }
  for (const id of ['gufoni-geotropic', 'gufoni-apogeotropic'] as const) {
    if (MANEUVERS[id].bedAxis !== 'transverse' || MANEUVERS[id].pillow !== 'none') throw new Error(`${id} scene is invalid`)
  }
  if (MANEUVERS['supine-roll'].pillow !== 'none' || MANEUVERS['supine-roll'].poses.some((pose) => !pose.upperBodyOnly)) {
    throw new Error('Supine Head Roll must use a pillow-free upper-body scene')
  }
}
validateRig()

export function interpolatePose(from: RigPose, to: RigPose, t: number): RigPose {
  const joints: Record<string, THREE.Vector3> = { pelvis: from.joints.pelvis.clone().lerp(to.joints.pelvis, t) }
  for (const [start, end] of TREE) {
    const fromDirection = from.joints[end].clone().sub(from.joints[start]).normalize()
    const toDirection = to.joints[end].clone().sub(to.joints[start]).normalize()
    const direction = fromDirection.lerp(toDirection, t).normalize()
    const length = from.joints[start].distanceTo(from.joints[end])
    joints[end] = step(joints[start], direction, length)
  }
  return {
    ...to,
    joints,
    faceDirection: from.faceDirection.clone().lerp(to.faceDirection, t).normalize(),
    headUp: from.headUp.clone().lerp(to.headUp, t).normalize(),
  }
}

/** 頸→頭の向き。頭頂の向き（headUp）が正しいかの基準になる */
export function neckToHead(pose: RigPose): THREE.Vector3 {
  return pose.joints.head.clone().sub(pose.joints.neck).normalize()
}

/** 骨盤→頸の体幹軸 */
export function bodyAxis(pose: RigPose): THREE.Vector3 {
  return pose.joints.neck.clone().sub(pose.joints.pelvis).normalize()
}

/** 患者左を指す肩幅軸 */
export function widthAxis(pose: RigPose): THREE.Vector3 {
  return pose.joints.shoulderLeft.clone().sub(pose.joints.shoulderRight).normalize()
}

const swapSide = (name: string) =>
  name.includes('Left') ? name.replace('Left', 'Right')
  : name.includes('Right') ? name.replace('Right', 'Left')
  : name

/**
 * 左右を反転したポーズを返す。
 *
 * 画像の水平反転ではなくポーズデータを反転するのは、キーライトが非対称なため。
 * 画像を反転すると陰の向きが画像間で揃わなくなる。
 */
export function mirrorPose(pose: RigPose): RigPose {
  const flip = (vector: THREE.Vector3) => new THREE.Vector3(-vector.x, vector.y, vector.z)
  const joints: Record<string, THREE.Vector3> = {}
  for (const [name, point] of Object.entries(pose.joints)) joints[swapSide(name)] = flip(point)
  return {
    ...pose,
    id: `${pose.id}-mirrored`,
    joints,
    faceDirection: flip(pose.faceDirection),
    headUp: flip(pose.headUp),
    fallSide: pose.fallSide === 'left' ? 'right' : pose.fallSide === 'right' ? 'left' : undefined,
  }
}
