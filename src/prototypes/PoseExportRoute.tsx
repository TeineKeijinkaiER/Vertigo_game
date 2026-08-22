import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { POSE_IDS, resolvePanels, resolvePose } from '../rig/catalog'
import { fitCamera, makeDirectionArrow, makePatient, makeRoom } from '../rig/scene'
import { MANEUVERS } from '../rig/poses'
import { FILM_IDS, filmCamera, filmDurations, filmFrames, FILMS_SPEC, type FilmId } from '../rig/films'
import type { PoseImageId } from '../data/poseImages'
import './dixHallpikeRig.css'

const SIZE = 1024
const FILM_CAPTIONS = Object.fromEntries(
  FILM_IDS.map((filmId) => [filmId, FILMS_SPEC[filmId].caption]),
) as Record<FilmId, string>

declare global {
  interface Window {
    __POSE_IDS__?: PoseImageId[]
    __FILM_IDS__?: FilmId[]
    __FILM_DURATIONS__?: number[]
    __FILM_CAPTIONS__?: Record<FilmId, string>
  }
}

/**
 * 書き出し専用ルート。1リクエストで1パネルだけを透過で描く。
 *
 * レビューUIとは別ルートにしている。UI装飾・鼻方向の赤矢印・背景・床は
 * 書き出しに入れてはならないため、条件分岐で共用すると事故りやすい。
 */
export function PoseExportRoute() {
  const mountRef = useRef<HTMLDivElement>(null)
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id') as PoseImageId | null
  const panelIndex = Number(params.get('panel') ?? 0) || 0
  const film = params.get('film') as FilmId | null
  const frameIndex = Number(params.get('frame') ?? 0) || 0

  useEffect(() => {
    window.__POSE_IDS__ = POSE_IDS
    window.__FILM_IDS__ = FILM_IDS
    window.__FILM_CAPTIONS__ = FILM_CAPTIONS
    if (film) {
      window.__FILM_DURATIONS__ = filmDurations(film)
      document.body.dataset.filmFrames = String(filmFrames(film).length)
    } else if (id) {
      document.body.dataset.panelCount = String(resolvePanels(id).length)
    }
  }, [id, film])

  // global.css は body に --navy-deep を塗っている。透過スクリーンショットは
  // キャンバス側だけでなくページ側も透明である必要があるため、
  // このルートがマウントされている間だけ body の背景を外す。
  useEffect(() => {
    document.body.classList.add('pose-export-body')
    return () => {
      document.body.classList.remove('pose-export-body')
    }
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || (!id && !film)) return

    const scene = new THREE.Scene()
    scene.background = null
    scene.add(new THREE.HemisphereLight(0xffffff, 0x687982, 2.25))
    const key = new THREE.DirectionalLight(0xffffff, 3.5)
    key.position.set(3.5, 7, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)

    if (film) {
      // フィルムはキーポーズと中間フレームを通じて1台のカメラを使い回す。
      // ここで毎フレーム fitCamera し直すと視線がポーズ相対に揺れてしまう。
      const spec = FILMS_SPEC[film]
      const frames = filmFrames(film)
      const frame = frames[Math.min(frames.length - 1, Math.max(0, frameIndex))]
      scene.add(makeRoom(MANEUVERS[spec.steps[0].maneuver], { floor: false }))
      scene.add(makePatient(frame, { skeleton: false, noseArrow: false }))
      filmCamera(camera, film)
    } else if (id) {
      const panels = resolvePanels(id)
      const spec = panels[Math.min(panels.length - 1, Math.max(0, panelIndex))]
      const pose = resolvePose(spec)
      // 頭部寄りの画角ではベッドが画面を埋め尽くし、輪郭も見えないので情報を持たない。
      // 描くと不透明な白い矩形になり、紺色のゲームUIの上で箱として浮く
      if (spec.framing !== 'head') scene.add(makeRoom(MANEUVERS[spec.maneuver], { floor: false }))
      scene.add(makePatient(pose, { skeleton: false, noseArrow: false }))
      if (spec.arrow) scene.add(makeDirectionArrow(pose, spec.arrow))
      fitCamera(camera, pose, spec.view, spec.framing)
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(SIZE, SIZE, false)
    renderer.setClearAlpha(0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    mount.dataset.ready = '1'

    return () => {
      mount.dataset.ready = '0'
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [id, panelIndex, film, frameIndex])

  if (!id && !film) {
    return <div className="pose-export-list">{POSE_IDS.join(',')}</div>
  }
  return <main className="pose-export"><div ref={mountRef} className="pose-export-canvas" /></main>
}
