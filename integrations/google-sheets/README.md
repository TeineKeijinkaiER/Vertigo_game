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

## 記録されるシート

- `vertigo_results` … ゲーム結果。1プレイが1行。
- `bppv_practice_opens` … BPPVれんしゅうの閲覧履歴。練習モードを開いた1回が1行で、
  型や患側は記録しない。

どちらも初回の送信時に自動で作成される。

時刻の列（`receivedAt` / `completedAt` / `openedAt`）はすべて日本時刻（JST）の
`YYYY-MM-DD HH:mm:ss` で入る。

新しいスプレッドシートに最初からある空の「シート1」（Sheet1）は、記録用シートを
作った時点で自動的に削除される。中身が入っていれば削除しない。スクリプトエディタから
`cleanupEmptyDefaultSheets` を実行して手で片づけることもできる。

以前の `bppv_learn_views` シート（型を選ぶたびに1行を積んでいた古い記録）は使わなくなった。
過去のデータが要らなければ、タブごと削除してよい。
