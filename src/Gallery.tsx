import { POSES, PoseFigure, type PoseKey } from './components/PoseFigure'

/** 全姿勢を並べて目視確認するための検証用ページ（?gallery=1） */
export default function Gallery() {
  const keys = Object.keys(POSES) as PoseKey[]
  return (
    <div className="app" style={{ maxWidth: 'none' }}>
      <h2 style={{ color: '#ffd75e', fontSize: 14 }}>体位イラスト一覧</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {keys.map((k) => (
          <div key={k} style={{ border: '1px solid #2c3468', padding: 6 }}>
            <div style={{ fontSize: 10, color: '#9aa4c8', marginBottom: 2 }}>{k}</div>
            <PoseFigure seq={[k]} />
          </div>
        ))}
      </div>
    </div>
  )
}
