import { useEffect, useRef } from 'react'

/**
 * 体位の動的イラスト。
 *
 * 前のバージョンは記号的すぎてどの方向から見た図か分からなかったため作り直した。
 * 二面図にして、それぞれに「横から見た図」「頭の方から見た図」と明記している。
 *
 *   横から見た図 … 患者の左側から見る。顔は画面の左を向く。
 *                  座位から仰臥位・頭部懸垂位への動きが読める。
 *   頭の方から見た図 … 患者の頭側に立って見下ろす。画面の左が患者の右。
 *                  頭の回旋と体幹のロール、顔が床を向くか天井を向くかが読める。
 *
 * 姿勢はキーフレームの列で与え、間を補間して繰り返し再生する。
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
  /** 横から見た図の体幹角度。90 = 座位、0 = 仰臥位 */
  trunk: number
  /** 頭部の後屈。懸垂位で正の値 */
  ext: number
  /** 頭の回旋。患者から見て + = 右 */
  turn: number
  /** 体幹のロール。患者から見て + = 右を下に */
  roll: number
  /** 顔の向き。front = 天井（正面）、down = 床、up = 天井（側臥位で上を向く） */
  face: 'front' | 'down' | 'up'
}

const POSES: Record<PoseKey, PoseParams> = {
  sitting: { trunk: 90, ext: 0, turn: 0, roll: 0, face: 'front' },
  sitting_turn_r: { trunk: 90, ext: 0, turn: 45, roll: 0, face: 'front' },
  sitting_turn_l: { trunk: 90, ext: 0, turn: -45, roll: 0, face: 'front' },
  supine: { trunk: 0, ext: 0, turn: 0, roll: 0, face: 'front' },
  hang_r: { trunk: 0, ext: 28, turn: 45, roll: 0, face: 'front' },
  hang_l: { trunk: 0, ext: 28, turn: -45, roll: 0, face: 'front' },
  roll_r: { trunk: 0, ext: 0, turn: 90, roll: 0, face: 'front' },
  roll_l: { trunk: 0, ext: 0, turn: -90, roll: 0, face: 'front' },
  side_r: { trunk: 0, ext: 0, turn: 0, roll: 90, face: 'front' },
  side_l: { trunk: 0, ext: 0, turn: 0, roll: -90, face: 'front' },
  side_r_facedown: { trunk: 0, ext: 0, turn: 0, roll: 90, face: 'down' },
  side_l_facedown: { trunk: 0, ext: 0, turn: 0, roll: -90, face: 'down' },
  side_r_faceup: { trunk: 0, ext: 0, turn: 0, roll: 90, face: 'up' },
  side_l_faceup: { trunk: 0, ext: 0, turn: 0, roll: -90, face: 'up' },
}

const HOLD = 1.1 // 各姿勢を保つ秒数
const MOVE = 0.7 // 姿勢の間を動く秒数

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)
}

