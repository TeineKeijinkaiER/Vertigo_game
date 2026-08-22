import { useState } from 'react'
import { POSE_IMAGES, type PoseImageId } from '../data/poseImages'

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
