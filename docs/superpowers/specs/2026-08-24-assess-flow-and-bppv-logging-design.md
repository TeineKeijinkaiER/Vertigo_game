# かんべつフロー簡略化・患側追加設問・BPPV学習の参照記録 設計書

日付: 2026-08-24

## 背景・目的

診察画面の「かんべつ」コマンドに、選ぶ意味のない中間メニューが挟まっている。また、かんべつの中で鑑別（GRACE-3の下位診断）を選んでも、患側（左右）を意識させる設問がなく、実臨床で重要な「型と患側」の対応づけを診察中に練習できない。あわせて、BPPV学習画面でどの型がよく参照されているかが分からないため、学習内容の利用状況を把握できるようにする。

3つの独立した変更を1つの設計書にまとめる。

## 変更1: 「かんべつ」を1タップで分類選択へ

### 現状

`ACTION_GROUPS` の `assess` グループには、コマンド `as_dx`（ラベル「めまいを分類する」）が1件だけ登録されている。診察画面でコマンド一覧から「かんべつ」を選ぶと、いったん `group` state が `'assess'` になり、1件だけのサブメニュー画面を経由してから `as_dx` を選び直す必要がある。

### 変更内容

[`src/screens/Exam.tsx`](../../../src/screens/Exam.tsx) のトップレベルコマンド一覧で、`g.id === 'assess'` のときだけ `setGroup(g.id)` の代わりに既存の `perform('as_dx')` を呼ぶ。`perform('as_dx')` は既に `setDxStep('type'); setModal('dx')` を実行するので、そのまま「かんべつ①　めまいを分類する」（AVS / s-EVS / t-EVS 選択）モーダルに直接入る。

`assess` グループが `group` state に設定されることがなくなるため、`ACTIONS.filter((a) => a.group === group)` 側の分岐は通らなくなるが、データ定義（`ACTION_GROUPS` の `assess` エントリ、`ACTIONS` の `as_dx`）自体は変更しない。

### 影響範囲

- UIのみ。採点・状態モデルへの影響なし。
- 既存のテストに `assess` グループのサブメニュー描画を前提にしたものがあれば要確認（現時点で該当テストは見当たらない）。

## 変更2: かんべつ②でBPPV／メニエール病／前庭神経炎なら患側も答えさせる

### 対象

「かんべつ②」（`SUBTYPES` からの鑑別選択）で、以下の鑑別IDを選んだときだけ患側設問を追加する。

- `sub_vn`（前庭神経炎）
- `sub_meniere`（メニエール病）
- `sub_pc_bppv`（後半規管BPPV）
- `sub_hc_geo`（水平半規管BPPV・向地性）
- `sub_hc_apo`（水平半規管BPPV・背地性）

対象外（患側を問わない）: `sub_stroke`, `sub_ssnhl`, `sub_vm`, `sub_tia`。

### データ・状態

- [`src/data/actions.ts`](../../../src/data/actions.ts) に `subtypeAsksSide(subtype: string | null): boolean` を追加。上記5IDの集合に含まれるかを判定する。既存の `asksSide`（最終診断用）と同じ形。
- [`src/game/state.ts`](../../../src/game/state.ts) の `GameState` に `subtypeSideAnswer: Side` を追加（初期値 `null`）。
- 新アクション `{ type: 'SET_SUBTYPE_SIDE'; value: Side }` を追加し、reducerで `subtypeSideAnswer` を更新する。
- `SET_SUBTYPE` アクションで、選び直した鑑別が患側不要なら `subtypeSideAnswer` を `null` に戻す（`SET_DIAGNOSIS` が `sideAnswer` を扱う既存ロジックと同じパターン）。
- `SET_VESTIBULAR`（GRACE-3分類のやり直し）では、既存どおり `subtypeAnswer` を `null` に戻すのに合わせて `subtypeSideAnswer` も `null` に戻す。
- 既存の最終診断用 `sideAnswer` / `SET_SIDE` とは完全に独立させ、互いに読み書きしない。

### UI

[`src/screens/Exam.tsx`](../../../src/screens/Exam.tsx) の「かんべつ②」画面（`dxStep === 'sub'`）で、`subtypeAsksSide(state.subtypeAnswer)` が真のときだけ「患側」の右／左メニューを追加表示する（[`src/screens/Decision.tsx`](../../../src/screens/Decision.tsx) の最終診断画面と同じ見た目）。「決定」ボタンは、患側が必要なのに未回答なら押せないようにする。

### 採点

[`src/game/scoring.ts`](../../../src/game/scoring.ts) に新しい採点行「鑑別の患側」を追加する。

