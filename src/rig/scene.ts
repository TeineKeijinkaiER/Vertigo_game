import * as THREE from 'three'
import {
  HEAD_RADIUS, TREE, V, bodyAxis, unit, widthAxis,
  type Maneuver, type RigPose,
} from './poses'

const SKIN = 0xf1aa82
const SKIN_SHADOW = 0xd98268
const HAIR = 0x39261f
const SHIRT = 0x258bc6
const SHIRT_DARK = 0x17658f
const TROUSERS = 0x32475f
const SHOES = 0xf2f4f5
const BONE = 0xffd348
/** マットレス上面の高さ。患者はこの高さに載る */
export const BED_TOP = 0.88
const HEAD_SCALE = HEAD_RADIUS / 0.23
const LOWER_LIMB = /^(hip|knee|ankle|toe)/

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

export function faceQuaternion(forwardInput: THREE.Vector3, upInput: THREE.Vector3) {
  const forward = unit(forwardInput)
  let right = unit(upInput).cross(forward)
  if (right.lengthSq() < 0.01) right = V(1, 0, 0)
  right.normalize()
  const up = forward.clone().cross(right).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward))
}

/** features グループ座標系での頭部楕円体の半径（x, y, z） */
export const FACE_RADII: readonly [number, number, number] = [
  (HEAD_RADIUS * 0.90) / HEAD_SCALE,
  (HEAD_RADIUS * 1.05) / HEAD_SCALE,
  (HEAD_RADIUS * 0.94) / HEAD_SCALE,
]

/**
 * 顔パーツを頭の表面に貼り付けるための z 座標。
 *
 * 頭は scale(0.90, 1.05, 0.94) の楕円体なので、中心の z で揃えると
 * 目や頬のように外側にあるパーツほど表面から浮いて見える。
 * sink はパーツを表面から少し埋める量。
 */
export function faceSurfaceZ(x: number, y: number, sink = 0.012): number {
  const [a, b, c] = FACE_RADII
  const remainder = 1 - (x / a) ** 2 - (y / b) ** 2
  return c * Math.sqrt(Math.max(0.05, remainder)) - sink
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
  const hair = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 1.025, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.33), mat(HAIR))
  hair.position.y = 0.018 * HEAD_SCALE
  group.add(hair)
  // 後頭部・側頭部。頭頂の帽子だけだと横や後ろから見て地肌が出る。
  //
  // 方位角を切って前面を空けると、その境界が顔を縦に横切る硬いエッジになり、
  // 顔が肌色の窓に押し込まれたように見える。方位角は全周のまま、椀を後ろへ
  // ずらして前縁を額の高さに置くことで、継ぎ目のない自然な生え際にする。
  const backHair = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RADIUS * 1.02, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.66),
    mat(HAIR),
  )
  backHair.scale.set(0.92, 1.03, 0.92)
  backHair.position.set(0, 0, -0.085)
  group.add(backHair)
  // 生え際を尖らせる。滑らかなドームだと帽子をかぶって見える
  const spikeCount = 14
  const spikeTheta = Math.PI * 0.33
  for (let index = 0; index < spikeCount; index += 1) {
    const phi = (index / spikeCount) * Math.PI * 2
    const length = index % 2 === 0 ? 0.085 : 0.055
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.030, length, 6), mat(HAIR))
    const normal = new THREE.Vector3(
      Math.sin(spikeTheta) * Math.sin(phi),
      Math.cos(spikeTheta),
      Math.sin(spikeTheta) * Math.cos(phi),
    )
    const seat = normal.clone().multiply(V(0.90, 1.05, 0.94)).multiplyScalar(HEAD_RADIUS * 1.02)
    spike.position.copy(seat).addScaledVector(normal, length * 0.25)
    spike.position.y += 0.012 * HEAD_SCALE
    spike.quaternion.setFromUnitVectors(V(0, 1, 0), normal)
    group.add(spike)
  }
  const features = new THREE.Group()
  features.scale.setScalar(HEAD_SCALE)
  group.add(features)
  for (const x of [-0.082, 0.082]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.044, 18, 14), mat(0xffffff))
    eye.scale.set(0.84, 1.10, 0.32); eye.position.set(x, 0, faceSurfaceZ(x, 0, 0.022)); features.add(eye)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), mat(0x392a25))
    iris.scale.z = 0.42; iris.position.set(x, -0.004, faceSurfaceZ(x, -0.004, 0.006)); features.add(iris)
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), mat(0xffffff))
    shine.position.set(x - 0.006, 0.004, faceSurfaceZ(x - 0.006, 0.004, 0.0)); features.add(shine)
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.052, 5, 9), mat(HAIR))
    brow.rotation.z = Math.PI / 2 + (x < 0 ? -0.08 : 0.08); brow.position.set(x, 0.061, faceSurfaceZ(x, 0.061, 0.014)); features.add(brow)
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.068, 16), mat(0xd97d63))
  nose.position.set(0, -0.02, faceSurfaceZ(0, -0.02, 0.006)); nose.rotation.x = Math.PI / 2; features.add(nose)
  const smile = new THREE.QuadraticBezierCurve3(
    V(-0.05, -0.084, faceSurfaceZ(-0.05, -0.084, 0.004)),
    V(0, -0.116, faceSurfaceZ(0, -0.116, -0.004)),
    V(0.05, -0.084, faceSurfaceZ(0.05, -0.084, 0.004)),
  )
  features.add(new THREE.Mesh(new THREE.TubeGeometry(smile, 18, 0.007, 8, false), mat(0x8d3842)))
  for (const x of [-0.127, 0.127]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), mat(0xef8c83))
    cheek.scale.z = 0.2; cheek.position.set(x, -0.052, faceSurfaceZ(x, -0.052, 0.020)); features.add(cheek)
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.039 * HEAD_SCALE, 14, 10), mat(SKIN))
    ear.scale.set(0.55, 1, 0.65); ear.position.set((x < 0 ? -0.222 : 0.222) * HEAD_SCALE, 0, 0); group.add(ear)
  }
  return group
}

