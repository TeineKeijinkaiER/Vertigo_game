# かんべつフロー簡略化・患側追加設問・BPPV学習の参照記録 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 診察画面の「かんべつ」コマンドを1タップで分類選択に入れるよう簡略化し、BPPV・メニエール病・前庭神経炎を鑑別に選んだときは患側も答えさせて採点し、BPPV学習画面でどの型を参照したかをGoogleスプレッドシートに記録する。

**Architecture:** 既存の React + useReducer 構成（`GameState`/`Action`/`reducer`）に、鑑別の患側用のstateとactionを1つずつ追加する。採点は既存の `scoreGame` に1行追加するだけ。テレメトリは既存の best-effort 送信ロジック（`sendBeacon`→`fetch`フォールバック、失敗を握りつぶす）を共有関数に切り出し、ゲーム結果とBPPV学習参照の2種類のペイロードから使う。Google Apps Script側は `kind` フィールドでシートを振り分ける。

**Tech Stack:** React 19 + TypeScript + Vite、テストは Vitest + @testing-library/react、Google Apps Script（`Code.gs`）。

## Global Constraints

- 設計書: [`docs/superpowers/specs/2026-08-24-assess-flow-and-bppv-logging-design.md`](../specs/2026-08-24-assess-flow-and-bppv-logging-design.md)
- 患側を追加で問う鑑別ID: `sub_vn`（前庭神経炎）、`sub_meniere`（メニエール病）、`sub_pc_bppv`/`sub_hc_geo`/`sub_hc_apo`（BPPV3型）のみ。
- かんべつ②の患側回答（`subtypeSideAnswer`）は、最終診断画面の `sideAnswer` とは完全に独立させる。互いに読み書きしない。
- 既存 `sendResult(payload)` のシグネチャ・挙動（`send.test.ts` でテスト済み）は変更しない。
- BPPV学習画面は、コンボボックスの選択が実際に変わったときだけ送信する（初期表示の `pc_r` は送らない）。
- BPPV学習の参照記録は新しいシート（タブ）`bppv_learn_views` に送る。既存 `vertigo_results` の列構成は変えない（`kind` 列を除く）。
- 個人を特定できる情報は一切送らない（既存方針を踏襲）。
- コミットはタスクごとに行う。日本語のUI文言・コメントは既存コードのスタイルに合わせる。

---

## Task 1: 鑑別の患側を保持するstate/action、対象判定関数

**Files:**
- Modify: `src/data/actions.ts` (SUBTYPES 定義の直後、217行目付近に追加)
- Modify: `src/game/state.ts`
- Test: `src/game/state.test.ts`

**Interfaces:**
- Produces: `subtypeAsksSide(subtype: string | null): boolean`（`src/data/actions.ts` からexport）
- Produces: `GameState.subtypeSideAnswer: Side`（`src/game/state.ts`）
- Produces: `Action` に `{ type: 'SET_SUBTYPE_SIDE'; value: Side }` を追加
- Consumes: 既存の `Side` 型（`src/data/types.ts`）、既存の `SUBTYPES` の鑑別ID文字列

- [ ] **Step 1: `src/game/state.test.ts` に失敗するテストを追加する**

既存の末尾（33行目、最後の `})` の直前）に以下を追加する。

```ts
  it('SET_SUBTYPE_SIDE で鑑別の患側を記録する', () => {
    const s = reducer(initialState, { type: 'SET_SUBTYPE_SIDE', value: 'R' })
    expect(s.subtypeSideAnswer).toBe('R')
  })

  it('患側を問わない鑑別に選び直すと SET_SUBTYPE_SIDE の回答を破棄する', () => {
    const withSide = reducer(
      reducer(initialState, { type: 'SET_SUBTYPE', value: 'sub_pc_bppv' }),
      { type: 'SET_SUBTYPE_SIDE', value: 'R' },
    )
    expect(withSide.subtypeSideAnswer).toBe('R')

    const switched = reducer(withSide, { type: 'SET_SUBTYPE', value: 'sub_stroke' })
    expect(switched.subtypeSideAnswer).toBeNull()
  })

  it('患側が必要な鑑別どうしを選び直しても患側の回答は残す', () => {
    const withSide = reducer(
      reducer(initialState, { type: 'SET_SUBTYPE', value: 'sub_pc_bppv' }),
      { type: 'SET_SUBTYPE_SIDE', value: 'R' },
    )
    const switched = reducer(withSide, { type: 'SET_SUBTYPE', value: 'sub_hc_geo' })
    expect(switched.subtypeSideAnswer).toBe('R')
  })

  it('SET_VESTIBULAR で分類をやり直すと鑑別と患側を両方白紙に戻す', () => {
    const withSide = reducer(
      reducer(initialState, { type: 'SET_SUBTYPE', value: 'sub_pc_bppv' }),
      { type: 'SET_SUBTYPE_SIDE', value: 'L' },
    )
    const redone = reducer(withSide, { type: 'SET_VESTIBULAR', value: 't-EVS' })
    expect(redone.subtypeAnswer).toBeNull()
    expect(redone.subtypeSideAnswer).toBeNull()
  })
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test -- state.test`
Expected: FAIL（`subtypeSideAnswer` が `GameState` に無い、`SET_SUBTYPE_SIDE` が `Action` に無いという型/実行時エラー）

