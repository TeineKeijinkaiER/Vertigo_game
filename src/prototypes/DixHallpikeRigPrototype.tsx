import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './dixHallpikeRig.css'

type PoseId = 'seated-neutral' | 'seated-right' | 'head-hanging-right'
type ViewId = 'foot' | 'side'

type RigPose = {
  id: PoseId
  label: string
  note: string
  joints: Record<string, THREE.Vector3>
  faceDirection: THREE.Vector3
  headAxis: THREE.Vector3
  headUp: THREE.Vector3
}

const SKIN = 0xf0ad88
const HAIR = 0x32241f
const SHIRT = 0x2d82bb
const TROUSERS = 0x31435a
const SHOES = 0xe6e9eb
const BONE = 0xffd348
const HEAD_RADIUS = 0.23
const MATTRESS_TOP = 0.88

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const scaled = (vector: THREE.Vector3, length: number) => vector.clone().normalize().multiplyScalar(length)

function makePose(id: PoseId): RigPose {
  const pelvis = V(0, 0.96, 0.42)
  const right = V(1, 0, 0)
  const seated = id !== 'head-hanging-right'
  const bodyAxis = seated ? V(0, 1, 0) : V(0, 0.36, -0.933)
  const legAxis = V(0, -0.055, 0.998)
  const chest = pelvis.clone().add(scaled(bodyAxis, 0.68))
  const neck = pelvis.clone().add(scaled(bodyAxis, 1.02))
  const headAxis = seated ? bodyAxis : V(0, -0.707, -0.707)
  const head = neck.clone().add(scaled(headAxis, 0.29))
  const shoulderCenter = pelvis.clone().add(scaled(bodyAxis, 0.84))
  const shoulderLeft = shoulderCenter.clone().addScaledVector(right, 0.3)
  const shoulderRight = shoulderCenter.clone().addScaledVector(right, -0.3)
  const hipLeft = pelvis.clone().addScaledVector(right, 0.16)
  const hipRight = pelvis.clone().addScaledVector(right, -0.16)
  const kneeLeft = hipLeft.clone().add(scaled(legAxis, 0.76))
  const kneeRight = hipRight.clone().add(scaled(legAxis, 0.76))
  const ankleLeft = kneeLeft.clone().add(scaled(legAxis, 0.70))
  const ankleRight = kneeRight.clone().add(scaled(legAxis, 0.70))

  const upperArmAxis = seated ? V(-0.08, -0.84, 0.54) : V(0.08, -0.04, 0.996)
  const forearmAxis = seated ? V(0.06, -0.45, 0.89) : V(-0.08, 0.02, 0.997)
  const elbowLeft = shoulderLeft.clone().add(scaled(upperArmAxis, 0.48))
  const elbowRight = shoulderRight.clone().add(scaled(upperArmAxis, 0.48))
  const wristLeft = elbowLeft.clone().add(scaled(forearmAxis, 0.43))
  const wristRight = elbowRight.clone().add(scaled(forearmAxis, 0.43))
  const handLeft = wristLeft.clone().add(scaled(forearmAxis, 0.16))
  const handRight = wristRight.clone().add(scaled(forearmAxis, 0.16))
  const toeLeft = ankleLeft.clone().add(scaled(legAxis, 0.24))
  const toeRight = ankleRight.clone().add(scaled(legAxis, 0.24))

  const faceDirection = (() => {
    if (id === 'seated-neutral') return V(0, 0, 1)
    if (id === 'seated-right') return V(-Math.SQRT1_2, 0, Math.SQRT1_2)
    // Face-up is tilted headward by the shoulder-supported extension, then yawed right.
    return V(-0.64, 0.54, -0.54).normalize()
  })()

  const labels: Record<PoseId, [string, string]> = {
    'seated-neutral': ['1. 座位・正面', '骨盤はベッド上。両下肢は長軸方向へ伸展'],
    'seated-right': ['2. 右45°回旋', '体幹と骨盤は固定し、頭部だけを検査側へ回旋'],
    'head-hanging-right': ['3. 後方へ倒す', '肩枕で胸郭を支持。右回旋を保ち頭部を後屈'],
  }

  return {
    id,
    label: labels[id][0],
    note: labels[id][1],
    joints: {
      pelvis,
      chest,
      neck,
      head,
      shoulderCenter,
      shoulderLeft,
      shoulderRight,
      hipLeft,
      hipRight,
      kneeLeft,
      kneeRight,
      ankleLeft,
      ankleRight,
      elbowLeft,
      elbowRight,
      wristLeft,
      wristRight,
      handLeft,
      handRight,
      toeLeft,
      toeRight,
    },
    faceDirection,
    headAxis,
    headUp: headAxis.clone(),
  }
}

