# 2026-08-24 現在の引き継ぎメモ

このファイルは、次の担当者が現在の実装・直近の判断を短時間で把握するための入口です。利用者向けの変更一覧はリポジトリ直下の `CHANGELOG.md` を正とする。

## 直近の変更

| コミット | 内容 |
| --- | --- |
| `aa77036` | 診察中に常設ヘッダーから中断し、確認後にタイトルへ戻る機能を追加 |
| `cc414bf` | 本編・BPPV学習の頭位変換と眼振開始時刻を同期 |
| `b830dab` | BPPV学習の型選択をコンボボックス化し、画像説明を除去 |
| `0992f41` | 6パターンを扱うBPPV学習画面を追加 |

## 診察の中断

- 入口は `src/components/AppHeader.tsx` の `onAbortExam`。`state.phase === 'exam'` のときだけボタンを表示する。
- 確認画面と中断確定処理は `src/App.tsx`。確定時には `RESET` を dispatch するため、症例、診察ログ、回答、手技の途中状態はすべて破棄される。
- ヘッダーはモーダルの上でも常駐する。そのため、耳石置換法・起立歩行・鑑別・画像適応の途中でも中断できる。
- 意図しない中断を防ぐため、タイトルへ直行させず「診察をつづける」と「中断してタイトルへ」の確認を必ず出す。

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

## 確認コマンド

変更後は最低限、次を実行する。

```powershell
npm test
npm run typecheck
npm run build
```

テレメトリー送信テストは、意図的な通信失敗のログを標準エラーに出すが、テストが成功していれば問題ない。
