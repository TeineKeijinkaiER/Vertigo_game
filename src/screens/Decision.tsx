import { asksSide, DISPOSITIONS } from '../data/actions'
import type { CaseDef } from '../data/types'
import { Button, MenuItem, Win } from '../components/ui'
import type { Action, GameState } from '../game/state'

export function DiagnosisScreen({
  caseDef,
  state,
  dispatch,
}: {
  caseDef: CaseDef
  state: GameState
  dispatch: (a: Action) => void
}) {
  // 患側を訊くかどうかは、選んだ診断名で決まる。BPPVと末梢性以外は左右を問わない
  const needsSide = asksSide(state.diagnosisAnswer)
  const ready = state.diagnosisAnswer !== null && (!needsSide || state.sideAnswer !== null)

  return (
    <div className="stack grow">
      <Win title="鑑別診断">
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
            <MenuItem label="右" checked={state.sideAnswer === 'R'} onSelect={() => dispatch({ type: 'SET_SIDE', value: 'R' })} />
            <MenuItem label="左" checked={state.sideAnswer === 'L'} onSelect={() => dispatch({ type: 'SET_SIDE', value: 'L' })} />
          </div>
        </Win>
      )}
      <div className="grow" />
      <Button variant="primary" disabled={!ready} onClick={() => dispatch({ type: 'GOTO', phase: 'disposition' })}>
        方針をきめる
      </Button>
    </div>
  )
}

export function DispositionScreen({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="方針をきめる">
        <div className="msg small dim">
          この患者を、これからどうしますか。{'\n'}
          今は夜間の救急外来です。
        </div>
      </Win>
      <Win>
        <div className="menu">
          {DISPOSITIONS.map((d) => (
            <MenuItem
              key={d.id}
              label={d.label}
              hint={d.hint}
              checked={state.dispositionChoice === d.id}
              onSelect={() => dispatch({ type: 'SET_DISPOSITION', id: d.id })}
            />
          ))}
        </div>
      </Win>
      <div className="grow" />
      <div className="row">
        <Button onClick={() => dispatch({ type: 'GOTO', phase: 'diagnosis' })}>もどる</Button>
        <Button
          variant="primary"
          disabled={state.dispositionChoice === null}
          onClick={() => dispatch({ type: 'GOTO', phase: 'result' })}
        >
          けってい
        </Button>
      </div>
    </div>
  )
}
