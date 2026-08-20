import { useEffect, useRef } from 'react'

/**
 * 体位の動的イラスト。二面図で示す。
 *
 *   横から見た図 … 患者の左側から見る。仰臥位では顔が上（天井）を向く。
 *                  座位から倒していく動き、頭部懸垂位で頭が台から外れる様子が読める。
 *   頭の方から見た図 … 患者の頭側に立って見下ろす。画面の左が患者の右。
 *                  頭の回旋と、顔が床を向くか天井を向くかが読める。
 *
 * 横から見た図は「仰臥位で顔が上を向いている」姿を基準に描き、
 * 体幹角度で起こす。頭は体幹と一緒に回るので、座位では自然に前を向く。
 * 下肢は台の上に伸ばしたままなので、体幹とは別に描いて回さない。
 */

export type PoseKey =
  | 'sitting'
  | 'sitting_turn_r'
  | 'sitting_turn_l'
  | 'supine'
  | 'hang_r'
  | 'hang_l'
  | 'roll_r'
  | 'roll_l'
  | 'side_r'
  | 'side_l'
  | 'side_r_facedown'
  | 'side_l_facedown'
  | 'side_r_faceup'
  | 'side_l_faceup'

interface PoseParams {
  /** 体幹角度。90 = 座位、0 = 仰臥位 */
  trunk: number
  /** 頸部の後屈。頭部懸垂位で正の値 */
  ext: number
  /** 頭の回旋。患者から見て + = 右 */
  turn: number
  /** 体幹のロール。患者から見て + = 右を下に */
  roll: number
  face: 'front' | 'down' | 'up'
}

const POSES: Record<PoseKey, PoseParams> = {
  sitting: { trunk: 90, ext: 0, turn: 0, roll: 0, face: 'front' },
  sitting_turn_r: { trunk: 90, ext: 0, turn: 45, roll: 0, face: 'front' },
  sitting_turn_l: { trunk: 90, ext: 0, turn: -45, roll: 0, face: 'front' },
  supine: { trunk: 0, ext: 0, turn: 0, roll: 0, face: 'front' },
  hang_r: { trunk: 0, ext: 40, turn: 45, roll: 0, face: 'front' },
  hang_l: { trunk: 0, ext: 40, turn: -45, roll: 0, face: 'front' },
  roll_r: { trunk: 0, ext: 0, turn: 90, roll: 0, face: 'front' },
  roll_l: { trunk: 0, ext: 0, turn: -90, roll: 0, face: 'front' },
  side_r: { trunk: 0, ext: 0, turn: 0, roll: 90, face: 'front' },
  side_l: { trunk: 0, ext: 0, turn: 0, roll: -90, face: 'front' },
  side_r_facedown: { trunk: 0, ext: 0, turn: 0, roll: 90, face: 'down' },
  side_l_facedown: { trunk: 0, ext: 0, turn: 0, roll: -90, face: 'down' },
  side_r_faceup: { trunk: 0, ext: 0, turn: 0, roll: 90, face: 'up' },
  side_l_faceup: { trunk: 0, ext: 0, turn: 0, roll: -90, face: 'up' },
}

const HOLD = 1.2
const MOVE = 0.8

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t))

function sample(seq: PoseKey[], t: number): PoseParams {
  // 未知のキーが混ざっても描画全体が止まらないようにする
  const at = (k: PoseKey | undefined): PoseParams => POSES[k as PoseKey] ?? POSES.supine
  if (!seq || seq.length === 0) return POSES.supine
  if (seq.length === 1) return at(seq[0])
  const span = HOLD + MOVE
  const local = t % (span * seq.length)
  const i = Math.min(seq.length - 1, Math.max(0, Math.floor(local / span)))
  const within = local - i * span
  const from = at(seq[i])
  const to = at(seq[(i + 1) % seq.length])
  if (within < HOLD) return from
  const k = easeInOut((within - HOLD) / MOVE)
  return {
    trunk: lerp(from.trunk, to.trunk, k),
    ext: lerp(from.ext, to.ext, k),
    turn: lerp(from.turn, to.turn, k),
    roll: lerp(from.roll, to.roll, k),
    face: k < 0.5 ? from.face : to.face,
  }
}

const SKIN = '#f0c9a4'
const SKIN_DARK = '#c99b74'
const GOWN = '#7fa8ff'
const HAIR = '#3a2b23'
const TABLE = '#1b2a63'
const LINE = '#8fa8e8'