- [ ] **Step 3: `src/data/actions.ts` に `subtypeAsksSide` を追加する**

212行目、`SUBTYPES` の定義（`}`で終わる行）の直後、`ALL_DIAGNOSES` のコメントの前に挿入する。

```ts
/** かんべつ②で患側もたずねる鑑別ID（BPPV3型・メニエール病・前庭神経炎） */
const LATERALIZED_SUBTYPES = ['sub_vn', 'sub_meniere', 'sub_pc_bppv', 'sub_hc_geo', 'sub_hc_apo']

/** この鑑別を選んだときに、かんべつ②で患側も答えさせるか */
export function subtypeAsksSide(subtype: string | null): boolean {
  return subtype !== null && LATERALIZED_SUBTYPES.includes(subtype)
}
```

- [ ] **Step 4: `src/game/state.ts` を更新する**

1行目のimportを変更する。

```ts
import { asksSide } from '../data/actions'
```
を
```ts
import { asksSide, subtypeAsksSide } from '../data/actions'
```
に置き換える。

`GameState` インターフェースの `subtypeAnswer: string | null` の直後に1行追加する。

```ts
  vestibularAnswer: VestibularChoice | null
  subtypeAnswer: string | null
  subtypeSideAnswer: Side
  criteriaAnswers: boolean[]
```

`initialState` の `subtypeAnswer: null,` の直後に1行追加する。

```ts
  vestibularAnswer: null,
  subtypeAnswer: null,
  subtypeSideAnswer: null,
  criteriaAnswers: [false, false, false, false],
```

`Action` 型の `{ type: 'SET_SUBTYPE'; value: string }` の直後に1行追加する。

```ts
  | { type: 'SET_VESTIBULAR'; value: VestibularChoice }
  | { type: 'SET_SUBTYPE'; value: string }
  | { type: 'SET_SUBTYPE_SIDE'; value: Side }
  | { type: 'TOGGLE_CRITERION'; index: number }
```

`reducer` 内の `SET_VESTIBULAR` と `SET_SUBTYPE` のcaseを、以下に置き換える（`SET_SUBTYPE_SIDE` のcaseを新規追加）。

```ts
    case 'SET_VESTIBULAR':
      // 分類を選び直したら細かい鑑別と患側はいったん白紙に戻す
      return { ...state, vestibularAnswer: action.value, subtypeAnswer: null, subtypeSideAnswer: null }

    // 患側を問わない鑑別に選び直したら、患側の回答は残さない
    case 'SET_SUBTYPE':
      return {
        ...state,
        subtypeAnswer: action.value,
        subtypeSideAnswer: subtypeAsksSide(action.value) ? state.subtypeSideAnswer : null,
      }

    case 'SET_SUBTYPE_SIDE':
      return { ...state, subtypeSideAnswer: action.value }
```

- [ ] **Step 5: テストを実行して成功を確認する**

Run: `npm test -- state.test`
Expected: PASS（既存のテストも含めすべて成功。特に「RESET は診察途中の状態を破棄してタイトルへ戻す」が `initialState` の新フィールドと整合していることを確認する）

- [ ] **Step 6: コミット**

```bash
git add src/data/actions.ts src/game/state.ts src/game/state.test.ts
git commit -m "feat: track patient side answered during subtype triage"
```

---

## Task 2: 鑑別の患側を採点に加える

**Files:**
- Modify: `src/game/scoring.ts`
- Test: `src/game/scoring.test.ts` (新規)