/** 時刻 t（秒）における補間後の姿勢 */
function sample(seq: PoseKey[], t: number): PoseParams {
  if (seq.length === 1) return POSES[seq[0]]
  const span = HOLD + MOVE
  const total = span * seq.length
  const local = t % total
  const i = Math.floor(local / span)
  const within = local - i * span
  const from = POSES[seq[i]]
  const to = POSES[seq[(i + 1) % seq.length]]
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

export function BodyPose({ seq, caption }: { seq: PoseKey[]; caption?: string }) {
  // 横から見た図
  const trunkRef = useRef<SVGGElement | null>(null)
  const headSideRef = useRef<SVGGElement | null>(null)
  // 頭の方から見た図
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

      // 横から見た図：体幹は腰(30,96)を軸に起こす。0=水平で頭が右、90=座位
      trunkRef.current?.setAttribute('transform', `rotate(${-p.trunk} 30 96)`)
      // 頭は首(96,96)を軸に後屈させる
      headSideRef.current?.setAttribute('transform', `rotate(${p.ext} 96 96)`)

      // 頭の方から見た図：患者から見た向きなので画面上は反転する
      shoulderRef.current?.setAttribute('transform', `rotate(${-p.roll * 0.35} 60 86)`)
      headTopRef.current?.setAttribute('transform', `rotate(${-p.turn - p.roll * 0.75} 60 44)`)

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
          <svg viewBox="0 0 150 120" role="img" aria-label="横から見た図">
            {/* 診察台 */}
            <rect x={8} y={96} width={124} height={12} rx={2} fill={TABLE} stroke={LINE} strokeWidth={1.2} />
            <line x1={132} y1={96} x2={148} y2={96} stroke={LINE} strokeWidth={1} strokeDasharray="3 3" />

            <g ref={trunkRef}>
              {/* 脚 */}
              <path d="M30 90 L14 90 L14 96 L30 96 Z" fill={GOWN} stroke={SKIN_DARK} strokeWidth={0.8} />
              {/* 体幹（腰30 → 首96） */}
              <path d="M30 78 L92 80 L92 96 L30 96 Z" fill={GOWN} stroke={LINE} strokeWidth={1.2} />
              {/* 腕 */}
              <path d="M52 82 L74 88" stroke={SKIN} strokeWidth={5} strokeLinecap="round" />

              <g ref={headSideRef}>
                {/* 首 */}
                <rect x={92} y={82} width={9} height={14} fill={SKIN} />
                {/* 横顔。顔は画面の右（頭側）を向く */}
                <circle cx={110} cy={82} r={15} fill={SKIN} stroke={SKIN_DARK} strokeWidth={1} />
                {/* 後頭部の髪 */}
                <path d="M97 76 A15 15 0 0 1 116 70 L116 76 A11 11 0 0 0 99 82 Z" fill={HAIR} />
                {/* 鼻・口・眼 */}
                <polygon points="124,82 118,78 118,86" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                <circle cx={117} cy={78} r={1.8} fill="#20232f" />
                <line x1={119} y1={88} x2={114} y2={89} stroke={SKIN_DARK} strokeWidth={1.2} />
                {/* 耳 */}
                <circle cx={106} cy={84} r={3} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
              </g>
            </g>
          </svg>
          <span className="bodypose-view">横から見た図</span>
        </div>

        {/* ── 頭の方から見た図 ────────────── */}
        <div className="bodypose-panel">
          <svg viewBox="0 0 120 120" role="img" aria-label="頭の方から見た図">
            <rect x={16} y={8} width={88} height={104} rx={3} fill={TABLE} stroke={LINE} strokeWidth={1.2} />

            <g ref={shoulderRef}>
              {/* 肩と体幹 */}
              <rect x={34} y={70} width={52} height={40} rx={12} fill={GOWN} stroke={LINE} strokeWidth={1.2} />
              {/* 腕 */}
              <line x1={36} y1={80} x2={26} y2={104} stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
              <line x1={84} y1={80} x2={94} y2={104} stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
              {/* 首 */}
              <rect x={52} y={60} width={16} height={14} fill={SKIN} />
            </g>

            <g ref={headTopRef}>
              {/* 頭 */}
              <circle cx={60} cy={44} r={20} fill={SKIN} stroke={SKIN_DARK} strokeWidth={1.2} />
              {/* 耳（頭の左右） */}
              <circle cx={40} cy={46} r={3.4} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
              <circle cx={80} cy={46} r={3.4} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />

              {/* 顔（天井を向いている＝こちらを向いている） */}
              <g ref={faceFrontRef}>
                <path d="M42 34 A20 20 0 0 1 78 34 L78 30 A20 20 0 0 0 42 30 Z" fill={HAIR} />
                <circle cx={52} cy={41} r={2.4} fill="#20232f" />
                <circle cx={68} cy={41} r={2.4} fill="#20232f" />
                <polygon points="60,44 56,52 64,52" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                <path d="M53 57 Q60 60 67 57" fill="none" stroke={SKIN_DARK} strokeWidth={1.4} />
              </g>

              {/* 顔が床を向いている＝後頭部が見えている */}
              <g ref={faceBackRef} opacity={0}>
                <circle cx={60} cy={44} r={19} fill={HAIR} />
                <path d="M52 60 Q60 66 68 60" fill="none" stroke={SKIN_DARK} strokeWidth={1.4} />
              </g>

              {/* 顔が天井を向いている（側臥位で上を向く）＝あごが上がった正面顔 */}
              <g ref={faceUpRef} opacity={0}>
                <path d="M42 32 A20 20 0 0 1 78 32 L78 28 A20 20 0 0 0 42 28 Z" fill={HAIR} />
                <circle cx={52} cy={38} r={2.4} fill="#20232f" />
                <circle cx={68} cy={38} r={2.4} fill="#20232f" />
                <polygon points="60,42 55,51 65,51" fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                <path d="M52 56 Q60 61 68 56" fill="none" stroke={SKIN_DARK} strokeWidth={1.4} />
              </g>
            </g>

            {/* 左右のラベル。画面の左が患者の右になる */}
            <text x={20} y={20} fontSize={9} fill="#ffd75e">
              患者の右
            </text>
            <text x={78} y={20} fontSize={9} fill="#ffd75e">
              患者の左
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
    caption: '座位で頭を右へ45°回し、その向きを保ったまま素早く仰臥位・頭部懸垂位にする',
  },
  eye_dh_l: {
    seq: ['sitting_turn_l', 'hang_l'],
    caption: '座位で頭を左へ45°回し、その向きを保ったまま素早く仰臥位・頭部懸垂位にする',
  },
  eye_roll_r: {
    seq: ['supine', 'roll_r'],
    caption: '仰臥位のまま、頭だけを右へ90°向ける（右耳が下になる）',
  },
  eye_roll_l: {
    seq: ['supine', 'roll_l'],
    caption: '仰臥位のまま、頭だけを左へ90°向ける（左耳が下になる）',
  },
}

export function ExamPose({ actionId }: { actionId: string }) {
  const entry = EXAM_SEQ[actionId]
  if (!entry) return null
  return <BodyPose seq={entry.seq} caption={entry.caption} />
}
