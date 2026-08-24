# オープニング画面の刷新とアプリシェル 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タイトルの入口を「しんさつかいし／しょうれいえらぶ／BPPVがくしゅう」の3本に整理し、使い方・クリア記録・履歴・音のオン/オフ・職種登録・オープニングと診察の BGM・職種別の利用状況の Google スプレッドシート送信を実装する。

**Architecture:** 状態を2層に分ける。1症例のプレイは既存の `GameState`（`useReducer`）、症例をまたいで永続する職種・音設定・クリア記録・履歴は新設の `Profile`（localStorage）。使い方・クリア記録・履歴・職種の画面は `Phase` ではなく `App` のローカル state に持つ overlay とし、どの画面から開いても閉じれば元へ戻り、診察の進行を失わない。

**Tech Stack:** React 19 / TypeScript 5.9 / Vite 7 / vite-plugin-pwa / Web Audio API（音源ファイルなし、合成のみ）/ vitest + jsdom + @testing-library/react（新規導入）/ Google Apps Script（受け口）

**設計書:** `docs/superpowers/specs/2026-08-24-opening-shell-design.md`

## Global Constraints

これらは全タスクの要件に暗黙に含まれる。

- **対象は A段階のみ。** BPPVがくしゅうの中身（眼振と耳石置換法の解説）は B段階の別計画。本計画では「準備中」の入口だけを作る。
- localStorage キーは `vertigo_profile_v1`、`schemaVersion` は `1`。
- 保存データが壊れていても**例外を投げずに既定値へフォールバックする**。記録のせいでゲームが起動しないほうが困る。
- テレメトリの**送信失敗はゲームを止めない**。`console.error` に出すだけで、画面には出さない。
- **個人を特定する情報は一切送らない。** 送るのは職種と成績のみ。
- BGM のタイマーは `setInterval` を使う。`requestAnimationFrame` はタブが非表示のときに止まる。
- 色は `src/styles/global.css` の既存の CSS 変数（`--navy` `--navy-deep` `--ink` `--dim` `--accent` `--danger` `--safe` `--frame`）だけを使う。新しい色を足さない。
- React 19 の `StrictMode` 下では effect が二重に走る。記録と送信は `useRef` でガードする。
- `tsconfig.json` は `noUnusedLocals` と `noUnusedParameters` が有効。未使用の変数・引数はビルドを壊す。
- Vite の `base` は `'./'`（GitHub Pages のサブディレクトリ対応）。アセット参照は `import.meta.env.BASE_URL` を通す。
- UI の文言は日本語。メニュー項目はひらがな主体（既存の `かんじゃをみる` `もどる` の流儀に合わせる）。
- 各タスクの最後にコミットする。push はしない（ユーザーがまとめて行う）。

---

## File Structure

| ファイル | 責務 | タスク |
|---|---|---|
| `src/profile/types.ts` | `RoleId` / `Rank` / `ClearRecord` / `HistoryEntry` / `Profile` / `PlayResult` の型 | 1 |
| `src/profile/roles.ts` | 職種8択の定義、`roleName()`、`isRoleId()` | 1 |
| `src/profile/storage.ts` | localStorage 入出力と、クリア判定・履歴追加・集計の純関数 | 1 |
| `src/profile/storage.test.ts` | 上記の単体テスト | 1 |
| `src/data/cases/index.ts` | `caseTitle()` を追加（既存ファイル） | 2 |
| `src/data/cases/index.test.ts` | `caseTitle()` のテスト | 2 |
| `src/game/state.ts` | `Phase` に `'learn'`、`GameState` に `fromRandom` を追加（既存ファイル） | 2 |
| `src/game/state.test.ts` | reducer のテスト | 2 |
| `src/screens/Title.tsx` | タイトル画面（3メニュー＋職種チップ） | 2 |
| `src/screens/CaseSelect.tsx` | 症例選択 | 2 |
| `src/screens/Brief.tsx` | 症例導入 | 2 |
| `src/screens/BppvLearn.tsx` | BPPVがくしゅうの入口 | 2 |
| `src/screens/Opening.tsx` | **削除** | 2 |
| `src/profile/ProfileContext.tsx` | Provider と `useProfile()` | 3 |
| `src/components/AppHeader.tsx` | 上部ユーティリティ行 | 3 |
| `src/components/AppHeader.test.tsx` | ミュート切替のテスト | 3 |
| `src/screens/Howto.tsx` | 使い方 | 3 |
| `src/profile/useRoleGate.ts` | 職種未選択時に選択へ誘導し、選択後に元の操作を続行する | 4 |
| `src/profile/useRoleGate.test.ts` | 上記のテスト | 4 |
| `src/screens/RolePick.tsx` | 職種選択 | 4 |
| `src/profile/useRecordResult.ts` | 結果を1回だけ記録する（StrictMode 対策の ref ガード） | 5 |
| `src/profile/useRecordResult.test.tsx` | 二重実行しないことのテスト | 5 |
| `src/screens/Clears.tsx` | クリア記録 | 5 |
| `src/screens/History.tsx` | 履歴 | 6 |
| `src/telemetry/config.ts` | `app-config.json` の読み込みと URL 検証 | 7 |
| `src/telemetry/send.ts` | ペイロード組み立てと送出 | 7 |
| `src/telemetry/send.test.ts` | 上記のテスト | 7 |
| `public/app-config.json` | GAS Web アプリ URL | 7 |
| `integrations/google-sheets/Code.gs` | GAS 側の受け口 | 7 |
| `src/audio/context.ts` | `AudioContext` の共有 | 8 |
| `src/audio/tracks.ts` | 曲データ（`opening` / `exam`） | 8 |
| `src/audio/music.ts` | ステップシーケンサ | 8 |
| `src/audio/music.test.ts` | 多重再生防止と停止のテスト | 8 |
| `src/audio/sfx.ts` | `AudioContext` を `context.ts` へ移譲（既存ファイル） | 8 |
| `src/App.tsx` | Provider・overlay・BGM の鳴らし分け・画面出し分け（既存ファイル） | 2,3,4,9 |
| `src/screens/Result.tsx` | 記録と送信の呼び出し（既存ファイル） | 5,7 |
| `src/styles/global.css` | ヘッダー・タブ・記録一覧・職種チップのスタイル（既存ファイル） | 3,5,6 |

---

## Task 1: Profile の永続層（vitest 導入込み）

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `src/profile/types.ts`
- Create: `src/profile/roles.ts`
- Create: `src/profile/storage.ts`
- Test: `src/profile/storage.test.ts`

**Interfaces:**
- Consumes: `src/data/types.ts` の `Category`、`src/game/scoring.ts` の `ScoreResult` と `EndingTier`
- Produces:
  - `type RoleId = 'pgy1'|'pgy2'|'senior'|'er'|'other_doctor'|'nurse'|'student'|'other'`
  - `type Rank = 'S'|'A'|'B'|'C'|'D'`
  - `interface ClearRecord { firstClearedAt: string | null; bestRank: Rank; bestScore: number; plays: number }`
  - `interface HistoryEntry { ts: number; caseId: number; caseTitle: string; category: Category; rank: Rank; score: number; ending: EndingTier; roleId: RoleId | ''; fromRandom: boolean }`
  - `interface Profile { schemaVersion: 1; roleId: RoleId | ''; muted: boolean; howtoAcknowledged: boolean; clears: Record<number, ClearRecord>; history: HistoryEntry[] }`
  - `interface PlayResult { caseId: number; caseTitle: string; category: Category; rank: Rank; score: number; ending: EndingTier; fromRandom: boolean }`
  - `const ROLES: readonly { id: RoleId; name: string }[]`
  - `function isRoleId(v: unknown): v is RoleId`
  - `function roleName(id: RoleId | ''): string`
  - `const STORAGE_KEY = 'vertigo_profile_v1'`、`const HISTORY_LIMIT = 50`
  - `function defaultProfile(): Profile`
  - `function parseProfile(raw: string | null): Profile`
  - `function loadProfile(): Profile`
  - `function saveProfile(p: Profile): void`
  - `function isCleared(rank: Rank): boolean`
  - `function clearOf(p: Profile, caseId: number): ClearRecord | undefined`
  - `function recordResult(p: Profile, r: PlayResult, now: number): Profile`
  - `function clearedSummary(p: Profile): { cleared: number; starred: number }`
  - `function filterHistory(history: HistoryEntry[], category: Category | 'all'): HistoryEntry[]`

- [ ] **Step 1: テスト環境の依存を入れる**

```bash
npm install -D vitest@^3 jsdom@^27 @testing-library/react@^16
```

- [ ] **Step 2: `package.json` に test スクリプトを足す**

`"scripts"` に2行追加する（既存の行は消さない）。

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: `vite.config.ts` に vitest の設定を足す**

1行目に型参照を追加する。

```ts
/// <reference types="vitest/config" />
```

`defineConfig({ ... })` の中、`base: './',` の直後に次を挿入する。

```ts
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
```

- [ ] **Step 4: `tsconfig.json` の types に vitest を足す**

```json
    "types": ["vite/client", "vite-plugin-pwa/client", "vitest/globals"]
```

- [ ] **Step 5: 失敗するテストを書く**

`src/profile/storage.test.ts` を作る。

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import type { PlayResult, Profile } from './types'
import {
  clearedSummary,
  clearOf,
  defaultProfile,
  filterHistory,
  HISTORY_LIMIT,
  isCleared,
  loadProfile,
  parseProfile,
  recordResult,
  saveProfile,
  STORAGE_KEY,
} from './storage'

const play = (over: Partial<PlayResult> = {}): PlayResult => ({
  caseId: 1,
  caseTitle: '後半規管型BPPV　右',
  category: 'bppv',
  rank: 'A',
  score: 88,
  ending: 'best',
  fromRandom: false,
  ...over,
})

describe('parseProfile', () => {
  it('null なら既定値を返す', () => {
    expect(parseProfile(null)).toEqual(defaultProfile())
  })

  it('壊れた JSON でも投げずに既定値を返す', () => {
    expect(parseProfile('{ not json')).toEqual(defaultProfile())
  })

  it('schemaVersion が違えば既定値を返す', () => {
    const old = JSON.stringify({ ...defaultProfile(), schemaVersion: 99, muted: true })
    expect(parseProfile(old)).toEqual(defaultProfile())
  })

  it('未知の roleId は未選択に落とす', () => {
    const raw = JSON.stringify({ ...defaultProfile(), roleId: 'wizard' })
    expect(parseProfile(raw).roleId).toBe('')
  })

  it('既知の roleId と muted は保つ', () => {
    const raw = JSON.stringify({ ...defaultProfile(), roleId: 'pgy2', muted: true })
    const p = parseProfile(raw)
    expect(p.roleId).toBe('pgy2')
    expect(p.muted).toBe(true)
  })

  it('clears と history が配列・オブジェクトでなければ空にする', () => {
    const raw = JSON.stringify({ ...defaultProfile(), clears: 'x', history: 'y' })
    const p = parseProfile(raw)
    expect(p.clears).toEqual({})
    expect(p.history).toEqual([])
  })
})

