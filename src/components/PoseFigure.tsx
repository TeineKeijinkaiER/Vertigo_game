import { useEffect, useRef } from 'react'

/**
 * 体位の動的イラスト。
 *
 * ── 設計の要点
 *
 * 頭側から見た図（axial）は、患者の頭側に立って足の方向を見た図。
 * hc-bppv.pdf（小川, 東医大誌 2016）の図がこの視点で統一されているのは、
 * 外側半規管型BPPVの手技（頭の回旋・体幹のロール）がこの一面だけで表せるため。
 *
 * ただしシルエットを角度で回すと、側臥位が「ベッドの中で体ごと向きを変えた」
 * ように見えてしまう。頭側から見た体は断面なので、仰臥位・右側臥位・左側臥位・
 * 腹臥位はそれぞれ別の絵として描き分ける。顔も同様に、正面・斜め・横顔・後頭部を
 * 描き分け、角度で回転させない。
 *
 * 横から見た図（sagittal）は、頭側からでは表せない
 * 「坐位か仰臥位か」「頭部懸垂位（頸部後屈）」を示すためだけに使う。
 */

type BodyView = 'supine' | 'side_r' | 'side_l' | 'prone'

export interface Pose {
  /** 体幹角度。90 = 坐位、0 = 仰臥位。横から見た図でのみ使う */
  trunk: number
  /** 頸部後屈。頭部懸垂位で正の値。横から見た図でのみ使う */
  ext: number
  /** 頭が空間内で向いている角度。患者から見て + = 右、180 = 真下（床） */
  headAngle: number
  /** 頭側から見た体の描き分け */
  body: BodyView
  /** 横から見た図も出すか */
  sagittal: boolean
  label: string
}

const P = (label: string, o: Partial<Omit<Pose, 'label'>> = {}): Pose => ({
  trunk: 0,
  ext: 0,
  headAngle: 0,
  body: 'supine',
  sagittal: false,
  label,
  ...o,
})

export const POSES = {
  // ── 後半規管型（坐位・懸垂位が要るので横から見た図も出す）
  sitting: P('坐位', { trunk: 90, sagittal: true }),
  sitting_turn_r: P('坐位・頭を右へ45°', { trunk: 90, headAngle: 45, sagittal: true }),
  sitting_turn_l: P('坐位・頭を左へ45°', { trunk: 90, headAngle: -45, sagittal: true }),
  hang_r: P('仰臥位・頭部懸垂位・頭は右45°', { ext: 40, headAngle: 45, sagittal: true }),
  hang_l: P('仰臥位・頭部懸垂位・頭は左45°', { ext: 40, headAngle: -45, sagittal: true }),
  /** Epley 第2段階：懸垂位のまま頭だけ反対側へ回す */
  hang_cross_r: P('懸垂位のまま頭を右へ90°', { ext: 40, headAngle: 90, sagittal: true }),
  hang_cross_l: P('懸垂位のまま頭を左へ90°', { ext: 40, headAngle: -90, sagittal: true }),
  supine: P('仰臥位', { sagittal: true }),

  // ── 外側半規管型（頭側から見た図だけで足りる）
  roll_r: P('仰臥位・頭を右へ90°（右耳が下）', { headAngle: 90 }),
  roll_l: P('仰臥位・頭を左へ90°（左耳が下）', { headAngle: -90 }),
  side_r: P('右側臥位（右が下）', { body: 'side_r', headAngle: 90 }),
  side_l: P('左側臥位（左が下）', { body: 'side_l', headAngle: -90 }),
  prone: P('腹臥位（うつ伏せ）', { body: 'prone', headAngle: 180 }),
  /** 側臥位からさらに顔を床側へ45° */
  side_r_facedown: P('右側臥位・顔を下へ45°', { body: 'side_r', headAngle: 135 }),
  side_l_facedown: P('左側臥位・顔を下へ45°', { body: 'side_l', headAngle: -135 }),
  /** 側臥位からさらに顔を天井側へ45° */
  side_r_faceup: P('右側臥位・顔を上へ45°', { body: 'side_r', headAngle: 45 }),
  side_l_faceup: P('左側臥位・顔を上へ45°', { body: 'side_l', headAngle: -45 }),
} satisfies Record<string, Pose>

