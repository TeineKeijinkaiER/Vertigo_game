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

// 診察のフィルムは所見をとる体位（懸垂位・頭を回した側）で止まる。所見の文章が
// その体位のものなので、元の体位へ戻すところまで見せない
const FILM_FOR: Partial<Record<string, { film: FilmId; caption?: string }>> = {
  eye_dh_r: {
    film: 'dix_hallpike_r',
    caption: '坐位で頭を右へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げ、懸垂位で観察する',
  },
  eye_dh_l: {
    film: 'dix_hallpike_l',
    caption: '坐位で頭を左へ45°回し、その向きのまま素早く仰臥位にして頭を台の端から下げ、懸垂位で観察する',
  },
  eye_roll_r: { film: 'headroll_r' },
  eye_roll_l: { film: 'headroll_l' },
}

/** 体位変換後の眼振開始時刻を合わせるため、診察アクションのフィルムIDを公開する。 */
export function examFilmForAction(actionId: string): FilmId | null {
  return FILM_FOR[actionId]?.film ?? null
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
