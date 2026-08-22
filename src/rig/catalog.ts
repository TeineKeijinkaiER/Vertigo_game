import { MANEUVERS, mirrorPose, type ManeuverId, type RigPose } from './poses'
import type { ArrowKind, Framing, View } from './scene'
import type { PoseImageId } from '../data/poseImages'

export type PanelSpec = {
  maneuver: ManeuverId
  pose: string
  view: View
  framing: Framing
  mirror?: boolean
  arrow?: ArrowKind
}

export type CaptureSpec = PanelSpec | { panels: PanelSpec[] }

const panel = (
  maneuver: ManeuverId, pose: string, view: View, framing: Framing,
  extra: { mirror?: boolean; arrow?: ArrowKind } = {},
): PanelSpec => ({ maneuver, pose, view, framing, ...extra })

/**
 * ゲーム本体の体位画像IDと、リグのポーズを結ぶ唯一の場所。
 *
 * `satisfies Record<PoseImageId, CaptureSpec>` により、poseImages.ts に
 * ID を足してここを更新し忘れると tsc が落ちる。
 */
export const POSE_CATALOG = {
  headroll_c: panel('supine-roll', 'roll-neutral', 'cranial', 'head'),
  headroll_r45: panel('supine-roll', 'roll-right-45', 'cranial', 'head'),
  headroll_r90: panel('supine-roll', 'roll-right', 'cranial', 'head'),
  headroll_l45: panel('supine-roll', 'roll-left-45', 'cranial', 'head'),
  headroll_l90: panel('supine-roll', 'roll-left', 'cranial', 'head'),

  sitting_front: panel('basic-positions', 'sitting-front', 'front', 'full'),
  supine: panel('basic-positions', 'supine-full', 'cranial', 'upper'),
  prone: panel('basic-positions', 'prone', 'cranial', 'upper'),
  sit_up: panel('basic-positions', 'sit-up', 'lateral', 'full'),

  dh_sit_r: panel('dix-hallpike', 'dix-yaw', 'lateral', 'full'),
  dh_sit_l: panel('dix-hallpike', 'dix-yaw', 'lateral', 'full', { mirror: true }),
  dh_hang_r: panel('dix-hallpike', 'dix-hang', 'lateral', 'full'),
  dh_hang_l: panel('dix-hallpike', 'dix-hang', 'lateral', 'full', { mirror: true }),

  ep_cross_r: panel('epley', 'epley-hang-left', 'lateral', 'head'),
  ep_cross_l: panel('epley', 'epley-hang-left', 'lateral', 'head', { mirror: true }),

  side_r: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'cranial', 'upper'),
  side_l: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'cranial', 'upper', { mirror: true }),
  side_r_facedown: panel('gufoni-geotropic', 'gufoni-g-down', 'cranial', 'head', { mirror: true }),
  side_l_facedown: panel('gufoni-geotropic', 'gufoni-g-down', 'cranial', 'head'),
  side_r_faceup: panel('gufoni-apogeotropic', 'gufoni-a-up', 'cranial', 'head'),
  side_l_faceup: panel('gufoni-apogeotropic', 'gufoni-a-up', 'cranial', 'head', { mirror: true }),

  // 矢印は「倒れる前」の端座位に付ける。倒れた後のポーズでは width が
  // V(0, -direction, 0) と垂直に回っており、widthAxis を使う矢印が
  // 左右どちらの場合も真下を向いて区別できなくなる。
  // spec の「坐位から…倒れるところ」にもこちらが合う
  gufoni_fall_r: panel('gufoni-apogeotropic', 'gufoni-a-start', 'front', 'full', { arrow: 'fall-right' }),
  gufoni_fall_l: panel('gufoni-geotropic', 'gufoni-g-start', 'front', 'full', { arrow: 'fall-left' }),

  // 矢印は「回す前」の仰臥位に付ける。90°ロール後は widthAxis が垂直に
  // 回っており、矢印が画面に対して真横を向いて潰れる。gufoni_fall_* と同じ
  lempert_roll_r: panel('lempert', 'lempert-0-supine', 'cranial', 'upper', { arrow: 'roll-right' }),
  lempert_roll_l: panel('lempert', 'lempert-0-supine', 'cranial', 'upper', { arrow: 'roll-left' }),

  lempert_full: {
    panels: [
      panel('lempert', 'lempert-0-supine', 'cranial', 'upper'),
      panel('lempert', 'lempert-3-healthy', 'cranial', 'upper'),
      panel('lempert', 'lempert-4-prone', 'cranial', 'upper'),
      panel('lempert', 'lempert-5-affected', 'cranial', 'upper'),
      panel('lempert', 'lempert-6-sit', 'lateral', 'full'),
    ],
  },
  lempert_half: {
    panels: [
      panel('lempert', 'lempert-0-supine', 'cranial', 'upper'),
      panel('lempert', 'lempert-3-healthy', 'cranial', 'upper'),
      panel('lempert', 'lempert-4-prone', 'cranial', 'upper'),
    ],
  },
} satisfies Record<PoseImageId, CaptureSpec>

export const POSE_IDS = Object.keys(POSE_CATALOG) as PoseImageId[]

export function resolvePanels(id: PoseImageId): PanelSpec[] {
  const spec: CaptureSpec = POSE_CATALOG[id]
  return 'panels' in spec ? spec.panels : [spec]
}

export function resolvePose(spec: PanelSpec): RigPose {
  const pose = MANEUVERS[spec.maneuver].poses.find((item) => item.id === spec.pose)
  if (!pose) throw new Error(`ポーズが見つからない: ${spec.maneuver}/${spec.pose}`)
  return spec.mirror ? mirrorPose(pose) : pose
}
