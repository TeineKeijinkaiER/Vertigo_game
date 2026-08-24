import { useState } from 'react'
import { BPPV_LESSONS, type BppvLessonId } from '../data/bppvLessons'
import { Button, MenuItem, Win } from '../components/ui'
import { ManeuverFilm } from '../components/ManeuverFilm'
import { Nystagmus } from '../components/Nystagmus'
import { PoseImage } from '../components/PoseImage'
import type { Action } from '../game/state'

export function BppvLearnScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const [selectedId, setSelectedId] = useState<BppvLessonId>('pc_r')
  const lesson = BPPV_LESSONS.find((item) => item.id === selectedId) ?? BPPV_LESSONS[0]

  return (
    <div className="stack grow scroll">
      <Win title="BPPVがくしゅう">
        <p className="msg small" style={{ margin: 0 }}>
          型と患側を選ぶと、誘発する体位、眼振、耳石置換法を本編と同じアニメーション・画像で確認できます。
          {'\n'}眼振の左右はすべて<span className="accent">患者から見た向き</span>です。
        </p>
      </Win>

      <Win title="型と患側をえらぶ">
        <div className="menu">
          {(['後半規管', '水平半規管・向地性', '水平半規管・背地性（クプラ結石）'] as const).map((family) => (
            <div key={family} className="learn-group">
              <div className="win-title">{family}</div>
              {BPPV_LESSONS.filter((item) => item.family === family).map((item) => (
                <MenuItem
                  key={item.id}
                  label={item.title}
                  checked={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          ))}
        </div>
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
              <Nystagmus spec={finding.nystagmus} />
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

      <Win title="体位を画像で確認">
        <div className="learn-poses">
          {lesson.poses.map((pose) => <PoseImage key={pose.id} id={pose.id} caption={pose.caption} compact />)}
        </div>
      </Win>

      <Win title="注意">
        <p className="msg small danger" style={{ margin: 0 }}>{lesson.caution}</p>
      </Win>
      <div className="grow" />
      <Button onClick={() => dispatch({ type: 'GOTO', phase: 'title' })}>タイトルへ</Button>
    </div>
  )
}
