# オープニング画面の刷新とアプリシェル ― 設計

作成日: 2026-08-24
対象バージョン: v0.2
参考実装: `C:\Users\shin0\Documents\GitHub\TKH-ER-Quiz`

---

## 1. 背景と目的

現在の Vertigo は、タイトル画面から症例を選んで1症例を解き、結果を見て終わる。
遊んだ記録はどこにも残らず、設定もなく、音は効果音だけで、利用状況を知る手立てもない。

今回、次の2つをまとめて解決する。

1. **入口の整理** — タイトルの入口を「しんさつかいし（ランダム）」「しょうれいえらぶ（疾患別）」
   「BPPVがくしゅう（解説）」の3本に整理し、遊び方が一目で分かるようにする。
2. **アプリシェルの整備** — 使い方・クリア記録・履歴・音のオン/オフ・職種の登録を持たせ、
   職種別の利用状況をバックヤード（Google スプレッドシート）で把握できるようにする。

この設計書が扱うのは上記のみ（以下「A段階」）。
**BPPVがくしゅうの中身は別の設計書（B段階）で扱う。** 本設計では入口だけを用意する。

### B段階の予定（本設計の対象外）

BPPV および末梢性眼振・耳石置換法の解説モード。
既存の画像・アニメーション資産（`src/data/poseImages.ts`、`src/data/poseFilms.json`、
`src/components/Nystagmus.tsx`、`src/components/ManeuverFilm.tsx`）を用いて、
BPPV の全パターン（後半規管 左右／水平半規管 向地性 左右／水平半規管 背地性（クプラ結石）左右）
について、誘発頭位・眼振の向き・耳石置換法の方向を解説する。

---

## 2. 決定事項の要約

| 項目 | 決定 |
|---|---|
| 進め方 | A段階（シェル）→ B段階（BPPVがくしゅう）の2段階 |
| バックヤード | Google Apps Script Web アプリのみ（Vertigo 専用シートを新設）。ローカル Node バックエンドは作らない |
| 職種の選択肢 | TKH-ER-Quiz と同じ8択をそのまま使う |
| クリア判定 | 症例ごとにランク A 以上（85点以上）。S は別途「☆」で表示 |
| BGM | オープニング系画面と診察中の2曲 |
| レイアウト | 上部に細いユーティリティ行（ハイブリッド案） |
| テスト | 純粋ロジックに vitest を導入。UI は typecheck + build + 実機確認 |

---

## 3. アーキテクチャ

### 3.1 状態を2層に分ける

`src/game/state.ts` の `GameState` は「1症例のプレイ」を表す使い捨ての状態である
（`START_CASE` で `initialState` に戻る）。
今回追加する職種・音設定・クリア記録・履歴は、症例をまたいで永続する性質のもので、
`GameState` に混ぜると reducer が肥大化し、どちらも読みにくくなる。層を分ける。

- **`GameState`**（既存 / `useReducer`）― 1症例のプレイ。変更は `Phase` への `'learn'` 追加のみ。
- **`Profile`**（新規 / localStorage 永続）― 職種・muted・クリア記録・履歴・使い方既読。

### 3.2 新規モジュール

各ファイルは単機能に保ち、単独で読めて単独でテストできる大きさにとどめる。

| ファイル | 責務 | 依存 |
|---|---|---|
| `src/profile/types.ts` | `Profile` / `ClearRecord` / `HistoryEntry` / `RoleId` の型 | `data/types`, `game/scoring` の型のみ |
| `src/profile/roles.ts` | 職種8択の定義（id ↔ 表示名） | なし |
| `src/profile/storage.ts` | localStorage の読み書き、既定値、破損時フォールバック、クリア判定と履歴追加の純関数 | `types`, `roles` |
| `src/profile/ProfileContext.tsx` | React Context と `useProfile()` | `storage` |
| `src/telemetry/config.ts` | `app-config.json` の実行時読み込み | なし |
| `src/telemetry/send.ts` | 送信ペイロードの組み立てと送出 | `config`, `profile/types` |
| `src/audio/context.ts` | `AudioContext` の生成と unlock。sfx と music で共有 | なし |
| `src/audio/music.ts` | ステップシーケンサ本体（開始・停止・多重防止） | `context`, `tracks` |
| `src/audio/tracks.ts` | 曲データ（`opening` / `exam`） | なし |
| `src/components/AppHeader.tsx` | 上部ユーティリティ行 | `ui`, `useProfile` |
| `src/screens/Title.tsx` | タイトル画面 | |
| `src/screens/CaseSelect.tsx` | 症例選択 | |
| `src/screens/Brief.tsx` | 症例導入（現 `Opening.tsx` から移設、内容は変えない） | |
| `src/screens/Howto.tsx` | 使い方 | |
| `src/screens/Clears.tsx` | クリア記録 | |
| `src/screens/History.tsx` | 履歴 | |
| `src/screens/RolePick.tsx` | 職種選択 | |
| `src/screens/BppvLearn.tsx` | BPPVがくしゅうの入口（A段階では「準備中」表示のみ） | |
| `integrations/google-sheets/Code.gs` | GAS 側の受け口 | |

