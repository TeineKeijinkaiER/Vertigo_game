import { useState } from 'react'
import { ACTIONS, ACTION_GROUPS } from '../data/actions'
import type { ActionGroup, CaseDef } from '../data/types'
import { Button, MenuItem, TypedText, Win } from '../components/ui'
import { Nystagmus } from '../components/Nystagmus'
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
  const [confirmEnd, setConfirmEnd] = useState(false)

  const last = state.log[state.log.length - 1]

  const perform = (actionId: string) => {
    const def = ACTIONS.find((a) => a.id === actionId)
    if (!def) return
    const text = caseDef.findings[actionId] ?? def.fallback
    dispatch({ type: 'PERFORM', entry: { actionId, label: def.label, text } })
    if (caseDef.redFlagActions.includes(actionId)) sfxFinding()
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
          <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'triage' })}>
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
              return (
                <MenuItem
                  key={a.id}
                  label={a.label}
                  hint={a.hint}
                  note={done ? '済' : undefined}
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
