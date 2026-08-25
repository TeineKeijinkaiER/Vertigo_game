import { CASES } from '../data/cases'
import { Button, MenuItem, Win } from '../components/ui'
import { unlockAudio } from '../audio/sfx'
import { roleName } from '../profile/roles'
import type { RoleId } from '../profile/types'
import type { Action } from '../game/state'
import doctorHeliLogo from '../../heriteinu.png'
import titleHero from '../assets/title-hero.png'

export function TitleScreen({
  dispatch,
  roleId,
  onChangeRole,
  guard,
}: {
  dispatch: (a: Action) => void
  roleId: RoleId | ''
  onChangeRole: () => void
  /** 職種が未選択なら選択へ誘導し、選び終わってから run を実行する */
  guard: (run: () => void) => void
}) {
  const startRandom = () => {
    const c = CASES[Math.floor(Math.random() * CASES.length)]
    dispatch({ type: 'START_CASE', caseId: c.id, fromRandom: true })
  }

  const go = (run: () => void) => () => {
    unlockAudio()
    guard(run)
  }

  return (
    <div className="stack grow scroll">
      <div className="title-hero">
        <div className="title-heading">
          <h1>TKH-ER Dizzy Quest</h1>
          <img className="title-logo" src={doctorHeliLogo} alt="札幌ドクターヘリのロゴ" />
        </div>
        <div className="sub">めまい診療の書</div>
        <img
          className="title-hero-art"
          src={titleHero}
          alt="めまい患者を診察する医師のイラスト"
        />
        <div className="ver">ver 1.0 — 研修医向け診断トレーニング</div>
      </div>
      <Win title="コマンド">
        <div className="menu">
          <MenuItem label="しんさつかいし" hint="ランダムな症例を診る" onSelect={go(startRandom)} />
          <MenuItem
            label="しょうれいえらぶ"
            hint="疾患別に選んで診る"
            onSelect={go(() => dispatch({ type: 'GOTO', phase: 'select' }))}
          />
          {/* 解説を読むだけの人を職種選択で止める理由がないので guard を通さない */}
          <MenuItem
            label="BPPVがくしゅう"
            hint="眼振と耳石置換法"
            onSelect={() => {
              unlockAudio()
              dispatch({ type: 'GOTO', phase: 'learn' })
            }}
          />
        </div>
      </Win>
      <button type="button" className="rolechip" onClick={onChangeRole}>
        <span className="rolechip-label">しょくぎょう</span>
        <span className="rolechip-value">{roleName(roleId)}</span>
        <span className="rolechip-action">▸ かえる</span>
      </button>
      <div className="grow" />
      <Button onClick={() => guard(startRandom)}>すぐにはじめる</Button>
    </div>
  )
}