export function makePatient(
  pose: RigPose,
  options: { skeleton?: boolean; noseArrow?: boolean } = {},
): THREE.Group {
  const { skeleton = false, noseArrow = true } = options
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
  if (noseArrow) group.add(new THREE.ArrowHelper(pose.faceDirection, j.head, 0.48, 0xe23b32, 0.12, 0.07))
  if (skeleton) {
    const lineMaterial = new THREE.LineBasicMaterial({ color: BONE, depthTest: false })
    for (const [start, end] of TREE) {
      if (pose.upperBodyOnly && LOWER_LIMB.test(end)) continue
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([j[start], j[end]]), lineMaterial); line.renderOrder = 10; group.add(line)
    }
    const skeletonPoints = pose.upperBodyOnly
      ? Object.entries(j).filter(([name]) => !LOWER_LIMB.test(name)).map(([, point]) => point)
      : Object.values(j)
    for (const point of skeletonPoints) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(BONE)); marker.position.copy(point); marker.renderOrder = 11; group.add(marker)
    }
  }
  return group
}

export function makeRoom(maneuver: Maneuver, options: { floor?: boolean } = {}): THREE.Group {
  const { floor: withFloor = true } = options
  const group = new THREE.Group()
  if (withFloor) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat(0xd6d9d8))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    group.add(floor)
  }
  const transverse = maneuver.bedAxis === 'transverse'
  const bedWidth = transverse ? 5.4 : 2.35
  const bedLength = transverse ? 2.35 : 5.4
  const mattressWidth = transverse ? 5.25 : 2.28
  const mattressLength = transverse ? 2.28 : 5.25
  const base = new THREE.Mesh(new THREE.BoxGeometry(bedWidth, 0.28, bedLength), mat(0x59676d)); base.position.set(0, 0.58, 0); base.castShadow = true; group.add(base)
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(mattressWidth, 0.16, mattressLength), mat(0xc8e2e6)); mattress.position.set(0, BED_TOP - 0.08, 0); mattress.castShadow = true; mattress.receiveShadow = true; group.add(mattress)
  const legXs = transverse ? [-2.1, 2.1] : [-0.92, 0.92]
  const legZs = transverse ? [-0.92, 0.92] : [-2.1, 2.1]
  for (const x of legXs) for (const z of legZs) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.55, 0.11), mat(0x59676d)); leg.position.set(x, 0.275, z); group.add(leg) }
  if (maneuver.pillow === 'shoulder') {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.28, 0.58), mat(0xf5f6f2)); pillow.position.set(0, 1.06, -0.22); pillow.rotation.x = -0.06; pillow.castShadow = true; group.add(pillow)
  }
  return group
}

