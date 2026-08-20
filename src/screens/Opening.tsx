import { useState } from 'react'
import { CASES } from '../data/cases'
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

type SelectMode = 'root' | 'list'

export function CaseSelectScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const [mode, setMode] = useState<SelectMode>('root')

  const start = (id: number) => dispatch({ type: 'START_CASE', caseId: id })

  if (mode === 'list') {
    return (
      <div className="stack grow">
        <Win title="症例をえらぶ">
          <div className="menu">
            {CASES.map((c) => (
              <MenuItem
                key={c.id}
                label={`症例${c.id}`}
                hint={`${c.age}${c.gender} / ${c.categoryLabel}`}
                onSelect={() => start(c.id)}
              />
            ))}
          </div>
        </Win>
        <p className="small dim center" style={{ margin: 0 }}>
          ※ 疾患名は伏せてあります
        </p>
        <Button onClick={() => setMode('root')}>もどる</Button>
      </div>
    )
  }

  return (
    <div className="stack grow">
      <Win title="症例をえらぶ">
        <div className="menu">
          <MenuItem
            label="ランダム"
            hint="おまかせ"
            onSelect={() => start(CASES[Math.floor(Math.random() * CASES.length)].id)}
          />
          <MenuItem label="一覧からえらぶ" onSelect={() => setMode('list')} />
          <MenuItem label="連続チャレンジ" hint="v0.3で実装" onSelect={() => {}} disabled />
        </div>
      </Win>
      <Button onClick={() => dispatch({ type: 'GOTO', phase: 'title' })}>タイトルへ</Button>
    </div>
  )
}

export function BriefScreen({ caseDef, dispatch }: { caseDef: CaseDef; dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow">
      <Win title="夜間救急外来">
        <p className="msg small dim" style={{ margin: '0 0 10px' }}>
          {caseDef.age}{caseDef.gender}が、めまいを訴えて救急車で搬送されてきた。
        </p>
        <TypedText text={caseDef.chiefComplaint} />
      </Win>
      <Win title="バイタルサイン">
        <div className="msg small">{caseDef.vitals}</div>
      </Win>
      <div className="grow" />
      <Button variant="primary" onClick={() => dispatch({ type: 'GOTO', phase: 'exam' })}>
        診察をはじめる
      </Button>
    </div>
  )
}