// 横から見た図の基準点
const HIP = { x: 46, y: 98 }
const NECK = { x: 84, y: 90 }

export function BodyPose({ seq, caption }: { seq: PoseKey[]; caption?: string }) {
  // 体幹が起き上がる／倒れる動きがあるときだけ、横から見た図に矢印を出す
  const trunkMoves = new Set(seq.map((k) => (POSES[k] ?? POSES.supine).trunk)).size > 1
  const trunkRef = useRef<SVGGElement | null>(null)
  const headSideRef = useRef<SVGGElement | null>(null)
  const shoulderRef = useRef<SVGGElement | null>(null)
  const headTopRef = useRef<SVGGElement | null>(null)
  const faceFrontRef = useRef<SVGGElement | null>(null)
  const faceBackRef = useRef<SVGGElement | null>(null)
  const faceUpRef = useRef<SVGGElement | null>(null)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const p = sample(seq, (now - start) / 1000)

      trunkRef.current?.setAttribute('transform', `rotate(${-p.trunk} ${HIP.x} ${HIP.y})`)
      // 後屈させるだけでは台の上に留まってしまうので、端から外へ出す分も加える
      headSideRef.current?.setAttribute(
        'transform',
        `rotate(${p.ext} ${NECK.x} ${NECK.y}) translate(${p.ext * 0.24} ${p.ext * 0.16})`,
      )

      shoulderRef.current?.setAttribute('transform', `rotate(${-p.roll * 0.3} 60 86)`)
      headTopRef.current?.setAttribute('transform', `rotate(${-p.turn - p.roll * 0.8} 60 44)`)

      faceFrontRef.current?.setAttribute('opacity', p.face === 'front' ? '1' : '0')
      faceBackRef.current?.setAttribute('opacity', p.face === 'down' ? '1' : '0')
      faceUpRef.current?.setAttribute('opacity', p.face === 'up' ? '1' : '0')

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [seq])

  return (
    <figure className="bodypose">
      <div className="bodypose-panels">
        {/* ── 横から見た図 ───────────────── */}
        <div className="bodypose-panel">
          <svg viewBox="0 0 150 130" role="img" aria-label="横から見た図">
            {/* 診察台。右端がここで終わり、頭を下げる余地がある */}
            <rect x={6} y={98} width={102} height={16} rx={2} fill={TABLE} stroke={LINE} strokeWidth={1.2} />

            {/* 下肢は台の上に伸ばしたまま。体幹とは別に描いて回さない */}
            <path d={`M${HIP.x} 98 L${HIP.x} 86 L20 88 L18 98 Z`} fill={GOWN} stroke={LINE} strokeWidth={1.1} />
            <path d="M18 98 L18 90 L10 92 L10 98 Z" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.9} />

            <g ref={trunkRef}>
              {/* 体幹（腰から肩へ） */}
              <path
                d={`M${HIP.x} 98 L${HIP.x} 82 Q66 78 88 82 L88 98 Z`}
                fill={GOWN}
                stroke={LINE}
                strokeWidth={1.2}
              />
              {/* 腕 */}
              <path d="M56 87 L80 92" stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
              {/* 首 */}
              <rect x={82} y={84} width={9} height={12} fill={SKIN} />

              <g ref={headSideRef}>
                {/*
                  仰臥位を基準に描く。顔は上（天井）を向き、
                  後頭部が下（台）に接し、頭頂は右（足と反対側）を向く。
                */}
                <circle cx={96} cy={88} r={12} fill={SKIN} stroke={SKIN_DARK} strokeWidth={1} />
                {/* 後頭部から頭頂にかけての髪 */}
                <path
                  d="M96 100 A12 12 0 0 0 108 88 A12 12 0 0 0 101 77 L99 82 A7 7 0 0 1 103 88 A7 7 0 0 1 96 95 Z"
                  fill={HAIR}
                />
                {/* 鼻は上（天井）を向く */}
                <polygon points="94,75 89,81 98,81" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                {/* 眼 */}
                <circle cx={93} cy={84} r={1.7} fill="#20232f" />
                {/* 口 */}
                <line x1={87} y1={86} x2={88} y2={90} stroke={SKIN_DARK} strokeWidth={1.1} />
                {/* 耳 */}
                <circle cx={98} cy={91} r={2.6} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
              </g>
            </g>

            {/* 動きの向きを示す矢印。体幹が倒れる手技のときだけ描く */}
            {trunkMoves && (
              <path
                d="M52 24 Q96 26 112 66"
                fill="none"
                stroke="#ffd75e"
                strokeWidth={1.8}
                strokeDasharray="4 3"
                markerEnd="url(#bp-arrow)"
                opacity={0.7}
              />
            )}
            <defs>
              <marker id="bp-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#ffd75e" />
              </marker>
            </defs>
          </svg>
          <span className="bodypose-view">横から見た図</span>
        </div>

        {/* ── 頭の方から見た図 ────────────── */}
        <div className="bodypose-panel">
          <svg viewBox="0 0 120 134" role="img" aria-label="頭の方から見た図">
            <rect x={14} y={10} width={92} height={106} rx={3} fill={TABLE} stroke={LINE} strokeWidth={1.2} />

            <g ref={shoulderRef}>
              <rect x={32} y={72} width={56} height={44} rx={13} fill={GOWN} stroke={LINE} strokeWidth={1.2} />
              <line x1={34} y1={82} x2={24} y2={108} stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
              <line x1={86} y1={82} x2={96} y2={108} stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
              <rect x={51} y={62} width={18} height={14} fill={SKIN} />
            </g>

            <g ref={headTopRef}>
              <circle cx={60} cy={44} r={21} fill={SKIN} stroke={SKIN_DARK} strokeWidth={1.2} />
              <circle cx={39} cy={46} r={3.6} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
              <circle cx={81} cy={46} r={3.6} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />

              {/* 顔が天井を向いている（こちらを向いている） */}
              <g ref={faceFrontRef}>
                <path d="M41 33 A21 21 0 0 1 79 33 L79 28 A21 21 0 0 0 41 28 Z" fill={HAIR} />
                <circle cx={51} cy={41} r={2.5} fill="#20232f" />
                <circle cx={69} cy={41} r={2.5} fill="#20232f" />
                <polygon points="60,44 55,53 65,53" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                <path d="M52 58 Q60 62 68 58" fill="none" stroke={SKIN_DARK} strokeWidth={1.4} />
              </g>

              {/* 顔が床を向いている＝後頭部が見えている */}
              <g ref={faceBackRef} opacity={0}>
                <circle cx={60} cy={44} r={20} fill={HAIR} />
                <path d="M52 61 Q60 67 68 61" fill="none" stroke={SKIN_DARK} strokeWidth={1.4} />
              </g>

              {/* 顔が天井を向いている（側臥位であごを上げた状態） */}
              <g ref={faceUpRef} opacity={0}>
                <path d="M41 31 A21 21 0 0 1 79 31 L79 26 A21 21 0 0 0 41 26 Z" fill={HAIR} />
                <circle cx={51} cy={38} r={2.5} fill="#20232f" />
                <circle cx={69} cy={38} r={2.5} fill="#20232f" />
                <polygon points="60,42 54,52 66,52" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                <path d="M51 57 Q60 63 69 57" fill="none" stroke={SKIN_DARK} strokeWidth={1.4} />
              </g>
            </g>

            <text x={16} y={130} fontSize={8} fill="#ffd75e">
              ← 患者の右
            </text>
            <text x={71} y={130} fontSize={8} fill="#ffd75e">
              患者の左 →
            </text>
          </svg>
          <span className="bodypose-view">頭の方から見た図</span>
        </div>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

