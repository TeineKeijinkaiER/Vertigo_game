# 体位静止画パイプライン（v8）：設計書

作成日: 2026-08-21
対象: 3Dリグから、ゲーム本体が使う体位静止画 27 種を書き出す仕組み

---

## 1. 背景と目的

v7 で 3D リグから GIF を書き出したが、ゲームに取り込めなかった。検証で判明した阻却要因は次の4つ。

1. **判読性** — 選択肢タイルの実表示幅は約 110px。768×512 のフレーム内で人物が小さく、110px では頭位が判別できない。
2. **形式不一致** — v7 GIF は不透明・768×512。ゲームUIは `#0d1440` の紺、既存体位画像は RGBA・480×470。
3. **ライブ埋め込み不可** — 自動再生 12 秒で JS heap +163MB。`renderPatient()` が毎フレーム約40個の Mesh を再生成し `dispose()` していない。
4. **カメラ手打ち** — ポーズごとにカメラ座標を手で設定しており、Dix–Hallpike / Epley / Supine Roll で肝心の頭部回旋が見えない画角になっていた。

本設計の目的は、GIF ではなく**アプリ組み込み用の透過静止画セット**を書き出し、`public/poses/` に置くことで、ゲーム本体の 27 種すべてのプレースホルダを解消することにある。ライブ埋め込み（阻却要因3）は本設計の対象外とする。

---

## 2. 現状

`src/data/poseImages.ts` の `POSE_IMAGES` は 27 種。うち実ファイルが存在するのは `headroll_*` の 5 枚のみで、残り 22 種は「イラスト準備中」のプレースホルダが表示されている。

`ManeuverRigPrototype.tsx` は 550 行で、リグ数学・three.js シーン構築・プロトタイプUIを1ファイルに抱えている。

---

## 3. Gufoni バグ修正

`sideLying()`（`ManeuverRigPrototype.tsx:143-155`）に2件の欠陥がある。ヘッドレスでポーズデータを検査して確定した。

### 3.1 頭部 180° 反転

```ts
headUp: nose === 'down' ? V(-direction, 0, 0) : V(direction, 0, 0)
```

`gufoni-g-down`（向地性の最終顔向き＝鼻を床へ）のみ `headUp · 体軸 = -1.00`、他の全ポーズは `+1.00`。頭頂が足側を向いている。側臥位で鼻を床へ回す動作は体軸まわりのロールであり、頭頂の向きは変わらない。

**修正:** `'down'` の特例分岐を削除し、常に `V(direction, 0, 0)`。

### 3.2 側臥位の左右が常に右下

`width` が `V(0, 1, 0)` 固定のため、両変法とも `shoulderLeft.y = 1.30 > shoulderRight.y = 0.70`（＝右側臥位）になる。向地性は健側＝患者左へ倒すので左肩が下でなければならない。背地性（患側右へ）は偶然正しい値になっている。

リグの座標系は「患者正面 +Z・頭上 +Y のとき患者左が +X」（`makePose` が `shoulderLeft` を `+width` 側に置き、`RIGHT = V(-0.707, 0, 0.707)` を患者右としていることと整合）。患者左へ倒せば頭は +X 側へ移動し左肩が下になる。

**修正:** `width: V(0, -direction, 0)`。`direction` は転倒方向（+1 = 患者左、-1 = 患者右）を意味する引数として維持する。

---

## 4. アーキテクチャ

### 4.1 ファイル構成

```
src/rig/poses.ts                        純粋なポーズ数学。three の Vector3 のみ依存、React 非依存
src/rig/scene.ts                        three.js シーン構築と自動フィットカメラ
src/rig/catalog.ts                      PoseImageId → CaptureSpec
src/prototypes/ManeuverRigPrototype.tsx レビューUI。上記を import。表示挙動は不変
src/prototypes/PoseExportRoute.tsx      書き出し専用ルート。透過・UIなし・カタログ駆動
scripts/capture_pose_images.mjs         Playwright で全 ID を撮影
scripts/compose_pose_images.py          帯状合成と WebP 変換
scripts/verify_rig_geometry.mjs         幾何不変量テスト（ヘッドレス）
scripts/verify_pose_images.py           画像・判読性検証
public/poses/*.webp                     27 枚。headroll 5 枚は上書き
```