const POSES: Record<PoseId, RigPose> = {
  'seated-neutral': makePose('seated-neutral'),
  'seated-right': makePose('seated-right'),
  'head-hanging-right': makePose('head-hanging-right'),
}

const BONE_PAIRS: Array<[string, string]> = [
  ['pelvis', 'chest'],
  ['chest', 'neck'],
  ['neck', 'head'],
  ['shoulderCenter', 'shoulderLeft'],
  ['shoulderCenter', 'shoulderRight'],
  ['shoulderLeft', 'elbowLeft'],
  ['elbowLeft', 'wristLeft'],
  ['wristLeft', 'handLeft'],
  ['shoulderRight', 'elbowRight'],
  ['elbowRight', 'wristRight'],
  ['wristRight', 'handRight'],
  ['hipLeft', 'kneeLeft'],
  ['kneeLeft', 'ankleLeft'],
  ['ankleLeft', 'toeLeft'],
  ['hipRight', 'kneeRight'],
  ['kneeRight', 'ankleRight'],
  ['ankleRight', 'toeRight'],
]

function validateRig() {
  const reference = POSES['seated-neutral']
  for (const pose of Object.values(POSES)) {
    if (pose.joints.pelvis.distanceTo(reference.joints.pelvis) > 1e-9) {
      throw new Error(`Pelvis drift in ${pose.id}`)
    }
    for (const [start, end] of BONE_PAIRS) {
      const expected = reference.joints[start].distanceTo(reference.joints[end])
      const actual = pose.joints[start].distanceTo(pose.joints[end])
      if (Math.abs(expected - actual) > 1e-9) throw new Error(`Bone length changed: ${pose.id} ${start}-${end}`)
    }
  }
  const hangingHead = POSES['head-hanging-right'].joints.head
  const lowestScalpPoint = hangingHead.y - HEAD_RADIUS * 1.05
  if (lowestScalpPoint < MATTRESS_TOP) {
    throw new Error(`Head intersects mattress by ${(MATTRESS_TOP - lowestScalpPoint).toFixed(3)}`)
  }
}

validateRig()

const material = (color: number) =>
  new THREE.MeshToonMaterial({ color, gradientMap: undefined })

function segment(start: THREE.Vector3, end: THREE.Vector3, radius: number, color: number) {
  const length = start.distanceTo(end)
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 8, 16)
  const mesh = new THREE.Mesh(geometry, material(color))
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), end.clone().sub(start).normalize())
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function faceQuaternion(forwardInput: THREE.Vector3, upInput: THREE.Vector3) {
  const forward = forwardInput.clone().normalize()
  let right = upInput.clone().normalize().cross(forward)
  if (right.lengthSq() < 0.01) right = V(1, 0, 0)
  right.normalize()
  const up = forward.clone().cross(right).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward))
}

function makeHead(pose: RigPose) {
  const group = new THREE.Group()
  group.position.copy(pose.joints.head)
  group.quaternion.copy(faceQuaternion(pose.faceDirection, pose.headUp))

  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 24, 18), material(SKIN))
  head.scale.set(0.92, 1.04, 0.96)
  head.castShadow = true
  group.add(head)

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RADIUS * 1.02, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    material(HAIR),
  )
  hair.position.y = 0.015
  group.add(hair)

  // Every facial feature is parented to this single head-local frame.
  const features = new THREE.Group()
  group.add(features)

  for (const x of [-0.082, 0.082]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.043, 16, 12), material(0xffffff))
    eyeWhite.scale.set(0.82, 1.12, 0.32)
    eyeWhite.position.set(x, -0.005, 0.207)
    features.add(eyeWhite)

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), material(0x3b2a25))
    iris.scale.z = 0.42
    iris.position.set(x, -0.008, 0.226)
    features.add(iris)

    const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), material(0xffffff))
    highlight.position.set(x - 0.006, 0.001, 0.244)
    features.add(highlight)

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.052, 4, 8), material(HAIR))
    brow.rotation.z = Math.PI / 2 + (x < 0 ? -0.08 : 0.08)
    brow.position.set(x, 0.058, 0.205)
    features.add(brow)
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.067, 14), material(0xdf8f73))
  nose.position.set(0, -0.018, 0.232)
  nose.rotation.x = Math.PI / 2
  features.add(nose)

  const smile = new THREE.QuadraticBezierCurve3(V(-0.05, -0.082, 0.214), V(0, -0.118, 0.235), V(0.05, -0.082, 0.214))
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 16, 0.008, 8, false), material(0x8f3b42))
  features.add(mouth)

  for (const x of [-0.125, 0.125]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 8), material(0xef8f86))
    cheek.scale.z = 0.22
    cheek.position.set(x, -0.055, 0.202)
    features.add(cheek)
  }

  for (const x of [-0.222, 0.222]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), material(SKIN))
    ear.scale.set(0.55, 1, 0.65)
    ear.position.set(x, 0, 0)
    group.add(ear)
  }
  return group
}

