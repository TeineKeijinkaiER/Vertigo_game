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
const HEAD_SCALE = HEAD_RADIUS / 0.23

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
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(mattressWidth, 0.16, mattressLength), mat(0xc8e2e6)); mattress.position.set(0, 0.80, 0); mattress.castShadow = true; mattress.receiveShadow = true; group.add(mattress)
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
export type Framing = 'full' | 'head'

/** カメラが向く方向。カメラ位置は注視点からこの逆向きに離れた場所になる */
export function viewDirection(pose: RigPose, view: View): THREE.Vector3 {
  if (view === 'front') return pose.faceDirection.clone().negate()
  if (view === 'lateral') return widthAxis(pose)
  return bodyAxis(pose).negate()
}

/** head は頭と肩に絞る。「体は動かさず頭だけ回す」ポーズで体幹の静止が見えるよう肩を含める */
export function framingPoints(pose: RigPose, framing: Framing): THREE.Vector3[] {
  if (framing === 'full') return Object.values(pose.joints).map((point) => point.clone())
  const core = ['head', 'neck', 'shoulderCenter', 'shoulderLeft', 'shoulderRight']
  const points = core.map((name) => pose.joints[name].clone())
  // 頭部の体積を含めるため、頭関節まわりに軸方向の6点を足す
  for (const axis of [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)]) {
    points.push(pose.joints.head.clone().add(axis.multiplyScalar(HEAD_RADIUS * 1.15)))
  }
  return points
}

/**
 * 被写体のバウンディングボックスからカメラ距離と注視点を解く。
 *
 * v7 はポーズごとにカメラ座標を手で打っていたため、人物が小さすぎたり
 * 肝心の回旋が見えない画角になっていた。ここを機械化するのが判読性の根治になる。
 * 画面上の上方向は常に世界の +Y にする。床と天井の区別が臨床的な意味を持つため。
 */
export function fitCamera(
  camera: THREE.PerspectiveCamera,
  pose: RigPose,
  view: View,
  framing: Framing,
  margin = 0.08,
): void {
  const direction = viewDirection(pose, view)
  const worldUp = Math.abs(direction.y) > 0.95 ? pose.faceDirection.clone() : V(0, 1, 0)
  const right = worldUp.clone().cross(direction).normalize()
  const up = direction.clone().cross(right).normalize()

  const points = framingPoints(pose, framing)
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

export type ArrowKind = 'fall-left' | 'fall-right' | 'roll-left' | 'roll-right'

const ARROW_COLOR = 0xe23b32

/** 図の一部として描く方向指示。鼻方向のデバッグ矢印とは別物で、書き出しにも含める */
export function makeDirectionArrow(pose: RigPose, kind: ArrowKind): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshToonMaterial({ color: ARROW_COLOR })
  const origin = pose.joints.shoulderCenter.clone()

  if (kind === 'fall-left' || kind === 'fall-right') {
    const towards = widthAxis(pose).multiplyScalar(kind === 'fall-left' ? 1 : -1)
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

  const axis = bodyAxis(pose)
  const sign = kind === 'roll-left' ? 1 : -1
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 8, 32, Math.PI * 0.75), material)
  arc.position.copy(origin)
  arc.quaternion.setFromUnitVectors(V(0, 0, 1), axis.clone().multiplyScalar(sign))
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 16), material)
  const tipAngle = Math.PI * 0.75
  tip.position.copy(origin).add(
    new THREE.Vector3(Math.cos(tipAngle) * 0.85, Math.sin(tipAngle) * 0.85, 0)
      .applyQuaternion(arc.quaternion),
  )
  tip.quaternion.copy(arc.quaternion)
  group.add(arc, tip)
  return group
}