- 表示条件: `subtypeAsksSide(c.subtype)`（症例の正解鑑別が対象疾患のときだけ。最終診断の患側行が `asksSide(c.diagnosis.correct)` で判定しているのと同じ考え方）。
- 正解条件: 鑑別（`subtypeAnswer === c.subtype`）と患側（`subtypeSideAnswer === c.diagnosis.side`）の両方が正しいときだけ満点。どちらか一方でも外れれば0点。
- 配点: 5点（既存の最終診断「患側」行と同じ）。`MAX` オブジェクトに `subtypeSide: 5` を追加。合計点は正規化（`/100`）されるため、他の項目の配点を調整する必要はない。

## 変更3: BPPV学習画面で型を選ぶたびにGoogleスプレッドシートへ参照記録

### 記録内容・タイミング

[`src/screens/BppvLearn.tsx`](../../../src/screens/BppvLearn.tsx) のコンボボックス `onChange` で選択IDが変わるたびに送信する。画面を開いた直後のデフォルト表示（`pc_r`）は、明示的な選択操作ではないので送信しない。

送るのは個人を特定しない情報のみ:

- 職種（`roleId` / `roleName`。[`useProfile`](../../../src/profile/ProfileContext.tsx) から取得）
- 選んだ型のID・ファミリー（後半規管／水平半規管・向地性／水平半規管・背地性）・患側・タイトル
- 参照日時（`viewedAt`）
- アプリバージョン・ページURL（既存のゲーム結果送信と同じ項目）

### 送信先とルーティング

新しいシート（タブ）`bppv_learn_views` を追加する。既存の `vertigo_results` とは別のシートにし、ゲーム結果の列構成に影響を与えない。

[`integrations/google-sheets/Code.gs`](../../../integrations/google-sheets/Code.gs) の `doPost` で、受信したペイロードの `kind` フィールドで振り分ける。

- `kind` が無い、または `'game_result'` → 既存の `vertigo_results` シートへ（後方互換）。
- `kind === 'bppv_learn_view'` → 新しい `bppv_learn_views` シートへ。ヘッダーは `receivedAt, viewedAt, roleId, roleName, lessonId, family, side, title, appVersion, pageUrl`。

### フロントエンド実装

[`src/telemetry/send.ts`](../../../src/telemetry/send.ts) に以下を追加する。

- `BppvLearnViewPayload` 型（`kind: 'bppv_learn_view'` を含む）
- `buildBppvLearnPayload(input)`：`BppvLesson` と `roleId` などから payload を組み立てる
- `sendBppvLearnView(payload)`：既存 `sendResult` と同じ best-effort 送信ロジック（`sendBeacon` 優先、失敗時 `fetch` にフォールバック、例外を投げない）を共有する内部関数から呼ぶ。既存の `sendResult` のシグネチャ・挙動（テスト済み）は変更しない。

`buildPayload` の既存 `TelemetryPayload` にも `kind: 'game_result'` を追加し、Code.gs 側のルーティングと対応させる。

### エラー処理

既存のテレメトリ送信方針を踏襲し、送信失敗はコンソール警告のみでゲーム・学習画面の操作をブロックしない。GAS URL が未設定・不正な形式のときは送信自体を行わない（既存の `isValidGasUrl` をそのまま利用）。

## テスト方針

- `src/game/state.test.ts`: `SET_SUBTYPE_SIDE` の状態更新、`SET_SUBTYPE`／`SET_VESTIBULAR` によるリセット挙動を追加。
- `src/telemetry/send.test.ts`: `buildBppvLearnPayload` の列組み立てと `sendBppvLearnView` の送信挙動（URL未設定・sendBeacon・fetchフォールバック）を、既存の `sendResult` のテストと同様に追加。
- `scoring.ts` に対する既存のユニットテストがあれば、「鑑別の患側」行の追加に合わせて期待値を更新する（現時点で `scoring.ts` 専用のテストファイルは無いため、必要なら新規追加を検討する）。
- 変更1（かんべつ1タップ化）はUI遷移のみのため、手動確認（開発サーバーでの動作確認）を基本とする。

## スコープ外

- 最終診断画面（[`Decision.tsx`](../../../src/screens/Decision.tsx)）の `sideAnswer` ロジックの変更は行わない。
- BPPV学習画面以外（ゲーム本編）のテレメトリ列構成は変更しない（`kind` 追加を除く）。
- Google スプレッドシート側のスプレッドシートID・共有設定など、運用面の変更はスコープ外（Code.gs の更新後、ユーザー側で再デプロイが必要）。