describe('isCleared', () => {
  it('S と A はクリア', () => {
    expect(isCleared('S')).toBe(true)
    expect(isCleared('A')).toBe(true)
  })

  it('B 以下はクリアではない', () => {
    expect(isCleared('B')).toBe(false)
    expect(isCleared('C')).toBe(false)
    expect(isCleared('D')).toBe(false)
  })
})

describe('recordResult', () => {
  it('初回プレイでその回の結果から ClearRecord を作る', () => {
    const p = recordResult(defaultProfile(), play({ rank: 'C', score: 60 }), 1000)
    expect(p.clears[1]).toEqual({
      firstClearedAt: null,
      bestRank: 'C',
      bestScore: 60,
      plays: 1,
    })
  })

  it('A 以上で firstClearedAt が入る', () => {
    const p = recordResult(defaultProfile(), play({ rank: 'A', score: 88 }), 1000)
    expect(p.clears[1].firstClearedAt).toBe(new Date(1000).toISOString())
  })

  it('firstClearedAt は二度目以降のクリアで上書きしない', () => {
    const first = recordResult(defaultProfile(), play({ rank: 'A', score: 88 }), 1000)
    const second = recordResult(first, play({ rank: 'S', score: 99 }), 5000)
    expect(second.clears[1].firstClearedAt).toBe(new Date(1000).toISOString())
  })

  it('bestRank と bestScore はスコアを厳密に上回ったときだけ更新する', () => {
    const a = recordResult(defaultProfile(), play({ rank: 'A', score: 88 }), 1000)
    const same = recordResult(a, play({ rank: 'S', score: 88 }), 2000)
    expect(same.clears[1].bestRank).toBe('A')
    expect(same.clears[1].bestScore).toBe(88)

    const better = recordResult(same, play({ rank: 'S', score: 96 }), 3000)
    expect(better.clears[1].bestRank).toBe('S')
    expect(better.clears[1].bestScore).toBe(96)
  })

  it('スコアが下がっても plays は増える', () => {
    const a = recordResult(defaultProfile(), play({ score: 88 }), 1000)
    const b = recordResult(a, play({ rank: 'D', score: 20 }), 2000)
    expect(b.clears[1].plays).toBe(2)
    expect(b.clears[1].bestScore).toBe(88)
  })

  it('元の Profile を書き換えない', () => {
    const base = defaultProfile()
    recordResult(base, play(), 1000)
    expect(base.clears).toEqual({})
    expect(base.history).toEqual([])
  })

  it('履歴を新しい順に積み、職種を記録する', () => {
    const base = { ...defaultProfile(), roleId: 'pgy1' as const }
    const a = recordResult(base, play({ caseId: 1 }), 1000)
    const b = recordResult(a, play({ caseId: 2 }), 2000)
    expect(b.history.map((h) => h.caseId)).toEqual([2, 1])
    expect(b.history[0].ts).toBe(2000)
    expect(b.history[0].roleId).toBe('pgy1')
  })

  it(`履歴は ${HISTORY_LIMIT} 件を超えたら古いものから捨てる`, () => {
    let p = defaultProfile()
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      p = recordResult(p, play({ caseId: i }), i + 1)
    }
    expect(p.history).toHaveLength(HISTORY_LIMIT)
    expect(p.history[0].caseId).toBe(HISTORY_LIMIT + 4)
    expect(p.history[HISTORY_LIMIT - 1].caseId).toBe(5)
  })
})

describe('clearOf', () => {
  it('記録の無い症例は undefined', () => {
    expect(clearOf(defaultProfile(), 99)).toBeUndefined()
  })

  it('記録のある症例は ClearRecord を返す', () => {
    const p = recordResult(defaultProfile(), play({ caseId: 7 }), 1000)
    expect(clearOf(p, 7)?.plays).toBe(1)
  })
})

describe('clearedSummary', () => {
  it('クリア数と ☆ 数を数える', () => {
    let p = defaultProfile()
    p = recordResult(p, play({ caseId: 1, rank: 'S', score: 99 }), 1000)
    p = recordResult(p, play({ caseId: 2, rank: 'A', score: 86 }), 2000)
    p = recordResult(p, play({ caseId: 3, rank: 'C', score: 55 }), 3000)
    expect(clearedSummary(p)).toEqual({ cleared: 2, starred: 1 })
  })
})

describe('filterHistory', () => {
  it("'all' なら全件返す", () => {
    let p = defaultProfile()
    p = recordResult(p, play({ caseId: 1, category: 'bppv' }), 1000)
    p = recordResult(p, play({ caseId: 2, category: 'central' }), 2000)
    expect(filterHistory(p.history, 'all')).toHaveLength(2)
  })

  it('カテゴリを指定すると絞り込む', () => {
    let p = defaultProfile()
    p = recordResult(p, play({ caseId: 1, category: 'bppv' }), 1000)
    p = recordResult(p, play({ caseId: 2, category: 'central' }), 2000)
    const only = filterHistory(p.history, 'central')
    expect(only).toHaveLength(1)
    expect(only[0].caseId).toBe(2)
  })
})

describe('loadProfile / saveProfile', () => {
  beforeEach(() => localStorage.clear())

  it('保存した内容を読み戻せる', () => {
    const p: Profile = { ...defaultProfile(), roleId: 'nurse', muted: true }
    saveProfile(p)
    expect(loadProfile()).toEqual(p)
  })

  it('保存が無ければ既定値を返す', () => {
    expect(loadProfile()).toEqual(defaultProfile())
  })

  it('保存先のキーは vertigo_profile_v1', () => {
    saveProfile(defaultProfile())
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})
```

- [ ] **Step 6: テストを走らせて落ちることを確かめる**

Run: `npm test`
Expected: FAIL —「Failed to resolve import "./storage"」

- [ ] **Step 7: `src/profile/types.ts` を書く**

```ts
import type { Category } from '../data/types'
import type { EndingTier, ScoreResult } from '../game/scoring'

/** 職種。TKH-ER-Quiz と同じ8種に揃えてある */
export type RoleId =
  | 'pgy1'
  | 'pgy2'
  | 'senior'
  | 'er'
  | 'other_doctor'
  | 'nurse'
  | 'student'
  | 'other'

export type Rank = ScoreResult['rank']

/** 症例ごとの成績。プレイするたびに更新する */
export interface ClearRecord {
  /** A以上を最初に取った日時(ISO)。未クリアなら null。一度入ったら上書きしない */
  firstClearedAt: string | null
  bestRank: Rank
  bestScore: number
  plays: number
}

export interface HistoryEntry {
  ts: number
  caseId: number
  caseTitle: string
  category: Category
  rank: Rank
  score: number
  ending: EndingTier
  roleId: RoleId | ''
  /** 「しんさつかいし」から始めたなら true */
  fromRandom: boolean
}

export interface Profile {
  schemaVersion: 1
  roleId: RoleId | ''
  muted: boolean
  howtoAcknowledged: boolean
  clears: Record<number, ClearRecord>
  /** 新しい順。HISTORY_LIMIT 件を超えたら古いものから捨てる */
  history: HistoryEntry[]
}

/** 1症例を解き終えた結果。Profile への記録とテレメトリ送信の入力になる */
export interface PlayResult {
  caseId: number
  caseTitle: string
  category: Category
  rank: Rank
  score: number
  ending: EndingTier
  fromRandom: boolean
}
```

- [ ] **Step 8: `src/profile/roles.ts` を書く**

```ts
import type { RoleId } from './types'

/** 表示順。TKH-ER-Quiz の職種と一対一に対応させてある */
export const ROLES: readonly { id: RoleId; name: string }[] = [
  { id: 'pgy1', name: 'PGY1' },
  { id: 'pgy2', name: 'PGY2' },
  { id: 'senior', name: '専攻医' },
  { id: 'er', name: '救急専門医' },
  { id: 'other_doctor', name: '他科医師' },
  { id: 'nurse', name: '看護師' },
  { id: 'student', name: '医学生' },
  { id: 'other', name: 'その他' },
]

const ROLE_IDS = new Set<string>(ROLES.map((r) => r.id))

export function isRoleId(v: unknown): v is RoleId {
  return typeof v === 'string' && ROLE_IDS.has(v)
}

export function roleName(id: RoleId | ''): string {
  return ROLES.find((r) => r.id === id)?.name ?? '未選択'
}
```

- [ ] **Step 9: `src/profile/storage.ts` を書く**

```ts
import type { Category } from '../data/types'
import { isRoleId } from './roles'
import type { ClearRecord, HistoryEntry, PlayResult, Profile, Rank } from './types'

export const STORAGE_KEY = 'vertigo_profile_v1'
export const SCHEMA_VERSION = 1
export const HISTORY_LIMIT = 50

export function defaultProfile(): Profile {
  return {
    schemaVersion: SCHEMA_VERSION,
    roleId: '',
    muted: false,
    howtoAcknowledged: false,
    clears: {},
    history: [],
  }
}

/**
 * 保存データの読み取り。
 * 壊れていても投げない。記録が消えるのは残念だが、
 * 記録のせいでゲームが起動しないほうが困る。
 */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return defaultProfile()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaultProfile()
  }
  if (typeof parsed !== 'object' || parsed === null) return defaultProfile()

  const o = parsed as Record<string, unknown>
  if (o.schemaVersion !== SCHEMA_VERSION) return defaultProfile()

  return {
    schemaVersion: SCHEMA_VERSION,
    roleId: isRoleId(o.roleId) ? o.roleId : '',
    muted: o.muted === true,
    howtoAcknowledged: o.howtoAcknowledged === true,
    clears:
      typeof o.clears === 'object' && o.clears !== null && !Array.isArray(o.clears)
        ? (o.clears as Record<number, ClearRecord>)
        : {},
    history: Array.isArray(o.history) ? (o.history as HistoryEntry[]) : [],
  }
}

export function loadProfile(): Profile {
  try {
    return parseProfile(localStorage.getItem(STORAGE_KEY))
  } catch {
    // プライベートブラウズなどで localStorage 自体が触れないことがある
    return defaultProfile()
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // 保存できなくても遊べるので黙って諦める
  }
}

/** クリアの条件はランク A 以上（85点以上） */
export function isCleared(rank: Rank): boolean {
  return rank === 'S' || rank === 'A'
}

/**
 * `clears` は Record<number, ClearRecord> なので、tsconfig に
 * noUncheckedIndexedAccess が無い以上、素の添字アクセスは
 * 「必ず存在する」型になってしまう。未記録を扱えるようここで型を付け直す。
 */
export function clearOf(p: Profile, caseId: number): ClearRecord | undefined {
  return p.clears[caseId] as ClearRecord | undefined
}

/**
 * 1症例分の結果を Profile に畳み込む（純関数）。
 * `now` は epoch ms。テストしやすいように引数で受ける。
 */