/** 診察コマンドに対応する体位の動き */
const EXAM_SEQ: Record<string, { seq: PoseKey[]; caption: string }> = {
  eye_dh_r: {
    seq: ['sitting_turn_r', 'hang_r'],
    caption:
      '① 座位で頭を右へ45°回す　② その向きのまま素早く仰臥位にし、頭を台の端から下げる（右耳が下を向く）　③ 眼振を観察する',
  },
  eye_dh_l: {
    seq: ['sitting_turn_l', 'hang_l'],
    caption:
      '① 座位で頭を左へ45°回す　② その向きのまま素早く仰臥位にし、頭を台の端から下げる（左耳が下を向く）　③ 眼振を観察する',
  },
  eye_roll_r: {
    seq: ['supine', 'roll_r'],
    caption: '仰臥位のまま、頭だけを右へ90°向ける（右耳が下になる）。体は動かさない',
  },
  eye_roll_l: {
    seq: ['supine', 'roll_l'],
    caption: '仰臥位のまま、頭だけを左へ90°向ける（左耳が下になる）。体は動かさない',
  },
}

export function ExamPose({ actionId }: { actionId: string }) {
  const entry = EXAM_SEQ[actionId]
  if (!entry) return null
  return <BodyPose seq={entry.seq} caption={entry.caption} />
}
