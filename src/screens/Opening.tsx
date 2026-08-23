import { CASES, CATEGORY_LABELS } from '../data/cases'
import type { CaseDef } from '../data/types'
import { Button, MenuItem, TypedText, Win } from '../components/ui'
import { unlockAudio } from '../audio/sfx'
import type { Action } from '../game/state'

export function TitleScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <div className="title-hero">
        <h1>VERTIGO</h1>
        <div className="sub">めまい診療の書</div>
        <div className="ver">ver 0.1 — 研修医向け診断トレーニング</div>
      </div>
      <Win>
        <div className="menu">
          <MenuItem
            label="かんじゃをみる"
            hint="症例を選ぶ"
            onSelect={() => {
              unlockAudio()
              dispatch({ type: 'GOTO', phase: 'select' })
            }}
          />
          <MenuItem label="せいせき" hint="v0.3で実装" onSelect={() => {}} disabled />
          <MenuItem label="せってい" hint="v0.2で実装" onSelect={() => {}} disabled />
        </div>
      </Win>
      <Win title="このゲームについて">
        <p className="msg small dim" style={{ margin: 0 }}>
          あなたは救急外来の当直医です。搬送されてきためまい患者を、自分でコマンドを選んで診察し、診断・治療・方針を決めてください。
          {'\n'}やらなかった診察の情報は最後まで得られません。不要な検査は減点されます。
        </p>
      </Win>
    </div>
  )
}

export function CaseSelectScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const start = (id: number) => dispatch({ type: 'START_CASE', caseId: id })

  // カテゴリごとに全症例を並べる。ラベルは最終診断で選ぶ名前と揃える
  const groups = (['bppv', 'peripheral', 'other', 'central'] as const).map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    cases: CASES.filter((c) => c.category === cat),
  }))

  return (
    <div className="stack grow scroll">
      <Win title="症例をえらぶ">
        <div className="menu">
          <MenuItem
            label="ランダム"
            hint="診断名を伏せて解く"
            onSelect={() => start(CASES[Math.floor(Math.random() * CASES.length)].id)}
          />
          <MenuItem label="連続チャレンジ" hint="v0.3で実装" onSelect={() => {}} disabled />
        </div>
      </Win>
      {groups.map((g) => (
        <Win key={g.cat} title={g.label}>
          <div className="menu">
            {g.cases.map((c) => (
              <MenuItem
                key={c.id}
                label={`${c.diagnosis.correct}${c.diagnosis.side ? `　${c.diagnosis.side === 'R' ? '右' : '左'}` : ''}`}
                hint={`${c.age}${c.gender}`}
                onSelect={() => start(c.id)}
              />
            ))}
          </div>
        </Win>
      ))}
      <Button onClick={() => dispatch({ type: 'GOTO', phase: 'title' })}>タイトルへ</Button>
    </div>
  )
}

export function BriefScreen({ caseDef, dispatch }: { caseDef: CaseDef; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="救急外来">
        <p className="msg small dim" style={{ margin: '0 0 10px' }}>
          {caseDef.age}{caseDef.gender}が、めまいを訴えて救急車で搬送されてきた。
        </p>
        <TypedText text={caseDef.chiefComplaint} />
      </Win>
      <Win title="バイタルサイン">
        <div className="msg small">{caseDef.vitals}</div>
      </Win>
      <div className="grow" />
      <div className="row">
        <Button onClick={() => dispatch({ type: 'GOTO', phase: 'select' })}>もどる</Button>
        <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'exam' })}>
          診察をはじめる
        </Button>
      </div>
    </div>
  )
}
