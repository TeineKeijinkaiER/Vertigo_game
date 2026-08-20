import { TREATMENTS } from '../data/actions'
import type { CaseDef, TreatmentDef } from '../data/types'
import { Button, MenuItem, Win } from '../components/ui'
import type { Action, GameState } from '../game/state'

const TX_GROUP_LABELS: Record<TreatmentDef['group'], string> = {
  maneuver: '耳石置換法',
  drug: '薬物療法',
  protocol: '急性期対応',
  advice: '指導・リハビリ',
}

export function DiagnosisScreen({
  caseDef,
  state,
  dispatch,
}: {
  caseDef: CaseDef
  state: GameState
  dispatch: (a: Action) => void
}) {
  const needsSide = caseDef.diagnosis.asksSide
  const ready = state.diagnosisAnswer !== null && (!needsSide || state.sideAnswer !== null)

  return (
    <div className="stack grow">
      <Win title="見立てをたてる">
        <div className="msg small dim">この患者の診断は何ですか。</div>
      </Win>
      <Win>
        <div className="menu">
          {caseDef.diagnosis.options.map((o) => (
            <MenuItem
              key={o}
              label={o}
              checked={state.diagnosisAnswer === o}
              onSelect={() => dispatch({ type: 'SET_DIAGNOSIS', value: o })}
            />
          ))}
        </div>
      </Win>
      {needsSide && (
        <Win title="患側">
          <div className="menu">
            <MenuItem
              label="右"
              checked={state.sideAnswer === 'R'}
              onSelect={() => dispatch({ type: 'SET_SIDE', value: 'R' })}
            />
            <MenuItem
              label="左"
              checked={state.sideAnswer === 'L'}
              onSelect={() => dispatch({ type: 'SET_SIDE', value: 'L' })}
            />
          </div>
        </Win>
      )}
      <div className="grow" />
      <Button variant="primary" disabled={!ready} onClick={() => dispatch({ type: 'GOTO', phase: 'treatment' })}>
        治療へ
      </Button>
    </div>
  )
}

export function TreatmentScreen({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const groups: TreatmentDef['group'][] = ['maneuver', 'drug', 'protocol', 'advice']

  return (
    <div className="stack grow">
      <Win title="治療をえらぶ" className="win--tight">
        <div className="msg small dim">行う治療を選んでください（複数可）。</div>
      </Win>
      <div className="stack grow scroll">
        {groups.map((g) => (
          <Win key={g} title={TX_GROUP_LABELS[g]}>
            <div className="menu">
              {TREATMENTS.filter((t) => t.group === g).map((t) => (
                <MenuItem
                  key={t.id}
                  label={t.label}
                  checked={state.treatmentsChosen.includes(t.id)}
                  onSelect={() => dispatch({ type: 'TOGGLE_TREATMENT', id: t.id })}
                />
              ))}
            </div>
          </Win>
        ))}
      </div>
      <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'result' })}>
        診療をおえる
      </Button>
    </div>
  )
}
