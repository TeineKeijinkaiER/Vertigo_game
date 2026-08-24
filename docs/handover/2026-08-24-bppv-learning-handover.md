# BPPV学習画面 引き継ぎ

## 完了した内容

`BPPVがくしゅう` は、次の6パターンを選んで確認できる画面になった。

| 型 | 右 | 左 |
| --- | --- | --- |
| 後半規管・半規管結石症 | `pc_r` | `pc_l` |
| 水平半規管・向地性（半規管結石症） | `hc_geo_r` | `hc_geo_l` |
| 水平半規管・背地性（クプラ結石） | `hc_apo_r` | `hc_apo_l` |

各パターンに、誘発試験のアニメーション、眼振アニメーション、耳石置換法のアニメーション、体位の静止画、手順と注意点を置いた。

## 実装の配置

- `src/data/bppvLessons.ts`
  - 6パターンの表示文言、眼振、動画、静止画、手順を定義する唯一の学習用データ。
  - `nystagmus` は対応する症例（`case01`、`case02`、`case03`、`case04`、`case05`、`case12`）から再利用している。本編との左右・向地性の不整合を避けるため、別の数値を複製しない。
- `src/screens/BppvLearn.tsx`
  - 型と患側の選択、各レッスンの描画を担う。
- `src/components/ManeuverFilm.tsx`
  - `public/poses/films/` の連続コマを再生する。
- `src/components/PoseImage.tsx`
  - `public/poses/` の静止画を表示する。

## アセット対応

| 学習内容 | 誘発試験 | 耳石置換法 |
| --- | --- | --- |
| 後半規管 右 / 左 | `dix_hallpike_r` / `dix_hallpike_l` | `epley_r` / `epley_l` |
| 水平向地性 右 / 左 | `headroll_r` と `headroll_l` | `gufoni_geo_r` / `gufoni_geo_l` |
| 水平背地性 右 / 左 | `headroll_r` と `headroll_l` | `gufoni_apo_r` / `gufoni_apo_l` |

動画IDを追加・変更する場合は、`src/data/poseFilms.json`、`ManeuverFilm.tsx` の `FilmId`、`scripts/verify_pose_films.py` を同時に更新する。

## 医学的な表示ルール

- 眼振の左右は患者から見た向きで書く。
- 水平半規管・向地性は、強い側が患側。
- 水平半規管・背地性（クプラ結石）は、弱い側が患側。
- 背地性眼振は中枢性疾患でも起こり得るため、注意文を残す。
- Gufoni向地性は健側へ倒して鼻を床へ、Gufoni–Appiani背地性は患側へ倒して鼻を天井へ向ける。

## 確認項目

1. 375px幅で、各型の選択・動画・眼振図・静止画がはみ出さないこと。
2. 6パターンすべてで、動画ファイルが欠けずに再生されること。
3. 本編の対応症例と、患側・眼振の強弱・手技の向きが一致すること。
4. 文言や医学的内容を変える場合は、対応する症例データとこの文書も同時に更新すること。
