import type { Pose } from '../data/maneuvers'

/**
 * 頭位の簡易イラスト。
 *
 * 患者を上から見た図（検者が患者の頭側に立って見下ろした向き）。
 * 眼振の図と同じく、画面の左が患者の右になる。
 * 顔の向きは鼻の三角で示す。
 */

const LABELS: Record<Pose, string> = {
  sitting: '座位',
  supine: '仰臥位（正面）',
  head_hanging_r: '右を下に　頭部懸垂位',
  head_hanging_l: '左を下に　頭部懸垂位',
  sidelying_r: '右側臥位',
  sidelying_l: '左側臥位',
  face_down: '顔を下（床）に向ける',
  face_up: '顔を上（天井）に向ける',
  rotate_r: '右方向へ回す',
  rotate_l: '左方向へ回す',
}

/** 顔の向き（度）。患者から見た向きで持ち、描画時に反転する */
function faceTurn(pose: Pose): number {
  switch (pose) {
    case 'head_hanging_r':
    case 'sidelying_r':
    case 'rotate_r':
      return 45
    case 'head_hanging_l':
    case 'sidelying_l':
    case 'rotate_l':
      return -45
    default:
      return 0
  }
}

export function HeadPose({ pose, active = false }: { pose: Pose; active?: boolean }) {
  const turn = -faceTurn(pose) // 検者から見た図に反転
  const hanging = pose === 'head_hanging_r' || pose === 'head_hanging_l'
  const sideLying = pose === 'sidelying_r' || pose === 'sidelying_l'
  const rotating = pose === 'rotate_r' || pose === 'rotate_l'
  const sitting = pose === 'sitting'
  const stroke = active ? '#ffd75e' : '#8fa8e8'

  return (
    <figure className={`headpose${active ? ' is-active' : ''}`}>
      <svg viewBox="0 0 110 122" role="img" aria-label={LABELS[pose]}>
        {/* 診察台 */}
        <rect x={20} y={sitting ? 58 : 8} width={70} height={sitting ? 56 : 106} rx={5} fill="#0f1740" stroke="#2c3468" />

        {/* 体幹 */}
        {sitting ? (
          <rect x={40} y={62} width={30} height={40} rx={10} fill="#1b2a63" stroke={stroke} strokeWidth={1.5} />
        ) : (
          <rect
            x={sideLying ? 44 : 40}
            y={44}
            width={sideLying ? 22 : 30}
            height={62}
            rx={10}
            fill="#1b2a63"
            stroke={stroke}
            strokeWidth={1.5}
          />
        )}

        {/* 頭。回旋は顔の向きで表現する */}
        <g transform={`translate(55 ${sitting ? 44 : hanging ? 22 : 30}) rotate(${turn})`}>
          <circle r={18} fill="#1b2a63" stroke={stroke} strokeWidth={2} />
          {/* 鼻。顔の向いている方向を示す */}
          <polygon points="0,-24 -5,-16 5,-16" fill={stroke} />
          {/* 両耳 */}
          <circle cx={-18} cy={0} r={3.4} fill={stroke} />
          <circle cx={18} cy={0} r={3.4} fill={stroke} />
          {/* 眼 */}
          <circle cx={-7} cy={-6} r={2.6} fill="#f4f6ff" />
          <circle cx={7} cy={-6} r={2.6} fill="#f4f6ff" />
        </g>

        {/* 頭部懸垂位：頭が台からはみ出て下がっていることを示す */}
        {hanging && (
          <>
            <path d="M30 12 L55 2 L80 12" fill="none" stroke="#ffd75e" strokeWidth={1.6} strokeDasharray="3 3" />
            <text x={55} y={118} textAnchor="middle" fontSize={8} fill="#ffd75e">
              頭を台から下げる
            </text>
          </>
        )}

        {/* 回転方向の矢印 */}
        {rotating && (
          <path
            d={pose === 'rotate_r' ? 'M78 96 A26 26 0 0 0 32 96' : 'M32 96 A26 26 0 0 1 78 96'}
            fill="none"
            stroke="#ffd75e"
            strokeWidth={2}
            markerEnd="url(#arrow)"
          />
        )}

        {/* 顔の上下向き（Gufoni法）は矢印で示す */}
        {pose === 'face_down' && (
          <text x={55} y={116} textAnchor="middle" fontSize={9} fill="#ffd75e">
            鼻を床へ ↓
          </text>
        )}
        {pose === 'face_up' && (
          <text x={55} y={116} textAnchor="middle" fontSize={9} fill="#ffd75e">
            鼻を天井へ ↑
          </text>
        )}

        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#ffd75e" />
          </marker>
        </defs>
      </svg>
      <figcaption>{LABELS[pose]}</figcaption>
    </figure>
  )
}

/** 診察（Dix-Hallpike / Head Roll）で頭位を示すための小さいラッパ */
export function ExamPose({ actionId }: { actionId: string }) {
  const map: Record<string, Pose> = {
    eye_dh_r: 'head_hanging_r',
    eye_dh_l: 'head_hanging_l',
    eye_roll_r: 'sidelying_r',
    eye_roll_l: 'sidelying_l',
  }
  const pose = map[actionId]
  if (!pose) return null
  return (
    <div className="exampose">
      <HeadPose pose={pose} />
      <p className="small dim">
        {actionId.startsWith('eye_dh')
          ? '座位から頭を45°回し、そのまま素早く仰臥位・頭部懸垂位にする'
          : '仰臥位から頭だけを90°横に向ける'}
      </p>
    </div>
  )
}
