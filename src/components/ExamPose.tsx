import { ManeuverFilm, type FilmId } from './ManeuverFilm'
import type { ManeuverAttempt, ManeuverKind } from '../data/maneuvers'

/**
 * 診察コマンドに対応するアニメーション。
 *
 * 耳石置換法（tx_maneuver）は「正解の手技」ではなく「プレイヤーが実施した
 * 手技」を再生する。誤った手技・患側を選んでいれば、その誤った手技が
 * 再生される（正解を先に見せてしまわないため）。
 */
const MANEUVER_FILM: Record<ManeuverKind, { R: FilmId; L: FilmId }> = {
  epley: { R: 'epley_r', L: 'epley_l' },
  lempert: { R: 'lempert_r', L: 'lempert_l' },
  gufoni_geo: { R: 'gufoni_geo_r', L: 'gufoni_geo_l' },
  gufoni_apo: { R: 'gufoni_apo_r', L: 'gufoni_apo_l' },
}

// headroll は1本で左右への往復を含むので、右耳下・左耳下のどちらでも同じフィルムを使う
const FILM_FOR: Partial<Record<string, { film: FilmId; caption?: string }>> = {
  eye_dh_r: {
    film: 'dix_hallpike_r',
    caption: '坐位で頭を右へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる',
  },
  eye_dh_l: {
    film: 'dix_hallpike_l',
    caption: '坐位で頭を左へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げる',
  },
  eye_roll_r: { film: 'headroll' },
  eye_roll_l: { film: 'headroll' },
}

export function ExamPose({
  actionId,
  maneuver,
}: {
  actionId: string
  maneuver?: ManeuverAttempt | null
}) {
  if (actionId === 'tx_maneuver' && maneuver) {
    const film = MANEUVER_FILM[maneuver.kind][maneuver.side]
    return <ManeuverFilm film={film} />
  }
  const spec = FILM_FOR[actionId]
  if (spec) return <ManeuverFilm film={spec.film} caption={spec.caption} />
  return null
}
