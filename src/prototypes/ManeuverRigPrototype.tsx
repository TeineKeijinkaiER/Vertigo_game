import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import './dixHallpikeRig.css'

type ViewId = 'review' | 'oblique'
type ManeuverId = 'dix-hallpike' | 'epley' | 'gufoni-geotropic' | 'gufoni-apogeotropic' | 'supine-roll'

type RigPose = {
  id: string
  label: string
  note: string
  holdMs: number
  joints: Record<string, THREE.Vector3>
  faceDirection: THREE.Vector3
  headUp: THREE.Vector3
  upperBodyOnly?: boolean
}

type Maneuver = {
  id: ManeuverId
  shortLabel: string
  title: string
  subtitle: string
  camera: 'posterior' | 'lateral'
  bedAxis: 'longitudinal' | 'transverse'
  pillow: 'shoulder' | 'none'
  poses: RigPose[]
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const unit = (vector: THREE.Vector3) => vector.clone().normalize()
const step = (origin: THREE.Vector3, direction: THREE.Vector3, length: number) =>
  origin.clone().add(unit(direction).multiplyScalar(length))

const SKIN = 0xf1aa82
const SKIN_SHADOW = 0xd98268
const HAIR = 0x39261f
const SHIRT = 0x258bc6
const SHIRT_DARK = 0x17658f
const TROUSERS = 0x32475f
const SHOES = 0xf2f4f5
const BONE = 0xffd348
const HEAD_RADIUS = 0.29
const HEAD_SCALE = HEAD_RADIUS / 0.23

const LENGTHS = {
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

function makePose(recipe: PoseRecipe): RigPose {
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
  const width = V(0, 1, 0)
  const face = nose === 'front' ? V(0, 0, 1) : nose === 'down' ? V(0, -1, 0.08) : V(0, 1, 0.08)
  return makePose({
    id, label, note, holdMs: 1500, pelvis: V(0, 1.00, 0.88), body, width, head: body, face,
    headUp: nose === 'down' ? V(-direction, 0, 0) : V(direction, 0, 0),
    thighs: V(-direction, 0, -0.05), shins: V(-direction, 0, -0.05),
    arms: V(-direction, 0.05, 0.15), forearms: V(-direction, 0.05, 0.12),
  })
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

const MANEUVERS: Record<ManeuverId, Maneuver> = {
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
      supine('roll-right', '2. 右へ90°', '眼振を観察し、消退するまで保持', V(-1, 0, 0)),
      supine('roll-center', '3. 正中へ戻す', '誘発反応が消退してから反対側へ', V(0, 0.50, 0.866)),
      supine('roll-left', '4. 左へ90°', '反対側の眼振方向と強度を観察', V(1, 0, 0)),
    ],
  },
}

const TREE: Array<[string, string]> = [
  ['pelvis', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['pelvis', 'shoulderCenter'],
  ['shoulderCenter', 'shoulderLeft'], ['shoulderCenter', 'shoulderRight'],
  ['pelvis', 'hipLeft'], ['pelvis', 'hipRight'],
  ['shoulderLeft', 'elbowLeft'], ['elbowLeft', 'wristLeft'], ['wristLeft', 'handLeft'],
  ['shoulderRight', 'elbowRight'], ['elbowRight', 'wristRight'], ['wristRight', 'handRight'],
  ['hipLeft', 'kneeLeft'], ['kneeLeft', 'ankleLeft'], ['ankleLeft', 'toeLeft'],
  ['hipRight', 'kneeRight'], ['kneeRight', 'ankleRight'], ['ankleRight', 'toeRight'],
]

function validateRig() {
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

function interpolatePose(from: RigPose, to: RigPose, t: number): RigPose {
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

const mat = (color: number) => new THREE.MeshToonMaterial({ color })
function segment(start: THREE.Vector3, end: THREE.Vector3, radius: number, color: number) {
  const length = start.distanceTo(end)
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 10, 18), mat(color))
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), end.clone().sub(start).normalize())
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function faceQuaternion(forwardInput: THREE.Vector3, upInput: THREE.Vector3) {
  const forward = unit(forwardInput)
  let right = unit(upInput).cross(forward)
  if (right.lengthSq() < 0.01) right = V(1, 0, 0)
  right.normalize()
  const up = forward.clone().cross(right).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward))
}