`src/screens/Opening.tsx` は Title / CaseSelect / Brief に分割して削除する。

### 3.3 画面遷移

`つかいかた` / `きろく` / `りれき` / `しょくしゅ` は、どの画面からでも開けて、
閉じたら**元の画面に戻る**必要がある。
これらを `Phase` に足すと戻り先を全部覚える必要が出るため、phase とは独立した
オーバーレイとして `App` のローカル state に持つ。

```ts
type Overlay = 'howto' | 'clears' | 'history' | 'role' | null
```

`Phase` への追加は `'learn'` のみ（BPPVがくしゅうは戻り先がタイトル固定なので phase でよい）。

```
                      ┌──────────────────────────────┐
                      │ overlay: howto/clears/history/role │
                      │  （どの画面の上にも開き、閉じると元へ）  │
                      └──────────────────────────────┘
 title ─┬─ しんさつかいし ──▶ brief ─▶ exam ─▶ diagnosis ─▶ disposition ─▶ result ─┐
        ├─ しょうれいえらぶ ─▶ select ─▶ brief …                                  │
        └─ BPPVがくしゅう ──▶ learn ─▶ title                                      │
        ◀────────────────────────────────────────────────────────────┘
```

---

## 4. データモデル

localStorage キー: **`vertigo_profile_v1`**

```ts
export type RoleId =
  | 'pgy1' | 'pgy2' | 'senior' | 'er'
  | 'other_doctor' | 'nurse' | 'student' | 'other'

export type Rank = 'S' | 'A' | 'B' | 'C' | 'D'

/** 症例ごとの成績。プレイするたびに更新する */
export interface ClearRecord {
  /** A以上を最初に取った日時（ISO 8601）。未クリアなら null。一度入ったら上書きしない */
  firstClearedAt: string | null
  bestRank: Rank
  bestScore: number
  plays: number
}

export interface HistoryEntry {
  ts: number            // 完了時刻（epoch ms）
  caseId: number
  /**
   * 表示用の症例名。`CaseDef.diagnosis.correct` に患側（`diagnosis.side`）を
   * 「　右」「　左」として付けたもの。`CaseDef.title` ではない
   * （症例選択画面の既存の表記に揃える）
   */
  caseTitle: string
  category: Category    // 'bppv' | 'peripheral' | 'central' | 'other'
  rank: Rank
  score: number
  ending: EndingTier    // 'best' | 'good' | 'bad' | 'worst'
  roleId: RoleId | ''
  fromRandom: boolean   // 「しんさつかいし」由来なら true
}

export interface Profile {
  schemaVersion: 1
  roleId: RoleId | ''
  muted: boolean
  howtoAcknowledged: boolean
  /** caseId をキーにした症例ごとの成績 */
  clears: Record<number, ClearRecord>
  /** 新しい順。上限50件を超えたら古いものから捨てる */
  history: HistoryEntry[]
}
```

### 4.1 職種8択（TKH-ER-Quiz と同一）

| id | 表示名 |
|---|---|
| `pgy1` | PGY1 |
| `pgy2` | PGY2 |
| `senior` | 専攻医 |
| `er` | 救急専門医 |
| `other_doctor` | 他科医師 |
| `nurse` | 看護師 |
| `student` | 医学生 |
| `other` | その他 |

### 4.2 クリア判定

`ScoreResult.rank`（`src/game/scoring.ts`）をそのまま使う。
しきい値は既存のまま `S:95 / A:85 / B:70 / C:50 / D:それ未満`。

- その症例の `ClearRecord` が無ければ、**初回プレイ時にその回の結果で作る**
  （`bestRank` / `bestScore` はその回の値、`plays` は 1、クリアでなければ `firstClearedAt` は `null`）。
