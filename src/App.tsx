import { lazy, Suspense, useCallback, useEffect, useReducer, useState } from 'react'
import { CASE_MAP } from './data/cases'
import { initialState, reducer } from './game/state'
import { AppHeader, type Overlay } from './components/AppHeader'
import { InstallGuide } from './components/InstallGuide'
import { HowtoScreen } from './screens/Howto'
import { ClearsScreen } from './screens/Clears'
import { HistoryScreen } from './screens/History'
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
import { startMusic, stopMusic } from './audio/music'
import { setSoundEnabled } from './audio/sfx'
import { Button, Win } from './components/ui'

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
  const [confirmAbortExam, setConfirmAbortExam] = useState(false)
  const caseDef = state.caseId !== null ? CASE_MAP.get(state.caseId) : undefined

  const { profile } = useProfile()
  const openRolePick = useCallback(() => setOverlay('role'), [])
  const { guard, resume, cancel } = useRoleGate(profile.roleId, openRolePick)

  // ミュートは BGM と効果音の両方を止める
  useEffect(() => {
    setSoundEnabled(!profile.muted)
  }, [profile.muted])

  useEffect(() => {
    if (profile.muted) {
      stopMusic()
      return
    }
    // メニューを触っているあいだは診察が止まっているので opening に切り替える。
    // ただし結果画面の上で開いたときだけは、ファンファーレの直後に
    // 曲が始まると興を削ぐので停止したままにする。
    if (state.phase === 'result') {
      stopMusic()
      return
    }
    const menuish =
      overlay !== null || state.phase === 'title' || state.phase === 'select' || state.phase === 'learn'
    startMusic(menuish ? 'opening' : 'exam')
  }, [profile.muted, overlay, state.phase])

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
      <AppHeader onOpen={setOverlay} onAbortExam={state.phase === 'exam' ? () => setConfirmAbortExam(true) : undefined} />
      <InstallGuide />
      {confirmAbortExam ? (
        <div className="stack grow">
          <Win title="診察を中断しますか">
            <div className="msg">
              ここまでの診察内容と回答は保存されません。<br />タイトル画面に戻りますか。
            </div>
          </Win>
          <div className="row">
            <Button onClick={() => setConfirmAbortExam(false)}>診察をつづける</Button>
            <Button
              variant="danger"
              onClick={() => {
                setOverlay(null)
                setConfirmAbortExam(false)
                dispatch({ type: 'RESET' })
              }}
            >
              中断してタイトルへ
            </Button>
          </div>
        </div>
      ) : overlay === 'howto' ? (
        <HowtoScreen onClose={close} />
      ) : overlay === 'clears' ? (
        <ClearsScreen onClose={close} />
      ) : overlay === 'history' ? (
        <HistoryScreen onClose={close} />
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