**Interfaces:**
- Consumes: `subtypeAsksSide`（Task 1、`src/data/actions.ts`）、`GameState.subtypeSideAnswer`（Task 1）
- Produces: `scoreGame` の戻り値 `lines` に、対象症例のときだけ `label: '鑑別の患側'` の行が増える

- [ ] **Step 1: `src/game/scoring.test.ts` を新規作成し、失敗するテストを書く**

```ts
import { describe, expect, it } from 'vitest'
import { scoreGame } from './scoring'
import { initialState } from './state'
import { case01 } from '../data/cases/case01'

function stateWithSubtype(subtypeAnswer: string | null, subtypeSideAnswer: 'R' | 'L' | null) {
  return {
    ...initialState,
    performed: ['as_dx'],
    vestibularAnswer: 't-EVS' as const,
    subtypeAnswer,
    subtypeSideAnswer,
  }
}

describe('scoreGame：鑑別の患側', () => {
  it('鑑別と患側が両方正しければ満点', () => {
    const result = scoreGame(case01, stateWithSubtype('sub_pc_bppv', 'R'))
    const line = result.lines.find((l) => l.label === '鑑別の患側')
    expect(line?.earned).toBe(5)
    expect(line?.max).toBe(5)
  })

  it('鑑別は正しいが患側が違えば0点', () => {
    const result = scoreGame(case01, stateWithSubtype('sub_pc_bppv', 'L'))
    const line = result.lines.find((l) => l.label === '鑑別の患側')
    expect(line?.earned).toBe(0)
    expect(line?.notes[0]).toContain('右')
  })

  it('鑑別を外していれば患側が合っていても0点', () => {
    const result = scoreGame(case01, stateWithSubtype('sub_stroke', 'R'))
    const line = result.lines.find((l) => l.label === '鑑別の患側')
    expect(line?.earned).toBe(0)
  })

  it('患側を問わない鑑別が正解の症例では行を出さない', () => {
    const vmCase = { ...case01, subtype: 'sub_vm' }
    const result = scoreGame(vmCase, stateWithSubtype('sub_vm', null))
    expect(result.lines.some((l) => l.label === '鑑別の患側')).toBe(false)
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test -- scoring.test`
Expected: FAIL（「鑑別の患側」という `label` の行が見つからず `line` が `undefined` になる）

- [ ] **Step 3: `src/game/scoring.ts` を更新する**

1行目のimportに `subtypeAsksSide` を追加する。

```ts
import {
  ACTION_MAP,
  asksSide,
  ATAXIA_GRADES,
  DISPOSITION_MAP,
  IMAGING_CRITERIA,
  subtypeAsksSide,
  SUBTYPE_LABEL,
} from '../data/actions'
```

`MAX` オブジェクトに `subtype: 5,` の直後、`subtypeSide: 5,` を追加する。

```ts
  const MAX = {
  process: 22,
  recommended: 4,
  grace: 5,
  subtype: 5,
  subtypeSide: 5,
  criteria: 8,
  imaging: 12,
  diagnosis: 15,
  side: 5,
  maneuver: 5,
  disposition: 15,
  ataxia: 5,
}
```

「── みたてる：細かい鑑別」の `lines.push({...})` ブロック（既存の「鑑別」行）の直後に、新しいブロックを追加する。

