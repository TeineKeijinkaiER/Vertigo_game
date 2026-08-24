import { useState } from 'react'
import { BPPV_LESSONS, type BppvLessonId } from '../data/bppvLessons'
import { Button, Win } from '../components/ui'
import { filmPoseReachedAfterMs, ManeuverFilm } from '../components/ManeuverFilm'
import { Nystagmus } from '../components/Nystagmus'
import type { Action } from '../game/state'

export function BppvLearnScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const [selectedId, setSelectedId] = useState<BppvLessonId>('pc_r')
  const lesson = BPPV_LESSONS.find((item) => item.id === selectedId) ?? BPPV_LESSONS[0]

  return (
    <div className="stack grow scroll">
      <Win title="型と患側をえらぶ">
        <select className="learn-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value as BppvLessonId)}>
          {(['後半規管', '水平半規管・向地性', '水平半規管・背地性（クプラ結石）'] as const).map((family) => (
            <optgroup key={family} label={family}>
              {BPPV_LESSONS.filter((item) => item.family === family).map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Win>

      <Win title={lesson.title}>
        <p className="msg small" style={{ margin: 0 }}>{lesson.summary}</p>
      </Win>

      <Win title={`① ${lesson.testName} と眼振`}>
        <p className="msg small dim" style={{ margin: '0 0 10px' }}>{lesson.findingRule}</p>
        {lesson.findings.map((finding) => (
          <div className="learn-finding" key={finding.label}>
            <div className="win-title">{finding.label}</div>
            <div className="exam-duo">
              <ManeuverFilm film={finding.film} />
              <Nystagmus spec={finding.nystagmus} startDelayMs={filmPoseReachedAfterMs(finding.film)} />
            </div>
          </div>
        ))}
      </Win>

      <Win title={`② ${lesson.maneuverName}`}>
        <ManeuverFilm film={lesson.maneuverFilm} caption={lesson.maneuverCaption} />
        <ol className="learn-steps">
          {lesson.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </Win>

      {lesson.alternativeManeuver && (
        <Win title={`③ ${lesson.alternativeManeuver.name}`}>
          <ManeuverFilm film={lesson.alternativeManeuver.film} caption={lesson.alternativeManeuver.caption} />
          <ol className="learn-steps">
            {lesson.alternativeManeuver.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </Win>
      )}

      <Win title="注意">
        <p className="msg small danger" style={{ margin: 0 }}>{lesson.caution}</p>
      </Win>
      <div className="grow" />
      <Button onClick={() => dispatch({ type: 'GOTO', phase: 'title' })}>タイトルへ</Button>
    </div>
  )
}
