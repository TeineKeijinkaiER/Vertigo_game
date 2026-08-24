import { CASES, CATEGORY_LABELS, caseTitle } from '../data/cases'
import { Button, MenuItem, Win } from '../components/ui'
import type { Action } from '../game/state'
import { useProfile } from '../profile/ProfileContext'
import { clearOf } from '../profile/storage'

export function CaseSelectScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const { profile } = useProfile()
  const start = (id: number) => dispatch({ type: 'START_CASE', caseId: id, fromRandom: false })

  // カテゴリごとに全症例を並べる。ラベルは最終診断で選ぶ名前と揃える
  const groups = (['bppv', 'peripheral', 'other', 'central'] as const).map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    cases: CASES.filter((c) => c.category === cat),
  }))

  return (
    <div className="stack grow scroll">
      {groups.map((g) => (
        <Win key={g.cat} title={g.label}>
          <div className="menu">
            {g.cases.map((c) => (
              <MenuItem
                key={c.id}
                label={caseTitle(c)}
                hint={`${c.age}${c.gender}`}
                note={
                  clearOf(profile, c.id)?.bestRank === 'S'
                    ? '☆'
                    : clearOf(profile, c.id)?.firstClearedAt
                      ? '✔'
                      : undefined
                }
                onSelect={() => start(c.id)}
              />
            ))}
          </div>
        </Win>
      ))}
      <Button onClick={() => dispatch({ type: 'GOTO', phase: 'title' })}>タイトルへ</Button>
    </div>
  )
}