```ts
  // ── みたてる：鑑別で選んだ患側（BPPV・メニエール病・前庭神経炎のみ）
  const subtypeSideAsked = subtypeAsksSide(c.subtype)
  const subtypeSideCorrect = !subtypeSideAsked || s.subtypeSideAnswer === c.diagnosis.side
  if (subtypeSideAsked) {
    lines.push({
      label: '鑑別の患側',
      earned: subOk && subtypeSideCorrect ? MAX.subtypeSide : 0,
      max: MAX.subtypeSide,
      notes: [
        subOk && subtypeSideCorrect
          ? '鑑別時点の患側判定も正しくできています'
          : `患側の正解：${c.diagnosis.side === 'R' ? '右' : '左'}`,
      ],
    })
  }
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test -- scoring.test`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/game/scoring.ts src/game/scoring.test.ts
git commit -m "feat: score patient side answered during subtype triage"
```

---

## Task 3: 診察画面のUI（かんべつ1タップ化・患側質問の表示）

**Files:**
- Modify: `src/screens/Exam.tsx`

**Interfaces:**
- Consumes: `subtypeAsksSide`（Task 1）、`GameState.subtypeSideAnswer`（Task 1）、`SET_SUBTYPE_SIDE` action（Task 1）
- Produces: なし（画面遷移・表示のみ。自動テストは既存の `Exam.tsx` に無いため、本タスクは手動確認で検証する）

- [ ] **Step 1: importに `subtypeAsksSide` を追加する**

`src/screens/Exam.tsx` の先頭のimportを以下のように変更する。

```ts
import {
  ACTIONS,
  ACTION_GROUPS,
  ATAXIA_NOTE,
  ATAXIA_GRADES,
  DIX_HALLPIKE_NOTE,
  IMAGING_CRITERIA,
  MODAL_ACTIONS,
  SUBTYPES,
  subtypeAsksSide,
  VESTIBULAR_TYPES,
  type VestibularChoice,
} from '../data/actions'
```

- [ ] **Step 2: 「かんべつ②」画面に患側の設問を追加する**

`dxStep === 'type'` の早期returnの直後にある「② その分類のなかで疾患名まで絞る」のブロックを、以下に置き換える。

```tsx
    // ② その分類のなかで疾患名まで絞る
    const needsSubtypeSide = subtypeAsksSide(state.subtypeAnswer)
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
        {needsSubtypeSide && (
          <Win title="患側">
            <div className="menu">
              <MenuItem
                label="右"
                checked={state.subtypeSideAnswer === 'R'}
                onSelect={() => dispatch({ type: 'SET_SUBTYPE_SIDE', value: 'R' })}
              />
              <MenuItem
                label="左"
                checked={state.subtypeSideAnswer === 'L'}
                onSelect={() => dispatch({ type: 'SET_SUBTYPE_SIDE', value: 'L' })}
              />
            </div>
          </Win>
        )}
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
            disabled={
              cls === null ||
              (cls !== 'none' && state.subtypeAnswer === null) ||
              (needsSubtypeSide && state.subtypeSideAnswer === null)
            }
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
```

- [ ] **Step 3: 「かんべつ」を1タップで分類選択に入るようにする**

トップレベルのコマンド一覧（`group === null` のブロック）にある `ACTION_GROUPS.map` の `onSelect` を、以下に置き換える。

```tsx
            {ACTION_GROUPS.map((g) => (
              <MenuItem
                key={g.id}
                label={g.label}
                onSelect={() => {
                  // かんべつは項目が1つしかないので、中間メニューを経由せず分類選択のモーダルへ直接入る
                  if (g.id === 'assess') return perform('as_dx')
                  setGroup(g.id)
                  // 画像検査では、まず全員が適応4項目を確認する。
                  if (g.id === 'imaging' && !criteriaDone) setModal('criteria')
                }}
              />
            ))}
```

- [ ] **Step 4: 型チェックとテストスイート全体を実行する**

Run: `npm run typecheck`
Expected: エラーなし

Run: `npm test`
Expected: すべてPASS（Task 1・2で追加したテストを含む）

- [ ] **Step 5: 開発サーバーで手動確認する**

Run: `npm run dev`

1. タイトル画面から症例を1つ選び診察を開始する。
2. コマンド一覧で「かんべつ」を選ぶ → 中間メニューを経由せず、いきなり「かんべつ①　めまいを分類する」（AVS/s-EVS/t-EVS選択）が開くことを確認する。
3. 「t-EVS」を選ぶ →「かんべつ②」で鑑別（例：後半規管BPPV）を選ぶ → 「患側」の右/左メニューが表示されることを確認する。
4. 患側を選ぶ前は「決定」ボタンが押せないこと、患側を選ぶと押せるようになることを確認する。
5. 「かんべつ②」で「脳卒中（小脳・脳幹）」など患側を問わない鑑別を選んだときは、患側メニューが表示されないことを確認する。

- [ ] **Step 6: コミット**

```bash
git add src/screens/Exam.tsx
git commit -m "feat: streamline assess flow and ask patient side for BPPV/Meniere/vestibular neuritis"
```

---

## Task 4: テレメトリ送信の共通化とBPPV学習ペイロード

**Files:**
- Modify: `src/telemetry/send.ts`
- Test: `src/telemetry/send.test.ts`

**Interfaces:**
- Consumes: `BppvLesson`（`src/data/bppvLessons.ts`、既存）、`RoleId`（`src/profile/types.ts`、既存）
- Produces: `BppvLearnViewPayload` 型、`buildBppvLearnPayload(input): BppvLearnViewPayload`、`sendBppvLearnView(payload): Promise<void>`
- 既存 `sendResult(payload): Promise<void>` と `buildPayload(input): TelemetryPayload` のシグネチャ・挙動は変えない（`TelemetryPayload` に `kind: 'game_result'` フィールドが増える点のみ変更）

- [ ] **Step 1: `src/telemetry/send.test.ts` の既存テストを更新し、新しいテストを追加する**

`buildPayload` の「設計書の列をすべて埋める」テストの `expect(p).toEqual({...})` の中身の先頭に `kind: 'game_result',` を追加する。

```ts
    expect(p).toEqual({
      kind: 'game_result',
      completedAt: new Date(1_700_000_000_000).toISOString(),
      roleId: 'pgy2',
      roleName: 'PGY2',
      caseId: 4,
      caseTitle: '水平半規管型BPPV　右',
      category: 'bppv',
      rank: 'S',
      score: 97,
      endingTier: 'best',
      diagnosisCorrect: true,
      sideCorrect: true,
      maneuverPerfect: true,
      fromRandom: true,
      appVersion: 'vertigo-v0.2',
      pageUrl: 'https://example.github.io/Vertigo/',
    })
