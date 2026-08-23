import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ACTIONS,
  ACTION_GROUPS,
  ATAXIA_NOTE,
  DIX_HALLPIKE_NOTE,
  IMAGING_CRITERIA,
  MODAL_ACTIONS,
  SUBTYPES,
  VESTIBULAR_TYPES,
  type VestibularChoice,
} from '../data/actions'
import { MANEUVER_KINDS, type ManeuverAttempt } from '../data/maneuvers'
import type { ActionGroup, CaseDef } from '../data/types'
import { Button, MenuItem, TypedText, Win } from '../components/ui'
import { Nystagmus } from '../components/Nystagmus'
import { ExamPose } from '../components/ExamPose'
import { SkewTest } from '../components/SkewTest'
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

/** 頭位変換で誘発する所見。体位と眼球を並べて同時に見せる */
const POSITIONAL_ACTIONS = ['eye_dh_r', 'eye_dh_l', 'eye_roll_r', 'eye_roll_l']

type Modal = 'dx' | 'criteria' | 'maneuver' | null

/** 画像検査の適応を考えてから出すコマンド */
const IMAGING_ORDERS = ['im_ct', 'im_mri']

/**
 * 体位アニメーションと眼振を横に並べ、コマンドを選んだ直後にその2つへ
 * 画面をずらす。頭位変換の所見は「その体位で眼がどう動くか」なので、
 * 片方をスクロールで探させると所見の意味が伝わらない。
 */
