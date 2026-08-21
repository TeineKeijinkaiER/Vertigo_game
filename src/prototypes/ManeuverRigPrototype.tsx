import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  HEAD_RADIUS, MANEUVERS, TREE, V, unit, interpolatePose,
  type Maneuver, type ManeuverId, type RigPose,
} from '../rig/poses'
import './dixHallpikeRig.css'

type ViewId = 'review' | 'oblique'

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
