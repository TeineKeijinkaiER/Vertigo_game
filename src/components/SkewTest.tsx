import { useEffect, useRef } from 'react'

/**
 * Test of Skew（交代遮蔽試験）の動的イラスト。
 *
 * 遮蔽板を左右の眼に交互にあて、遮蔽を外した瞬間に
 * その眼が垂直方向に「戻る」動きをするかを見る。
 * 戻り運動があれば skew deviation 陽性で、脳幹病変を疑う。
 *
 * 画面は検者から見た図なので、画面左が患者の右眼。
 */

const CYCLE = 3.2 // 1周期（右を覆う → 左を覆う）

export function SkewTest({ positive, caption }: { positive: boolean; caption?: string }) {
  const cover = useRef<SVGGElement | null>(null)
  const rightEye = useRef<SVGGElement | null>(null)
  const leftEye = useRef<SVGGElement | null>(null)

  useEffect(() => {
    let raf = 0
    const start = performance.now()

    const frame = (now: number) => {
      const t = ((now - start) / 1000) % CYCLE
      const half = CYCLE / 2
      // 前半は右眼（画面左）を覆い、後半は左眼（画面右）を覆う
      const coveringRight = t < half
      const within = coveringRight ? t : t - half

      // 遮蔽板の横位置。移動は 0.35 秒
      const target = coveringRight ? 62 : 148
      const prev = coveringRight ? 148 : 62
      const slide = Math.min(1, within / 0.35)
      const x = prev + (target - prev) * slide
      cover.current?.setAttribute('transform', `translate(${x - 105} 0)`)

      // 遮蔽を外された眼が垂直に戻る動き（陽性のときだけ）
      // 覆われている間、その眼は偏位している。外すと 0.3 秒で戻る。
      let dyRight = 0
      let dyLeft = 0
      if (positive) {
        const settle = Math.max(0, 1 - Math.max(0, within - 0.35) / 0.3)
        if (coveringRight) {
          // 右眼が覆われている → 左眼（開いている側）は上方へずれた状態から戻る
          dyLeft = -5 * settle
          dyRight = 5
        } else {
          dyRight = 5 * settle
          dyLeft = -5
        }
      }
      rightEye.current?.setAttribute('transform', `translate(0 ${dyRight})`)
      leftEye.current?.setAttribute('transform', `translate(0 ${dyLeft})`)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [positive])

  return (
    <figure className="skewtest">
      <svg viewBox="0 0 210 120" role="img" aria-label="Test of Skew">
        {/* 顔 */}
        <ellipse cx={105} cy={58} rx={78} ry={50} fill="#f0c9a4" stroke="#c99b74" strokeWidth={1.5} />
        <path d="M27 46 A78 50 0 0 1 183 46 L183 34 A78 50 0 0 0 27 34 Z" fill="#3a2b23" />
        <polygon points="105,58 98,76 112,76" fill="#f0c9a4" stroke="#c99b74" strokeWidth={1} />
        <path d="M92 90 Q105 96 118 90" fill="none" stroke="#c99b74" strokeWidth={1.8} />

        {/* 右眼（画面左） */}
        <g>
          <ellipse cx={62} cy={54} rx={22} ry={14} fill="#f8fbff" stroke="#8fa8e8" strokeWidth={1.4} />
          <g ref={rightEye}>
            <circle cx={62} cy={54} r={9} fill="#3d5aa8" />
            <circle cx={62} cy={54} r={4} fill="#0b1030" />
          </g>
        </g>

        {/* 左眼（画面右） */}
        <g>
          <ellipse cx={148} cy={54} rx={22} ry={14} fill="#f8fbff" stroke="#8fa8e8" strokeWidth={1.4} />
          <g ref={leftEye}>
            <circle cx={148} cy={54} r={9} fill="#3d5aa8" />
            <circle cx={148} cy={54} r={4} fill="#0b1030" />
          </g>
        </g>

        {/* 遮蔽板 */}
        <g ref={cover}>
          <rect x={82} y={26} width={46} height={56} rx={3} fill="#0b0f34" stroke="#ffd75e" strokeWidth={2} />
          <rect x={100} y={80} width={10} height={30} rx={3} fill="#0b0f34" stroke="#ffd75e" strokeWidth={2} />
        </g>

        <text x={62} y={112} textAnchor="middle" fontSize={9} fill="#9aa4c8">
          右眼
        </text>
        <text x={148} y={112} textAnchor="middle" fontSize={9} fill="#9aa4c8">
          左眼
        </text>
      </svg>
      <figcaption>
        {caption && <span className={positive ? 'danger' : 'safe'}>{caption}</span>}
        <span className="dim"> ／ 検者から見た図</span>
      </figcaption>
    </figure>
  )
}
