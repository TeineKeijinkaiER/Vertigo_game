import { useProfile } from '../profile/ProfileContext'

/** ヘッダーから開ける画面。null は overlay を出していない状態 */
export type Overlay = 'howto' | 'clears' | 'history' | 'role' | null

/**
 * 全画面に常駐する細いユーティリティ行。
 * overlay は GameState に触れないので、診察の途中で開いて閉じても進行は失われない。
 * ♪ は診察中にも押したくなるため、タイトル専用にせず常駐させる。
 */
export function AppHeader({
  onOpen,
  onAbortExam,
}: {
  onOpen: (o: Overlay) => void
  /** 診察中にだけ渡す。モーダル表示中もヘッダーから中断できる。 */
  onAbortExam?: () => void
}) {
  const { profile, update } = useProfile()

  return (
    <div className="apphdr">
      <button type="button" className="apphdr-btn" onClick={() => onOpen('howto')}>
        つかいかた
      </button>
      <button type="button" className="apphdr-btn" onClick={() => onOpen('clears')}>
        きろく
      </button>
      <button type="button" className="apphdr-btn" onClick={() => onOpen('history')}>
        りれき
      </button>
      {onAbortExam && (
        <button type="button" className="apphdr-btn apphdr-btn--abort" onClick={onAbortExam}>
          診察を中断
        </button>
      )}
      <button
        type="button"
        className="apphdr-btn apphdr-btn--sound"
        aria-pressed={profile.muted}
        onClick={() => update((p) => ({ ...p, muted: !p.muted }))}
      >
        {profile.muted ? '♪OFF' : '♪ON'}
      </button>
    </div>
  )
}