export function recordResult(p: Profile, r: PlayResult, now: number): Profile {
  const prev = clearOf(p, r.caseId)
  const clearedNow = isCleared(r.rank) ? new Date(now).toISOString() : null

  const record: ClearRecord =
    prev === undefined
      ? { firstClearedAt: clearedNow, bestRank: r.rank, bestScore: r.score, plays: 1 }
      : {
          // 一度入った初クリア日時は上書きしない
          firstClearedAt: prev.firstClearedAt ?? clearedNow,
          // 更新はスコアを厳密に上回ったときだけ。同点では最初の記録を残す
          bestRank: r.score > prev.bestScore ? r.rank : prev.bestRank,
          bestScore: r.score > prev.bestScore ? r.score : prev.bestScore,
          plays: prev.plays + 1,
        }

  const entry: HistoryEntry = {
    ts: now,
    caseId: r.caseId,
    caseTitle: r.caseTitle,
    category: r.category,
    rank: r.rank,
    score: r.score,
    ending: r.ending,
    roleId: p.roleId,
    fromRandom: r.fromRandom,
  }

  return {
    ...p,
    clears: { ...p.clears, [r.caseId]: record },
    history: [entry, ...p.history].slice(0, HISTORY_LIMIT),
  }
}

export function clearedSummary(p: Profile): { cleared: number; starred: number } {
  const records = Object.values(p.clears)
  return {
    cleared: records.filter((c) => c.firstClearedAt !== null).length,
    starred: records.filter((c) => c.bestRank === 'S').length,
  }
}

export function filterHistory(
  history: HistoryEntry[],
  category: Category | 'all',
): HistoryEntry[] {
  return category === 'all' ? history : history.filter((h) => h.category === category)
}
```

- [ ] **Step 10: テストが通ることを確かめる**

Run: `npm test`
Expected: PASS（`storage.test.ts` の全ケース）

- [ ] **Step 11: 型検査を通す**

Run: `npm run typecheck`
Expected: エラーなし

- [ ] **Step 12: コミット**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json src/profile
git commit -m "feat: add persisted profile layer with vitest"
```

---

## Task 2: オープニングの3メニューと画面分割

**Files:**
- Modify: `src/game/state.ts`
- Test: `src/game/state.test.ts`
- Modify: `src/data/cases/index.ts`
- Test: `src/data/cases/index.test.ts`
- Create: `src/screens/Title.tsx`
- Create: `src/screens/CaseSelect.tsx`
- Create: `src/screens/Brief.tsx`
- Create: `src/screens/BppvLearn.tsx`
- Delete: `src/screens/Opening.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1 の何も使わない（Profile の配線は Task 3 以降）
- Produces:
  - `Phase` に `'learn'` を追加
  - `GameState` に `fromRandom: boolean` を追加
  - `Action` の `START_CASE` を `{ type: 'START_CASE'; caseId: number; fromRandom: boolean }` に変更
  - `function caseTitle(c: CaseDef): string`（`src/data/cases/index.ts`）
  - `function TitleScreen({ dispatch }: { dispatch: (a: Action) => void })`
  - `function CaseSelectScreen({ dispatch }: { dispatch: (a: Action) => void })`
  - `function BriefScreen({ caseDef, dispatch }: { caseDef: CaseDef; dispatch: (a: Action) => void })`
  - `function BppvLearnScreen({ dispatch }: { dispatch: (a: Action) => void })`

- [ ] **Step 1: 失敗するテストを書く（reducer）**

`src/game/state.test.ts` を作る。

```ts
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './state'

describe('reducer', () => {
  it('START_CASE は fromRandom を保持する', () => {
    const s = reducer(initialState, { type: 'START_CASE', caseId: 3, fromRandom: true })
    expect(s.phase).toBe('brief')
    expect(s.caseId).toBe(3)
    expect(s.fromRandom).toBe(true)
  })

  it('START_CASE は前の症例の記録を持ち越さない', () => {
    const dirty = {
      ...initialState,
      performed: ['ex_ataxia'],
      diagnosisAnswer: 'BPPV',
      fromRandom: true,
    }
    const s = reducer(dirty, { type: 'START_CASE', caseId: 1, fromRandom: false })
    expect(s.performed).toEqual([])
    expect(s.diagnosisAnswer).toBeNull()
    expect(s.fromRandom).toBe(false)
  })

  it("GOTO で learn へ行ける", () => {
    expect(reducer(initialState, { type: 'GOTO', phase: 'learn' }).phase).toBe('learn')
  })
})
```

- [ ] **Step 2: 失敗するテストを書く（caseTitle）**

`src/data/cases/index.test.ts` を作る。

```ts
import { describe, expect, it } from 'vitest'
import { CASES, CASE_MAP, caseTitle } from './index'

describe('caseTitle', () => {
  it('患側のある診断は全角スペースで左右を付ける', () => {
    const c = { ...CASES[0], diagnosis: { correct: '後半規管型BPPV', side: 'R' as const } }
    expect(caseTitle(c)).toBe('後半規管型BPPV　右')
  })

  it('患側が null の診断は診断名だけ', () => {
    const c = { ...CASES[0], diagnosis: { correct: '前庭性片頭痛', side: null } }
    expect(caseTitle(c)).toBe('前庭性片頭痛')
  })

  it('全症例で空文字にならない', () => {
    for (const c of CASES) expect(caseTitle(c).length).toBeGreaterThan(0)
  })

  it('CASE_MAP は全症例を引ける', () => {
    for (const c of CASES) expect(CASE_MAP.get(c.id)).toBe(c)
  })
})
```

- [ ] **Step 3: テストを走らせて落ちることを確かめる**

Run: `npm test`
Expected: FAIL — `START_CASE` に `fromRandom` が無い型エラーと、`caseTitle` が export されていないエラー

- [ ] **Step 4: `src/game/state.ts` を変更する**

`Phase` の定義を置き換える。

```ts
export type Phase =
  | 'title'
  | 'select'
  | 'learn'
  | 'brief'
  | 'exam'
  | 'diagnosis'
  | 'disposition'
  | 'result'
```

`GameState` の `caseId` の直後に1フィールド追加する。

```ts
  /** 「しんさつかいし」から始めたか。履歴と送信データに残す */
  fromRandom: boolean
```

`initialState` の `caseId: null,` の直後に追加する。

```ts
  fromRandom: false,
```

`Action` の `START_CASE` を置き換える。

```ts
  | { type: 'START_CASE'; caseId: number; fromRandom: boolean }
```

`reducer` の `START_CASE` を置き換える。

```ts
    case 'START_CASE':
      return { ...initialState, phase: 'brief', caseId: action.caseId, fromRandom: action.fromRandom }
```

- [ ] **Step 5: `src/data/cases/index.ts` に `caseTitle` を足す**

ファイル末尾に追加する。

```ts
/**
 * 一覧・履歴・送信データで使う症例の表示名。
 * 症例選択画面の従来の表記に揃えてあるので、`CaseDef.title` ではなく
 * 診断名＋患側を使う。
 */
export function caseTitle(c: CaseDef): string {
  const side = c.diagnosis.side === 'R' ? '　右' : c.diagnosis.side === 'L' ? '　左' : ''
  return `${c.diagnosis.correct}${side}`
}
```

- [ ] **Step 6: テストが通ることを確かめる**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: `src/screens/Title.tsx` を作る**

```tsx
import { CASES } from '../data/cases'
import { Button, MenuItem, Win } from '../components/ui'
import { unlockAudio } from '../audio/sfx'
import type { Action } from '../game/state'

export function TitleScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const startRandom = () => {
    const c = CASES[Math.floor(Math.random() * CASES.length)]
    dispatch({ type: 'START_CASE', caseId: c.id, fromRandom: true })
  }

  return (
    <div className="stack grow scroll">
      <div className="title-hero">
        <h1>VERTIGO</h1>
        <div className="sub">めまい診療の書</div>
        <div className="ver">ver 0.2 — 研修医向け診断トレーニング</div>
      </div>
      <Win title="コマンド">
        <div className="menu">
          <MenuItem
            label="しんさつかいし"
            hint="ランダムな症例を診る"
            onSelect={() => {
              unlockAudio()
              startRandom()
            }}
          />
          <MenuItem
            label="しょうれいえらぶ"
            hint="疾患別に選んで診る"
            onSelect={() => {
              unlockAudio()
              dispatch({ type: 'GOTO', phase: 'select' })
            }}
          />
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
      <Win title="このゲームについて">
        <p className="msg small dim" style={{ margin: 0 }}>
          あなたは救急外来の当直医です。搬送されてきためまい患者を、自分でコマンドを選んで診察し、診断・治療・方針を決めてください。
          {'\n'}やらなかった診察の情報は最後まで得られません。不要な検査は減点されます。
        </p>
      </Win>
      <div className="grow" />
      <Button onClick={startRandom}>すぐにはじめる</Button>
    </div>
  )
}
```

- [ ] **Step 8: `src/screens/CaseSelect.tsx` を作る**

「ランダム」と「連続チャレンジ」の項目は落とす。前者はタイトルの「しんさつかいし」に昇格し、後者は作る予定がない。

```tsx
import { CASES, CATEGORY_LABELS, caseTitle } from '../data/cases'
import { Button, MenuItem, Win } from '../components/ui'
import type { Action } from '../game/state'