function makePatient(pose: RigPose, showSkeleton: boolean) {
  const group = new THREE.Group()
  const j = pose.joints

  const torso = segment(j.pelvis, j.neck, 0.225, SHIRT)
  torso.scale.set(1.25, 1, 0.76)
  group.add(torso)
  group.add(segment(j.shoulderCenter, j.shoulderLeft, 0.09, SHIRT))
  group.add(segment(j.shoulderCenter, j.shoulderRight, 0.09, SHIRT))
  group.add(segment(j.neck, j.head, 0.075, SKIN))

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14), material(TROUSERS))
  pelvis.scale.set(1.35, 0.72, 0.92)
  pelvis.position.copy(j.pelvis)
  pelvis.castShadow = true
  group.add(pelvis)

  for (const side of ['Left', 'Right'] as const) {
    group.add(segment(j[`hip${side}`], j[`knee${side}`], 0.105, TROUSERS))
    group.add(segment(j[`knee${side}`], j[`ankle${side}`], 0.088, TROUSERS))
    const shoulder = j[`shoulder${side}`]
    const elbow = j[`elbow${side}`]
    const sleeveEnd = shoulder.clone().lerp(elbow, 0.28)
    group.add(segment(shoulder, sleeveEnd, 0.105, SHIRT))
    group.add(segment(sleeveEnd, elbow, 0.072, SKIN))
    group.add(segment(elbow, j[`wrist${side}`], 0.062, SKIN))
    group.add(segment(j[`wrist${side}`], j[`hand${side}`], 0.073, SKIN))
    group.add(segment(j[`ankle${side}`], j[`toe${side}`], 0.1, SHOES))

    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), material(SHIRT))
    shoulderJoint.position.copy(shoulder)
    shoulderJoint.castShadow = true
    group.add(shoulderJoint)

    const wristJoint = new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 8), material(SKIN))
    wristJoint.position.copy(j[`wrist${side}`])
    wristJoint.castShadow = true
    group.add(wristJoint)

    const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), material(SHOES))
    ankleJoint.position.copy(j[`ankle${side}`])
    ankleJoint.castShadow = true
    group.add(ankleJoint)
  }
  group.add(makeHead(pose))

  const arrow = new THREE.ArrowHelper(pose.faceDirection, j.head, 0.48, 0xe23b32, 0.12, 0.07)
  group.add(arrow)

  if (showSkeleton) {
    const skeletonMaterial = new THREE.LineBasicMaterial({ color: BONE, depthTest: false })
    for (const [start, end] of BONE_PAIRS) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([j[start], j[end]]), skeletonMaterial)
      line.renderOrder = 10
      group.add(line)
    }
    for (const point of Object.values(j)) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), material(BONE))
      marker.position.copy(point)
      marker.renderOrder = 11
      group.add(marker)
    }
  }
  return group
}