- **クリア** … `rank` が `'S'` または `'A'`。`firstClearedAt` が `null` のときだけ現在時刻を入れる。
- **☆** … `bestRank === 'S'`。
- `bestRank` と `bestScore` は**対で**更新する。更新するのは `score` が `bestScore` を
  **厳密に上回った**ときのみ（同点では更新しない。最初に到達した記録を残す）。
- `plays` は毎回 +1。
- 未クリアの症例も `ClearRecord` を持つ（`firstClearedAt` が `null`）。
  「クリアきろく」画面では `firstClearedAt !== null` の件数をクリア数として数える。

### 4.3 破損データの扱い

`JSON.parse` の失敗、`schemaVersion` の不一致、型が想定と違う値は、
**例外を投げずに既定の Profile へフォールバックする**。
記録が消えるのは残念だが、記録のせいでゲームが起動しないほうが困る。
`roleId` が既知の8種でなければ `''`（未選択）に落とす。

---

## 5. 職種の必須化

- `roleId` が空のまま **しんさつかいし** / **しょうれいえらぶ** を選ぶと職種選択へ誘導し、
  **選択が終わったら押した操作をそのまま続行する**（もう一度押させない）。
  実装は `RolePick` に `onPicked` コールバックを渡し、保留していた操作を呼ぶ。
- **BPPVがくしゅう** と **つかいかた** は職種未選択でも開ける。
  解説を読むだけの人を止める理由がない。
- タイトルの職種チップからいつでも変更できる。

---

## 6. バックヤード送信（Google Apps Script）

### 6.1 設定

`public/app-config.json`:

```json
{ "googleSheetsWebAppUrl": "" }
```

- **実行時に fetch** する。ビルドに埋め込まないので、URL の差し替えに再ビルドが要らない。
- 空文字なら送信しない（開発時・URL 未発行時の既定）。
- URL は `https://script.google.com/macros/s/<id>/exec` の形式を検証してから使う。
  形式が違えば送信せずコンソールに警告を出す。

### 6.2 送信のタイミングと信頼性

- 症例完了時（結果画面が `step === 'score'` に到達した時点）に**1回だけ**送る。
  React 19 の StrictMode による effect の二重実行に耐えるよう `useRef` でガードする。
- `navigator.sendBeacon` を第一手段とし、失敗したら `fetch(..., { mode: 'no-cors', keepalive: true })`。
- **送信の失敗はゲームを止めない。** `console.error` に出すだけで、画面には出さない。
  研修中の学習者にネットワークエラーを見せる意味がない。

### 6.3 ペイロード

| 列 | 由来 |
|---|---|
| `receivedAt` | GAS 側で付与 |
| `completedAt` | ISO 8601 |
| `roleId` / `roleName` | Profile |
| `caseId` / `caseTitle` / `category` | `CaseDef` |
| `rank` / `score` | `ScoreResult.rank` / `.total` |
| `endingTier` | `ScoreResult.ending` |
| `diagnosisCorrect` / `sideCorrect` | `ScoreResult` |
| `maneuverPerfect` | `GameState.maneuver?.perfect ?? null` |
| `fromRandom` | 「しんさつかいし」由来か |
| `appVersion` | `'vertigo-v0.2'` |
| `pageUrl` | `location.href` |

### 6.4 プライバシー

**個人を特定する情報は一切送らない。** 送るのは職種と成績のみ。
氏名・端末 ID・メールアドレスなどは収集しない。
この方針を「つかいかた」画面に明記する。

### 6.5 GAS スクリプト

`integrations/google-sheets/Code.gs` として同梱する。
TKH-ER-Quiz の同名ファイルを土台に、シート名を `vertigo_results`、
列を 6.3 の表に差し替えたもの。`doPost` は `LockService` で直列化し、
ヘッダー行が無ければ作る。

---

## 7. 音

### 7.1 AudioContext の共有

現在 `src/audio/sfx.ts` が `AudioContext` をモジュール内に private に持っている。
BGM も同じコンテキストで鳴らす必要があるため、`src/audio/context.ts` に切り出す。

```ts
export function getAudioContext(): AudioContext | null
export function unlockAudio(): void
```

`sfx.ts` は `unlockAudio` の再エクスポートを残し、既存の呼び出し元を壊さない。

### 7.2 シーケンサ