export type PoseKey = keyof typeof POSES

const HOLD = 1.3
const MOVE = 0.85
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t))

function sample(seq: PoseKey[], t: number): Pose {
  const at = (k: PoseKey | undefined): Pose => POSES[k as PoseKey] ?? POSES.supine
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
  // 体と顔は描き分けなので補間せず、途中で切り替える
  return {
    trunk: lerp(from.trunk, to.trunk, k),
    ext: lerp(from.ext, to.ext, k),
    headAngle: lerp(from.headAngle, to.headAngle, k),
    body: k < 0.5 ? from.body : to.body,
    sagittal: from.sagittal || to.sagittal,
    label: k < 0.5 ? from.label : to.label,
  }
}

const SKIN = '#f3d0ad'
const SKIN_D = '#c08a5e'
const GOWN = '#8fb4ff'
const GOWN_D = '#4f72c4'
const HAIR = '#3a2b23'
const TABLE = '#243468'
const TABLE_D = '#4a5da8'
const EYE = '#20232f'

/** 顔をどの絵で描くか。角度で回さず、5段階に描き分ける */
type FaceView = 'front' | 'three_quarter' | 'profile' | 'three_quarter_back' | 'back'

function faceView(angle: number): FaceView {
  const a = Math.abs(((angle % 360) + 360) % 360)
  const d = a > 180 ? 360 - a : a
  if (d < 25) return 'front'
  if (d < 68) return 'three_quarter'
  if (d < 113) return 'profile'
  if (d < 158) return 'three_quarter_back'
  return 'back'
}

/**
 * 顔の絵。すべて「画面の左を向いている」状態で描く。
 * 患者の右を向く（＝画面の左）ときはそのまま、左を向くときは左右反転して使う。
 */