```

ファイル先頭のimportに `buildBppvLearnPayload` と `sendBppvLearnView` を追加し、`BPPV_LESSONS` をインポートする。

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildBppvLearnPayload, buildPayload, isValidGasUrl, sendBppvLearnView, sendResult } from './send'
import { __setTelemetryUrlForTest } from './config'
import type { PlayResult } from '../profile/types'
import { BPPV_LESSONS } from '../data/bppvLessons'
```

ファイル末尾（最後の `})` の直後）に以下のdescribeブロックを追加する。

```ts
describe('buildBppvLearnPayload', () => {
  const lesson = BPPV_LESSONS.find((l) => l.id === 'pc_r')!

  it('選んだ型の情報を列に詰める', () => {
    const p = buildBppvLearnPayload({
      lesson,
      roleId: 'student',
      viewedAt: 1_700_000_000_000,
      pageUrl: 'https://example.github.io/Vertigo/',
    })

    expect(p).toEqual({
      kind: 'bppv_learn_view',
      viewedAt: new Date(1_700_000_000_000).toISOString(),
      roleId: 'student',
      roleName: '医学生',
      lessonId: 'pc_r',
      family: '後半規管',
      side: '右',
      title: lesson.title,
      appVersion: 'vertigo-v0.2',
      pageUrl: 'https://example.github.io/Vertigo/',
    })
  })

  it('職種未選択でも組み立てられる', () => {
    const p = buildBppvLearnPayload({
      lesson,
      roleId: '',
      viewedAt: 1,
      pageUrl: 'x',
    })
    expect(p.roleId).toBe('')
    expect(p.roleName).toBe('未選択')
  })
})

describe('sendBppvLearnView', () => {
  const lesson = BPPV_LESSONS.find((l) => l.id === 'hc_geo_r')!
  const payload = buildBppvLearnPayload({
    lesson,
    roleId: 'pgy1',
    viewedAt: 1,
    pageUrl: 'x',
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    __setTelemetryUrlForTest(null)
  })

  it('URL が未設定なら送らない', async () => {
    __setTelemetryUrlForTest('')
    await sendBppvLearnView(payload)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendBeacon が使えればそれで送る', async () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    __setTelemetryUrlForTest('https://script.google.com/macros/s/AKfycbwABC123/exec')

    await sendBppvLearnView(payload)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test -- send.test`
Expected: FAIL（`buildBppvLearnPayload`・`sendBppvLearnView` が存在しない、`kind` が `toEqual` の期待値に一致しない）

- [ ] **Step 3: `src/telemetry/send.ts` を全面的に書き換える**

ファイル全体を以下の内容に置き換える。