`poses.ts` を React と three.js シーンから切り離すことが要点である。ポーズデータを Node から直接読めるようになり、Gufoni バグを特定したのと同じ検査を常設テストにできる。

### 4.2 カタログ

```ts
type View = 'front' | 'lateral' | 'cranial'
type Framing = 'full' | 'head'

type PanelSpec = {
  maneuver: ManeuverId
  pose: string
  view: View
  framing: Framing
  mirror?: boolean
  arrow?: 'fall-left' | 'fall-right' | 'roll-left' | 'roll-right'
}

type CaptureSpec = PanelSpec | { panels: PanelSpec[] }

export const POSE_CATALOG = { /* 27 entries */ } satisfies Record<PoseImageId, CaptureSpec>
```

`satisfies Record<PoseImageId, CaptureSpec>` により、ID が1つでも欠ければ `tsc -b` が失敗する。カタログとゲーム本体のズレをコンパイル時に落とすのが目的である。

### 4.3 視点は患者相対で定義する

`View` は世界座標ではなくポーズ自身のフレーム（体軸・肩幅軸・顔方向）から導く。

`width` は患者左を指す軸（`makePose` が `shoulderLeft` を `+width` 側に置く）、`bodyAxis` は骨盤→頭を指す。

| View | カメラ位置 | 視線方向 |
|---|---|---|
| `front` | 顔の前方（`+faceDirection` 側） | `-faceDirection` |
| `lateral` | 患者の右側（`-width` 側） | `+width` |
| `cranial` | 頭側（`+bodyAxis` 側） | `-bodyAxis` |

患者相対で定義すると、ミラーポーズのカメラが自動的に正しくなる。`poseImages.ts` の各 `spec` に「頭の方から見た図」「横から見た図」「正面から見た図」と既に書かれているので、`view` はそこから機械的に決まる。

### 4.4 カメラ自動フィット

v7 の手打ちカメラを全廃する。

- `framing: 'full'` — 対象点 = 全ジョイント
- `framing: 'head'` — 対象点 = `head`, `neck`, `shoulderCenter`, `shoulderLeft`, `shoulderRight` と頭部半径

`head` に肩を含めるのは、「体は動かさず頭だけを回す」ことが要点のポーズ（`ep_cross_*`, `side_*_face*`）で体幹が静止している手がかりを残すためである。

対象点を視線基底に射影して画面 bbox を求め、余白 8% で距離と注視点を解く。

### 4.5 左右の作り分け

画像の水平反転ではなく、ポーズデータの X 反転＋左右ジョイントのスワップ（`mirrorPose()`）で解く。キーライトが `(3.5, 7, 4)` と非対称なので、画像反転では陰の向きが画像間で揃わない。

### 4.6 透過とベッド

`WebGLRenderer({ alpha: true, antialias: true })`、`scene.background = null`、fog と床平面を削除。ベッドは残す（全身図では患者とベッドの接地関係が要点のため）。`head` framing では自然に画角外へ出る。

### 4.7 矢印

`poseImages.ts` の spec が `gufoni_fall_*`（倒れる向き）と `lempert_roll_*`（回転方向）に矢印を要求している。これらは図の一部としてシーンに描画する。デバッグ用の `ArrowHelper`（鼻方向を示す赤線）とは別物であり、書き出しには含めない。

### 4.8 出力仕様

1024×1024 でレンダし 512×512 へダウンスケール、WebP lossy q=88＋アルファ。1枚 15〜25KB、27 枚で約 500KB を見込む。

格納先は `public/poses/` のままとするため、`PoseImage` / `PoseFilm` / `poseImages.ts` は無改造。**ゲーム本体側の変更は** `global.css` の `.posefilm-stage { aspect-ratio: 480 / 470 }` を `1 / 1` にする1行のみ（リグ・スクリプト・ビルド設定の変更は §3・§4.1・§8 を参照）。

---

## 5. カタログ内容