function makeHead(pose: RigPose) {
  const group = new THREE.Group()
  group.position.copy(pose.joints.head)
  group.quaternion.copy(faceQuaternion(pose.faceDirection, pose.headUp))
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 32, 24), mat(SKIN))
  head.scale.set(0.90, 1.05, 0.94)
  head.castShadow = true
  group.add(head)
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.72, 24, 16), mat(SKIN_SHADOW))
  jaw.scale.set(0.86, 0.60, 0.80)
  jaw.position.set(0, -0.12 * HEAD_SCALE, 0.025 * HEAD_SCALE)
  group.add(jaw)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 1.025, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.46), mat(HAIR))
  hair.position.y = 0.018 * HEAD_SCALE
  group.add(hair)
  const features = new THREE.Group()
  features.scale.setScalar(HEAD_SCALE)
  group.add(features)
  for (const x of [-0.082, 0.082]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.044, 18, 14), mat(0xffffff))
    eye.scale.set(0.84, 1.10, 0.32); eye.position.set(x, 0, 0.207); features.add(eye)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), mat(0x392a25))
    iris.scale.z = 0.42; iris.position.set(x, -0.004, 0.228); features.add(iris)
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), mat(0xffffff))
    shine.position.set(x - 0.006, 0.004, 0.244); features.add(shine)
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.052, 5, 9), mat(HAIR))
    brow.rotation.z = Math.PI / 2 + (x < 0 ? -0.08 : 0.08); brow.position.set(x, 0.061, 0.205); features.add(brow)
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.068, 16), mat(0xd97d63))
  nose.position.set(0, -0.02, 0.235); nose.rotation.x = Math.PI / 2; features.add(nose)
  const smile = new THREE.QuadraticBezierCurve3(V(-0.05, -0.084, 0.216), V(0, -0.116, 0.239), V(0.05, -0.084, 0.216))
  features.add(new THREE.Mesh(new THREE.TubeGeometry(smile, 18, 0.007, 8, false), mat(0x8d3842)))
  for (const x of [-0.127, 0.127]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), mat(0xef8c83))
    cheek.scale.z = 0.2; cheek.position.set(x, -0.052, 0.202); features.add(cheek)
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.039 * HEAD_SCALE, 14, 10), mat(SKIN))
    ear.scale.set(0.55, 1, 0.65); ear.position.set((x < 0 ? -0.222 : 0.222) * HEAD_SCALE, 0, 0); group.add(ear)
  }
  return group
}