function ExamDuo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [])
  return (
    <div className="exam-duo" ref={ref}>
      {children}
    </div>
  )
}

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
  const [dxStep, setDxStep] = useState<'type' | 'sub'>('type')
  const [confirmEnd, setConfirmEnd] = useState(false)

  const last = state.log[state.log.length - 1]
  const criteriaDone = state.performed.includes('im_criteria')

  /**
   * 手技のアニメーションは、手技の種類・患側・手順のすべてが正しいときだけ流す。
   * 誤った手技を動かして見せると、間違った手順を正解のように覚えてしまう。
   * 誤りは所見の文章だけで伝える。
   */
  const correctManeuver =
    state.maneuver &&
    caseDef.maneuver &&
    caseDef.maneuver.kind === state.maneuver.kind &&
    caseDef.maneuver.side === state.maneuver.side &&
    state.maneuver.perfect
      ? state.maneuver
      : null

  const perform = (actionId: string) => {
    if (actionId === 'as_dx') {
      setDxStep('type')
      return setModal('dx')
    }
    if (actionId === 'im_criteria') return setModal('criteria')
    if (actionId === 'tx_maneuver') return setModal('maneuver')

    const def = ACTIONS.find((a) => a.id === actionId)
    if (!def) return
    const text =
      actionId === 'im_mri'
        ? caseDef.mriResult
        : actionId === 'im_ct'
          ? caseDef.ctResult
          : (caseDef.findings[actionId] ?? def.fallback)
    dispatch({ type: 'PERFORM', entry: { actionId, label: def.label, text } })
    if (caseDef.redFlagActions.includes(actionId)) sfxFinding()
  }

  const finishManeuver = (attempt: ManeuverAttempt) => {
    const kindLabel = MANEUVER_KINDS.find((m) => m.id === attempt.kind)?.label ?? ''
    const sideLabel = attempt.side === 'R' ? '右' : '左'
    const correct = caseDef.maneuver
    const rightChoice = correct && correct.kind === attempt.kind && correct.side === attempt.side
    const text =
      rightChoice && attempt.perfect
        ? `${kindLabel}（${sideLabel}）を正しい手順で施行した。\n\n直後に頭位変換試験を再検すると、眼振もめまいも誘発されない。患者は「治りました」と目を丸くしている。`
        : rightChoice
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

  if (modal === 'dx') {
    const cls = state.vestibularAnswer
    const subs = cls && cls !== 'none' ? SUBTYPES[cls] : null

    // ① まず GRACE-3 の3分類を選ぶ
    if (dxStep === 'type') {
      return (
        <div className="stack grow scroll">
          <Win title="かんべつ①　めまいを分類する">
            <p className="msg small dim" style={{ margin: 0 }}>
              GRACE-3では、TriggerとTimingでめまいを3つに分けます。
            </p>
          </Win>
          <Win>
            <div className="menu">
              {VESTIBULAR_TYPES.map((o) => (
                <MenuItem
                  key={o.id}
                  label={o.label}
                  hint={o.hint}
                  checked={cls === o.id}
                  onSelect={() => {
                    dispatch({ type: 'SET_VESTIBULAR', value: o.id as VestibularChoice })
                    if (o.id !== 'none') setDxStep('sub')
                  }}
                />
              ))}
            </div>
          </Win>
          <div className="grow" />
          <div className="row">
            <Button
              onClick={() => {
                sfxCancel()
                setModal(null)
              }}
            >
              やめる
            </Button>
            {cls === 'none' && (
              <Button
                variant="primary"
                onClick={() => {
                  dispatch({ type: 'CONFIRM_ASSESS', id: 'as_dx' })
                  setModal(null)
                }}
              >
                決定
              </Button>
            )}
          </div>
        </div>
      )
    }

    // ② その分類のなかで疾患名まで絞る
    return (
      <div className="stack grow scroll">
        <Win title={`かんべつ②　${cls} なら何を考えますか`}>
          <div className="menu">
            {subs?.map((sub) => (
              <MenuItem
                key={sub.id}
                label={sub.label}
                hint={sub.hint}
                checked={state.subtypeAnswer === sub.id}
                onSelect={() => dispatch({ type: 'SET_SUBTYPE', value: sub.id })}
              />
            ))}
          </div>
        </Win>
        <div className="grow" />
        <div className="row">
          <Button
            onClick={() => {
              sfxCancel()
              setModal(null)
            }}
          >
            もどる
          </Button>
          <Button
            variant="primary"
            disabled={cls === null || (cls !== 'none' && state.subtypeAnswer === null)}
            onClick={() => {
              dispatch({ type: 'CONFIRM_ASSESS', id: 'as_dx' })
              setModal(null)
            }}
          >
            決定
          </Button>
        </div>
      </div>
    )
  }

  if (modal === 'criteria') {
    return (
      <div className="stack grow scroll">
        <Win title="画像検査の適応を考える">
          <p className="msg small dim" style={{ margin: 0 }}>
            診察で得た情報から、当てはまるものを選んでください。当てはまるものがあれば画像検査を考慮します。
            {'\n'}※「突然発症」は、持続するめまいが突然始まった場合を指します。体位で誘発される短時間のめまい（t-EVS）は含めません。
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
        <div className="row">
          <Button
            onClick={() => {
              sfxCancel()
              setModal(null)
            }}
          >
            もどる
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              dispatch({ type: 'CONFIRM_ASSESS', id: 'im_criteria' })
              setModal(null)
            }}
          >
            決定（どれも該当しない場合もこのまま）
          </Button>
        </div>
      </div>
    )
  }

  if (confirmEnd) {
    return (
      <div className="stack grow">
        <Win title="最終診断へ">
          <div className="msg">
            診察をおえて最終診断に進みますか。{'\n'}
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
            {POSITIONAL_ACTIONS.includes(last.actionId) ? (
              <ExamDuo key={`duo-${last.actionId}`}>
                <ExamPose key={`pose-${last.actionId}`} actionId={last.actionId} maneuver={correctManeuver} />
                <Nystagmus key={`nys-${last.actionId}`} spec={caseDef.nystagmus?.[last.actionId] ?? {}} />
              </ExamDuo>
            ) : (
              <>
                <ExamPose key={`pose-${last.actionId}`} actionId={last.actionId} maneuver={correctManeuver} />
                {last.actionId === 'eye_skew' && (
                  <SkewTest
                    key={`skew-${last.actionId}`}
                    positive={caseDef.redFlagActions.includes('eye_skew')}
                    caption={
                      caseDef.redFlagActions.includes('eye_skew')
                        ? '遮蔽を外した眼が垂直に戻る ＝ skew deviation 陽性'
                        : '遮蔽を外しても眼は動かない ＝ 陰性'
                    }
                  />
                )}
                {EYE_VIEW_ACTIONS.includes(last.actionId) && (
                  <Nystagmus key={`nys-${last.actionId}`} spec={caseDef.nystagmus?.[last.actionId] ?? {}} />
                )}
              </>
            )}
            <TypedText key={`txt-${last.actionId}`} text={last.text} />
            {last.actionId === 'ex_ataxia' && <p className="small dim" style={{ marginTop: 8 }}>{ATAXIA_NOTE}</p>}
            {(last.actionId === 'eye_dh_r' || last.actionId === 'eye_dh_l') && (
              <p className="small dim" style={{ marginTop: 8 }}>{DIX_HALLPIKE_NOTE}</p>
            )}
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
            <MenuItem label="最終診断" hint="診察をおえて診断する" onSelect={() => setConfirmEnd(true)} />
          </div>
        </Win>
      ) : (
        <Win title={ACTION_GROUPS.find((g) => g.id === group)?.label}>
          <div className="menu scroll" style={{ maxHeight: '42dvh' }}>
            {ACTIONS.filter((a) => a.group === group)
              .filter((a) => a.id === 'im_criteria' || !IMAGING_ORDERS.includes(a.id) || criteriaDone)
              .map((a) => {
              const done = state.performed.includes(a.id)
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
            {group === 'imaging' && !criteriaDone && (
              <p className="small dim" style={{ margin: '4px 0 0' }}>
                まず適応を考えてから、CT / MRI を選びます。
              </p>
            )}
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
