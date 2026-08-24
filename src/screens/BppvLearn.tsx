import { Button, Win } from '../components/ui'
import type { Action } from '../game/state'

export function BppvLearnScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  return (
    <div className="stack grow scroll">
      <Win title="BPPVがくしゅう">
        <p className="msg" style={{ margin: '0 0 10px' }}>
          準備中です。
        </p>
        <p className="msg small dim" style={{ margin: 0 }}>
          次の更新で、BPPVのすべてのパターンについて解説を入れます。
          {'\n'}・後半規管型（右・左）
          {'\n'}・水平半規管型 向地性（右・左）
          {'\n'}・水平半規管型 背地性＝クプラ結石（右・左）
          {'\n'}それぞれの誘発頭位、眼振の向き、耳石置換法の回す向きを、
          診察で使うのと同じイラストとアニメーションで確かめられるようにします。
        </p>
      </Win>
      <div className="grow" />
      <Button onClick={() => dispatch({ type: 'GOTO', phase: 'title' })}>タイトルへ</Button>
    </div>
  )
}