```ts
import { roleName } from '../profile/roles'
import type { PlayResult, RoleId } from '../profile/types'
import type { BppvLesson } from '../data/bppvLessons'
import { isValidGasUrl, loadTelemetryUrl } from './config'

export { isValidGasUrl }

export const APP_VERSION = 'vertigo-v0.2'

/**
 * スプレッドシートに1行として積まれる内容。
 * 個人を特定する情報は含めない。送るのは職種と成績だけ。
 */
export interface TelemetryPayload {
  kind: 'game_result'
  completedAt: string
  roleId: RoleId | ''
  roleName: string
  caseId: number
  caseTitle: string
  category: string
  rank: string
  score: number
  endingTier: string
  diagnosisCorrect: boolean
  sideCorrect: boolean
  maneuverPerfect: boolean | null
  fromRandom: boolean
  appVersion: string
  pageUrl: string
}

/** BPPV学習画面で、どの型を参照したかの記録。1回の選択が1行になる */
export interface BppvLearnViewPayload {
  kind: 'bppv_learn_view'
  viewedAt: string
  roleId: RoleId | ''
  roleName: string
  lessonId: string
  family: string
  side: string
  title: string
  appVersion: string
  pageUrl: string
}

export function buildPayload(input: {
  play: PlayResult
  roleId: RoleId | ''
  maneuverPerfect: boolean | null
  diagnosisCorrect: boolean
  sideCorrect: boolean
  completedAt: number
  pageUrl: string
}): TelemetryPayload {
  return {
    kind: 'game_result',
    completedAt: new Date(input.completedAt).toISOString(),
    roleId: input.roleId,
    roleName: roleName(input.roleId),
    caseId: input.play.caseId,
    caseTitle: input.play.caseTitle,
    category: input.play.category,
    rank: input.play.rank,
    score: input.play.score,
    endingTier: input.play.ending,
    diagnosisCorrect: input.diagnosisCorrect,
    sideCorrect: input.sideCorrect,
    maneuverPerfect: input.maneuverPerfect,
    fromRandom: input.play.fromRandom,
    appVersion: APP_VERSION,
    pageUrl: input.pageUrl,
  }
}

export function buildBppvLearnPayload(input: {
  lesson: BppvLesson
  roleId: RoleId | ''
  viewedAt: number
  pageUrl: string
}): BppvLearnViewPayload {
  return {
    kind: 'bppv_learn_view',
    viewedAt: new Date(input.viewedAt).toISOString(),
    roleId: input.roleId,
    roleName: roleName(input.roleId),
    lessonId: input.lesson.id,
    family: input.lesson.family,
    side: input.lesson.side,
    title: input.lesson.title,
    appVersion: APP_VERSION,
    pageUrl: input.pageUrl,
  }
}

/**
 * 送信は best-effort。失敗してもゲーム・学習画面の操作を止めない。
 * 研修中の学習者にネットワークエラーを見せる意味がない。
 */
async function postTelemetry(payload: TelemetryPayload | BppvLearnViewPayload): Promise<void> {
  try {
    const url = await loadTelemetryUrl()
    if (!isValidGasUrl(url)) {
      if (url) console.warn('[telemetry] googleSheetsWebAppUrl の形式が違うので送信しません:', url)
      return
    }

    const body = JSON.stringify(payload)

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=utf-8' }))
      if (queued) return
    }

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: true,
    })
  } catch (e) {
    console.error('[telemetry] 送信に失敗しました', e)
  }
}

export function sendResult(payload: TelemetryPayload): Promise<void> {
  return postTelemetry(payload)
}

export function sendBppvLearnView(payload: BppvLearnViewPayload): Promise<void> {
  return postTelemetry(payload)
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test -- send.test`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/telemetry/send.ts src/telemetry/send.test.ts
git commit -m "feat: add BPPV learn view telemetry payload alongside game result payload"
```

---

## Task 5: Google Apps Script側のシート振り分け

**Files:**
- Modify: `integrations/google-sheets/Code.gs`
- Modify: `integrations/google-sheets/README.md`

**Interfaces:**
- Consumes: `TelemetryPayload`／`BppvLearnViewPayload` の `kind` フィールド（Task 4）
- Produces: なし（Apps Script。このリポジトリにはGAS用のテストランナーが無いため、本タスクはコードレビューと、デプロイ後の手動確認で検証する）

- [ ] **Step 1: `Code.gs` を全面的に書き換える**

`integrations/google-sheets/Code.gs` の内容を以下に置き換える。

```javascript
const SHEET_NAME = "vertigo_results";
const SHEET_NAME_LEARN = "bppv_learn_views";
const SPREADSHEET_ID = "";
const HEADERS = [
  "receivedAt",
  "completedAt",
  "roleId",
  "roleName",
  "caseId",
  "caseTitle",
  "category",
  "rank",
  "score",
  "endingTier",
  "diagnosisCorrect",
  "sideCorrect",
  "maneuverPerfect",
  "fromRandom",
  "appVersion",
  "pageUrl",
];
const HEADERS_LEARN = [
  "receivedAt",
  "viewedAt",
  "roleId",
  "roleName",
  "lessonId",
  "family",
  "side",
  "title",
  "appVersion",
  "pageUrl",
];