| ID | リグポーズ | view | framing | 状態 |
|---|---|---|---|---|
| headroll_c | supine-roll / roll-neutral | cranial | head | 既存 |
| headroll_r45 | supine-roll / roll-right-45 | cranial | head | **要追加** |
| headroll_r90 | supine-roll / roll-right | cranial | head | 既存 |
| headroll_l45 | supine-roll / roll-left-45 | cranial | head | **要追加** |
| headroll_l90 | supine-roll / roll-left | cranial | head | 既存 |
| sitting_front | seated（顔 +Z） | front | full | **要追加** |
| supine | 全身仰臥位 | cranial | full | **要追加** |
| prone | 腹臥位 | cranial | full | **要追加** |
| sit_up | 介助起坐（側臥位→坐位の中間） | lateral | full | **要追加** |
| dh_sit_r | dix-hallpike / dix-yaw | lateral | full | 既存 |
| dh_sit_l | mirror(dix-yaw) | lateral | full | mirror |
| dh_hang_r | dix-hallpike / dix-hang | lateral | full | 既存 |
| dh_hang_l | mirror(dix-hang) | lateral | full | mirror |
| ep_cross_r | epley / epley-hang-left | lateral | head | 既存 |
| ep_cross_l | mirror | lateral | head | mirror |
| side_r | sideLying(-1, 'front') | cranial | full | 既存関数 |
| side_l | mirror | cranial | full | mirror |
| side_r_facedown | sideLying(-1, 'down') | cranial | head | 既存関数 |
| side_l_facedown | mirror | cranial | head | mirror |
| side_r_faceup | sideLying(-1, 'up') | cranial | head | 既存関数 |
| side_l_faceup | mirror | cranial | head | mirror |
| gufoni_fall_r | gufoni-apogeotropic / gufoni-a-fall＋矢印 | front | full | 既存＋矢印 |
| gufoni_fall_l | gufoni-geotropic / gufoni-g-fall＋矢印 | front | full | 既存＋矢印 |
| lempert_roll_r | lempert / roll-step-1＋矢印 | cranial | full | **要追加** |
| lempert_roll_l | mirror＋矢印 | cranial | full | mirror |
| lempert_full | 5パネル帯（仰臥位→側臥位→腹臥位→反対側臥位→坐位） | cranial | full | **要追加** |
| lempert_half | 3パネル帯（仰臥位→側臥位→腹臥位） | cranial | full | **要追加** |

### 5.1 リグへの追加

- `supine-roll` に左右の 45° 中間ポーズ（`roll-right-45` / `roll-left-45`）
- 全身仰臥位、腹臥位、正面座位、介助起坐
- **Lempert 手技**（仰臥位→健側へ90°側臥位→腹臥位→反対側臥位→坐位）の5ポーズ

Lempert は現在リグに存在しない。`maneuvers.ts` の `buildSteps` は既に Lempert を出題しているため、追加が必要である。

---

## 6. データフロー

```
poses.ts (ポーズデータ)  ──┐
catalog.ts (27 ID)      ──┼─→ PoseExportRoute (?prototype=pose-export&id=<PoseImageId>[&panel=N])
scene.ts (シーン・カメラ) ─┘             │
                                        ↓ Playwright screenshot (1024×1024, 透過PNG)
                        capture_pose_images.mjs
                                        ↓
                        compose_pose_images.py（帯状合成 → 512×512 WebP）
                                        ↓
                                public/poses/*.webp
```

エクスポートルートは `window.__POSE_IDS__` に ID 一覧を出し、撮影スクリプトは `page.evaluate` でそれを読む。ID 一覧を別ファイルに複製しないための措置である。

`lempert_full` / `lempert_half` はパネルを1枚ずつ撮影し、合成スクリプトが横に並べる。

---

## 7. 検証

### 7.1 幾何不変量（`verify_rig_geometry.mjs`）

- 全ポーズで骨長が基準ポーズと一致（既存 `validateRig` 相当）
- **全ポーズで `headUp · 体軸 > 0.9`** — 3.1 のバグの再発防止
- **側臥位ポーズで下になる肩が、手技の宣言した転倒方向と一致** — 3.2 のバグの再発防止
- 鼻方向の符号が手技定義と一致
- ミラーポーズが元ポーズの厳密な X 反転になっている

