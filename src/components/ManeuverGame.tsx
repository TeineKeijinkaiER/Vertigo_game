import { useState } from 'react'
import { buildSteps, MANEUVER_KINDS, type ManeuverAttempt, type ManeuverKind } from '../data/maneuvers'
import { BodyPose } from './BodyPose'
import { Button, MenuItem, Win } from './ui'
import { sfxCancel, sfxConfirm } from '../audio/sfx'

/**
 * 耳石置換法を組み立てるミニゲーム。
 * 手技を選ぶ → 患側を選ぶ → 各手順で倒す向き・顔の向きをイラストから選ぶ。
 * すべて正しく組み立てられて初めて手技が成功する。
 */
export function ManeuverGame({
  onDone,
  onCancel,
}: {
  onDone: (attempt: ManeuverAttempt) => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<ManeuverKind | null>(null)
  const [side, setSide] = useState<'R' | 'L' | null>(null)
  const [answers, setAnswers] = useState<string[]>([])

  if (kind === null) {
    return (
      <Win title="耳石置換法をおこなう">
        <p className="msg small dim" style={{ margin: '0 0 8px' }}>
          どの手技を行いますか。
        </p>
        <div className="menu">
          {MANEUVER_KINDS.map((m) => (
            <MenuItem key={m.id} label={m.label} hint={m.hint} onSelect={() => setKind(m.id)} />
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <Button
            onClick={() => {
              sfxCancel()
              onCancel()
            }}
          >
            やめる
          </Button>
        </div>
      </Win>
    )
  }

  const kindLabel = MANEUVER_KINDS.find((m) => m.id === kind)?.label

  if (side === null) {
    return (
      <Win title={kindLabel}>
        <p className="msg small dim" style={{ margin: '0 0 8px' }}>
          患側はどちらですか。
        </p>
        <div className="menu">
          <MenuItem label="右" onSelect={() => setSide('R')} />
          <MenuItem label="左" onSelect={() => setSide('L')} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Button
            onClick={() => {
              sfxCancel()
              setKind(null)
            }}
          >
            もどる
          </Button>
        </div>
      </Win>
    )
  }

  const steps = buildSteps(kind, side, answers)
  const index = answers.length

  if (index < steps.length) {
    const step = steps[index]
    return (
      <div className="stack grow scroll">
        <Win title={`${kindLabel}　${side === 'R' ? '右' : '左'}`}>
          <p className="msg" style={{ margin: '0 0 10px' }}>
            {step.question}
          </p>
          <div className="pose-choices">
            {step.options.map((o) => (
              <button
                key={o.value}
                type="button"
                className="pose-choice"
                onClick={() => {
                  sfxConfirm()
                  setAnswers([...answers, o.value])
                }}
              >
                <BodyPose seq={o.seq} />
                <span className="pose-label">{o.label}</span>
              </button>
            ))}
          </div>
          <p className="small dim center" style={{ margin: '8px 0 0' }}>
            手順 {index + 1} / {steps.length}
          </p>
        </Win>
      </div>
    )
  }

  const perfect = steps.every((st, i) => st.correct === answers[i])
  return (
    <Win title="手技を実施する">
      <p className="msg" style={{ margin: '0 0 10px' }}>
        {kindLabel}（{side === 'R' ? '右' : '左'}）を、この手順で行います。
      </p>
      <div className="stack">
        {steps.map((st, i) => (
          <div className="small" key={st.question}>
            {st.question}　→　<span className="accent">{st.options.find((o) => o.value === answers[i])?.label}</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Button
          onClick={() => {
            sfxCancel()
            setAnswers([])
          }}
        >
          やりなおす
        </Button>
        <Button variant="primary" onClick={() => onDone({ kind, side, answers, perfect })}>
          実施する
        </Button>
      </div>
    </Win>
  )
}
