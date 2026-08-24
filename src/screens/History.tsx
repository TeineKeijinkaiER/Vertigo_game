import { useState } from 'react'
import { CATEGORY_LABELS } from '../data/cases'
import type { Category } from '../data/types'
import { Button, Win } from '../components/ui'
import { useProfile } from '../profile/ProfileContext'
import { roleName } from '../profile/roles'
import { filterHistory, HISTORY_LIMIT } from '../profile/storage'

const TABS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'bppv', label: CATEGORY_LABELS.bppv },
  { id: 'peripheral', label: CATEGORY_LABELS.peripheral },
  { id: 'other', label: CATEGORY_LABELS.other },
  { id: 'central', label: CATEGORY_LABELS.central },
]

function formatStamp(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function HistoryScreen({ onClose }: { onClose: () => void }) {
  const { profile, update } = useProfile()
  const [tab, setTab] = useState<Category | 'all'>('all')
  const rows = filterHistory(profile.history, tab)

  const reset = () => {
    if (!window.confirm('履歴をすべて消します。よろしいですか。')) return
    update((p) => ({ ...p, history: [] }))
  }

  return (
    <div className="stack grow scroll">
      <Win title="りれき">
        <p className="small dim" style={{ margin: 0 }}>
          新しい順に最大{HISTORY_LIMIT}件まで残します。
        </p>
      </Win>

      <div className="tabrow">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabrow-btn${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Win>
        {rows.length === 0 ? (
          <div className="recempty">まだ記録がありません。</div>
        ) : (
          <div className="reclist">
            {rows.map((h) => (
              <div className="recrow" key={`${h.ts}-${h.caseId}`}>
                <span className="recmark is-clear">{h.rank}</span>
                <span className="recname">{h.caseTitle}</span>
                <span className="recmeta">{h.score}点</span>
                <span className="recdate dim">
                  {formatStamp(h.ts)}　{roleName(h.roleId)}
                  {h.fromRandom ? '　ランダム' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Win>

      <div className="grow" />
      <div className="row">
        <Button variant="danger" onClick={reset}>
          りれきを全削除
        </Button>
        <Button variant="primary" onClick={onClose}>
          とじる
        </Button>
      </div>
    </div>
  )
}