function Faces({ initial }: { initial: FaceView }) {
  const op = (v: FaceView) => (v === initial ? 1 : 0)
  return (
    <>
      {/* 正面（顔が天井を向いている） */}
      <g data-face="front" opacity={op('front')}>
        <circle cx={60} cy={42} r={23} fill={SKIN} stroke={SKIN_D} strokeWidth={1.4} />
        <circle cx={36} cy={45} r={4} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
        <circle cx={84} cy={45} r={4} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
        <path d="M39.3 32 A23 23 0 0 1 80.7 32 Q60 26 39.3 32 Z" fill={HAIR} />
        <circle cx={50} cy={39} r={2.7} fill={EYE} />
        <circle cx={70} cy={39} r={2.7} fill={EYE} />
        <polygon points="60,41 55,52 65,52" fill={SKIN} stroke={SKIN_D} strokeWidth={1} />
        <path d="M52 57 Q60 61 68 57" fill="none" stroke={SKIN_D} strokeWidth={1.5} />
      </g>

      {/* 斜め（画面左寄りを向いている） */}
      <g data-face="three_quarter" opacity={op('three_quarter')}>
        <circle cx={60} cy={42} r={23} fill={SKIN} stroke={SKIN_D} strokeWidth={1.4} />
        <circle cx={81} cy={48} r={4.4} fill={SKIN} stroke={SKIN_D} strokeWidth={1.2} />
        {/* 後頭部側（画面右）と前髪 */}
        <path d="M72 22 A23 23 0 0 1 72 62 L66 56 A17 17 0 0 0 66 28 Z" fill={HAIR} />
        <path d="M42 29 A23 23 0 0 1 72 22 L69 30 A17 17 0 0 0 48 35 Z" fill={HAIR} />
        <circle cx={46} cy={41} r={2.7} fill={EYE} />
        <circle cx={63} cy={39} r={2.5} fill={EYE} />
        <polygon points="45,45 38,54 49,55" fill={SKIN} stroke={SKIN_D} strokeWidth={1} />
        <path d="M43 59 Q50 62 57 58" fill="none" stroke={SKIN_D} strokeWidth={1.4} />
      </g>

      {/* 横顔（画面左を向いている）。後頭部側の髪で頭の向きを示す */}
      <g data-face="profile" opacity={op('profile')}>
        <circle cx={60} cy={42} r={23} fill={SKIN} stroke={SKIN_D} strokeWidth={1.4} />
        {/* 後頭部（画面右）を髪で覆う */}
        <path d="M60 19 A23 23 0 0 1 60 65 L60 19 Z" fill={HAIR} />
        {/* 前髪が額（画面左上）にかかる */}
        <path d="M60 19 A23 23 0 0 0 39 33 L46 37 A16 16 0 0 1 60 27 Z" fill={HAIR} />
        {/* 鼻が画面左に突き出す */}
        <polygon points="33,44 45,38 45,51" fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
        <circle cx={47} cy={38} r={2.6} fill={EYE} />
        <path d="M39 54 Q45 57 51 54" fill="none" stroke={SKIN_D} strokeWidth={1.4} />
        {/* 上を向いている側の耳だけが見える */}
        <circle cx={64} cy={46} r={4.6} fill={SKIN} stroke={SKIN_D} strokeWidth={1.2} />
      </g>

      {/* 斜め後ろ（顔が床寄りを向いている）。ほとんど後頭部で、頬と鼻先だけ見える */}
      <g data-face="three_quarter_back" opacity={op('three_quarter_back')}>
        <circle cx={60} cy={42} r={23} fill={SKIN} stroke={SKIN_D} strokeWidth={1.4} />
        <path d="M60 19 A23 23 0 0 1 60 65 L60 19 Z" fill={HAIR} />
        <path d="M60 19 A23 23 0 0 0 38 48 L47 50 A16 16 0 0 1 60 27 Z" fill={HAIR} />
        {/* 鼻先だけがのぞく */}
        <polygon points="36,54 45,50 44,58" fill={SKIN} stroke={SKIN_D} strokeWidth={1} />
        <circle cx={62} cy={52} r={4.6} fill={SKIN} stroke={SKIN_D} strokeWidth={1.2} />
      </g>

      {/* 後頭部（顔が床を向いている） */}
      <g data-face="back" opacity={op('back')}>
        <circle cx={60} cy={42} r={23} fill={HAIR} stroke="#241a15" strokeWidth={1.4} />
        <path d="M60 19 A23 23 0 0 1 60 65" fill="none" stroke="#241a15" strokeWidth={1.6} />
        <circle cx={36} cy={45} r={4} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
        <circle cx={84} cy={45} r={4} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
      </g>
    </>
  )
}

