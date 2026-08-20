import { useEffect, useRef, useState } from 'react'
import type { NystagmusSpec } from '../data/types'

/**
 * 眼振の動的表示。
 *
 * 描画は「検者が患者を正面から見た図」。したがって画面の左側が患者の右眼になる。
 * spec の向きは患者から見た向きで書かれているので、ここで左右と回旋を反転する。
 *
 * 律動眼振（jerk nystagmus）として、緩徐相でゆっくり流れ、急速相でぱっと戻る動きを描く。
 * 速相の向きが「〜向き眼振」の向きにあたる。
 */

const SLOW_PHASE = 0.85 // 1周期のうち緩徐相が占める割合

/** 1周期内の位置。+1（速相直後）→ -1（緩徐相の終わり）→ +1 に急速に戻る */
function beatPosition(p: number): number {
  if (p < SLOW_PHASE) return 1 - (2 * p) / SLOW_PHASE
  return -1 + (2 * (p - SLOW_PHASE)) / (1 - SLOW_PHASE)
}

/** 潜時と疲労性の包絡線 */
function envelope(t: number, latency: number, duration: number | null): number {
  if (t < latency) return 0
  if (duration === null) return 1
  const e = t - latency
  if (e > duration) return 0
  const rise = Math.min(1, e / 0.6)
  const half = duration * 0.5
  const decay = e > half ? Math.max(0, 1 - (e - half) / half) : 1
  return rise * decay
}

function Eye({
  cx,
  label,
  offsetRef,
}: {
  cx: number
  label: string
  offsetRef: (el: SVGGElement | null) => void
}) {
  const cy = 62
  return (
    <g>
      {/* 眼瞼・強膜 */}
      <ellipse cx={cx} cy={cy} rx={40} ry={26} fill="#f4f6ff" stroke="#7f88b8" strokeWidth={2} />
      <clipPath id={`clip-${label}`}>
        <ellipse cx={cx} cy={cy} rx={40} ry={26} />
      </clipPath>
      <g clipPath={`url(#clip-${label})`}>
        <g ref={offsetRef}>
          {/* 虹彩。回旋が見えるように放射状の模様を入れる */}
          <circle cx={cx} cy={cy} r={16} fill="#3d5aa8" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * 7}
                y1={cy + Math.sin(a) * 7}
                x2={cx + Math.cos(a) * 15.5}
                y2={cy + Math.sin(a) * 15.5}
                stroke="#8fa8e8"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )
          })}
          {/* 12時の位置に目印。回旋方向はこれを見れば分かる */}
          <circle cx={cx} cy={cy - 15.5} r={2.6} fill="#ffd75e" />
          <circle cx={cx} cy={cy} r={7} fill="#0b1030" />
        </g>
      </g>
      <text x={cx} y={106} textAnchor="middle" fontSize={11} fill="#9aa4c8">
        {label}
      </text>
    </g>
  )
}

export function Nystagmus({ spec }: { spec: NystagmusSpec }) {
  const rightEye = useRef<SVGGElement | null>(null)
  const leftEye = useRef<SVGGElement | null>(null)
  const [replayKey, setReplayKey] = useState(0)

  const h = spec.horizontal ?? 0
  const v = spec.vertical ?? 0
  const tor = spec.torsional ?? 0
  const freq = spec.frequency ?? 0
  const latency = spec.latencySec ?? 0
  const duration = spec.durationSec ?? null
  const gaze = spec.gazeOffset ?? 0
  const hasNystagmus = freq > 0 && (h !== 0 || v !== 0 || tor !== 0)
  // 潜時や疲労性がある場合は、繰り返し観察できるよう間を置いてループさせる
  const cycle = duration !== null ? latency + duration + 1.6 : null

  useEffect(() => {
    let raf = 0
    const start = performance.now()

    const frame = (now: number) => {
      const elapsed = (now - start) / 1000
      const t = cycle !== null ? elapsed % cycle : elapsed
      const env = hasNystagmus ? envelope(t, latency, duration) : 0
      const s = beatPosition((elapsed * freq) % 1)

      // 患者から見た向き → 検者から見た図に反転
      const dx = -(h * s * env + gaze)
      const dy = -v * s * env
      const rot = -tor * s * env

      for (const ref of [rightEye.current, leftEye.current]) {
        if (!ref) continue
        const box = ref.getBBox()
        const ox = box.x + box.width / 2
        const oy = box.y + box.height / 2
        ref.setAttribute('transform', `translate(${dx} ${dy}) rotate(${rot} ${ox} ${oy})`)
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [h, v, tor, freq, latency, duration, gaze, hasNystagmus, cycle, replayKey])

  return (
    <figure className="nystagmus">
      <svg viewBox="0 0 260 118" role="img" aria-label={spec.caption ?? '眼振の所見'}>
        {spec.frenzel && (
          <g>
            {/* Frenzel眼鏡はゴーグル。顔全体を覆うフレームとバンドを描く */}
            <rect x={6} y={16} width={248} height={92} rx={26} fill="#12183c" stroke="#5a6088" strokeWidth={3} />
            <rect x={0} y={52} width={10} height={16} rx={3} fill="#5a6088" />
            <rect x={250} y={52} width={10} height={16} rx={3} fill="#5a6088" />
            {/* 拡大レンズ（強い凸レンズ）のリング */}
            <circle cx={68} cy={62} r={40} fill="#0a0f2e" stroke="#ffd75e" strokeWidth={3} />
            <circle cx={68} cy={62} r={33} fill="none" stroke="#5a6088" strokeWidth={1.5} />
            <circle cx={192} cy={62} r={40} fill="#0a0f2e" stroke="#ffd75e" strokeWidth={3} />
            <circle cx={192} cy={62} r={33} fill="none" stroke="#5a6088" strokeWidth={1.5} />
            {/* 内部照明の反射 */}
            <path d="M44 40 A40 40 0 0 1 60 28" fill="none" stroke="#8fa8e8" strokeWidth={2.5} opacity={0.7} />
            <path d="M168 40 A40 40 0 0 1 184 28" fill="none" stroke="#8fa8e8" strokeWidth={2.5} opacity={0.7} />
          </g>
        )}

        {/* 検者から見た図：画面左が患者の右眼 */}
        <Eye cx={68} label="右眼" offsetRef={(el) => (rightEye.current = el)} />
        <Eye cx={192} label="左眼" offsetRef={(el) => (leftEye.current = el)} />
      </svg>
      <figcaption>
        {hasNystagmus ? (
          <>
            {spec.caption && <span className="accent">{spec.caption}</span>}
            <span className="dim"> ／ 検者から見た図</span>
          </>
        ) : (
          <span className="dim">眼振なし ／ 検者から見た図</span>
        )}
        {cycle !== null && (
          <button type="button" className="replay" onClick={() => setReplayKey((k) => k + 1)}>
            もう一度みる
          </button>
        )}
      </figcaption>
    </figure>
  )
}
