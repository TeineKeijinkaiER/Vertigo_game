import { useEffect, useState } from 'react'
import filmsData from '../data/poseFilms.json'

/**
 * 手技アニメーション（連続コマ）。public/poses/films/<filmId>/ に置いた
 * 書き出し済みフレームを表示する。作りは PoseImage.tsx の PoseFilm と同じ流儀。
 *
 * JSON モジュールの文字列プロパティは tsc 上ではただの string に広がってしまう
 * ため（`resolveJsonModule` では literal 型が保たれない）、film id のユニオン型は
 * ここで明示的に宣言する。scripts/verify_pose_films.py が、この一覧が
 * poseFilms.json の内容と過不足なく一致することを保証する。
 */
export type FilmId =
  | 'epley_r'
  | 'epley_l'
  | 'lempert_r'
  | 'lempert_l'
  | 'gufoni_geo_r'
  | 'gufoni_geo_l'
  | 'gufoni_apo_r'
  | 'gufoni_apo_l'
  | 'dix_hallpike_r'
  | 'dix_hallpike_l'
  | 'headroll_r'
  | 'headroll_l'

interface FilmFrame {
  file: string
  durationMs: number
}

interface FilmSpec {
  id: FilmId
  caption: string
  frames: FilmFrame[]
}

const FILMS = Object.fromEntries(
  (filmsData as FilmSpec[]).map((film) => [film.id, film]),
) as Record<FilmId, FilmSpec>

const url = (file: string) => `${import.meta.env.BASE_URL}poses/films/${file}`

/**
 * 最終コマで止めるフィルム。診察のフィルムは頭位変換した先（懸垂位・頭を回した
 * 側臥頭位）で終わり、眼振所見も説明もその体位のものなので、繰り返して元の体位へ
 * 戻してしまうと画と説明が食い違う。
 * 治療手技のフィルムは最後が起坐で、頭からもう一度回しても手技として筋が通るため
 * 繰り返したままにする。
 */
const PLAY_ONCE: FilmId[] = ['dix_hallpike_r', 'dix_hallpike_l', 'headroll_r', 'headroll_l']

/**
 * setTimeout でコマを送る（rAF だとタブが非表示のとき止まってしまう）。
 * 全コマを重ねて置き、表示中のものだけ不透明にすることで、
 * 切り替え時の読み込み待ちとちらつきを避ける。
 */
export function ManeuverFilm({ film, caption }: { film: FilmId; caption?: string }) {
  const spec = FILMS[film]
  const frames = spec.frames
  const [i, setI] = useState(0)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    setI(0)
    setMissing(false)
  }, [film])

  useEffect(() => {
    if (missing) return
    if (i === frames.length - 1 && PLAY_ONCE.includes(film)) return
    const t = window.setTimeout(() => setI((n) => (n + 1) % frames.length), frames[i].durationMs)
    return () => window.clearTimeout(t)
  }, [i, frames, missing, film])

  const shownCaption = caption ?? spec.caption

  if (missing) {
    return (
      <figure className="poseimg">
        <div className="poseimg-missing">
          <div className="poseimg-missing-title">イラスト準備中</div>
          <div className="poseimg-missing-file">poses/films/{film}/ ほか</div>
        </div>
        <figcaption className="dim">{shownCaption}</figcaption>
      </figure>
    )
  }

  return (
    <figure className="maneuverfilm">
      <div className="maneuverfilm-stage">
        {frames.map((f, n) => (
          <img
            key={f.file}
            src={url(f.file)}
            alt={shownCaption}
            style={{ opacity: n === i ? 1 : 0 }}
            onError={() => setMissing(true)}
          />
        ))}
      </div>
      <figcaption className="dim">{shownCaption}</figcaption>
    </figure>
  )
}