export function CaseSelectScreen({ dispatch }: { dispatch: (a: Action) => void }) {
  const start = (id: number) => dispatch({ type: 'START_CASE', caseId: id, fromRandom: false })

  // カテゴリごとに全症例を並べる。ラベルは最終診断で選ぶ名前と揃える
  const groups = (['bppv', 'peripheral', 'other', 'central'] as const).map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    cases: CASES.filter((c) => c.category === cat),
  }))

  return (
    <div className="stack grow scroll">
      {groups.map((g) => (
        <Win key={g.cat} title={g.label}>
          <div className="menu">
            {g.cases.map((c) => (
              <MenuItem
                key={c.id}
                label={caseTitle(c)}
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
```

- [ ] **Step 9: `src/screens/Brief.tsx` を作る**

旧 `Opening.tsx` の `BriefScreen` をそのまま移す。中身は変えない。
「もどる」は従来どおり症例選択へ行く。ランダム開始から来た場合も、
一覧に降りるのは自然な戻り先なので分けない。

```tsx
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
```

- [ ] **Step 10: `src/screens/BppvLearn.tsx` を作る**

A段階では入口だけ。中身は B段階の別計画で実装する。

```tsx
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
```

- [ ] **Step 11: `src/screens/Opening.tsx` を消す**

```bash
git rm src/screens/Opening.tsx
```

- [ ] **Step 12: `src/App.tsx` の import と分岐を差し替える**

`import { BriefScreen, CaseSelectScreen, TitleScreen } from './screens/Opening'` の1行を、次の4行で置き換える。

```tsx
import { TitleScreen } from './screens/Title'
import { CaseSelectScreen } from './screens/CaseSelect'
import { BriefScreen } from './screens/Brief'
import { BppvLearnScreen } from './screens/BppvLearn'
```

`const caseDef = ...` から関数の末尾までを、次で丸ごと置き換える。
（Task 3 でここをもう一度組み替えるので、ここでは分岐が通ることだけを見る。）

```tsx
  const caseDef = state.caseId !== null ? CASE_MAP.get(state.caseId) : undefined

  if (state.phase === 'select') {
    return (
      <div className="app">
        <CaseSelectScreen dispatch={dispatch} />
      </div>
    )
  }

  if (state.phase === 'learn') {
    return (
      <div className="app">
        <BppvLearnScreen dispatch={dispatch} />
      </div>
    )
  }

  // 症例が解決できない場合もタイトルに戻す（データ不整合の保険）
  if (state.phase === 'title' || !caseDef) {
    return (
      <div className="app">
        <TitleScreen dispatch={dispatch} />
      </div>
    )
  }

  return (
    <div className="app">
      {state.phase === 'brief' && <BriefScreen caseDef={caseDef} dispatch={dispatch} />}
      {state.phase === 'exam' && <ExamScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
      {state.phase === 'diagnosis' && <DiagnosisScreen state={state} dispatch={dispatch} />}
      {state.phase === 'disposition' && <DispositionScreen state={state} dispatch={dispatch} />}
      {state.phase === 'result' && <ResultScreen caseDef={caseDef} state={state} dispatch={dispatch} />}
    </div>
  )
```

- [ ] **Step 13: テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 14: ブラウザで確かめる**

`.claude/launch.json` の dev サーバを起動し、次を確認する。

1. タイトルに「しんさつかいし／しょうれいえらぶ／BPPVがくしゅう」の3項目が出る
2. しんさつかいし → いきなり症例導入が始まる
3. しょうれいえらぶ → カテゴリ別の一覧が出て、「ランダム」「連続チャレンジ」が消えている
4. BPPVがくしゅう → 準備中の画面が出て、「タイトルへ」で戻れる

- [ ] **Step 15: コミット**

```bash
git add -A src/App.tsx src/screens src/game/state.ts src/game/state.test.ts src/data/cases
git commit -m "feat: restructure opening into three entry points"
```

---

## Task 3: Profile Context・ヘッダー・overlay・つかいかた

**Files:**
- Create: `src/profile/ProfileContext.tsx`
- Create: `src/components/AppHeader.tsx`
- Test: `src/components/AppHeader.test.tsx`
- Create: `src/screens/Howto.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Task 1 の `Profile` / `loadProfile` / `saveProfile`
- Produces:
  - `function ProfileProvider({ children }: { children: ReactNode })`
  - `function useProfile(): { profile: Profile; update: (fn: (p: Profile) => Profile) => void }`
  - `type Overlay = 'howto' | 'clears' | 'history' | 'role' | null`（`src/components/AppHeader.tsx` から export）
  - `function AppHeader({ onOpen }: { onOpen: (o: Overlay) => void })`
  - `function HowtoScreen({ onClose }: { onClose: () => void })`

- [ ] **Step 1: `src/profile/ProfileContext.tsx` を書く**

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { loadProfile, saveProfile } from './storage'
import type { Profile } from './types'

interface ProfileApi {
  profile: Profile
  /** 現在の Profile から次の Profile を作る。保存も行う */
  update: (fn: (p: Profile) => Profile) => void
}

const ProfileCtx = createContext<ProfileApi | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(loadProfile)

  const update = useCallback((fn: (p: Profile) => Profile) => {
    setProfile((prev) => {
      const next = fn(prev)
      saveProfile(next)
      return next
    })
  }, [])

  const api = useMemo(() => ({ profile, update }), [profile, update])
  return <ProfileCtx.Provider value={api}>{children}</ProfileCtx.Provider>
}

export function useProfile(): ProfileApi {
  const api = useContext(ProfileCtx)
  if (!api) throw new Error('useProfile must be used inside <ProfileProvider>')
  return api
}
```

- [ ] **Step 2: 失敗するテストを書く**

`src/components/AppHeader.test.tsx` を作る。

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppHeader } from './AppHeader'
import { ProfileProvider } from '../profile/ProfileContext'
import { loadProfile, STORAGE_KEY } from '../profile/storage'

function renderHeader(onOpen = vi.fn()) {
  render(
    <ProfileProvider>
      <AppHeader onOpen={onOpen} />
    </ProfileProvider>,
  )
  return onOpen
}

describe('AppHeader', () => {
  beforeEach(() => localStorage.clear())

  it('4つのボタンを出す', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'つかいかた' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'きろく' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'りれき' })).toBeDefined()
    expect(screen.getByRole('button', { name: '♪ON' })).toBeDefined()
  })

  it('ボタンを押すと overlay を要求する', () => {
    const onOpen = renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'つかいかた' }))
    expect(onOpen).toHaveBeenCalledWith('howto')
    fireEvent.click(screen.getByRole('button', { name: 'きろく' }))
    expect(onOpen).toHaveBeenCalledWith('clears')
    fireEvent.click(screen.getByRole('button', { name: 'りれき' }))
    expect(onOpen).toHaveBeenCalledWith('history')
  })

  it('♪ を押すと表示が反転し、localStorage に残る', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: '♪ON' }))
    expect(screen.getByRole('button', { name: '♪OFF' })).toBeDefined()
    expect(loadProfile().muted).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('♪ は overlay を開かない', () => {
    const onOpen = renderHeader()
    fireEvent.click(screen.getByRole('button', { name: '♪ON' }))
    expect(onOpen).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: テストを走らせて落ちることを確かめる**

Run: `npm test src/components/AppHeader.test.tsx`
Expected: FAIL —「Failed to resolve import "./AppHeader"」

- [ ] **Step 4: `src/components/AppHeader.tsx` を書く**

音のミュートは Task 8 で BGM と効果音に実際につなぐ。ここでは Profile の値を切り替えて表示に反映するところまで。

`Overlay` はここで定義する。`App.tsx` に置くと `App → AppHeader → App` の
循環参照になり、テストで AppHeader だけを描画したいときにも App 一式を引き込んでしまう。

```tsx
import { useProfile } from '../profile/ProfileContext'

/** ヘッダーから開ける画面。null は overlay を出していない状態 */
export type Overlay = 'howto' | 'clears' | 'history' | 'role' | null

/**
 * 全画面に常駐する細いユーティリティ行。
 * overlay は GameState に触れないので、診察の途中で開いて閉じても進行は失われない。
 * ♪ は診察中にも押したくなるため、タイトル専用にせず常駐させる。
 */
export function AppHeader({ onOpen }: { onOpen: (o: Overlay) => void }) {
  const { profile, update } = useProfile()

  return (
    <div className="apphdr">
      <button type="button" className="apphdr-btn" onClick={() => onOpen('howto')}>
        つかいかた
      </button>
      <button type="button" className="apphdr-btn" onClick={() => onOpen('clears')}>
        きろく
      </button>
      <button type="button" className="apphdr-btn" onClick={() => onOpen('history')}>
        りれき
      </button>
      <button
        type="button"
        className="apphdr-btn apphdr-btn--sound"
        aria-pressed={profile.muted}
        onClick={() => update((p) => ({ ...p, muted: !p.muted }))}
      >
        {profile.muted ? '♪OFF' : '♪ON'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: テストが通ることを確かめる**

Run: `npm test src/components/AppHeader.test.tsx`
Expected: PASS

- [ ] **Step 6: `src/screens/Howto.tsx` を書く**

```tsx
import { Button, Win } from '../components/ui'

export function HowtoScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="stack grow scroll">
      <Win title="このゲームの目的">
        <p className="msg small" style={{ margin: 0 }}>
          救急外来でめまい患者を診るときの手順を身につけるためのゲームです。
          {'\n'}めまいは「どの検査をしたか」ではなく「何を診たか」で診断が決まります。
          自分でコマンドを選び、診察の順番ごと組み立てる練習をしてください。
        </p>
      </Win>
      <Win title="あそびかた">
        <p className="msg small" style={{ margin: 0 }}>
          1　コマンドを選んで問診・眼の診察・身体診察を行う
          {'\n'}2　「みたてる」で前庭症候の分類と鑑別を答える
          {'\n'}3　必要なら画像検査、適応があれば耳石置換法を行う
          {'\n'}4　診断名と患側を決める
          {'\n'}5　帰宅・入院・専門科コンサルトなど方針を決める
        </p>
      </Win>
      <Win title="てんすうのつきかた">
        <p className="msg small" style={{ margin: 0 }}>
          やらなかった診察の情報は最後まで得られません。
          {'\n'}不要な検査と、禁忌にあたる方針は減点されます。
          {'\n'}起立・歩行の評価は指鼻試験より感度が高い診察です。省くと減点されます。
        </p>
      </Win>
      <Win title="ランクとクリア">
        <p className="msg small" style={{ margin: 0 }}>
          S　95点以上
          {'\n'}A　85点以上
          {'\n'}B　70点以上
          {'\n'}C　50点以上
          {'\n'}D　50点未満
          {'\n'}
          {'\n'}A以上でその症例はクリアです。Sを取ると一覧に ☆ が付きます。
          成績は「きろく」、遊んだ記録は「りれき」で見られます。
        </p>
      </Win>
      <Win title="しょくしゅ と おくられるデータ">
        <p className="msg small" style={{ margin: 0 }}>
          学習状況を集計するため、症例を解き終えるたびに
          <span className="accent">職種と成績</span>を送信します。
          {'\n'}氏名・端末の情報・メールアドレスなど、
          <span className="accent">個人を特定する情報は一切送りません</span>。
          {'\n'}送信に失敗してもゲームは止まりません。
        </p>
      </Win>
      <Win title="こうしんりれき">
        <p className="msg small dim" style={{ margin: 0 }}>
          ver 0.2　オープニングを3つの入口に整理。使い方・クリア記録・履歴・職種・BGMを追加。
          {'\n'}ver 0.1　12症例の診断トレーニングを公開。
        </p>
      </Win>
      <div className="grow" />
      <Button variant="primary" onClick={onClose}>
        とじる
      </Button>
    </div>
  )
}
```

- [ ] **Step 7: `src/main.tsx` に Provider を挿す**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ProfileProvider } from './profile/ProfileContext'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfileProvider>
      <App />
    </ProfileProvider>
  </StrictMode>,
)
```

- [ ] **Step 8: `src/App.tsx` に overlay とヘッダーを組み込む**

`App` の本体を組み替える。プロトタイプの早期 return はそのまま残し、その下を次の形にする。

```tsx
  const [state, dispatch] = useReducer(reducer, initialState)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const caseDef = state.caseId !== null ? CASE_MAP.get(state.caseId) : undefined

  const close = () => setOverlay(null)

  const screen = () => {
    if (state.phase === 'select') return <CaseSelectScreen dispatch={dispatch} />
    if (state.phase === 'learn') return <BppvLearnScreen dispatch={dispatch} />
    // 症例が解決できない場合もタイトルに戻す（データ不整合の保険）
    if (state.phase === 'title' || !caseDef) return <TitleScreen dispatch={dispatch} />
    if (state.phase === 'brief') return <BriefScreen caseDef={caseDef} dispatch={dispatch} />
    if (state.phase === 'exam') return <ExamScreen caseDef={caseDef} state={state} dispatch={dispatch} />
    if (state.phase === 'diagnosis') return <DiagnosisScreen state={state} dispatch={dispatch} />
    if (state.phase === 'disposition') return <DispositionScreen state={state} dispatch={dispatch} />
    return <ResultScreen caseDef={caseDef} state={state} dispatch={dispatch} />
  }

  return (
    <div className="app">
      <AppHeader onOpen={setOverlay} />
      {overlay === 'howto' ? <HowtoScreen onClose={close} /> : screen()}
    </div>
  )
```

必要な import を足す。

```tsx
import { lazy, Suspense, useReducer, useState } from 'react'
import { AppHeader, type Overlay } from './components/AppHeader'
import { HowtoScreen } from './screens/Howto'
```

`clears` / `history` / `role` は Task 4〜6 で分岐に足す。この時点では `setOverlay('clears')` を押しても何も起きないが、型は通る。

- [ ] **Step 9: `src/styles/global.css` にヘッダーのスタイルを足す**

ファイル末尾に追加する。

```css
/* ── 上部ユーティリティ行 ───────────────────────────── */
.apphdr {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 0 0 auto;
}

.apphdr-btn {
  flex: 1 1 0;
  padding: 5px 4px;
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: var(--dim);
  border: 1px solid var(--dim);
  border-radius: 3px;
  background: var(--navy);
  white-space: nowrap;
}

.apphdr-btn:active {
  color: var(--navy-deep);
  background: var(--accent);
  border-color: var(--accent);
}

.apphdr-btn--sound {
  flex: 0 0 auto;
  min-width: 56px;
  text-align: center;
}

.apphdr-btn--sound[aria-pressed='true'] {
  color: var(--navy-deep);
  background: var(--dim);
  border-color: var(--dim);
}
```

- [ ] **Step 10: テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 11: ブラウザで確かめる**

1. どの画面でも上部に4つのボタンが出る
2. 「つかいかた」で使い方が開き、「とじる」で元の画面に戻る
3. 診察の途中で「つかいかた」を開いて閉じても、実施済みのコマンドが消えていない
4. 「♪ON」を押すと「♪OFF」になり、再読み込みしても「♪OFF」のまま

- [ ] **Step 12: コミット**

```bash
git add src/profile/ProfileContext.tsx src/components/AppHeader.tsx src/components/AppHeader.test.tsx src/screens/Howto.tsx src/App.tsx src/main.tsx src/styles/global.css
git commit -m "feat: add profile context, header and how-to screen"
```

---

## Task 4: 職種の選択とゲート

**Files:**
- Create: `src/profile/useRoleGate.ts`
- Test: `src/profile/useRoleGate.test.ts`
- Create: `src/screens/RolePick.tsx`
- Modify: `src/screens/Title.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Task 1 の `ROLES` / `roleName` / `RoleId`、Task 3 の `useProfile` と `Overlay`
- Produces:
  - `function useRoleGate(roleId: RoleId | '', openRolePick: () => void): { guard: (run: () => void) => void; resume: () => void; cancel: () => void }`
  - `function RolePickScreen({ onDone, onCancel }: { onDone: () => void; onCancel: () => void })`
  - `TitleScreen` の props が `{ dispatch, roleId, onChangeRole, guard }` になる

- [ ] **Step 1: 失敗するテストを書く**

`src/profile/useRoleGate.test.ts` を作る。

```ts
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRoleGate } from './useRoleGate'

describe('useRoleGate', () => {
  it('職種が選ばれていれば、その場で実行する', () => {
    const open = vi.fn()
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('pgy1', open))

    act(() => result.current.guard(run))

    expect(run).toHaveBeenCalledTimes(1)
    expect(open).not.toHaveBeenCalled()
  })

  it('職種が未選択なら実行せず、職種選択を開く', () => {
    const open = vi.fn()
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', open))

    act(() => result.current.guard(run))

    expect(run).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('resume で保留していた操作を続行する', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', vi.fn()))

    act(() => result.current.guard(run))
    act(() => result.current.resume())

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('resume は一度きり。二度目は何も起こさない', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', vi.fn()))

    act(() => result.current.guard(run))
    act(() => result.current.resume())
    act(() => result.current.resume())

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('cancel すると保留は捨てられる', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', vi.fn()))

    act(() => result.current.guard(run))
    act(() => result.current.cancel())
    act(() => result.current.resume())

    expect(run).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストを走らせて落ちることを確かめる**

Run: `npm test src/profile/useRoleGate.test.ts`
Expected: FAIL —「Failed to resolve import "./useRoleGate"」

- [ ] **Step 3: `src/profile/useRoleGate.ts` を書く**

```ts
import { useCallback, useRef } from 'react'
import type { RoleId } from './types'

/**
 * 職種が未選択のまま診察を始めようとしたら、職種選択へ誘導する。
 * 選択が終わったら保留していた操作をそのまま続行する。
 * ボタンをもう一度押させるのは、学習者にとって意味のない一手間なので避ける。
 */
export function useRoleGate(roleId: RoleId | '', openRolePick: () => void) {
  const pending = useRef<(() => void) | null>(null)

  const guard = useCallback(
    (run: () => void) => {
      if (roleId) {
        run()
        return
      }
      pending.current = run
      openRolePick()
    },
    [roleId, openRolePick],
  )

  const resume = useCallback(() => {
    const run = pending.current
    pending.current = null
    run?.()
  }, [])

  const cancel = useCallback(() => {
    pending.current = null
  }, [])

  return { guard, resume, cancel }
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test src/profile/useRoleGate.test.ts`
Expected: PASS

- [ ] **Step 5: `src/screens/RolePick.tsx` を書く**

```tsx
import { Button, MenuItem, Win } from '../components/ui'
import { useProfile } from '../profile/ProfileContext'
import { ROLES } from '../profile/roles'

export function RolePickScreen({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { profile, update } = useProfile()

  const pick = (id: (typeof ROLES)[number]['id']) => {
    update((p) => ({ ...p, roleId: id }))
    onDone()
  }

  return (
    <div className="stack grow scroll">
      <Win title="しょくしゅをえらぶ">
        <p className="msg small dim" style={{ margin: '0 0 8px' }}>
          学習状況の集計に使います。個人を特定する情報は送りません。
        </p>
        <div className="menu">
          {ROLES.map((r) => (
            <MenuItem
              key={r.id}
              label={r.name}
              checked={profile.roleId === r.id}
              onSelect={() => pick(r.id)}
            />
          ))}
        </div>
      </Win>
      <div className="grow" />
      <Button onClick={onCancel}>やめる</Button>
    </div>
  )
}
```

- [ ] **Step 6: `src/screens/Title.tsx` に職種チップとゲートを組み込む**

props と本体を差し替える。ファイル全体を次で置き換える。

```tsx
import { CASES } from '../data/cases'
import { Button, MenuItem, Win } from '../components/ui'
import { unlockAudio } from '../audio/sfx'
import { roleName } from '../profile/roles'
import type { RoleId } from '../profile/types'
import type { Action } from '../game/state'

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
        <h1>VERTIGO</h1>
        <div className="sub">めまい診療の書</div>
        <div className="ver">ver 0.2 — 研修医向け診断トレーニング</div>
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
        <span className="rolechip-label">しょくしゅ</span>
        <span className="rolechip-value">{roleName(roleId)}</span>
        <span className="rolechip-action">▸ かえる</span>
      </button>
      <Win title="このゲームについて">
        <p className="msg small dim" style={{ margin: 0 }}>
          あなたは救急外来の当直医です。搬送されてきためまい患者を、自分でコマンドを選んで診察し、診断・治療・方針を決めてください。
          {'\n'}やらなかった診察の情報は最後まで得られません。不要な検査は減点されます。
        </p>
      </Win>
      <div className="grow" />
      <Button onClick={() => guard(startRandom)}>すぐにはじめる</Button>
    </div>
  )
}
```

- [ ] **Step 7: `src/App.tsx` にゲートと職種 overlay をつなぐ**

import を足す。

```tsx
import { RolePickScreen } from './screens/RolePick'
import { useProfile } from './profile/ProfileContext'
import { useRoleGate } from './profile/useRoleGate'
```

`const [overlay, setOverlay] = useState<Overlay>(null)` の下に足す。

```tsx
  const { profile } = useProfile()
  const openRolePick = useCallback(() => setOverlay('role'), [])
  const { guard, resume, cancel } = useRoleGate(profile.roleId, openRolePick)
```

`useCallback` を React の import に足す。

`screen()` の中の `TitleScreen` の行を差し替える。

```tsx
    if (state.phase === 'title' || !caseDef)
      return (
        <TitleScreen
          dispatch={dispatch}
          roleId={profile.roleId}
          onChangeRole={() => setOverlay('role')}
          guard={guard}
        />
      )
```

`CaseSelectScreen` も職種ゲートの内側に入れる。しょうれいえらぶはタイトルの `guard` で守られているが、症例を選ぶところで職種を変えてから始める経路もあるので、`start` は素通しでよい。ここでは変更しない。

overlay の分岐を差し替える。

```tsx
      {overlay === 'howto' ? (
        <HowtoScreen onClose={close} />
      ) : overlay === 'role' ? (
        <RolePickScreen
          onDone={() => {
            setOverlay(null)
            resume()
          }}
          onCancel={() => {
            setOverlay(null)
            cancel()
          }}
        />
      ) : (
        screen()
      )}
```

- [ ] **Step 8: `src/styles/global.css` に職種チップのスタイルを足す**

ファイル末尾に追加する。

```css
/* ── 職種チップ ─────────────────────────────────── */
.rolechip {
  display: flex;
  gap: 8px;
  align-items: baseline;
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px dashed var(--dim);
  border-radius: 3px;
  background: transparent;
}

.rolechip-label {
  color: var(--dim);
  font-size: 12px;
}

.rolechip-value {
  color: var(--accent);
  flex: 1 1 auto;
  text-align: left;
}

.rolechip-action {
  color: var(--dim);
  font-size: 12px;
}
```

- [ ] **Step 9: テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 10: ブラウザで確かめる**

1. localStorage を消した状態で「しんさつかいし」を押すと職種選択が開く
2. 職種を選ぶと**そのまま症例が始まる**（もう一度押さなくてよい）
3. 職種選択で「やめる」を押すとタイトルに戻り、症例は始まらない
4. タイトルの職種チップに選んだ職種が出て、押すと選び直せる
5. 職種未選択でも「BPPVがくしゅう」と「つかいかた」は開ける

- [ ] **Step 11: コミット**

```bash
git add src/profile/useRoleGate.ts src/profile/useRoleGate.test.ts src/screens/RolePick.tsx src/screens/Title.tsx src/App.tsx src/styles/global.css
git commit -m "feat: add role selection with a gate that resumes the pending action"
```

---

## Task 5: 結果の記録とクリア記録画面

**Files:**
- Create: `src/profile/useRecordResult.ts`
- Test: `src/profile/useRecordResult.test.tsx`
- Create: `src/screens/Clears.tsx`
- Modify: `src/screens/Result.tsx`
- Modify: `src/screens/CaseSelect.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Task 1 の `recordResult` / `clearedSummary` / `PlayResult`、Task 2 の `caseTitle`、Task 3 の `useProfile`
- Produces:
  - `function useRecordResult(result: PlayResult | null): void`
  - `function ClearsScreen({ onClose }: { onClose: () => void })`

- [ ] **Step 1: 失敗するテストを書く**

`src/profile/useRecordResult.test.tsx` を作る（JSX を含むので拡張子は `.tsx`）。StrictMode で effect が二重に走っても記録が1回であることを確かめるのがこのテストの主眼。

```tsx
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ProfileProvider, useProfile } from './ProfileContext'
import { useRecordResult } from './useRecordResult'
import { clearOf, loadProfile } from './storage'
import type { PlayResult } from './types'

const play: PlayResult = {
  caseId: 1,
  caseTitle: '後半規管型BPPV　右',
  category: 'bppv',
  rank: 'A',
  score: 88,
  ending: 'best',
  fromRandom: false,
}

function Probe({ result }: { result: PlayResult | null }) {
  useRecordResult(result)
  const { profile } = useProfile()
  return <span data-testid="plays">{clearOf(profile, 1)?.plays ?? 0}</span>
}

describe('useRecordResult', () => {
  beforeEach(() => localStorage.clear())

  it('StrictMode で effect が二重に走っても1回しか記録しない', () => {
    const { getByTestId } = render(
      <StrictMode>
        <ProfileProvider>
          <Probe result={play} />
        </ProfileProvider>
      </StrictMode>,
    )
    expect(getByTestId('plays').textContent).toBe('1')
    expect(clearOf(loadProfile(), 1)?.plays).toBe(1)
    expect(loadProfile().history).toHaveLength(1)
  })

  it('再レンダーしても増えない', () => {
    const { getByTestId, rerender } = render(
      <ProfileProvider>
        <Probe result={play} />
      </ProfileProvider>,
    )
    rerender(
      <ProfileProvider>
        <Probe result={play} />
      </ProfileProvider>,
    )
    expect(getByTestId('plays').textContent).toBe('1')
  })

  it('result が null のあいだは何も記録しない', () => {
    render(
      <ProfileProvider>
        <Probe result={null} />
      </ProfileProvider>,
    )
    expect(loadProfile().history).toHaveLength(0)
  })
})
```

- [ ] **Step 2: テストを走らせて落ちることを確かめる**

Run: `npm test src/profile/useRecordResult.test.tsx`
Expected: FAIL —「Failed to resolve import "./useRecordResult"」

- [ ] **Step 3: `src/profile/useRecordResult.ts` を書く**

```ts
import { useEffect, useRef } from 'react'
import { useProfile } from './ProfileContext'
import { recordResult } from './storage'
import type { PlayResult } from './types'

/**
 * 1症例分の結果を Profile に1回だけ書く。
 * React 19 の StrictMode は effect を二重に走らせるので、ref で番をする。
 * `result` が null のあいだは何もしない。
 */
export function useRecordResult(result: PlayResult | null): void {
  const { update } = useProfile()
  const done = useRef(false)

  useEffect(() => {
    if (!result || done.current) return
    done.current = true
    update((p) => recordResult(p, result, Date.now()))
  }, [result, update])
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test src/profile/useRecordResult.test.tsx`
Expected: PASS

- [ ] **Step 5: `src/screens/Result.tsx` から記録を呼ぶ**

既存の1行目 `import { useEffect, useState } from 'react'` を次で置き換える。

```tsx
import { useEffect, useMemo, useState } from 'react'
```

そのうえで、import 群の末尾に3行足す。

```tsx
import { caseTitle } from '../data/cases'
import { useRecordResult } from '../profile/useRecordResult'
import type { PlayResult } from '../profile/types'
```

`const [step, setStep] = useState<Step>(...)` の下に足す。

```tsx
  // 記録はスコア画面に到達した時点で確定する。
  // それ以前は null を渡して useRecordResult を黙らせておく。
  const play: PlayResult | null = useMemo(
    () =>
      step === 'score' || step === 'review'
        ? {
            caseId: caseDef.id,
            caseTitle: caseTitle(caseDef),
            category: caseDef.category,
            rank: result.rank,
            score: result.total,
            ending: result.ending,
            fromRandom: state.fromRandom,
          }
        : null,
    [step, caseDef, result.rank, result.total, result.ending, state.fromRandom],
  )
  useRecordResult(play)
```

- [ ] **Step 6: `src/screens/Clears.tsx` を書く**

```tsx
import { useState } from 'react'
import { CASES, CATEGORY_LABELS, caseTitle } from '../data/cases'
import type { Category } from '../data/types'
import { Button, Win } from '../components/ui'
import { useProfile } from '../profile/ProfileContext'
import { clearedSummary, clearOf } from '../profile/storage'

const CATS: Category[] = ['bppv', 'peripheral', 'other', 'central']

function formatDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function ClearsScreen({ onClose }: { onClose: () => void }) {
  const { profile, update } = useProfile()
  const [cat, setCat] = useState<Category>('bppv')
  const summary = clearedSummary(profile)

  const reset = () => {
    if (!window.confirm('クリア記録をすべて消します。よろしいですか。')) return
    update((p) => ({ ...p, clears: {} }))
  }

  return (
    <div className="stack grow scroll">
      <Win title="クリアきろく">
        <div className="msg">
          {CASES.length}症例中　<span className="accent">{summary.cleared}</span> クリア
          （☆ <span className="accent">{summary.starred}</span>）
        </div>
        <p className="small dim" style={{ margin: '4px 0 0' }}>
          ランクA以上でクリア。Sを取ると ☆ が付きます。
        </p>
      </Win>

      <div className="tabrow">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={`tabrow-btn${cat === c ? ' is-on' : ''}`}
            onClick={() => setCat(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <Win title={CATEGORY_LABELS[cat]}>
        <div className="reclist">
          {CASES.filter((c) => c.category === cat).map((c) => {
            const rec = clearOf(profile, c.id)
            const mark = rec?.bestRank === 'S' ? '☆' : rec?.firstClearedAt ? '✔' : '—'
            return (
              <div className="recrow" key={c.id}>
                <span className={`recmark${rec?.firstClearedAt ? ' is-clear' : ''}`}>{mark}</span>
                <span className="recname">{caseTitle(c)}</span>
                <span className="recmeta">
                  {rec ? `${rec.bestRank}　${rec.bestScore}点　${rec.plays}回` : '未プレイ'}
                </span>
                {rec?.firstClearedAt && (
                  <span className="recdate dim">初クリア {formatDate(rec.firstClearedAt)}</span>
                )}
              </div>
            )
          })}
        </div>
      </Win>

      <div className="grow" />
      <div className="row">
        <Button variant="danger" onClick={reset}>
          きろくを全削除
        </Button>
        <Button variant="primary" onClick={onClose}>
          とじる
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: `src/screens/CaseSelect.tsx` にクリア表示を足す**

import 群の末尾に2行足す。

```tsx
import { useProfile } from '../profile/ProfileContext'
import { clearOf } from '../profile/storage'
```

`export function CaseSelectScreen` の中、`const start = ...` の上に足す。

```tsx
  const { profile } = useProfile()
```

`MenuItem` の呼び出しを差し替える。

```tsx
              <MenuItem
                key={c.id}
                label={caseTitle(c)}
                hint={`${c.age}${c.gender}`}
                note={
                  clearOf(profile, c.id)?.bestRank === 'S'
                    ? '☆'
                    : clearOf(profile, c.id)?.firstClearedAt
                      ? '✔'
                      : undefined
                }
                onSelect={() => start(c.id)}
              />
```

- [ ] **Step 8: `src/App.tsx` に clears overlay をつなぐ**

import を足す。

```tsx
import { ClearsScreen } from './screens/Clears'
```

overlay の分岐に1本足す（`role` の分岐の前）。

```tsx
      ) : overlay === 'clears' ? (
        <ClearsScreen onClose={close} />
```

- [ ] **Step 9: `src/styles/global.css` にタブと記録一覧のスタイルを足す**

ファイル末尾に追加する。

```css
/* ── タブ行 ─────────────────────────────────────── */
.tabrow {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
  overflow-x: auto;
}

.tabrow-btn {
  flex: 1 1 auto;
  padding: 5px 8px;
  font-size: 12px;
  white-space: nowrap;
  color: var(--dim);
  border: 1px solid var(--dim);
  border-radius: 3px;
  background: var(--navy);
}

.tabrow-btn.is-on {
  color: var(--navy-deep);
  background: var(--accent);
  border-color: var(--accent);
}

/* ── クリア記録・履歴の一覧 ─────────────────────────── */
.reclist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recrow {
  display: grid;
  grid-template-columns: 1.6em 1fr auto;
  gap: 2px 8px;
  align-items: baseline;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(154, 164, 200, 0.25);
  font-size: 13px;
}

.recrow:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.recmark {
  color: var(--dim);
  text-align: center;
}

.recmark.is-clear {
  color: var(--accent);
}

.recname {
  min-width: 0;
}

.recmeta {
  color: var(--dim);
  font-size: 12px;
  white-space: nowrap;
}

.recdate {
  grid-column: 2 / -1;
  font-size: 11px;
}

.recempty {
  color: var(--dim);
  font-size: 13px;
  text-align: center;
  padding: 12px 0;
}
```

- [ ] **Step 10: テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 11: ブラウザで確かめる**

1. 症例を1件、結果画面のスコアまで進める
2. 「きろく」を開くと、その症例に成績が出ている（回数は 1）
3. 結果画面から「けっかをみる」に戻って再表示しても回数が増えない
4. A以上を取った症例に ✔ が付き、しょうれいえらぶの一覧にも ✔ が出る
5. 「きろくを全削除」で確認ダイアログが出て、OK すると消える

- [ ] **Step 12: コミット**

```bash
git add src/profile/useRecordResult.ts src/profile/useRecordResult.test.tsx src/screens/Clears.tsx src/screens/Result.tsx src/screens/CaseSelect.tsx src/App.tsx src/styles/global.css
git commit -m "feat: record play results and add the clear-record screen"
```

---

## Task 6: 履歴画面

**Files:**
- Create: `src/screens/History.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1 の `filterHistory` / `HistoryEntry` / `roleName`、Task 3 の `useProfile`
- Produces: `function HistoryScreen({ onClose }: { onClose: () => void })`

- [ ] **Step 1: `src/screens/History.tsx` を書く**

`filterHistory` は Task 1 でテスト済みなので、この画面には新しい純ロジックが無い。表示だけを組む。

```tsx
import { useState } from 'react'
import { CATEGORY_LABELS } from '../data/cases'
import type { Category } from '../data/types'
import { Button, Win } from '../components/ui'
import { useProfile } from '../profile/ProfileContext'
import { roleName } from '../profile/roles'
import { filterHistory, HISTORY_LIMIT } from '../profile/storage'

const TABS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'bppv', label: CATEGORY_LABELS.bppv },
  { id: 'peripheral', label: CATEGORY_LABELS.peripheral },
  { id: 'other', label: CATEGORY_LABELS.other },
  { id: 'central', label: CATEGORY_LABELS.central },
]

function formatStamp(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function HistoryScreen({ onClose }: { onClose: () => void }) {
  const { profile, update } = useProfile()
  const [tab, setTab] = useState<Category | 'all'>('all')
  const rows = filterHistory(profile.history, tab)

  const reset = () => {
    if (!window.confirm('履歴をすべて消します。よろしいですか。')) return
    update((p) => ({ ...p, history: [] }))
  }

  return (
    <div className="stack grow scroll">
      <Win title="りれき">
        <p className="small dim" style={{ margin: 0 }}>
          新しい順に最大{HISTORY_LIMIT}件まで残します。
        </p>
      </Win>

      <div className="tabrow">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabrow-btn${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Win>
        {rows.length === 0 ? (
          <div className="recempty">まだ記録がありません。</div>
        ) : (
          <div className="reclist">
            {rows.map((h) => (
              <div className="recrow" key={`${h.ts}-${h.caseId}`}>
                <span className="recmark is-clear">{h.rank}</span>
                <span className="recname">{h.caseTitle}</span>
                <span className="recmeta">{h.score}点</span>
                <span className="recdate dim">
                  {formatStamp(h.ts)}　{roleName(h.roleId)}
                  {h.fromRandom ? '　ランダム' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Win>

      <div className="grow" />
      <div className="row">
        <Button variant="danger" onClick={reset}>
          りれきを全削除
        </Button>
        <Button variant="primary" onClick={onClose}>
          とじる
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `src/App.tsx` に history overlay をつなぐ**

import を足す。

```tsx
import { HistoryScreen } from './screens/History'
```

overlay の分岐に1本足す（`role` の分岐の前）。

```tsx
      ) : overlay === 'history' ? (
        <HistoryScreen onClose={close} />
```

- [ ] **Step 3: テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 4: ブラウザで確かめる**

1. 記録が無い状態で「りれき」を開くと「まだ記録がありません。」が出る
2. 症例を2件解くと、新しいほうが上に並ぶ
3. カテゴリタブで絞り込める
4. 「りれきを全削除」で確認ダイアログが出て、OK すると空になる

- [ ] **Step 5: コミット**

```bash
git add src/screens/History.tsx src/App.tsx
git commit -m "feat: add the play history screen"
```

---

## Task 7: Google スプレッドシートへの送信

**Files:**
- Create: `public/app-config.json`
- Create: `src/telemetry/config.ts`
- Create: `src/telemetry/send.ts`
- Test: `src/telemetry/send.test.ts`
- Create: `integrations/google-sheets/Code.gs`
- Modify: `src/screens/Result.tsx`

**Interfaces:**
- Consumes: Task 1 の `PlayResult` / `RoleId` / `roleName`、Task 5 の記録タイミング
- Produces:
  - `function isValidGasUrl(url: string): boolean`
  - `function loadTelemetryUrl(): Promise<string>`
  - `interface TelemetryPayload`（下記 Step 5 の定義）
  - `function buildPayload(input: { play: PlayResult; roleId: RoleId | ''; maneuverPerfect: boolean | null; diagnosisCorrect: boolean; sideCorrect: boolean; completedAt: number; pageUrl: string }): TelemetryPayload`
  - `function sendResult(payload: TelemetryPayload): Promise<void>`

- [ ] **Step 1: `public/app-config.json` を作る**

URL は運用時にここへ入れる。空のあいだは送信しない。

```json
{
  "googleSheetsWebAppUrl": ""
}
```

- [ ] **Step 2: 失敗するテストを書く**

`src/telemetry/send.test.ts` を作る。

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPayload, isValidGasUrl, sendResult } from './send'
import { __setTelemetryUrlForTest } from './config'
import type { PlayResult } from '../profile/types'

const play: PlayResult = {
  caseId: 4,
  caseTitle: '水平半規管型BPPV　右',
  category: 'bppv',
  rank: 'S',
  score: 97,
  ending: 'best',
  fromRandom: true,
}

const GOOD_URL = 'https://script.google.com/macros/s/AKfycbwABC123/exec'

describe('isValidGasUrl', () => {
  it('Apps Script の exec URL を受け入れる', () => {
    expect(isValidGasUrl(GOOD_URL)).toBe(true)
  })

  it('空文字は受け付けない', () => {
    expect(isValidGasUrl('')).toBe(false)
  })

  it('別ホストは受け付けない', () => {
    expect(isValidGasUrl('https://example.com/collect')).toBe(false)
  })

  it('exec で終わらない URL は受け付けない', () => {
    expect(isValidGasUrl('https://script.google.com/macros/s/AKfycbwABC123/dev')).toBe(false)
  })
})

describe('buildPayload', () => {
  it('設計書の列をすべて埋める', () => {
    const p = buildPayload({
      play,
      roleId: 'pgy2',
      maneuverPerfect: true,
      diagnosisCorrect: true,
      sideCorrect: true,
      completedAt: 1_700_000_000_000,
      pageUrl: 'https://example.github.io/Vertigo/',
    })

    expect(p).toEqual({
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
  })

  it('職種未選択でも組み立てられる', () => {
    const p = buildPayload({
      play,
      roleId: '',
      maneuverPerfect: null,
      diagnosisCorrect: false,
      sideCorrect: false,
      completedAt: 1,
      pageUrl: 'x',
    })
    expect(p.roleId).toBe('')
    expect(p.roleName).toBe('未選択')
    expect(p.maneuverPerfect).toBeNull()
  })
})

describe('sendResult', () => {
  const payload = buildPayload({
    play,
    roleId: 'pgy1',
    maneuverPerfect: null,
    diagnosisCorrect: true,
    sideCorrect: true,
    completedAt: 1,
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
    await sendResult(payload)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('URL の形式が違えば送らない', async () => {
    __setTelemetryUrlForTest('https://example.com/collect')
    await sendResult(payload)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendBeacon が使えればそれで送る', async () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    __setTelemetryUrlForTest(GOOD_URL)

    await sendResult(payload)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe(GOOD_URL)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendBeacon が失敗したら fetch に落とす', async () => {
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) })
    __setTelemetryUrlForTest(GOOD_URL)

    await sendResult(payload)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(GOOD_URL)
  })

  it('送信が失敗しても投げない', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    __setTelemetryUrlForTest(GOOD_URL)

    await expect(sendResult(payload)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: テストを走らせて落ちることを確かめる**

Run: `npm test src/telemetry/send.test.ts`
Expected: FAIL —「Failed to resolve import "./send"」

- [ ] **Step 4: `src/telemetry/config.ts` を書く**

```ts
/**
 * 送信先の URL は public/app-config.json から実行時に読む。
 * ビルドに埋め込まないので、GitHub Pages 上で URL を差し替えるのに
 * 再ビルドが要らない。
 */
let cached: Promise<string> | null = null
let override: string | null = null

/** Apps Script の Web アプリ（/exec）だけを受け入れる */
export function isValidGasUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/.test(url)
}

export function loadTelemetryUrl(): Promise<string> {
  if (override !== null) return Promise.resolve(override)
  if (!cached) {
    cached = fetch(`${import.meta.env.BASE_URL}app-config.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        const url = (j as { googleSheetsWebAppUrl?: unknown } | null)?.googleSheetsWebAppUrl
        return typeof url === 'string' ? url.trim() : ''
      })
      .catch(() => '')
  }
  return cached
}

/** テスト専用。URL の解決を差し替える。null に戻すと通常の読み込みへ帰る */
export function __setTelemetryUrlForTest(url: string | null): void {
  override = url
  cached = null
}
```

- [ ] **Step 5: `src/telemetry/send.ts` を書く**

```ts
import { roleName } from '../profile/roles'
import type { PlayResult, RoleId } from '../profile/types'
import { isValidGasUrl, loadTelemetryUrl } from './config'

export { isValidGasUrl }

export const APP_VERSION = 'vertigo-v0.2'

/**
 * スプレッドシートに1行として積まれる内容。
 * 個人を特定する情報は含めない。送るのは職種と成績だけ。
 */
export interface TelemetryPayload {
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

/**
 * 送信は best-effort。失敗してもゲームを止めない。
 * 研修中の学習者にネットワークエラーを見せる意味がない。
 */
export async function sendResult(payload: TelemetryPayload): Promise<void> {
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
```

- [ ] **Step 6: テストが通ることを確かめる**

Run: `npm test src/telemetry/send.test.ts`
Expected: PASS

- [ ] **Step 7: `src/screens/Result.tsx` から送信を呼ぶ**

Task 5 で `import { useEffect, useMemo, useState } from 'react'` にした1行目を、さらに置き換える。

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
```

そのうえで、import 群の末尾に2行足す。

```tsx
import { useProfile } from '../profile/ProfileContext'
import { buildPayload, sendResult } from '../telemetry/send'
```

Task 5 で足した `useRecordResult(play)` の直後に足す。

```tsx
  // 送信も1回だけ。StrictMode の二重実行を ref で防ぐ
  const { profile } = useProfile()
  const sent = useRef(false)
  useEffect(() => {
    if (!play || sent.current) return
    sent.current = true
    void sendResult(
      buildPayload({
        play,
        roleId: profile.roleId,
        maneuverPerfect: state.maneuver?.perfect ?? null,
        diagnosisCorrect: result.diagnosisCorrect,
        sideCorrect: result.sideCorrect,
        completedAt: Date.now(),
        pageUrl: window.location.href,
      }),
    )
  }, [play, profile.roleId, state.maneuver, result.diagnosisCorrect, result.sideCorrect])
```

- [ ] **Step 8: `integrations/google-sheets/Code.gs` を書く**

```javascript
const SHEET_NAME = "vertigo_results";
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

function doGet() {
  const sheet = getResultSheet_();
  ensureHeaders_(sheet);
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
    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      const sheet = getResultSheet_();
      ensureHeaders_(sheet);
      sheet.appendRow(toResultRow_(payload));
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

function getResultSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Create this Apps Script from a Google Spreadsheet or set SPREADSHEET_ID.");
  }
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(HEADERS);
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

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
```

- [ ] **Step 9: セットアップ手順を書き添える**

`integrations/google-sheets/README.md` を作る。

```markdown
# Google スプレッドシートへの記録

1. 新しい Google スプレッドシートを作る。
2. 拡張機能 → Apps Script を開き、`Code.gs` の内容を貼り付けて保存する。
3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」。
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
4. 発行された `https://script.google.com/macros/s/<id>/exec` を
   `public/app-config.json` の `googleSheetsWebAppUrl` に入れる。
5. デプロイし直すと URL の `<id>` が変わることがある。変わったら 4 をやり直す。

`googleSheetsWebAppUrl` が空、または `/exec` で終わる Apps Script の URL でない場合、
アプリは何も送信しない。
```

- [ ] **Step 10: テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 11: ブラウザで確かめる**

`app-config.json` が空の状態で、症例を1件完走する。
DevTools の Network で `script.google.com` へのリクエストが**出ないこと**、
Console にエラーが**出ないこと**を確認する。

- [ ] **Step 12: コミット**

```bash
git add public/app-config.json src/telemetry src/screens/Result.tsx integrations/google-sheets
git commit -m "feat: send role-tagged results to a Google Sheets collector"
```

---

## Task 8: BGM エンジンと曲

**Files:**
- Create: `src/audio/context.ts`
- Create: `src/audio/tracks.ts`
- Create: `src/audio/music.ts`
- Test: `src/audio/music.test.ts`
- Modify: `src/audio/sfx.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `function getAudioContext(): AudioContext | null`
  - `function unlockAudio(): void`（`context.ts` が本体。`sfx.ts` は再エクスポート）
  - `function playNote(freq: number, dur: number, wave: OscillatorType, gain: number): void`
  - `type TrackId = 'opening' | 'exam'`
  - `const TRACKS: Record<TrackId, Track>`
  - `function startMusic(id: TrackId): void`
  - `function stopMusic(): void`
  - `function currentTrack(): TrackId | null`

- [ ] **Step 1: `src/audio/context.ts` を書く**

```ts
/**
 * AudioContext は効果音と BGM で1つを共有する。
 * iOS Safari は最初のユーザー操作まで suspended のままなので、
 * タイトルのタップで unlockAudio() を呼ぶ。
 */
let ctx: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

export function unlockAudio(): void {
  const c = getAudioContext()
  if (c && c.state === 'suspended') void c.resume()
}

/** 単音を今すぐ鳴らす。BGM の1ステップ分に使う */
export function playNote(freq: number, dur: number, wave: OscillatorType, gain: number): void {
  const c = getAudioContext()
  if (!c || freq <= 0) return
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, c.currentTime)
  amp.gain.setValueAtTime(0, c.currentTime)
  amp.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  osc.connect(amp).connect(c.destination)
  osc.start(c.currentTime)
  osc.stop(c.currentTime + dur + 0.02)
}
```

- [ ] **Step 2: `src/audio/sfx.ts` を context.ts に寄せる**

先頭のコメントと `ctx` / `getCtx` / `unlockAudio` を削り、`context.ts` を使う形にする。
ファイル冒頭を次で置き換える（`let enabled = true` から下の `tone` の直前まで）。

```ts
/**
 * 効果音。Web Audio API で合成するため音源ファイルは不要。
 * AudioContext は BGM と共有する（audio/context.ts）。
 */
import { getAudioContext, unlockAudio } from './context'

let enabled = true

export { unlockAudio }

export function setSoundEnabled(v: boolean): void {
  enabled = v
}

export function isSoundEnabled(): boolean {
  return enabled
}
```

`tone` と `play` の中の `getCtx()` を `getAudioContext()` に置き換える。

- [ ] **Step 3: `src/audio/tracks.ts` を書く**

```ts
/**
 * BGM の曲データ。音源ファイルは持たず Web Audio で合成する。
 * 0 は休符。melody / counter / bass は同じ長さの配列にする。
 * intervalMs が1ステップの長さ。
 */
export type TrackId = 'opening' | 'exam'

export interface Voice {
  notes: number[]
  wave: OscillatorType
  gain: number
  /** 音の長さ。intervalMs に対する倍率 */
  hold: number
}

export interface Track {
  intervalMs: number
  voices: Voice[]
}

export const TRACKS: Record<TrackId, Track> = {
  // オープニング — ハ長調・約76bpm。3声（旋律＋対旋律＋ベース）。ドラムなし。
  opening: {
    intervalMs: 200,
    voices: [
      {
        notes: [
          523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 494, 0, 523, 0, 0, 0,
          440, 0, 523, 0, 659, 0, 587, 0, 523, 0, 494, 0, 523, 0, 0, 0,
        ],
        wave: 'triangle',
        gain: 0.022,
        hold: 1.6,
      },
      {
        notes: [
          330, 0, 0, 0, 392, 0, 0, 0, 349, 0, 0, 0, 330, 0, 0, 0,
          262, 0, 0, 0, 330, 0, 0, 0, 349, 0, 0, 0, 330, 0, 0, 0,
        ],
        wave: 'triangle',
        gain: 0.011,
        hold: 3.2,
      },
      {
        notes: [
          131, 0, 0, 0, 165, 0, 0, 0, 147, 0, 0, 0, 98, 0, 0, 0,
          110, 0, 0, 0, 131, 0, 0, 0, 147, 0, 0, 0, 131, 0, 0, 0,
        ],
        wave: 'triangle',
        gain: 0.026,
        hold: 3.2,
      },
    ],
  },
  // 診察中 — イ短調・落ち着いた2声。考えごとの邪魔をしない音量にとどめる。
  exam: {
    intervalMs: 300,
    voices: [
      {
        notes: [440, 0, 0, 523, 0, 0, 494, 0, 440, 0, 0, 392, 0, 0, 440, 0],
        wave: 'triangle',
        gain: 0.013,
        hold: 2.4,
      },
      {
        notes: [110, 0, 0, 0, 131, 0, 0, 0, 98, 0, 0, 0, 110, 0, 0, 0],
        wave: 'triangle',
        gain: 0.018,
        hold: 3.6,
      },
    ],
  },
}
```

- [ ] **Step 4: 失敗するテストを書く**

`src/audio/music.test.ts` を作る。

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./context', () => ({
  getAudioContext: vi.fn(() => ({ state: 'running', resume: vi.fn() })),
  unlockAudio: vi.fn(),
  playNote: vi.fn(),
}))

import { playNote } from './context'
import { currentTrack, startMusic, stopMusic } from './music'

describe('music', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(playNote).mockClear()
  })

  afterEach(() => {
    stopMusic()
    vi.useRealTimers()
  })

  it('startMusic で鳴りはじめ、currentTrack が分かる', () => {
    startMusic('opening')
    expect(currentTrack()).toBe('opening')
    expect(playNote).toHaveBeenCalled()
  })

  it('stopMusic のあとは時間を進めても鳴らない', () => {
    startMusic('opening')
    stopMusic()
    vi.mocked(playNote).mockClear()

    vi.advanceTimersByTime(5000)

    expect(playNote).not.toHaveBeenCalled()
    expect(currentTrack()).toBeNull()
  })

  it('同じ曲を二度呼んでも鳴りはじめ直さない', () => {
    startMusic('opening')
    vi.mocked(playNote).mockClear()

    startMusic('opening')

    expect(playNote).not.toHaveBeenCalled()
    expect(currentTrack()).toBe('opening')
  })

  it('曲を切り替えると古いループは止まる', () => {
    startMusic('opening')
    startMusic('exam')
    expect(currentTrack()).toBe('exam')

    vi.mocked(playNote).mockClear()
    // exam は intervalMs 300。1000ms でおよそ3ステップぶん。
    // opening (200ms) が生きていれば、これより多く鳴ってしまう。
    vi.advanceTimersByTime(1000)

    const calls = vi.mocked(playNote).mock.calls.length
    // exam は2声。3〜4ステップ分で最大 8 回。opening が混ざれば超える。
    expect(calls).toBeLessThanOrEqual(8)
    expect(calls).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 5: テストを走らせて落ちることを確かめる**

Run: `npm test src/audio/music.test.ts`
Expected: FAIL —「Failed to resolve import "./music"」

- [ ] **Step 6: `src/audio/music.ts` を書く**

```ts
import { getAudioContext, playNote } from './context'
import { TRACKS, type TrackId } from './tracks'

/**
 * BGM のステップシーケンサ。
 *
 * setInterval を使う。requestAnimationFrame はタブが非表示のときに止まり、
 * バックグラウンドに回した瞬間に曲が固まってしまう。
 *
 * 停止・切替のたびに generation を進め、古いループのコールバックは
 * 自分の世代を見て黙って抜ける。setInterval の解除が間に合わなくても
 * 二重に鳴らない。
 */
let timerId = 0
let generation = 0
let step = 0
let playing: TrackId | null = null

export function currentTrack(): TrackId | null {
  return playing
}

export function stopMusic(): void {
  generation += 1
  if (timerId) {
    window.clearInterval(timerId)
    timerId = 0
  }
  step = 0
  playing = null
}

export function startMusic(id: TrackId): void {
  if (playing === id) return
  stopMusic()

  const c = getAudioContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const track = TRACKS[id]
  const mine = ++generation
  playing = id
  step = 0

  const tick = () => {
    if (mine !== generation) return
    for (const v of track.voices) {
      const freq = v.notes[step % v.notes.length]
      if (freq > 0) playNote(freq, (track.intervalMs / 1000) * v.hold, v.wave, v.gain)
    }
    step += 1
  }

  tick()
  timerId = window.setInterval(tick, track.intervalMs)
}
```

- [ ] **Step 7: テストが通ることを確かめる**

Run: `npm test src/audio/music.test.ts`
Expected: PASS

- [ ] **Step 8: 全テストと型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功（`sfx.ts` を触ったので既存の呼び出し元も確認される）

- [ ] **Step 9: コミット**

```bash
git add src/audio
git commit -m "feat: add a BGM step sequencer with opening and exam tracks"
```

---

## Task 9: BGM の配線とミュート、総合確認

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 8 の `startMusic` / `stopMusic`、Task 3 の `useProfile`、Task 3 の `Overlay`
- Produces: なし（最終配線）

- [ ] **Step 1: `src/App.tsx` に BGM の鳴らし分けを足す**

1行目の React import に `useEffect` を足す。

```tsx
import { lazy, Suspense, useCallback, useEffect, useReducer, useState } from 'react'
```

そのうえで、import 群の末尾に2行足す。

```tsx
import { startMusic, stopMusic } from './audio/music'
import { setSoundEnabled } from './audio/sfx'
```

`const { guard, resume, cancel } = useRoleGate(...)` の下に足す。

```tsx
  // ミュートは BGM と効果音の両方を止める
  useEffect(() => {
    setSoundEnabled(!profile.muted)
  }, [profile.muted])

  useEffect(() => {
    if (profile.muted) {
      stopMusic()
      return
    }
    // メニューを触っているあいだは診察が止まっているので opening に切り替える。
    // ただし結果画面の上で開いたときだけは、ファンファーレの直後に
    // 曲が始まると興を削ぐので停止したままにする。
    if (state.phase === 'result') {
      stopMusic()
      return
    }
    const menuish =
      overlay !== null || state.phase === 'title' || state.phase === 'select' || state.phase === 'learn'
    startMusic(menuish ? 'opening' : 'exam')
  }, [profile.muted, overlay, state.phase])
```

- [ ] **Step 2: 型検査とビルドを通す**

Run: `npm test && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 3: ブラウザで通し確認する**

dev サーバを起動し、`localStorage.clear()` してから次を順に確認する。

1. タイトルを最初にタップすると BGM が鳴りはじめる（自動再生は制限されるので、タップ前に鳴らなくてよい）
2. 「しんさつかいし」→ 職種選択が開く → 職種を選ぶとそのまま症例が始まり、曲が診察用に変わる
3. 診察中に「りれき」を開くと曲がオープニングに戻り、閉じると診察用に戻り、実施済みコマンドが消えていない
4. 結果のスコア画面でファンファーレが鳴り、そのあと BGM は鳴らない
5. 「きろく」にその症例の成績が載っている。回数は 1
6. 「りれき」に1件載り、職種が正しい
7. `♪OFF` にすると BGM も効果音も止まる。再読み込みしても OFF のまま
8. `♪ON` に戻すと曲が鳴りはじめる
9. しょうれいえらぶの一覧に、クリアした症例の ✔（または ☆）が出ている
10. BPPVがくしゅうが「準備中」で開き、タイトルへ戻れる

- [ ] **Step 4: スクリーンショットを撮る**

タイトル画面、クリア記録、履歴の3枚を撮り、ユーザーに見せる。

- [ ] **Step 5: コミット**

```bash
git add src/App.tsx
git commit -m "feat: wire background music and mute across screens"
```

---

## 積み残し（この計画では扱わない）

- BPPVがくしゅうの中身（B段階の別計画）
- ローカル Node バックエンドと管理画面（GAS のみとする決定による）
- 多言語対応
- 連続チャレンジモード
- サーバ側でのユーザー識別・ログイン