function doGet() {
  const sheet = getSheet_(SHEET_NAME);
  ensureHeaders_(sheet, HEADERS);
  return jsonOutput_({
    ok: true,
    app: "VERTIGO Google Sheets collector",
    sheetName: SHEET_NAME,
    spreadsheetUrl: sheet.getParent().getUrl(),
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const isLearnView = payload.kind === "bppv_learn_view";
    const sheetName = isLearnView ? SHEET_NAME_LEARN : SHEET_NAME;
    const headers = isLearnView ? HEADERS_LEARN : HEADERS;
    const toRow = isLearnView ? toLearnRow_ : toResultRow_;

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      const sheet = getSheet_(sheetName);
      ensureHeaders_(sheet, headers);
      sheet.appendRow(toRow(payload));
    } finally {
      lock.releaseLock();
    }
    return jsonOutput_({ ok: true });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error && error.message ? error.message : String(error) });
  }
}

function parsePayload_(e) {
  const content =
    e && e.parameter && e.parameter.payload
      ? e.parameter.payload
      : e && e.postData && e.postData.contents
        ? e.postData.contents
        : "{}";
  const payload = JSON.parse(content);
  if (!payload || typeof payload !== "object") throw new Error("Payload must be a JSON object.");
  return payload;
}

function getSheet_(sheetName) {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Create this Apps Script from a Google Spreadsheet or set SPREADSHEET_ID.");
  }
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
}

function toResultRow_(p) {
  return [
    new Date().toISOString(),
    p.completedAt || "",
    p.roleId || "",
    p.roleName || "",
    p.caseId === undefined ? "" : p.caseId,
    p.caseTitle || "",
    p.category || "",
    p.rank || "",
    p.score === undefined ? "" : p.score,
    p.endingTier || "",
    p.diagnosisCorrect === undefined ? "" : p.diagnosisCorrect,
    p.sideCorrect === undefined ? "" : p.sideCorrect,
    p.maneuverPerfect === undefined || p.maneuverPerfect === null ? "" : p.maneuverPerfect,
    p.fromRandom === undefined ? "" : p.fromRandom,
    p.appVersion || "",
    p.pageUrl || "",
  ];
}

