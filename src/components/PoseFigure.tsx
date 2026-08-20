import { useEffect, useRef } from 'react'
import { facePath, nosePath, noseVisible, PARTS, project } from './pose/head'
import { POSES, type Pose, type PoseKey, type SceneKind } from './pose/poses'

export { POSES }
export type { PoseKey }

const HOLD = 1.3
const MOVE = 0.85
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t))

function sample(seq: PoseKey[], t: number): Pose {
  const at = (k: PoseKey | undefined): Pose => POSES[k as PoseKey] ?? POSES.ax_supine
  if (!seq || seq.length === 0) return POSES.ax_supine
  if (seq.length === 1) return at(seq[0])
  const span = HOLD + MOVE
  const local = t % (span * seq.length)
  const i = Math.min(seq.length - 1, Math.max(0, Math.floor(local / span)))
  const within = local - i * span
  const from = at(seq[i])
  const to = at(seq[(i + 1) % seq.length])
  if (within < HOLD) return from
  const k = easeInOut((within - HOLD) / MOVE)
  // 図の種類と見る向きは補間できないので、途中で切り替える
  return {
    scene: k < 0.5 ? from.scene : to.scene,
    fromRight: k < 0.5 ? from.fromRight : to.fromRight,
    trunk: lerp(from.trunk, to.trunk, k),
    ext: lerp(from.ext, to.ext, k),
    tilt: lerp(from.tilt, to.tilt, k),
    roll: lerp(from.roll, to.roll, k),
    yaw: lerp(from.yaw, to.yaw, k),
    label: k < 0.5 ? from.label : to.label,
  }
}

const SKIN = '#f3d0ad'
const SKIN_D = '#b8825a'
const GOWN = '#8fb4ff'
const GOWN_D = '#4f72c4'
const HAIR = '#3a2b23'
const TABLE = '#243468'
const TABLE_D = '#4a5da8'
const EYE = '#20232f'

const R = 26 // 頭の半径

/** 頭部。パーツはヨー角から座標を計算するので、どの向きでも位置関係が崩れない */
function Head() {
  return (
    <g data-head="">
      <circle r={R} fill={HAIR} stroke="#241a15" strokeWidth={1.4} />
      <path data-face="" fill={SKIN} stroke={SKIN_D} strokeWidth={1.2} />
      <ellipse data-part="earR" rx={4.2} ry={5.6} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
      <ellipse data-part="earL" rx={4.2} ry={5.6} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
      <path data-nose="" fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} strokeLinejoin="round" />
      <ellipse data-part="eyeR" rx={2.9} ry={3.1} fill={EYE} />
      <ellipse data-part="eyeL" rx={2.9} ry={3.1} fill={EYE} />
      <path data-mouth="" fill="none" stroke={SKIN_D} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
}

function updateHead(g: SVGGElement | null | undefined, yaw: number) {
  if (!g) return
  g.querySelector<SVGPathElement>('[data-face]')?.setAttribute('d', facePath(yaw, R))

  const nose = g.querySelector<SVGPathElement>('[data-nose]')
  nose?.setAttribute('d', nosePath(yaw, R))
  nose?.setAttribute('opacity', noseVisible(yaw) ? '1' : '0')

  for (const key of ['eyeR', 'eyeL', 'earR', 'earL'] as const) {
    const el = g.querySelector<SVGEllipseElement>(`[data-part="${key}"]`)
    if (!el) continue
    const p = project(PARTS[key].az, PARTS[key].el, yaw, R)
    // 耳は横顔でこそ見える。輪郭に近いところにあれば描く
    const shown = key.startsWith('ear') ? p.depth > 0.02 : p.visible
    el.setAttribute('opacity', shown ? '1' : '0')
    el.setAttribute('cx', String(p.x.toFixed(2)))
    el.setAttribute('cy', String(p.y.toFixed(2)))
    if (!key.startsWith('ear')) el.setAttribute('rx', String((2.9 * Math.max(0.3, p.depth)).toFixed(2)))
  }

  const mouth = g.querySelector<SVGPathElement>('[data-mouth]')
  const mp = project(PARTS.mouth.az, PARTS.mouth.el, yaw, R)
  const w = 7 * Math.max(0.2, mp.depth)
  mouth?.setAttribute('d', `M${(mp.x - w).toFixed(1)},${mp.y.toFixed(1)} Q${mp.x.toFixed(1)},${(mp.y + 3).toFixed(1)} ${(mp.x + w).toFixed(1)},${mp.y.toFixed(1)}`)
  mouth?.setAttribute('opacity', mp.visible ? '1' : '0')
}