`setInterval` ベースで実装する。`requestAnimationFrame` はタブが非表示のときに止まり、
バックグラウンドに回した瞬間に曲が固まるため使わない（TKH-ER-Quiz と同じ判断）。

多重再生を防ぐため `generation` カウンタを持ち、
停止・再開のたびに増やして、古いループのコールバックは自分の世代を見て黙って抜ける。

```ts
export function startMusic(trackId: TrackId): void
export function stopMusic(): void
```

### 7.3 曲

`src/audio/tracks.ts` に2曲。いずれも Web Audio の合成のみで、音源ファイルは持たない。

- **`opening`** … 3声（旋律＋対旋律＋ベース）。穏やかでドラムなし。
- **`exam`** … 2声。控えめの音量。診察の思考を邪魔しない範囲にとどめる。

### 7.4 鳴らし分け

| 画面 | 曲 |
|---|---|
| `title` / `select` / `learn`、および overlay 表示中 | `opening` |
| `brief` / `exam` / `diagnosis` / `disposition` | `exam` |
| `result` | 停止（ファンファーレと重ならないように） |

overlay は「その下の画面」ではなく overlay 自身で判定する。
診察中に履歴を開いても曲は `exam` のままにはせず `opening` に切り替える
— メニューを触っている間は診察が止まっているため。
ただし `result` の上で overlay を開いたときだけは例外で、停止したままにする
（結果発表のファンファーレの直後に曲が始まると興を削ぐ）。

### 7.5 ミュート

`Profile.muted` 一本で BGM と効果音の両方を止める。
ヘッダーの `♪ON` / `♪OFF` で切り替え、切り替えは即座に永続化する。
`muted` が true になったら `stopMusic()` と `setSoundEnabled(false)` を呼ぶ。

### 7.6 自動再生制限

iOS Safari では最初のユーザー操作まで `AudioContext` が `suspended` のままになる。
既存の `unlockAudio()` を最初のタップで呼び、`resume()` が済んだあとに
オープニング曲を開始する。ミュート中なら開始しない。

---

## 8. 画面

### 8.1 タイトル

```
[つかいかた] [きろく] [りれき] [♪ON]
        V E R T I G O
        めまい診療の書
     ver 0.2 — 研修医向け診断トレーニング
┌ コマンド ────────────────────────┐
│ ▶ しんさつかいし    ランダムな症例を診る      │
│ ▶ しょうれいえらぶ  疾患別に選んで診る        │
│ ▶ BPPVがくしゅう    眼振と耳石置換法          │
└──────────────────────────────┘
  しょくしゅ： PGY1  ▸ かえる
┌ このゲームについて ──────────────────┐
│ （既存の説明文をそのまま残す）                 │
└──────────────────────────────┘
```

- **しんさつかいし** … `CASES` からランダムに1件選び `brief` へ直行する。
  `fromRandom: true` で記録する。
- **しょうれいえらぶ** … `select` へ。
- **BPPVがくしゅう** … `learn` へ。
- 現行の `せいせき（v0.3で実装）` / `せってい（v0.2で実装）` の disabled 項目は削除する。

### 8.2 上部ユーティリティ行（`AppHeader`）

全画面に常駐する細い行。`つかいかた` / `きろく` / `りれき` / `♪ON・♪OFF` の4つ。
`♪` は診察中にも押したくなるため、タイトル専用ではなく常駐させる。

overlay は `GameState` に触れないので、**診察の途中で開いて閉じても進行は失われない**。
職種チップはタイトル画面にのみ置く（診察中に職種を変えられると、
その回の記録がどちらの職種のものか曖昧になるため）。

### 8.3 しょうれいえらぶ

既存 `CaseSelectScreen` をベースに、カテゴリ別（BPPV / 末梢性 / その他 / 中枢性）。

- 各症例に到達状況を出す ― `☆`（S 済）／`✔`（A 以上でクリア済）／無印（未クリア）。
- 「ランダム」項目はタイトルの「しんさつかいし」に昇格したので**削除**する。
- 「連続チャレンジ（v0.3で実装）」の disabled 項目は**削除**する（YAGNI）。

### 8.4 つかいかた

静的テキスト。内容は次の5節。

1. このゲームの目的（救急外来でめまい患者を診る手順を身につける）
2. 遊び方（コマンドを選んで診察 → みたてる → 診断と患側 → 方針決定 → 結果）
3. 減点の仕組み（やらなかった診察の情報は最後まで得られない／不要な検査と禁忌の方針は減点）
4. ランクとクリアの条件（S:95 / A:85 / B:70 / C:50。**A 以上でクリア、S で ☆**）
5. 職種と送信データについて（**職種と成績のみを集計のために送信する。個人を特定する情報は送らない**）

