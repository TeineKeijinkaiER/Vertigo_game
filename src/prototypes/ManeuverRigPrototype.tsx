import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  MANEUVERS, interpolatePose,
  type Maneuver, type ManeuverId, type RigPose,
} from '../rig/poses'
import { makePatient, makeRoom, positionCamera } from '../rig/scene'
import './dixHallpikeRig.css'

type ViewId = 'review' | 'oblique'

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
    patientRef.current = makePatient(pose, { skeleton: showSkeleton, noseArrow: !exportMode })
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