const VIEW_LABEL: Record<SceneKind, string> = {
  side: '横から見た図（患側から）',
  front: '正面から見た図',
  axial: '頭の方から見た図',
  head: '頭の方から見た図（頭部のみ）',
}

export function PoseFigure({ seq, caption }: { seq: PoseKey[]; caption?: string }) {
  const rootRef = useRef<SVGSVGElement | null>(null)
  const labelRef = useRef<SVGTextElement | null>(null)
  const viewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const p = sample(seq, (now - start) / 1000)
      const svg = rootRef.current
      if (!svg) {
        raf = requestAnimationFrame(frame)
        return
      }

      for (const sc of ['side', 'front', 'axial', 'head'] as SceneKind[]) {
        const el = svg.querySelector<SVGGElement>(`[data-scene="${sc}"]`)
        if (el) el.style.display = sc === p.scene ? '' : 'none'
      }

      // 側面図。患側から見るので、右の検査では全体を左右反転する
      svg
        .querySelector<SVGGElement>('[data-mirror]')
        ?.setAttribute('transform', p.fromRight ? 'translate(150 0) scale(-1 1)' : '')
      svg.querySelector<SVGGElement>('[data-side-trunk]')?.setAttribute('transform', `rotate(${-p.trunk} 44 96)`)
      svg
        .querySelector<SVGGElement>('[data-side-head]')
        ?.setAttribute(
          'transform',
          `rotate(${p.ext} 84 88) translate(${(96 + p.ext * 0.34).toFixed(1)} ${(84 + p.ext * 0.24).toFixed(1)})`,
        )
      updateHead(svg.querySelector<SVGGElement>('[data-side-head] [data-head]'), p.yaw)

      // 正面図。腰を軸に左右へ倒す
      svg.querySelector<SVGGElement>('[data-front-body]')?.setAttribute('transform', `rotate(${-p.tilt} 60 110)`)
      updateHead(svg.querySelector<SVGGElement>('[data-front-body] [data-head]'), p.yaw)

      // 頭側図。胸郭は断面なので、そのまま回して正しい
      svg.querySelector<SVGGElement>('[data-axial-chest]')?.setAttribute('transform', `rotate(${-p.roll} 60 106)`)
      updateHead(svg.querySelector<SVGGElement>('[data-axial-head] [data-head]'), p.yaw)

      // 頭部のみ
      updateHead(svg.querySelector<SVGGElement>('[data-headonly] [data-head]'), p.yaw)

      if (labelRef.current && labelRef.current.textContent !== p.label) {
        labelRef.current.textContent = p.label
      }
      if (viewRef.current && viewRef.current.textContent !== VIEW_LABEL[p.scene]) {
        viewRef.current.textContent = VIEW_LABEL[p.scene]
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [seq])

  const first = POSES[seq[0]] ?? POSES.ax_supine
  const show = (sc: SceneKind) => ({ display: first.scene === sc ? undefined : 'none' })

  return (
    <figure className="posefig">
      <svg ref={rootRef} viewBox="0 0 150 152" role="img" aria-label={first.label}>
        {/* ── 横から見た図：坐位↔仰臥位・頭部懸垂位 ───────── */}
        <g data-scene="side" style={show('side')}>
          <g data-mirror="">
            <rect x={6} y={96} width={96} height={16} rx={2} fill={TABLE} stroke={TABLE_D} strokeWidth={1.4} />
            <path d="M44 96 L44 84 L18 86 L16 96 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.2} />
            <path d="M16 96 L16 88 L7 90 L7 96 Z" fill={SKIN} stroke={SKIN_D} strokeWidth={1} />
            <g data-side-trunk="">
              <path d="M44 96 L44 80 Q64 76 84 80 L84 96 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.4} />
              <path d="M54 85 L78 90" stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
              <rect x={78} y={82} width={10} height={12} fill={SKIN} />
              <g data-side-head="">
                <g transform="scale(0.46)">
                  <Head />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* ── 正面から見た図：坐位から左右に倒れる ───────── */}
        <g data-scene="front" style={show('front')}>
          <rect x={6} y={114} width={138} height={14} rx={2} fill={TABLE} stroke={TABLE_D} strokeWidth={1.4} />
          <g data-front-body="">
            <path d="M42 114 L46 68 Q60 62 74 68 L78 114 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.4} />
            <path d="M47 72 L32 110" stroke={SKIN} strokeWidth={7} strokeLinecap="round" />
            <path d="M73 72 L88 110" stroke={SKIN} strokeWidth={7} strokeLinecap="round" />
            <rect x={52} y={56} width={16} height={16} rx={3} fill={SKIN} />
            <g transform="translate(60 38) scale(0.66)">
              <Head />
            </g>
          </g>
          <text x={16} y={142} fontSize={8} fill="#ffd75e">
            ← 患者の右
          </text>
          <text x={101} y={142} fontSize={8} fill="#ffd75e">
            患者の左 →
          </text>
        </g>

        {/* ── 頭の方から見た図：頭の回旋と胸郭の回転 ───────── */}
        <g data-scene="axial" style={show('axial')}>
          <rect x={14} y={6} width={122} height={128} rx={4} fill={TABLE} stroke={TABLE_D} strokeWidth={1.4} />
          {/* 胸郭の断面。前（胸）と後（背）を塗り分けているので、回すと向きが読める */}
          <g data-axial-chest="">
            <ellipse cx={60} cy={106} rx={33} ry={20} fill="#2f4a8c" stroke={GOWN_D} strokeWidth={1.4} />
            {/* 明るい側が胸（前）。回しても前後が読めるよう、胸の中央に印を置く */}
            <path d="M27 106 A33 20 0 0 1 93 106 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.4} />
            <circle cx={60} cy={97} r={3.4} fill="#0b0f34" />
            <path d="M60 90 L55 82 L65 82 Z" fill="#ffd75e" />
          </g>
          <rect x={52} y={62} width={16} height={18} rx={3} fill={SKIN} />
          <g data-axial-head="" transform="translate(60 46) scale(0.82)">
            <Head />
          </g>
          <text x={16} y={146} fontSize={8} fill="#ffd75e">
            ← 患者の右
          </text>
          <text x={101} y={146} fontSize={8} fill="#ffd75e">
            患者の左 →
          </text>
        </g>

        {/* ── 頭部のみ：Supine Head Roll ───────── */}
        <g data-scene="head" style={show('head')}>
          <rect x={10} y={26} width={130} height={86} rx={4} fill={TABLE} stroke={TABLE_D} strokeWidth={1.4} />
          <g data-headonly="" transform="translate(75 69) scale(1.45)">
            <Head />
          </g>
          <text x={16} y={132} fontSize={8} fill="#ffd75e">
            ← 患者の右
          </text>
          <text x={101} y={132} fontSize={8} fill="#ffd75e">
            患者の左 →
          </text>
        </g>
      </svg>

      <div className="posefig-view" ref={viewRef}>
        {VIEW_LABEL[first.scene]}
      </div>

      <svg viewBox="0 0 240 16" className="posefig-label" role="img" aria-label="現在の姿勢">
        <text ref={labelRef} x={120} y={12} textAnchor="middle" fontSize={11} fill="#ffd75e">
          {first.label}
        </text>
      </svg>

      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

const EXAM_SEQ: Record<string, { seq: PoseKey[]; caption: string }> = {
  eye_dh_r: {
    seq: ['dh_sit_r', 'dh_hang_r'],
    caption: '坐位で頭を右へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる（右耳が下）',
  },
  eye_dh_l: {
    seq: ['dh_sit_l', 'dh_hang_l'],
    caption: '坐位で頭を左へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる（左耳が下）',
  },
  eye_roll_r: {
    seq: ['head_front', 'head_r'],
    caption: '仰臥位のまま、頭だけを右へ90°向ける（右耳が下）。体は動かさない',
  },
  eye_roll_l: {
    seq: ['head_front', 'head_l'],
    caption: '仰臥位のまま、頭だけを左へ90°向ける（左耳が下）。体は動かさない',
  },
}

export function ExamPose({ actionId }: { actionId: string }) {
  const entry = EXAM_SEQ[actionId]
  if (!entry) return null
  return <PoseFigure seq={entry.seq} caption={entry.caption} />
}