末尾にアップデート履歴。

### 8.5 クリアきろく

- 上部に総括 ― 「12症例中 n クリア（☆ m）」。
- カテゴリ別タブ（BPPV / 末梢性 / その他 / 中枢性）。
- 症例ごとに `✔` or `☆`、最高ランク、最高点、初クリア日時、プレイ回数。
- 「クリア記録を全削除」ボタン。`window.confirm` で確認する。

### 8.6 りれき

- 新しい順に最大50件。1行に 日時／症例名／ランク／点／職種。
- カテゴリのフィルタタブ（すべて / BPPV / 末梢性 / その他 / 中枢性）。
- 「履歴を全削除」ボタン。`window.confirm` で確認する。
- 0件のときは「まだ記録がありません」を出す。

### 8.7 しょくしゅ

8択。既存 `MenuItem` の `checked` プロパティで選択状態を出せるので、
新しいコンポーネントは作らない。

### 8.8 BPPVがくしゅう（A段階では入口のみ）

「準備中です」と、B段階で扱う内容の予告（BPPV の全パターンの眼振と耳石置換法）、
そして「タイトルへ」ボタン。

---

## 9. 検証

このリポジトリにはテストランナーが無い（`playwright` は devDependency にあるが
`test` スクリプトは未定義）。純粋ロジックには **vitest** を導入する。

### 9.1 単体テスト（vitest）

| 対象 | 確かめること |
|---|---|
| `profile/storage.ts` | 既定値の生成／不正 JSON でフォールバック／`schemaVersion` 不一致でフォールバック／未知の `roleId` を `''` に落とす |
| クリア判定 | `S`/`A` でクリア、`B` 以下でクリアしない／`firstClearedAt` を上書きしない／`bestScore` は上回ったときだけ更新／同点では更新しない／`plays` の加算 |
| 履歴追加 | 新しい順に積む／51件目で最古が落ちる |
| `telemetry/send.ts` | ペイロードの組み立てが 6.3 の列と一致／URL 未設定なら送信しない／不正な URL 形式なら送信しない |
| `audio/music.ts` | `generation` により古いループが停止する（タイマーはフェイク） |

### 9.2 UI の確認

`npm run typecheck` と `npm run build` を通したうえで、dev サーバを起動して次を実機確認する。

1. タイトルの3メニューがそれぞれ正しい画面へ行くこと
2. 職種未選択で「しんさつかいし」→ 職種選択 → 選択後にそのまま症例が始まること
3. 症例を1件完走し、クリア記録と履歴に載ること
4. `♪OFF` で BGM と効果音の両方が止まり、再読み込み後も OFF のままであること
5. どの画面からでもヘッダーの4ボタンが開き、閉じると元の画面に戻ること

---

## 10. 既存コードへの影響

| ファイル | 変更 |
|---|---|
| `src/App.tsx` | Profile Context の設置、overlay の管理、BGM の鳴らし分け、画面の出し分け |
| `src/screens/Opening.tsx` | **削除**。Title / CaseSelect / Brief に分割 |
| `src/screens/Result.tsx` | `step === 'score'` 到達時に Profile への記録とテレメトリ送信を1回だけ行う |
| `src/audio/sfx.ts` | `AudioContext` を `context.ts` へ切り出し。`setSoundEnabled` を Profile と接続 |
| `src/game/state.ts` | `Phase` に `'learn'` を追加。それ以外は変更しない |
| `src/styles/global.css` | ヘッダー行、タブ行、記録一覧、職種チップのスタイルを追加 |
| `package.json` | `vitest` を devDependency に、`test` スクリプトを追加 |
| `public/app-config.json` | 新規 |
| `integrations/google-sheets/Code.gs` | 新規 |

`src/game/scoring.ts` は変更しない。`ScoreResult` が必要な値をすべて持っている。

---

## 11. やらないこと

- ローカル Node バックエンドと管理画面（GAS のみとする決定による）
- 多言語対応（TKH-ER-Quiz は日英対応だが、Vertigo は日本語のみ）
- 連続チャレンジモード
- サーバ側でのユーザー識別・ログイン
- BPPVがくしゅうの中身（B段階）
