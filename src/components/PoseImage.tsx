import { useEffect, useState } from 'react'
import { FILMS, POSE_IMAGES, type FilmId, type PoseImageId } from '../data/poseImages'

const url = (file: string) => `${import.meta.env.BASE_URL}poses/${file}`

/**
 * 体位イラスト（静止画）。public/poses/ に置いた画像を表示する。
 * ファイルがまだ無いときは、どんな絵が必要かを書いたプレースホルダを出す。
 */
export function PoseImage({
  id,
  caption,
  compact = false,
}: {
  id: PoseImageId
  caption?: string
  compact?: boolean
}) {
  const entry = POSE_IMAGES[id]
  const [missing, setMissing] = useState(false)

  return (
    <figure className={`poseimg${compact ? ' poseimg--compact' : ''}`}>
      {missing ? (
        <div className="poseimg-missing">
          <div className="poseimg-missing-title">イラスト準備中</div>
          <div className="poseimg-missing-file">poses/{entry.file}</div>
          {!compact && <div className="poseimg-missing-spec">{entry.spec}</div>}
        </div>
      ) : (
        <img src={url(entry.file)} alt={entry.title} onError={() => setMissing(true)} loading="lazy" />
      )}
      <figcaption>
        <span className="accent">{entry.title}</span>
        {caption && <span className="dim">　{caption}</span>}
      </figcaption>
    </figure>
  )
}

/**
 * 体位イラスト（連続コマ）。静止画を順に切り替えて動いて見せる。
 *
 * rAF ではなく setTimeout で送るので、タブが前面でなくても止まらない。
 * 全コマを重ねて置き、表示中のものだけ不透明にすることで、
 * 切り替え時の読み込み待ちとちらつきを避けている。
 */
export function PoseFilm({ film, compact = false }: { film: FilmId; compact?: boolean }) {
  const spec = FILMS[film]
  const frames = spec.frames
  const [i, setI] = useState(0)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    setI(0)
  }, [film])

  useEffect(() => {
    if (missing) return
    const t = window.setTimeout(() => setI((n) => (n + 1) % frames.length), frames[i].ms)
    return () => window.clearTimeout(t)
  }, [i, frames, missing])

  if (missing) {
    const first = POSE_IMAGES[frames[0].id]
    return (
      <figure className={`poseimg${compact ? ' poseimg--compact' : ''}`}>
        <div className="poseimg-missing">
          <div className="poseimg-missing-title">イラスト準備中</div>
          <div className="poseimg-missing-file">poses/{first.file} ほか</div>
        </div>
        <figcaption className="dim">{spec.caption}</figcaption>
      </figure>
    )
  }

  return (
    <figure className={`posefilm${compact ? ' poseimg--compact' : ''}`}>
      <div className="posefilm-stage">
        {frames.map((f, n) => (
          <img
            key={`${f.id}-${n}`}
            src={url(POSE_IMAGES[f.id].file)}
            alt={POSE_IMAGES[f.id].title}
            style={{ opacity: n === i ? 1 : 0 }}
            onError={() => setMissing(true)}
          />
        ))}
      </div>
      <figcaption>
        <span className="accent">{POSE_IMAGES[frames[i].id].title}</span>
        <span className="dim">　{spec.caption}</span>
      </figcaption>
    </figure>
  )
}
