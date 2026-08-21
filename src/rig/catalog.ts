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
  supine: panel('basic-positions', 'supine-full', 'cranial', 'full'),
  prone: panel('basic-positions', 'prone', 'cranial', 'full'),
  sit_up: panel('basic-positions', 'sit-up', 'lateral', 'full'),

  dh_sit_r: panel('dix-hallpike', 'dix-yaw', 'lateral', 'full'),
  dh_sit_l: panel('dix-hallpike', 'dix-yaw', 'lateral', 'full', { mirror: true }),
  dh_hang_r: panel('dix-hallpike', 'dix-hang', 'lateral', 'full'),
  dh_hang_l: panel('dix-hallpike', 'dix-hang', 'lateral', 'full', { mirror: true }),

  ep_cross_r: panel('epley', 'epley-hang-left', 'lateral', 'head'),
  ep_cross_l: panel('epley', 'epley-hang-left', 'lateral', 'head', { mirror: true }),

  side_r: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'cranial', 'full'),
  side_l: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'cranial', 'full', { mirror: true }),
  side_r_facedown: panel('gufoni-geotropic', 'gufoni-g-down', 'cranial', 'head', { mirror: true }),
  side_l_facedown: panel('gufoni-geotropic', 'gufoni-g-down', 'cranial', 'head'),
  side_r_faceup: panel('gufoni-apogeotropic', 'gufoni-a-up', 'cranial', 'head'),
  side_l_faceup: panel('gufoni-apogeotropic', 'gufoni-a-up', 'cranial', 'head', { mirror: true }),

  gufoni_fall_r: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'front', 'full', { arrow: 'fall-right' }),
  gufoni_fall_l: panel('gufoni-geotropic', 'gufoni-g-fall', 'front', 'full', { arrow: 'fall-left' }),

  lempert_roll_r: panel('lempert', 'lempert-side', 'cranial', 'full', { mirror: true, arrow: 'roll-right' }),
  lempert_roll_l: panel('lempert', 'lempert-side', 'cranial', 'full', { arrow: 'roll-left' }),

  lempert_full: {
    panels: [
      panel('lempert', 'lempert-supine', 'cranial', 'full'),
      panel('lempert', 'lempert-side', 'cranial', 'full'),
      panel('lempert', 'lempert-prone', 'cranial', 'full'),
      panel('lempert', 'lempert-side-far', 'cranial', 'full'),
      panel('lempert', 'lempert-sit', 'lateral', 'full'),
    ],
  },
  lempert_half: {
    panels: [
      panel('lempert', 'lempert-supine', 'cranial', 'full'),
      panel('lempert', 'lempert-side', 'cranial', 'full'),
      panel('lempert', 'lempert-prone', 'cranial', 'full'),
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
