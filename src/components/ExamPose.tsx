import { PoseFilm, PoseImage } from './PoseImage'
import type { FilmId, PoseImageId } from '../data/poseImages'

/**
 * 診察コマンドに対応する体位イラスト。
 * Supine Head Roll は連続コマ、Dix-Hallpike は静止画で示す。
 */
const FILM_FOR: Record<string, FilmId> = {
  eye_roll_r: 'headroll_r',
  eye_roll_l: 'headroll_l',
}

const IMAGE_FOR: Record<string, { id: PoseImageId; caption: string }> = {
  eye_dh_r: {
    id: 'dh_hang_r',
    caption: '坐位で頭を右へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる',
  },
  eye_dh_l: {
    id: 'dh_hang_l',
    caption: '坐位で頭を左へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる',
  },
}

export function ExamPose({ actionId }: { actionId: string }) {
  const film = FILM_FOR[actionId]
  if (film) return <PoseFilm film={film} />
  const img = IMAGE_FOR[actionId]
  if (img) return <PoseImage id={img.id} caption={img.caption} />
  return null
}
