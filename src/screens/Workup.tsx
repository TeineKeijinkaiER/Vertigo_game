import { DISPOSITIONS, IMAGING_CRITERIA, STUDIES, STUDY_MAP } from '../data/actions'
import type { CaseDef, VestibularType } from '../data/types'
import { Button, MenuItem, TypedText, Win } from '../components/ui'
import type { Action, GameState } from '../game/state'

const VESTIBULAR_OPTIONS: { id: VestibularType; label: string; hint: string }[] = [
  { id: 'AVS', label: 'AVS', hint: '急に始まり安静時も24時間以上持続' },
  { id: 's-EVS', label: 's-EVS', hint: 'きっかけなく数分〜数時間、反復' },
  { id: 't-EVS', label: 't-EVS', hint: '体位で誘発、数秒〜数分、反復' },
]

export function TriageScreen({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="めまいのタイプを見立てる">
        <div className="msg small dim">
          GRACE-3では、TriggerとTimingでめまいを3つに分けます。この患者はどれにあたりますか。
        </div>
      </Win>
      <Win>
        <div className="menu">
          {VESTIBULAR_OPTIONS.map((o) => (
            <MenuItem
              key={o.id}
              label={o.label}
              hint={o.hint}
              checked={state.vestibularAnswer === o.id}
              onSelect={() => dispatch({ type: 'SET_VESTIBULAR', value: o.id })}
            />
          ))}
        </div>
      </Win>
      <div className="grow" />
      <Button
        variant="primary"
        disabled={state.vestibularAnswer === null}
        onClick={() => dispatch({ type: 'GOTO', phase: 'criteria' })}
      >
        すすむ
      </Button>
    </div>
  )
}

export function CriteriaScreen({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="画像検査の適応をかんがえる">
        <div className="msg small dim">
          あなたが診察で得た情報から、以下のどれに当てはまるかを判断してください。当てはまるものを選びます。
        </div>
      </Win>
      <Win>
        <div className="menu">
          {IMAGING_CRITERIA.map((c, i) => (
            <MenuItem
              key={c.id}
              label={c.question}
              checked={state.criteriaAnswers[i]}
              onSelect={() => dispatch({ type: 'TOGGLE_CRITERION', index: i })}
            />
          ))}
        </div>
      </Win>
      <div className="grow" />
      <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'studies' })}>
        検査をえらぶ
      </Button>
    </div>
  )
}

export function StudiesScreen({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="検査をえらぶ">
        <div className="msg small dim">
          必要な検査を選んでください（複数可）。何も選ばずに進むこともできます。
        </div>
      </Win>
      <Win className="scroll" >
        <div className="menu">
          {STUDIES.map((s) => (
            <MenuItem
              key={s.id}
              label={s.label}
              checked={state.studiesOrdered.includes(s.id)}
              onSelect={() => dispatch({ type: 'TOGGLE_STUDY', id: s.id })}
            />
          ))}
        </div>
      </Win>
      <div className="grow" />
      <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'studyResult' })}>
        {state.studiesOrdered.length === 0 ? '検査は行わない' : '結果をみる'}
      </Button>
    </div>
  )
}

export function StudyResultScreen({
  caseDef,
  state,
  dispatch,
}: {
  caseDef: CaseDef
  state: GameState
  dispatch: (a: Action) => void
}) {
  const results = state.studiesOrdered.map((id) => ({
    label: STUDY_MAP.get(id)?.label ?? id,
    text: caseDef.studyResults[id]?.text ?? STUDY_MAP.get(id)?.fallback ?? '特記すべき異常を認めない。',
  }))

  return (
    <div className="stack grow">
      <Win title="検査結果">
        {results.length === 0 ? (
          <div className="msg dim">検査は行わなかった。</div>
        ) : (
          <div className="stack">
            {results.map((r) => (
              <div key={r.label}>
                <div className="win-title">{r.label}</div>
                <div className="msg small">{r.text}</div>
              </div>
            ))}
          </div>
        )}
      </Win>
      <div className="grow" />
      <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'disposition' })}>
        方針をきめる
      </Button>
    </div>
  )
}

export function DispositionScreen({
  caseDef,
  state,
  dispatch,
}: {
  caseDef: CaseDef
  state: GameState
  dispatch: (a: Action) => void
}) {
  const next = () => {
    const goesDay2 = state.dispositionChoice === 'dp_observe' && caseDef.day2 !== null
    dispatch({ type: 'GOTO', phase: goesDay2 ? 'day2' : 'diagnosis' })
  }

  return (
    <div className="stack grow">
      <Win title="方針をきめる">
        <div className="msg small dim">
          この患者を、これからどうしますか。
          {'\n'}画像で異常がなかったことは、中枢性を否定した根拠になるでしょうか。
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
      <Button variant="primary" disabled={state.dispositionChoice === null} onClick={next}>
        けってい
      </Button>
    </div>
  )
}

export function Day2Screen({ caseDef, dispatch }: { caseDef: CaseDef; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="第2病日">
        <TypedText text={caseDef.day2?.text ?? '翌日、症状は落ち着いていた。'} speed={22} />
      </Win>
      <div className="grow" />
      <Button
        variant="primary"
        onClick={() => {
          dispatch({ type: 'SEE_DAY2' })
          dispatch({ type: 'GOTO', phase: 'diagnosis' })
        }}
      >
        見立てをたてる
      </Button>
    </div>
  )
}
