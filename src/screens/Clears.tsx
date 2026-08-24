import { useState } from 'react'
import { CASES, CATEGORY_LABELS, caseTitle } from '../data/cases'
import type { Category } from '../data/types'
import { Button, Win } from '../components/ui'
import { useProfile } from '../profile/ProfileContext'
import { clearedSummary, clearOf } from '../profile/storage'

const CATS: Category[] = ['bppv', 'peripheral', 'other', 'central']

function formatDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function ClearsScreen({ onClose }: { onClose: () => void }) {
  const { profile, update } = useProfile()
  const [cat, setCat] = useState<Category>('bppv')
  const summary = clearedSummary(profile)

  const reset = () => {
    if (!window.confirm('クリア記録をすべて消します。よろしいですか。')) return
    update((p) => ({ ...p, clears: {} }))
  }

  return (
    <div className="stack grow scroll">
      <Win title="クリアきろく">
        <div className="msg">
          {CASES.length}症例中　<span className="accent">{summary.cleared}</span> クリア
          （☆ <span className="accent">{summary.starred}</span>）
        </div>
        <p className="small dim" style={{ margin: '4px 0 0' }}>
          ランクA以上でクリア。Sを取ると ☆ が付きます。
        </p>
      </Win>

      <div className="tabrow">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={`tabrow-btn${cat === c ? ' is-on' : ''}`}
            onClick={() => setCat(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <Win title={CATEGORY_LABELS[cat]}>
        <div className="reclist">
          {CASES.filter((c) => c.category === cat).map((c) => {
            const rec = clearOf(profile, c.id)
            const mark = rec?.bestRank === 'S' ? '☆' : rec?.firstClearedAt ? '✔' : '—'
            return (
              <div className="recrow" key={c.id}>
                <span className={`recmark${rec?.firstClearedAt ? ' is-clear' : ''}`}>{mark}</span>
                <span className="recname">{caseTitle(c)}</span>
                <span className="recmeta">
                  {rec ? `${rec.bestRank}　${rec.bestScore}点　${rec.plays}回` : '未プレイ'}
                </span>
                {rec?.firstClearedAt && (
                  <span className="recdate dim">初クリア {formatDate(rec.firstClearedAt)}</span>
                )}
              </div>
            )
          })}
        </div>
      </Win>

      <div className="grow" />
      <div className="row">
        <Button variant="danger" onClick={reset}>
          きろくを全削除
        </Button>
        <Button variant="primary" onClick={onClose}>
          とじる
        </Button>
      </div>
    </div>
  )
}