function addRoom(scene: THREE.Scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), material(0xd6d9d8))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const bedBase = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 5.4), material(0x5b666c))
  bedBase.position.set(0, 0.58, 0)
  bedBase.castShadow = true
  bedBase.receiveShadow = true
  scene.add(bedBase)

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.16, 5.25), material(0xb9c9ce))
  mattress.position.set(0, 0.8, 0)
  mattress.castShadow = true
  mattress.receiveShadow = true
  scene.add(mattress)

  for (const x of [-0.65, 0.65]) {
    for (const z of [-2.1, 2.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.55, 0.11), material(0x5b666c))
      leg.position.set(x, 0.275, z)
      scene.add(leg)
    }
  }

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.28, 0.56), material(0xf2f4f1))
  pillow.position.set(0, 1.06, -0.2)
  pillow.rotation.x = -0.06
  pillow.castShadow = true
  pillow.receiveShadow = true
  scene.add(pillow)
}

function positionCamera(camera: THREE.PerspectiveCamera, view: ViewId) {
  if (view === 'foot') camera.position.set(0, 3.5, 6.3)
  else camera.position.set(-4.7, 3.8, -2.8)
  camera.lookAt(0, 1.2, -0.2)
}

export function DixHallpikeRigPrototype() {
  const mountRef = useRef<HTMLDivElement>(null)
  const patientRef = useRef<THREE.Group | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const params = new URLSearchParams(window.location.search)
  const requestedPose = params.get('pose')
  const requestedView = params.get('view')
  const [poseId, setPoseId] = useState<PoseId>(
    requestedPose && requestedPose in POSES ? (requestedPose as PoseId) : 'seated-neutral',
  )
  const [view, setView] = useState<ViewId>(requestedView === 'side' ? 'side' : 'foot')
  const [showSkeleton, setShowSkeleton] = useState(params.get('skeleton') === '1')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe9edec)
    scene.fog = new THREE.Fog(0xe9edec, 8, 14)
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
    positionCamera(camera, view)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6d7880, 2.1))
    const key = new THREE.DirectionalLight(0xffffff, 3.2)
    key.position.set(3.5, 7, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)
    addRoom(scene)

    const resize = () => {
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    let animationFrame = 0
    const draw = () => {
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(draw)
    }
    draw()
    sceneRef.current = scene
    cameraRef.current = camera

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      sceneRef.current = null
      cameraRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (patientRef.current) scene.remove(patientRef.current)
    const patient = makePatient(POSES[poseId], showSkeleton)
    patientRef.current = patient
    scene.add(patient)
  }, [poseId, showSkeleton])

  useEffect(() => {
    if (cameraRef.current) positionCamera(cameraRef.current, view)
  }, [view])

  const pose = POSES[poseId]
  return (
    <main className="rig-prototype">
      <header className="rig-header">
        <div>
          <p className="rig-kicker">DIX-HALLPIKE RIGHT / RIG PROTOTYPE</p>
          <h1>固定3D人体モデル</h1>
        </div>
        <span className="rig-status">臨床レビュー前</span>
      </header>

      <section className="rig-stage" aria-label="Dix-Hallpike 3D pose review">
        <div ref={mountRef} className="rig-canvas" />
        <div className="rig-readout" aria-live="polite">
          <strong>{pose.label}</strong>
          <span>{pose.note}</span>
        </div>
        <div className="rig-axis-key"><span />赤線：鼻の向き</div>
      </section>

      <nav className="rig-controls" aria-label="Pose and camera controls">
        <div className="rig-segment" aria-label="Pose">
          {(Object.keys(POSES) as PoseId[]).map((id) => (
            <button key={id} type="button" className={poseId === id ? 'active' : ''} onClick={() => setPoseId(id)}>
              {POSES[id].label}
            </button>
          ))}
        </div>
        <div className="rig-control-row">
          <div className="rig-segment rig-segment--small" aria-label="Camera">
            <button type="button" className={view === 'foot' ? 'active' : ''} onClick={() => setView('foot')}>足側</button>
            <button type="button" className={view === 'side' ? 'active' : ''} onClick={() => setView('side')}>右斜位</button>
          </div>
          <label className="rig-toggle">
            <input type="checkbox" checked={showSkeleton} onChange={(event) => setShowSkeleton(event.target.checked)} />
            <span>骨格表示</span>
          </label>
        </div>
      </nav>

      <footer className="rig-footer">
        <span>骨盤座標・骨長・頭径は全姿勢で共通</span>
        <a href="https://www.aafp.org/pubs/afp/issues/2006/0115/p244.pdf" target="_blank" rel="noreferrer">静止図資料</a>
        <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12358047/" target="_blank" rel="noreferrer">肩枕法資料</a>
      </footer>
    </main>
  )
}