/** 頭側から見た体。仰臥位・右側臥位・左側臥位・腹臥位を別々に描く */
function Bodies({ initial }: { initial: BodyView }) {
  const op = (v: BodyView) => (v === initial ? 1 : 0)
  return (
    <>
      {/* 仰臥位：肩幅が広く、両上肢が左右に開く */}
      <g data-body="supine" opacity={op('supine')}>
        <path d="M34 66 Q60 60 86 66 L90 142 L30 142 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.5} />
        <path d="M36 72 L20 124" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
        <path d="M84 72 L100 124" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
        <rect x={50} y={56} width={20} height={16} rx={4} fill={SKIN} />
      </g>

      {/* 右側臥位：右（画面左）が下。肩幅は狭く見え、上になった左肩と左上肢が手前に来る */}
      <g data-body="side_r" opacity={op('side_r')}>
        <path d="M46 66 Q60 61 76 66 L78 142 L44 142 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.5} />
        {/* 上になった側（画面右＝患者の左）の肩 */}
        <ellipse cx={78} cy={72} rx={9} ry={7} fill={GOWN} stroke={GOWN_D} strokeWidth={1.3} />
        <path d="M80 76 L96 120" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
        {/* 下になった側の腕は体の陰に隠れ、わずかに見える */}
        <path d="M46 78 L38 112" stroke={SKIN_D} strokeWidth={5} strokeLinecap="round" opacity={0.55} />
        <rect x={52} y={56} width={17} height={16} rx={4} fill={SKIN} />
        <text x={22} y={140} fontSize={9} fill="#ffd75e">
          下
        </text>
      </g>

      {/* 左側臥位：左（画面右）が下 */}
      <g data-body="side_l" opacity={op('side_l')}>
        <path d="M44 66 Q60 61 74 66 L76 142 L42 142 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.5} />
        <ellipse cx={42} cy={72} rx={9} ry={7} fill={GOWN} stroke={GOWN_D} strokeWidth={1.3} />
        <path d="M40 76 L24 120" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
        <path d="M74 78 L82 112" stroke={SKIN_D} strokeWidth={5} strokeLinecap="round" opacity={0.55} />
        <rect x={51} y={56} width={17} height={16} rx={4} fill={SKIN} />
        <text x={92} y={140} fontSize={9} fill="#ffd75e">
          下
        </text>
      </g>

      {/* 腹臥位：背中が見える。両上肢は頭の脇へ上げる */}
      <g data-body="prone" opacity={op('prone')}>
        <path d="M34 66 Q60 60 86 66 L90 142 L30 142 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.5} />
        <path d="M60 66 L60 142" stroke={GOWN_D} strokeWidth={1.6} />
        <path d="M36 72 L16 92" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
        <path d="M84 72 L104 92" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
        <rect x={50} y={56} width={20} height={16} rx={4} fill={SKIN} />
      </g>
    </>
  )
}

