import { useReducer } from 'react'
import { CASE_MAP } from './data/cases'
import { initialState, reducer } from './game/state'
import { BriefScreen, CaseSelectScreen, TitleScreen } from './screens/Opening'
import { ExamScreen } from './screens/Exam'
import {
  CriteriaScreen,
  Day2Screen,
  DispositionScreen,
  StudiesScreen,
  StudyResultScreen,
  TriageScreen,
} from './screens/Workup'
import { DiagnosisScreen, TreatmentScreen } from './screens/Decision'
import { ResultScreen } from './screens/Result'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const caseDef = state.caseId !== null ? CASE_MAP.get(state.caseId) : undefined

  if (state.phase === 'title') {
    return (
      <div className="app">
        <TitleScreen dispatch={dispatch} />
      </div>
    )
  }

  if (state.phase === 'select') {
    return (
      <div className="app">
        <CaseSelectScreen dispatch={dispatch} />
      </div>
    )
  }

  if (!caseDef) {
    // 症例が解決できない場合はタイトルに戻す（データ不整合の保険）
    return (
      <div className="app">
        <TitleScreen dispatch={dispatch} />
      </div>
    )
  }

  return (
    <div className="app">
      {state.phase === 'brief' && <BriefScreen caseDef={caseDef} dispatch={dispatch} />}
      {state.phase === 'exam' && <ExamScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
      {state.phase === 'triage' && <TriageScreen state={state} dispatch={dispatch} />}
      {state.phase === 'criteria' && <CriteriaScreen state={state} dispatch={dispatch} />}
      {state.phase === 'studies' && <StudiesScreen state={state} dispatch={dispatch} />}
      {state.phase === 'studyResult' && <StudyResultScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
      {state.phase === 'disposition' && <DispositionScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
      {state.phase === 'day2' && <Day2Screen caseDef={caseDef} dispatch={dispatch} />}
      {state.phase === 'diagnosis' && <DiagnosisScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
      {state.phase === 'treatment' && <TreatmentScreen state={state} dispatch={dispatch} />}
      {state.phase === 'result' && <ResultScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
    </div>
  )
}
