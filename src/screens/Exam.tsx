import { useState } from 'react'
import { ACTIONS, ACTION_GROUPS, IMAGING_CRITERIA, MODAL_ACTIONS, VESTIBULAR_TYPES } from '../data/actions'
import { MANEUVER_KINDS, type ManeuverAttempt } from '../data/maneuvers'
import type { ActionGroup, CaseDef } from '../data/types'
import { Button, MenuItem, TypedText, Win } from '../components/ui'
import { Nystagmus } from '../components/Nystagmus'
import { ExamPose } from '../components/HeadPose'
import { ManeuverGame } from '../components/ManeuverGame'
import { sfxCancel, sfxFinding } from '../audio/sfx'
import type { Action, GameState } from '../game/state'

/** 眼球を実際に観察するコマンド。所見が陰性でも「動いていない眼」を描いて見せる */
const EYE_VIEW_ACTIONS = [
  'eye_spont',
  'eye_frenzel',
  'eye_fixation',
  'eye_gaze',
  'eye_dh_r',
  'eye_dh_l',
  'eye_roll_r',
  'eye_roll_l',
]

type Modal = 'grace' | 'criteria' | 'maneuver' | null

export function ExamScreen({
  caseDef,
  state,
  dispatch,
}: {
  caseDef: CaseDef
  state: GameState
  dispatch: (a: Action) => void
}) {
  const [group, setGroup] = useState<ActionGroup | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const last = state.log[state.log.length - 1]

  const perform = (actionId: string) => {
    if (actionId === 'as_grace') return setModal('grace')
    if (actionId === 'as_criteria') return setModal('criteria')
    if (actionId === 'tx_maneuver') return setModal('maneuver')

    const def = ACTIONS.find((a) => a.id === actionId)
    if (!def) return
    const text =
      actionId === 'st_mri' ? caseDef.mriResult : (caseDef.findings[actionId] ?? def.fallback)
    dispatch({ type: 'PERFORM', entry: { actionId, label: def.label, text } })
    if (caseDef.redFlagActions.includes(actionId)) sfxFinding()
  }

  const finishManeuver = (attempt: ManeuverAttempt) => {
    const kindLabel = MANEUVER_KINDS.find((m) => m.id === attempt.kind)?.label ?? ''
    const sideLabel = attempt.side === 'R' ? '右' : '左'
    const correct = caseDef.maneuver
    const isRightChoice = correct && correct.kind === attempt.kind && correct.side === attempt.side
    const text =
      isRightChoice && attempt.perfect
        ? `${kindLabel}（${sideLabel}）を正しい手順で施行した。\n\n直後に頭位変換試験を再検すると、眼振もめまいも誘発されない。患者は「治りました」と目を丸くしている。`
        : isRightChoice
          ? `${kindLabel}（${sideLabel}）を施行した。……手順のどこかが違ったようで、眼振とめまいは残ったままである。`
          : `${kindLabel}（${sideLabel}）を施行した。眼振・めまいに変化はない。手技の選択か患側の判断が誤っている可能性がある。`
    dispatch({
      type: 'SET_MANEUVER',
      attempt,
      entry: { actionId: 'tx_maneuver', label: `耳石置換法：${kindLabel}（${sideLabel}）`, text },
    })
    setModal(null)
  }

  if (modal === 'maneuver') {
    return (
      <div className="stack grow">
        <ManeuverGame onDone={finishManeuver} onCancel={() => setModal(null)} />
      </div>
    )
  }

  if (modal === 'grace') {
    return (
      <div className="stack grow">
        <Win title="めまいのタイプを分類する">
          <p className="msg small dim" style={{ margin: 0 }}>
            GRACE-3では、TriggerとTimingでめまいを3つに分けます。この患者はどれにあたりますか。
          </p>
        </Win>
        <Win>
          <div className="menu">
            {VESTIBULAR_TYPES.map((o) => (
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
          onClick={() => {
            dispatch({ type: 'CONFIRM_ASSESS', id: 'as_grace' })
            setModal(null)
          }}
        >
          決定
        </Button>
      </div>
    )
  }

  if (modal === 'criteria') {
    return (
      <div className="stack grow">
        <Win title="画像検査の適応を考える">
          <p className="msg small dim" style={{ margin: 0 }}>
            診察で得た情報から、当てはまるものを選んでください。当てはまるものがあればMRIを考慮します。
          </p>
        </Win>
        <Win>
          <div className="menu">
            {IMAGING_CRITERIA.map((q, i) => (
              <MenuItem
                key={q}
                label={q}
                checked={state.criteriaAnswers[i]}
                onSelect={() => dispatch({ type: 'TOGGLE_CRITERION', index: i })}
              />
            ))}
          </div>
        </Win>
        <div className="grow" />
        <Button
          variant="primary"
          onClick={() => {
            dispatch({ type: 'CONFIRM_ASSESS', id: 'as_criteria' })
            setModal(null)
          }}
        >
          決定（どれも該当しない場合もこのまま）
        </Button>
      </div>
    )
  }

  if (confirmEnd) {
    return (
      <div className="stack grow">
        <Win title="診察をおえる">
          <div className="msg">
            診察を打ち切って、見立てに進みますか。{'\n'}
            <span className="danger">一度進むと、診察には戻れません。</span>
          </div>
        </Win>
        <div className="row">
          <Button
            onClick={() => {
              sfxCancel()
              setConfirmEnd(false)
            }}
          >
            まだ診る
          </Button>
          <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'diagnosis' })}>
            すすむ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack grow">
      <Win title={`症例${caseDef.id}　${caseDef.age}${caseDef.gender}`} className="win--tight">
        <div className="small dim">実施した診察：{state.performed.length}件</div>
      </Win>

      <Win className="grow scroll">
        {last ? (
          <>
            <div className="win-title">{last.label}</div>
            {/* key は兄弟間で重複させないこと。重複するとフィバーが更新されず所見が前のまま残る */}
            <ExamPose key={`pose-${last.actionId}`} actionId={last.actionId} />
            {EYE_VIEW_ACTIONS.includes(last.actionId) && (
              <Nystagmus key={`nys-${last.actionId}`} spec={caseDef.nystagmus?.[last.actionId] ?? {}} />
            )}
            <TypedText key={`txt-${last.actionId}`} text={last.text} />
          </>
        ) : (
          <div className="msg dim">コマンドを選んで診察を始めてください。</div>
        )}
      </Win>

      {group === null ? (
        <Win title="コマンド">
          <div className="menu">
            {ACTION_GROUPS.map((g) => (
              <MenuItem key={g.id} label={g.label} onSelect={() => setGroup(g.id)} />
            ))}
            <MenuItem label="診察をおえる" hint="見立てへ" onSelect={() => setConfirmEnd(true)} />
          </div>
        </Win>
      ) : (
        <Win title={ACTION_GROUPS.find((g) => g.id === group)?.label}>
          <div className="menu scroll" style={{ maxHeight: '42dvh' }}>
            {ACTIONS.filter((a) => a.group === group).map((a) => {
              const done = state.performed.includes(a.id)
              // 「みたてる」と耳石置換法は何度でも開き直せる
              const repeatable = MODAL_ACTIONS.includes(a.id)
              return (
                <MenuItem
                  key={a.id}
                  label={a.label}
                  hint={a.hint}
                  note={done && !repeatable ? '済' : undefined}
                  checked={done}
                  onSelect={() => perform(a.id)}
                />
              )
            })}
          </div>
          <div style={{ marginTop: 8 }}>
            <Button
              onClick={() => {
                sfxCancel()
                setGroup(null)
              }}
            >
              もどる
            </Button>
          </div>
        </Win>
      )}
    </div>
  )
}
