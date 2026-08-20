import { useEffect, useState } from 'react'
import type { CaseDef } from '../data/types'
import { Button, TypedText, Win } from '../components/ui'
import { sfxFanfare, sfxGameOver } from '../audio/sfx'
import { scoreGame } from '../game/scoring'
import type { Action, GameState } from '../game/state'

const RANK_COLOR: Record<string, string> = {
  S: 'var(--accent)',
  A: 'var(--safe)',
  B: '#7fb2ff',
  C: 'var(--dim)',
  D: 'var(--danger)',
}

export function ResultScreen({
  caseDef,
  state,
  dispatch,
}: {
  caseDef: CaseDef
  state: GameState
  dispatch: (a: Action) => void
}) {
  const [step, setStep] = useState<'ending' | 'score' | 'review'>('ending')
  const result = scoreGame(caseDef, state)
  const isBad = result.ending === 'worst'

  // 講評は減点理由と項目コメントが重複しうるので、本文で重複排除する
  const review: { text: string; bad: boolean }[] = []
  const seen = new Set<string>()
  const deductionReasons = new Set(result.deductions.map((d) => d.reason))
  for (const l of result.lines) {
    for (const n of l.notes) {
      if (seen.has(n)) continue
      seen.add(n)
      review.push({ text: n, bad: deductionReasons.has(n) })
    }
  }
  for (const d of result.deductions) {
    if (seen.has(d.reason)) continue
    seen.add(d.reason)
    review.push({ text: d.reason, bad: true })
  }

  useEffect(() => {
    if (step === 'score') {
      if (isBad) sfxGameOver()
      else sfxFanfare()
    }
  }, [step, isBad])

  if (step === 'ending') {
    return (
      <div className={`stack grow${isBad ? ' flash-bad' : ''}`}>
        <Win title={isBad ? 'そのご……' : 'そのご'} className="grow scroll">
          <TypedText text={caseDef.endings[result.ending]} speed={16} />
        </Win>
        <Button variant={isBad ? 'danger' : 'primary'} onClick={() => setStep('score')}>
          けっかをみる
        </Button>
      </div>
    )
  }

  if (step === 'score') {
    return (
      <div className="stack grow">
        <Win title="しんりょう けっか">
          <div className="rank-big" style={{ color: RANK_COLOR[result.rank] }}>
            {result.rank}
          </div>
          <div className="center" style={{ fontSize: 22, letterSpacing: '0.1em' }}>
            {result.total} <span className="dim small">/ 100</span>
          </div>
        </Win>
        <Win title="うちわけ" className="grow scroll">
          {result.lines.map((l) => (
            <div className="score-row" key={l.label}>
              <span className="small">{l.label}</span>
              <span className="val small">
                {l.earned} / {l.max}
              </span>
            </div>
          ))}
          {result.deductions.length > 0 && (
            <>
              <div className="win-title danger" style={{ marginTop: 12 }}>
                げんてん
              </div>
              {result.deductions.map((d, i) => (
                <div className="score-row" key={`${d.label}-${i}`}>
                  <span className="small danger">{d.label}</span>
                  <span className="val small danger">{d.points}</span>
                </div>
              ))}
            </>
          )}
        </Win>
        <Button variant="primary" onClick={() => setStep('review')}>
          こうひょうをきく
        </Button>
      </div>
    )
  }

  return (
    <div className="stack grow">
      <div className="stack grow scroll">
        <Win title="上級医からの講評">
          <div className="stack">
            {review.map((r) => (
              <div className={`msg small${r.bad ? ' danger' : ''}`} key={r.text}>
                ・{r.text}
              </div>
            ))}
          </div>
        </Win>

        {caseDef.redFlagActions.length > 0 && (
          <Win title="この症例の赤旗">
            {result.redFlagsFound.length > 0 && (
              <div className="msg small safe">拾えた所見：{result.redFlagsFound.join('、')}</div>
            )}
            {result.redFlagsMissed.length > 0 && (
              <div className="msg small danger">拾えなかった所見：{result.redFlagsMissed.join('、')}</div>
            )}
          </Win>
        )}

        <Win title="診断ポイント">
          <div className="stack">
            {caseDef.keyPoints.map((k) => (
              <div className="msg small" key={k}>
                ・{k}
              </div>
            ))}
          </div>
        </Win>

        <Win title="解説">
          <div className="msg small">{caseDef.explanation}</div>
        </Win>

        <Win title="画像検査について">
          <div className="msg small">{caseDef.mriNote}</div>
        </Win>
      </div>

      <div className="row">
        <Button onClick={() => dispatch({ type: 'START_CASE', caseId: caseDef.id })}>もういちど</Button>
        <Button variant="primary" onClick={() => dispatch({ type: 'RESET' })}>
          タイトルへ
        </Button>
      </div>
    </div>
  )
}