function makePatient(pose: RigPose, showSkeleton: boolean, showDirection = true) {
  const group = new THREE.Group()
  const j = pose.joints
  const lowerTorso = segment(j.pelvis, j.chest, 0.225, SHIRT_DARK); lowerTorso.scale.set(1.22, 1, 0.77); group.add(lowerTorso)
  const upperTorso = segment(j.chest, j.neck, 0.235, SHIRT); upperTorso.scale.set(1.32, 1, 0.80); group.add(upperTorso)
  group.add(segment(j.shoulderCenter, j.shoulderLeft, 0.095, SHIRT), segment(j.shoulderCenter, j.shoulderRight, 0.095, SHIRT))
  group.add(segment(j.neck, j.head, 0.075, SKIN))
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 24), mat(0xe8f2f5)); collar.position.copy(j.neck); collar.quaternion.setFromUnitVectors(V(0, 0, 1), j.neck.clone().sub(j.chest).normalize()); group.add(collar)
  if (!pose.upperBodyOnly) {
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), mat(TROUSERS)); pelvis.scale.set(1.35, 0.72, 0.92); pelvis.position.copy(j.pelvis); pelvis.castShadow = true; group.add(pelvis)
  }
  for (const side of ['Left', 'Right'] as const) {
    if (!pose.upperBodyOnly) group.add(segment(j[`hip${side}`], j[`knee${side}`], 0.112, TROUSERS), segment(j[`knee${side}`], j[`ankle${side}`], 0.093, TROUSERS))
    const shoulder = j[`shoulder${side}`]; const elbow = j[`elbow${side}`]; const sleeveEnd = shoulder.clone().lerp(elbow, 0.32)
    group.add(segment(shoulder, sleeveEnd, 0.112, SHIRT), segment(sleeveEnd, elbow, 0.075, SKIN), segment(elbow, j[`wrist${side}`], 0.066, SKIN))
    const palm = segment(j[`wrist${side}`], j[`hand${side}`], 0.079, SKIN); palm.scale.x = 1.08; group.add(palm)
    if (!pose.upperBodyOnly) { const shoe = segment(j[`ankle${side}`], j[`toe${side}`], 0.105, SHOES); shoe.scale.set(1.05, 1, 0.78); group.add(shoe) }
    const visibleJoints: Array<[THREE.Vector3, number, number]> = [[shoulder, 0.112, SHIRT], [elbow, 0.076, SKIN], [j[`wrist${side}`], 0.069, SKIN]]
    if (!pose.upperBodyOnly) visibleJoints.push([j[`knee${side}`], 0.105, TROUSERS], [j[`ankle${side}`], 0.098, SHOES])
    for (const [point, radius, color] of visibleJoints) {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), mat(color)); joint.position.copy(point); joint.castShadow = true; group.add(joint)
    }
  }
  group.add(makeHead(pose))
  if (showDirection) group.add(new THREE.ArrowHelper(pose.faceDirection, j.head, 0.48, 0xe23b32, 0.12, 0.07))
  if (showSkeleton) {
    const lineMaterial = new THREE.LineBasicMaterial({ color: BONE, depthTest: false })
    for (const [start, end] of TREE) {
      if (pose.upperBodyOnly && /^(hip|knee|ankle|toe)/.test(end)) continue
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([j[start], j[end]]), lineMaterial); line.renderOrder = 10; group.add(line)
    }
    const skeletonPoints = pose.upperBodyOnly
      ? Object.entries(j).filter(([name]) => !/^(hip|knee|ankle|toe)/.test(name)).map(([, point]) => point)
      : Object.values(j)
    for (const point of skeletonPoints) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(BONE)); marker.position.copy(point); marker.renderOrder = 11; group.add(marker)
    }
  }
  return group
}

function makeRoom(maneuver: Maneuver) {
  const group = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat(0xd6d9d8)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor)
  const transverse = maneuver.bedAxis === 'transverse'
  const bedWidth = transverse ? 5.4 : 2.35
  const bedLength = transverse ? 2.35 : 5.4
  const mattressWidth = transverse ? 5.25 : 2.28
  const mattressLength = transverse ? 2.28 : 5.25
  const base = new THREE.Mesh(new THREE.BoxGeometry(bedWidth, 0.28, bedLength), mat(0x59676d)); base.position.set(0, 0.58, 0); base.castShadow = true; group.add(base)
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(mattressWidth, 0.16, mattressLength), mat(0xc8e2e6)); mattress.position.set(0, 0.80, 0); mattress.castShadow = true; mattress.receiveShadow = true; group.add(mattress)
  const legXs = transverse ? [-2.1, 2.1] : [-0.92, 0.92]
  const legZs = transverse ? [-0.92, 0.92] : [-2.1, 2.1]
  for (const x of legXs) for (const z of legZs) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.55, 0.11), mat(0x59676d)); leg.position.set(x, 0.275, z); group.add(leg) }
  if (maneuver.pillow === 'shoulder') {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.28, 0.58), mat(0xf5f6f2)); pillow.position.set(0, 1.06, -0.22); pillow.rotation.x = -0.06; pillow.castShadow = true; group.add(pillow)
  }
  return group
}

