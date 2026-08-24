import type { CaseDef } from '../data/types'
import { Button, TypedText, Win } from '../components/ui'
import type { Action } from '../game/state'

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