### 7.2 画像（`verify_pose_images.py`）

- 27 種すべてファイルが存在し、512×512、アルファチャンネルを持つ
- **被写体 bbox が縦横いずれもフレームの 55% 以上** — v7 の「小さすぎ」を機械で落とす
- `head` framing では頭部 bbox が 40% 以上
- 全ペアがピクセル単位で相異なる — 取り違えと重複の検出

### 7.3 実機確認

375×812 でゲームを開き、耳石置換法ミニゲームの選択肢タイルを実寸でスクリーンショットする。判読できることを目視で確認する。

### 7.4 エラー処理

撮影・検証スクリプトは違反した ID を列挙して非ゼロ終了する。部分的に成功した状態で完了を宣言しない。

---

## 8. PWA precache

`vite.config.ts` の `globIgnores` に v7 が無いため、precache が 124 エントリ 13.7MB になっている（うち v7 が 100 ファイル 4.1MB、その 95 ファイルはアプリが使わない中間 PNG）。

次を追加する。

- `**/vertigo-maneuvers-v7-rig/**`
- `**/ManeuverRigPrototype-*.*`（既存の `DixHallpikeRigPrototype-*` と同趣旨）

`public/poses/` は従来どおり precache 対象に残す（約 500KB）。

`public/assets/` 全体が 105MB あり `src/` からの参照がゼロである点は、本設計の対象外として別途扱う。

---

## 9. スキル更新

`skills/medical-maneuver-gif/` が正本、`.claude/skills/` と `.agents/skills/` はそこを指すアダプタ。正本のみ更新する。

### 9.1 `references/rigged-3d-workflow.md`

- 「Required automated checks」に **head-up / roll 不変量**を追加。現状は `expected nose direction` しかなく、今回の頭部 180° 反転を素通しする。
- 同節に**側臥位の下側肩と宣言した転倒方向の一致**を追加。
- **カメラは手打ちせず被写体 bbox から自動フィットする**規定を追加。
- **最終表示サイズでの判読性予算**の節を新設。現行の "at least 768 × 512" は解像度の話でしかなく、v7 の失敗を防げていない。被写体占有率の下限と、消費側アプリの実表示幅での確認を求める。

### 9.2 `SKILL.md`

- 出力が GIF だけでなく**アプリ組み込み用の透過静止画セット**でもあり得ることを明記。
- 完了条件に**消費側アプリの実表示サイズでの判読確認**を追加。
- 生成物の ID を**消費側アプリの識別子に型で紐付ける**規定を追加。

スキル名 `medical-maneuver-gif` は維持する。アダプタ2つと description が連動しており、改名は割に合わない。

作業ツリーで削除済みの `.skill_staging/` は git からも落とす（`skills/` が後継）。

---

## 10. 実装フェーズ

規模が大きいため、各フェーズ末で検証を通してから次へ進む。

1. **リグ分離とバグ修正** — `src/rig/` へ抽出、`sideLying()` の2件を修正、`verify_rig_geometry.mjs` を通す。レビューUIの表示挙動が変わらないことを確認する。
2. **リグ拡張** — 新規ポーズ6種と Lempert 手技を追加、幾何テストを拡張して通す。
3. **書き出し経路** — `catalog.ts`、`PoseExportRoute.tsx`、`capture_pose_images.mjs`、`compose_pose_images.py`。まず数枚で判読性を確認してから全 27 種を回す。
4. **ゲーム統合** — `public/poses/` 差し替え、CSS 1行、`globIgnores` 追加、`verify_pose_images.py` と実機確認。
5. **スキル更新** — §9。

---

## 11. スコープ外

- ライブ 3D リグのゲーム内埋め込み（`renderPatient()` の dispose 漏れ修正を含む）
- `public/assets/` の v1〜v7 計 105MB の整理
- `App.tsx` の条件付き `useReducer`（Rules of Hooks 違反）
- リグプロトタイプUIのモバイル横スクロール

いずれも別途扱う。
