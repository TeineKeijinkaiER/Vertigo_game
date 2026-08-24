import { lazy, Suspense, useCallback, useReducer, useState } from 'react'
import { CASE_MAP } from './data/cases'
import { initialState, reducer } from './game/state'
import { AppHeader, type Overlay } from './components/AppHeader'
import { HowtoScreen } from './screens/Howto'
import { ClearsScreen } from './screens/Clears'
import { RolePickScreen } from './screens/RolePick'
import { useProfile } from './profile/ProfileContext'
import { useRoleGate } from './profile/useRoleGate'
import { TitleScreen } from './screens/Title'
import { CaseSelectScreen } from './screens/CaseSelect'
import { BriefScreen } from './screens/Brief'
import { BppvLearnScreen } from './screens/BppvLearn'
import { ExamScreen } from './screens/Exam'
import { DiagnosisScreen, DispositionScreen } from './screens/Decision'
import { ResultScreen } from './screens/Result'

const ManeuverRigPrototype = lazy(() =>
  import('./prototypes/ManeuverRigPrototype').then((module) => ({ default: module.ManeuverRigPrototype })),
)
const PoseExportRoute = lazy(() =>
  import('./prototypes/PoseExportRoute').then((module) => ({ default: module.PoseExportRoute })),
)

export default function App() {
  const prototype = new URLSearchParams(window.location.search).get('prototype') ?? ''
  if (prototype === 'pose-export') {
    return (
      <Suspense fallback={<div className="rig-loading">読み込み中...</div>}>
        <PoseExportRoute />
      </Suspense>
    )
  }
  if (['dix-rig', 'maneuver-rig'].includes(prototype)) {
    return (
      <Suspense fallback={<div className="rig-loading">3Dモデルを読み込み中...</div>}>
        <ManeuverRigPrototype />
      </Suspense>
    )
  }

  const [state, dispatch] = useReducer(reducer, initialState)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const caseDef = state.caseId !== null ? CASE_MAP.get(state.caseId) : undefined

  const { profile } = useProfile()
  const openRolePick = useCallback(() => setOverlay('role'), [])
  const { guard, resume, cancel } = useRoleGate(profile.roleId, openRolePick)

  const close = () => setOverlay(null)

  const screen = () => {
    if (state.phase === 'select') return <CaseSelectScreen dispatch={dispatch} />
    if (state.phase === 'learn') return <BppvLearnScreen dispatch={dispatch} />
    // 症例が解決できない場合もタイトルに戻す（データ不整合の保険）
    if (state.phase === 'title' || !caseDef)
      return (
        <TitleScreen
          dispatch={dispatch}
          roleId={profile.roleId}
          onChangeRole={() => setOverlay('role')}
          guard={guard}
        />
      )
    if (state.phase === 'brief') return <BriefScreen caseDef={caseDef} dispatch={dispatch} />
    if (state.phase === 'exam') return <ExamScreen caseDef={caseDef} state={state} dispatch={dispatch} />
    if (state.phase === 'diagnosis') return <DiagnosisScreen state={state} dispatch={dispatch} />
    if (state.phase === 'disposition') return <DispositionScreen state={state} dispatch={dispatch} />
    return <ResultScreen caseDef={caseDef} state={state} dispatch={dispatch} />
  }

  return (
    <div className="app">
      <AppHeader onOpen={setOverlay} />
      {overlay === 'howto' ? (
        <HowtoScreen onClose={close} />
      ) : overlay === 'clears' ? (
        <ClearsScreen onClose={close} />
      ) : overlay === 'role' ? (
        <RolePickScreen
          onDone={() => {
            setOverlay(null)
            resume()
          }}
          onCancel={() => {
            setOverlay(null)
            cancel()
          }}
        />
      ) : (
        screen()
      )}
    </div>
  )
}