export function positionCamera(camera: THREE.PerspectiveCamera, maneuver: Maneuver, view: 'review' | 'oblique'): void {
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

export type View = 'front' | 'lateral' | 'cranial'
export type Framing = 'full' | 'upper' | 'head'

/** カメラが向く方向。カメラ位置は注視点からこの逆向きに離れた場所になる */
export function viewDirection(pose: RigPose, view: View): THREE.Vector3 {
  if (view === 'front') return pose.faceDirection.clone().negate()
  if (view === 'lateral') return widthAxis(pose)
  // 「頭の方から見た図」は真上からの俯瞰。体軸の延長から覗くと頭頂＝髪しか
  // 見えず、頸を前屈したポーズでは顔が視線と直交して完全に隠れる。
  // 体軸が鉛直に近いポーズ（坐位）だけは俯瞰にできないので体軸沿いに退避する
  if (Math.abs(bodyAxis(pose).y) > 0.9) return bodyAxis(pose).clone().negate()
  return V(0, -1, 0)
}

/**
 * 画面の上方向。
 *
 * 通常は世界の上方向を使う。床と天井の区別が臨床的な意味を持つため。
 * 俯瞰では世界の上方向が視線と平行になって使えないので、体軸を使い
 * 頭が画面上に来るようにする。顔の向きを使うと、頭部回旋のコマ送りで
 * 画像全体が回ってしまい動きが読めなくなる。
 */
export function screenUp(pose: RigPose, view: View): THREE.Vector3 {
  const direction = viewDirection(pose, view)
  if (Math.abs(direction.y) <= 0.95) return V(0, 1, 0)
  return bodyAxis(pose).clone()
}

/**
 * 頭関節のまわりに6方向の点を置き、頭部メッシュの体積を画角計算に含める。
 *
 * 関節座標だけを囲むと、頭の球（半径 HEAD_RADIUS、身長のおよそ15%）が
 * はみ出して頭頂が切れる。四肢や体幹の太さは margin で吸収できるが、
 * 頭の半径は吸収できない。全身・頭部寄りのどちらの画角でも必要。
 */
const headVolumePoints = (pose: RigPose): THREE.Vector3[] =>
  [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)].map((axis) =>
    pose.joints.head.clone().addScaledVector(axis, HEAD_RADIUS * 1.15),
  )

/** head は頭と肩に絞る。「体は動かさず頭だけ回す」ポーズで体幹の静止が見えるよう肩を含める */
export function framingPoints(pose: RigPose, framing: Framing): THREE.Vector3[] {
  if (framing === 'full') {
    return [...Object.values(pose.joints).map((point) => point.clone()), ...headVolumePoints(pose)]
  }
  if (framing === 'upper') {
    // 真上から寝ている人を見ると全身が細い棒になり、正方形フレームで人物が
    // 小さくなりすぎる。臥位の向きも顔の向きも上半身に出るので下肢を落とす
    const upper = Object.entries(pose.joints)
      .filter(([name]) => !LOWER_LIMB.test(name))
      .map(([, point]) => point.clone())
    return [...upper, ...headVolumePoints(pose)]
  }
  const core = ['head', 'neck', 'shoulderCenter', 'shoulderLeft', 'shoulderRight']
  return [...core.map((name) => pose.joints[name].clone()), ...headVolumePoints(pose)]
}

/**
 * 対象点の集合からカメラ距離と注視点を解く。視線と画面上方向は呼び出し側が決める。
 *
 * v7 はポーズごとにカメラ座標を手で打っていたため、人物が小さすぎたり
 * 肝心の回旋が見えない画角になっていた。ここを機械化するのが判読性の根治になる。
 * 画面上の上方向は常に世界の +Y にする。床と天井の区別が臨床的な意味を持つため。
 */