function toLearnRow_(p) {
  return [
    new Date().toISOString(),
    p.viewedAt || "",
    p.roleId || "",
    p.roleName || "",
    p.lessonId || "",
    p.family || "",
    p.side || "",
    p.title || "",
    p.appVersion || "",
    p.pageUrl || "",
  ];
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
```

- [ ] **Step 2: `README.md` に新しいシートについて1文追記する**

`integrations/google-sheets/README.md` の末尾（13行目）に以下を追記する。

```markdown

ゲーム結果は `vertigo_results` シートに、BPPV学習画面でどの型を参照したかは
`bppv_learn_views` シートに、それぞれ自動で作成・記録される。
```

- [ ] **Step 3: コードレビューで確認する（自動テストなし）**

`doPost` のルーティング（`payload.kind === "bppv_learn_view"` の分岐）と、`toResultRow_`／`toLearnRow_` が対応する `HEADERS`／`HEADERS_LEARN` の並び順と一致していることを目で確認する。

- [ ] **Step 4: コミット**

```bash
git add integrations/google-sheets/Code.gs integrations/google-sheets/README.md
git commit -m "feat: route telemetry payloads to separate sheets by kind"
```

---

## Task 6: BPPV学習画面から参照記録を送信する

**Files:**
- Modify: `src/screens/BppvLearn.tsx`
- Test: `src/screens/BppvLearn.test.tsx` (新規)

**Interfaces:**
- Consumes: `buildBppvLearnPayload`／`sendBppvLearnView`（Task 4、`src/telemetry/send.ts`）、`useProfile`（`src/profile/ProfileContext.tsx`、既存）

- [ ] **Step 1: `src/screens/BppvLearn.test.tsx` を新規作成し、失敗するテストを書く**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BppvLearnScreen } from './BppvLearn'
import { ProfileProvider } from '../profile/ProfileContext'

vi.mock('../telemetry/send', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../telemetry/send')>()
  return {
    ...actual,
    sendBppvLearnView: vi.fn(),
  }
})

import { sendBppvLearnView } from '../telemetry/send'

function renderScreen() {
  render(
    <ProfileProvider>
      <BppvLearnScreen dispatch={vi.fn()} />
    </ProfileProvider>,
  )
}

describe('BppvLearnScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(sendBppvLearnView).mockClear()
  })

  it('初期表示では送信しない', () => {
    renderScreen()
    expect(sendBppvLearnView).not.toHaveBeenCalled()
  })

  it('コンボボックスで型を選ぶと参照を記録する', () => {
    renderScreen()
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })

    expect(sendBppvLearnView).toHaveBeenCalledTimes(1)
    const sentPayload = vi.mocked(sendBppvLearnView).mock.calls[0][0]
    expect(sentPayload.kind).toBe('bppv_learn_view')
    expect(sentPayload.lessonId).toBe('hc_geo_r')
    expect(sentPayload.family).toBe('水平半規管・向地性')
  })

  it('同じ型を選び直しても（変化がなければ）連続送信しない', () => {
    renderScreen()
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })
    expect(sendBppvLearnView).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test -- BppvLearn.test`
Expected: FAIL（型を変更しても `sendBppvLearnView` が呼ばれない）

- [ ] **Step 3: `src/screens/BppvLearn.tsx` を更新する**

ファイル先頭のimportを以下に置き換える。

```tsx
import { useState } from 'react'
import { BPPV_LESSONS, type BppvLessonId } from '../data/bppvLessons'
import { Button, Win } from '../components/ui'
import { filmPoseReachedAfterMs, ManeuverFilm } from '../components/ManeuverFilm'
import { Nystagmus } from '../components/Nystagmus'
import { useProfile } from '../profile/ProfileContext'
import { buildBppvLearnPayload, sendBppvLearnView } from '../telemetry/send'
import type { Action } from '../game/state'
```

`BppvLearnScreen` の本体（関数の先頭）を以下に置き換える。

```tsx
export function BppvLearnScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const [selectedId, setSelectedId] = useState<BppvLessonId>('pc_r')
  const lesson = BPPV_LESSONS.find((item) => item.id === selectedId) ?? BPPV_LESSONS[0]
  const { profile } = useProfile()

  // 実際に選択が変わったときだけ記録する。開いた直後の初期表示（pc_r）や、
  // 同じ型を選び直したときは送らない（テスト環境では change イベントが値の異同に
  // 関わらず発火しうるため、ここで明示的に比較する）
  const selectLesson = (id: BppvLessonId) => {
    if (id === selectedId) return
    setSelectedId(id)
    const next = BPPV_LESSONS.find((item) => item.id === id)
    if (!next) return
    void sendBppvLearnView(
      buildBppvLearnPayload({
        lesson: next,
        roleId: profile.roleId,
        viewedAt: Date.now(),
        pageUrl: window.location.href,
      }),
    )
  }
```

コンボボックスの `onChange` を以下に置き換える。

```tsx
        <select
          className="learn-select"
          value={selectedId}
          onChange={(event) => selectLesson(event.target.value as BppvLessonId)}
        >
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test -- BppvLearn.test`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/screens/BppvLearn.tsx src/screens/BppvLearn.test.tsx
git commit -m "feat: log BPPV lesson selection to telemetry"
```

---

## Task 7: 最終確認

**Files:** なし（検証のみ）

- [ ] **Step 1: 型チェックとテストスイート全体を実行する**

Run: `npm run typecheck`
Expected: エラーなし

Run: `npm test`
Expected: すべてPASS

- [ ] **Step 2: ビルドを確認する**

Run: `npm run build`
Expected: エラーなしでビルドが完了する

- [ ] **Step 3: 開発サーバーで一連の流れを通しで手動確認する**

Run: `npm run dev`

1. BPPV学習画面（タイトル→「BPPVをまなぶ」）でコンボボックスの型を数回切り替え、ブラウザのネットワークタブ（または `console.warn` が出ないこと）でエラーが出ていないことを確認する（`app-config.json` の `googleSheetsWebAppUrl` が未設定の環境では送信自体スキップされるが、エラーにはならないことを確認する）。
2. 症例を1つプレイし、「かんべつ」→ BPPV/メニエール病/前庭神経炎を選んだときに患側設問が出て、最終診断画面の患側設問とは独立して動作すること（かんべつ②で右を選んでも、最終診断で改めて患側を問われること）を確認する。
3. 結果画面で「鑑別の患側」の採点行が表示されることを確認する。
