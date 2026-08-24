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

ゲーム結果は `vertigo_results` シートに、BPPV学習画面でどの型を参照したかは
`bppv_learn_views` シートに、それぞれ自動で作成・記録される。
