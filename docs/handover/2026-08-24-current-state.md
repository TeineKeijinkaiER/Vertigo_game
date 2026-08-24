# 2026-08-24 現在の引き継ぎメモ

このファイルは、次の担当者が現在の実装・直近の判断を短時間で把握するための入口です。利用者向けの変更一覧はリポジトリ直下の `CHANGELOG.md` を正とする。

## 直近の変更

| コミット | 内容 |
| --- | --- |
| `e3aa354` | BPPV学習画面の型選択をGoogleスプレッドシートへ記録 |
| `dab8e08` | テレメトリ送信を `kind` で振り分け、Code.gsに `bppv_learn_views` シートを追加 |
| `ed9ec56` | BPPV学習の参照ペイロード（`buildBppvLearnPayload`）をゲーム結果ペイロードと並行して追加 |
| `758cfa8` | 「かんべつ」を1タップ化し、BPPV3型・メニエール病・前庭神経炎で患側も質問するUIを追加 |
| `9f4b1a3` | かんべつ②の患側回答を「鑑別の患側」として採点に追加 |
| `f4491ca` | かんべつ②の患側回答を保持するstate/actionと `subtypeAsksSide()` を追加 |
| `aa77036` | 診察中に常設ヘッダーから中断し、確認後にタイトルへ戻る機能を追加 |
| `cc414bf` | 本編・BPPV学習の頭位変換と眼振開始時刻を同期 |
| `b830dab` | BPPV学習の型選択をコンボボックス化し、画像説明を除去 |
| `0992f41` | 6パターンを扱うBPPV学習画面を追加 |

## 診察の中断

- 入口は `src/components/AppHeader.tsx` の `onAbortExam`。`state.phase === 'exam'` のときだけボタンを表示する。
- 確認画面と中断確定処理は `src/App.tsx`。確定時には `RESET` を dispatch するため、症例、診察ログ、回答、手技の途中状態はすべて破棄される。
- ヘッダーはモーダルの上でも常駐する。そのため、耳石置換法・起立歩行・鑑別・画像適応の途中でも中断できる。
- 意図しない中断を防ぐため、タイトルへ直行させず「診察をつづける」と「中断してタイトルへ」の確認を必ず出す。

## 画像検査の画面遷移

- `src/screens/Exam.tsx` では、がぞうけんさコマンドを選ぶと未確認の場合に適応4項目の画面を直ちに開く。適応4項目を確定した後かつCT/MRI実施前は `showImagingCriteria` を真にする。この間の主表示は直前の診察ログではなく、選択済みの適応4項目になる。
- 画像を実施すると `im_ct` / `im_mri` が診察ログの末尾となり、通常の所見表示へ戻るため、主表示は検査結果になる。
- 失調Gradeの選択肢は `ataxia-grade-menu`（`src/styles/global.css`）でラベルを折り返さない。

## BPPVの動画と眼振の同期

- `src/components/ManeuverFilm.tsx` の `filmPoseReachedAfterMs(film)` は、最終コマの保持時間を除いた「最終観察体位に到達する時刻」を返す。
- `src/components/Nystagmus.tsx` の `startDelayMs` は、眼振の潜時を数え始める前の時間。表示開始は `startDelayMs + spec.latencySec`。
- 本編は `src/screens/Exam.tsx`、学習画面は `src/screens/BppvLearn.tsx` からこの値を渡す。通常の眼球診察には渡さない。
- 動画フレームの時間を変更した場合は `ManeuverFilm.test.ts` の期待値も確認する。

## BPPV学習

詳細は `docs/handover/2026-08-24-bppv-learning-handover.md` を参照する。

- 学習データの唯一の定義場所は `src/data/bppvLessons.ts`。
- 6パターン（後半規管左右、水平半規管の向地性左右、背地性左右）をネイティブの選択欄で切り替える。
- 向地性はGufoni法とLempert法を並べている。Gufoniの名称に患側を付けない。

## かんべつ②の患側設問とテレメトリのシート振り分け

- かんべつ②（`SUBTYPES` からの鑑別選択）でBPPV3型・メニエール病・前庭神経炎を選んだときだけ、患側の設問を追加する。対象判定は `subtypeAsksSide()`（`src/data/actions.ts`）。
- 回答は `GameState.subtypeSideAnswer` に保存し、`SET_SUBTYPE_SIDE` action（`src/game/state.ts`）で更新する。最終診断画面の `sideAnswer`／`SET_SIDE` とは完全に独立しており、互いに読み書きしない。かんべつ②で右を選んでも、最終診断では改めて患側を問われる。
- `src/game/scoring.ts` の「鑑別の患側」行は、鑑別（`subtypeAnswer`）と患側（`subtypeSideAnswer`）の両方が正しいときだけ5点満点になる。
- `integrations/google-sheets/Code.gs` の `doPost` は、受信ペイロードの `kind` フィールドで送り先シートを振り分ける（`kind` なし／`'game_result'` → `vertigo_results`、`'bppv_learn_view'` → `bppv_learn_views`）。**Code.gsは先にApps Scriptへ再デプロイしておくこと。** 旧いスクリプトのままフロントエンドだけ `kind` 付きペイロードを送るようになっても、旧スクリプトは `kind` を無視して従来どおり `vertigo_results` に書き込むため実害はないが、新しいシートへの記録は再デプロイまで始まらない。

## 確認コマンド

変更後は最低限、次を実行する。

```powershell
npm test
npm run typecheck
npm run build
```

テレメトリー送信テストは、意図的な通信失敗のログを標準エラーに出すが、テストが成功していれば問題ない。