function fitPointsWithBasis(
  camera: THREE.PerspectiveCamera,
  points: THREE.Vector3[],
  direction: THREE.Vector3,
  worldUp: THREE.Vector3,
  margin: number,
): void {
  const right = worldUp.clone().cross(direction).normalize()
  const up = direction.clone().cross(right).normalize()

  let minRight = Infinity, maxRight = -Infinity
  let minUp = Infinity, maxUp = -Infinity
  let minDepth = Infinity
  for (const point of points) {
    const alongRight = point.dot(right)
    const alongUp = point.dot(up)
    const alongDepth = point.dot(direction)
    minRight = Math.min(minRight, alongRight); maxRight = Math.max(maxRight, alongRight)
    minUp = Math.min(minUp, alongUp); maxUp = Math.max(maxUp, alongUp)
    minDepth = Math.min(minDepth, alongDepth)
  }

  const centerRight = (minRight + maxRight) / 2
  const centerUp = (minUp + maxUp) / 2
  const halfWidth = ((maxRight - minRight) / 2) * (1 + margin)
  const halfHeight = ((maxUp - minUp) / 2) * (1 + margin)

  const target = right.clone().multiplyScalar(centerRight)
    .add(up.clone().multiplyScalar(centerUp))
    .add(direction.clone().multiplyScalar(minDepth))

  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2
  const distanceForHeight = halfHeight / Math.tan(halfFov)
  const distanceForWidth = halfWidth / (Math.tan(halfFov) * camera.aspect)
  const distance = Math.max(distanceForHeight, distanceForWidth)

  camera.up.copy(up)
  camera.position.copy(target).addScaledVector(direction, -distance)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}

/**
 * 被写体のバウンディングボックスからカメラ距離と注視点を解く。単一ポーズ用。
 */
export function fitCamera(
  camera: THREE.PerspectiveCamera,
  pose: RigPose,
  view: View,
  framing: Framing,
  margin = 0.08,
): void {
  const direction = viewDirection(pose, view)
  const worldUp = screenUp(pose, view)
  const points = framingPoints(pose, framing)
  fitPointsWithBasis(camera, points, direction, worldUp, margin)
}

/**
 * 複数のポーズをまとめて画角に収める。
 *
 * フィルムでは全フレームで同じカメラを使う。視線と画面上方向は基準ポーズから
 * 決め、距離は全キーポーズの framing 点を囲めるように取る。フレームごとに
 * 画角を計算し直すと、視線がポーズ相対なので映像が揺れる。
 */
export function fitCameraToPoses(
  camera: THREE.PerspectiveCamera,
  poses: RigPose[],
  view: View,
  framing: Framing,
  margin = 0.08,
): void {
  const reference = poses[0]
  const direction = viewDirection(reference, view)
  const worldUp = screenUp(reference, view)
  const points = poses.flatMap((pose) => framingPoints(pose, framing))
  fitPointsWithBasis(camera, points, direction, worldUp, margin)
}

export type ArrowKind = 'fall-left' | 'fall-right' | 'roll-left' | 'roll-right'

const ARROW_COLOR = 0xe23b32

/**
 * 図の一部として描く方向指示。鼻方向のデバッグ矢印とは別物で、書き出しにも含める。
 *
 * 弧ではなく直線にしているのは、仰臥位を真上から見る画角では体軸まわりの弧が
 * 画面に対して真横を向き、線に潰れて読めなくなるため。倒れる向きも回す向きも
 * 「患者のどちら側へ動くか」なので、肩幅軸に沿った直線で表せる。
 */
export function makeDirectionArrow(pose: RigPose, kind: ArrowKind): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshToonMaterial({ color: ARROW_COLOR })
  const towards = widthAxis(pose).multiplyScalar(kind.endsWith('left') ? 1 : -1)
  const origin = pose.joints.shoulderCenter.clone()
  const start = origin.clone().addScaledVector(towards, 0.55)
  const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.55, 6, 12), material)
  shaft.position.copy(start).addScaledVector(towards, 0.35)
  shaft.quaternion.setFromUnitVectors(V(0, 1, 0), towards)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 16), material)
  tip.position.copy(start).addScaledVector(towards, 0.78)
  tip.quaternion.setFromUnitVectors(V(0, 1, 0), towards)
  group.add(shaft, tip)
  return group
}