export function PoseFigure({ seq, caption }: { seq: PoseKey[]; caption?: string }) {
  const hasSagittal = seq.some((k) => (POSES[k] ?? POSES.supine).sagittal)

  const rootRef = useRef<SVGSVGElement | null>(null)
  const headWrapRef = useRef<SVGGElement | null>(null)
  const trunkRef = useRef<SVGGElement | null>(null)
  const headSideRef = useRef<SVGGElement | null>(null)
  const labelRef = useRef<SVGTextElement | null>(null)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const p = sample(seq, (now - start) / 1000)
      const svg = rootRef.current

      if (svg) {
        // 体は4通りの描き分けから1つだけ出す
        for (const el of svg.querySelectorAll<SVGGElement>('g[data-body]')) {
          el.style.opacity = el.dataset.body === p.body ? '1' : '0'
        }
        // 顔も5通りの描き分けから1つだけ出す
        const fv = faceView(p.headAngle)
        for (const el of svg.querySelectorAll<SVGGElement>('g[data-face]')) {
          el.style.opacity = el.dataset.face === fv ? '1' : '0'
        }
      }
      // 患者の右を向く（画面の左）ときはそのまま、左を向くときだけ左右反転
      const mirrored = p.headAngle < 0
      headWrapRef.current?.setAttribute('transform', mirrored ? 'translate(120 0) scale(-1 1)' : '')

      trunkRef.current?.setAttribute('transform', `rotate(${-p.trunk} 46 98)`)
      headSideRef.current?.setAttribute(
        'transform',
        `rotate(${p.ext} 84 90) translate(${p.ext * 0.26} ${p.ext * 0.17})`,
      )

      if (labelRef.current && labelRef.current.textContent !== p.label) {
        labelRef.current.textContent = p.label
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [seq])

  const initial = POSES[seq[0]] ?? POSES.supine
  const initialFace = faceView(initial.headAngle)

  return (
    <figure className="posefig">
      <div className="posefig-panels">
        {hasSagittal && (
          <div className="posefig-panel">
            <svg viewBox="0 0 150 128" role="img" aria-label="横から見た図">
              <rect x={4} y={98} width={104} height={16} rx={2} fill={TABLE} stroke={TABLE_D} strokeWidth={1.4} />
              <path d="M46 98 L46 86 L20 88 L18 98 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.2} />
              <path d="M18 98 L18 90 L9 92 L9 98 Z" fill={SKIN} stroke={SKIN_D} strokeWidth={1} />

              <g ref={trunkRef}>
                <path d="M46 98 L46 82 Q66 78 88 82 L88 98 Z" fill={GOWN} stroke={GOWN_D} strokeWidth={1.4} />
                <path d="M56 87 L80 92" stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
                <rect x={82} y={84} width={9} height={12} fill={SKIN} />

                {/* 仰臥位を基準に描く。顔は上（天井）を向き、後頭部が台に接する */}
                <g ref={headSideRef}>
                  <circle cx={96} cy={88} r={12} fill={SKIN} stroke={SKIN_D} strokeWidth={1.1} />
                  <path
                    d="M96 100 A12 12 0 0 0 108 88 A12 12 0 0 0 101 77 L99 82 A7 7 0 0 1 103 88 A7 7 0 0 1 96 95 Z"
                    fill={HAIR}
                  />
                  <polygon points="94,75 89,81 98,81" fill={SKIN} stroke={SKIN_D} strokeWidth={0.9} />
                  <circle cx={93} cy={84} r={1.7} fill={EYE} />
                  <line x1={87} y1={86} x2={88} y2={90} stroke={SKIN_D} strokeWidth={1.1} />
                  <circle cx={98} cy={91} r={2.6} fill={SKIN} stroke={SKIN_D} strokeWidth={0.9} />
                </g>
              </g>
            </svg>
            <span className="posefig-view">横から見た図</span>
          </div>
        )}

        <div className="posefig-panel">
          <svg ref={rootRef} viewBox="0 0 120 158" role="img" aria-label="頭の方から見た図">
            <rect x={8} y={6} width={104} height={138} rx={4} fill={TABLE} stroke={TABLE_D} strokeWidth={1.4} />

            {/* 体：描き分けたうち1つだけを表示する */}
            <Bodies initial={initial.body} />

            {/* 顔：描き分けたうち1つだけを表示する。左を向くときだけ左右反転 */}
            <g ref={headWrapRef}>
              <Faces initial={initialFace} />
            </g>

            <text x={10} y={153} fontSize={8} fill="#ffd75e">
              ← 患者の右
            </text>
            <text x={73} y={153} fontSize={8} fill="#ffd75e">
              患者の左 →
            </text>
          </svg>
          <span className="posefig-view">頭の方から見た図</span>
        </div>
      </div>

      <svg viewBox="0 0 240 16" className="posefig-label" role="img" aria-label="現在の姿勢">
        <text ref={labelRef} x={120} y={12} textAnchor="middle" fontSize={11} fill="#ffd75e">
          {initial.label}
        </text>
      </svg>

      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

const EXAM_SEQ: Record<string, { seq: PoseKey[]; caption: string }> = {
  eye_dh_r: {
    seq: ['sitting_turn_r', 'hang_r'],
    caption: '坐位で頭を右へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる（右耳が下）',
  },
  eye_dh_l: {
    seq: ['sitting_turn_l', 'hang_l'],
    caption: '坐位で頭を左へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる（左耳が下）',
  },
  eye_roll_r: {
    seq: ['supine', 'roll_r'],
    caption: '仰臥位のまま、頭だけを右へ90°向ける（右耳が下）。体は動かさない',
  },
  eye_roll_l: {
    seq: ['supine', 'roll_l'],
    caption: '仰臥位のまま、頭だけを左へ90°向ける（左耳が下）。体は動かさない',
  },
}

export function ExamPose({ actionId }: { actionId: string }) {
  const entry = EXAM_SEQ[actionId]
  if (!entry) return null
  return <PoseFigure seq={entry.seq} caption={entry.caption} />
}