function positionCamera(camera: THREE.PerspectiveCamera, maneuver: Maneuver, view: ViewId) {
  if (maneuver.id === 'supine-roll') {
    camera.position.set(view === 'review' ? 0 : -3.2, view === 'review' ? 3.35 : 3.2, view === 'review' ? 3.9 : -1.8)
    camera.lookAt(0, 1.22, -0.55)
  } else if (maneuver.camera === 'lateral') {
    camera.position.set(0, view === 'review' ? 3.25 : 3.9, view === 'review' ? 6.8 : 5.2)
    camera.lookAt(0, 1.08, 0.20)
  } else {
    camera.position.set(view === 'review' ? 0 : -5.8, view === 'review' ? 3.85 : 4.3, view === 'review' ? 7.5 : -3.5)
    camera.lookAt(0.18, 1.18, -0.12)
  }
}

export function ManeuverRigPrototype() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialManeuver = params.get('maneuver') as ManeuverId | null
  const exportMode = params.get('export') === '1'
  const selectedManeuver = initialManeuver && initialManeuver in MANEUVERS ? initialManeuver : 'dix-hallpike'
  const selectedPoses = MANEUVERS[selectedManeuver].poses
  const requestedPose = Math.min(selectedPoses.length - 1, Math.max(0, Number(params.get('pose') ?? 0) || 0))
  const tweenFrom = Math.min(selectedPoses.length - 1, Math.max(0, Number(params.get('from') ?? requestedPose) || 0))
  const tweenTo = Math.min(selectedPoses.length - 1, Math.max(0, Number(params.get('to') ?? requestedPose) || 0))
  const tweenT = Math.min(1, Math.max(0, Number(params.get('t') ?? 1) || 0))
  const initialPose = params.has('from')
    ? interpolatePose(selectedPoses[tweenFrom], selectedPoses[tweenTo], tweenT)
    : selectedPoses[requestedPose]
  const [maneuverId, setManeuverId] = useState<ManeuverId>(selectedManeuver)
  const [poseIndex, setPoseIndex] = useState(requestedPose)
  const [view, setView] = useState<ViewId>(params.get('view') === 'oblique' ? 'oblique' : 'review')
  const [showSkeleton, setShowSkeleton] = useState(params.get('skeleton') === '1')
  const [playing, setPlaying] = useState(false)
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const patientRef = useRef<THREE.Group | null>(null)
  const roomRef = useRef<THREE.Group | null>(null)
  const transitionRef = useRef<{ from: RigPose; to: RigPose; start: number; duration: number } | null>(null)
  const currentPoseRef = useRef(initialPose)
  const maneuver = MANEUVERS[maneuverId]

  const renderPatient = (pose: RigPose) => {
    const scene = sceneRef.current
    if (!scene) return
    if (patientRef.current) scene.remove(patientRef.current)
    patientRef.current = makePatient(pose, showSkeleton, !exportMode)
    scene.add(patientRef.current)
    currentPoseRef.current = pose
  }

  const renderRoom = (nextManeuver: Maneuver) => {
    const scene = sceneRef.current
    if (!scene) return
    if (roomRef.current) scene.remove(roomRef.current)
    roomRef.current = makeRoom(nextManeuver)
    scene.add(roomRef.current)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9edec); scene.fog = new THREE.Fog(0xe9edec, 8, 14)
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50); positionCamera(camera, maneuver, view)
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; mount.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x687982, 2.25))
    const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(3.5, 7, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key)
    const resize = () => { const width = Math.max(1, mount.clientWidth); const height = Math.max(1, mount.clientHeight); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix() }
    resize(); const observer = new ResizeObserver(resize); observer.observe(mount)
    sceneRef.current = scene; cameraRef.current = camera; renderRoom(maneuver); renderPatient(currentPoseRef.current)
    let animationFrame = 0
    const draw = (now: number) => {
      const transition = transitionRef.current
      if (transition) {
        const raw = Math.min(1, (now - transition.start) / transition.duration); const eased = raw * raw * (3 - 2 * raw)
        renderPatient(interpolatePose(transition.from, transition.to, eased))
        if (raw >= 1) transitionRef.current = null
      }
      renderer.render(scene, camera)
      mount.dataset.ready = '1'
      animationFrame = requestAnimationFrame(draw)
    }
    animationFrame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animationFrame); observer.disconnect(); renderer.dispose(); mount.removeChild(renderer.domElement); sceneRef.current = null; cameraRef.current = null }
  }, [])

  useEffect(() => {
    if (cameraRef.current) positionCamera(cameraRef.current, maneuver, view)
    renderRoom(maneuver)
  }, [maneuver, view])
  useEffect(() => { renderPatient(currentPoseRef.current) }, [showSkeleton])

  const goToPose = (next: number) => {
    const target = maneuver.poses[next]
    transitionRef.current = { from: currentPoseRef.current, to: target, start: performance.now(), duration: 720 }
    setPoseIndex(next)
  }
  const chooseManeuver = (id: ManeuverId) => {
    setPlaying(false); setManeuverId(id); setPoseIndex(0); transitionRef.current = null; currentPoseRef.current = MANEUVERS[id].poses[0]; renderPatient(currentPoseRef.current)
  }

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      const next = (poseIndex + 1) % maneuver.poses.length
      goToPose(next)
    }, maneuver.poses[poseIndex].holdMs)
    return () => window.clearTimeout(timer)
  }, [playing, poseIndex, maneuver])

  const pose = maneuver.poses[poseIndex]
  return (
    <main className={`rig-prototype${exportMode ? ' rig-prototype--export' : ''}`}>
      {!exportMode && <header className="rig-header">
        <div><p className="rig-kicker">CLINICAL MANEUVER / FIXED 3D RIG</p><h1>{maneuver.title}</h1><p className="rig-subtitle">{maneuver.subtitle}</p></div>
        <span className="rig-status">臨床レビュー前</span>
      </header>}
      <section className="rig-stage" aria-label={`${maneuver.title} 3D pose review`}>
        <div ref={mountRef} className="rig-canvas" />
        {!exportMode && <div className="rig-readout" aria-live="polite"><strong>{pose.label}</strong><span>{pose.note}</span></div>}
        {!exportMode && <div className="rig-axis-key"><span />赤線：鼻の向き</div>}
      </section>
      {!exportMode && <nav className="rig-controls" aria-label="Maneuver, pose, and camera controls">
        <div className="rig-maneuver-tabs">
          {(Object.keys(MANEUVERS) as ManeuverId[]).map((id) => <button key={id} type="button" className={id === maneuverId ? 'active' : ''} onClick={() => chooseManeuver(id)}>{MANEUVERS[id].shortLabel}</button>)}
        </div>
        <div className="rig-segment rig-segment--poses" style={{ '--pose-count': maneuver.poses.length } as React.CSSProperties}>
          {maneuver.poses.map((item, index) => <button key={item.id} type="button" className={index === poseIndex ? 'active' : ''} onClick={() => goToPose(index)}>{item.label}</button>)}
        </div>
        <div className="rig-control-row">
          <button type="button" className={`rig-play ${playing ? 'active' : ''}`} onClick={() => setPlaying((value) => !value)}>{playing ? '一時停止' : '自動再生'}</button>
          <div className="rig-segment rig-segment--small">
            <button type="button" className={view === 'review' ? 'active' : ''} onClick={() => setView('review')}>基準視点</button>
            <button type="button" className={view === 'oblique' ? 'active' : ''} onClick={() => setView('oblique')}>斜位</button>
          </div>
          <label className="rig-toggle"><input type="checkbox" checked={showSkeleton} onChange={(event) => setShowSkeleton(event.target.checked)} /><span>骨格表示</span></label>
        </div>
      </nav>}
      {!exportMode && <footer className="rig-footer"><span>患者リグ・骨長は共通／ベッド・枕・画角は手技別</span><span>教育用図解・臨床承認前</span><a href="https://www.entnet.org/quality-practice/quality-products/clinical-practice-guidelines/bppv/" target="_blank" rel="noreferrer">AAO-HNS BPPV guideline</a></footer>}
    </main>
  )
}
