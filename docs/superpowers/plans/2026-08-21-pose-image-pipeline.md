# 体位静止画パイプライン（v8）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3Dリグから透過静止画 27 種を書き出し、`public/poses/` に置いてゲーム本体のプレースホルダを全廃する。

**Architecture:** `ManeuverRigPrototype.tsx`（550行）を純粋ポーズ数学 `src/rig/poses.ts`・three.js シーン `src/rig/scene.ts`・撮影カタログ `src/rig/catalog.ts` に分割する。`poses.ts` を React と three.js シーンから切り離すことで Node から直接読めるようになり、幾何不変量を常設テストにできる。カメラはポーズのバウンディングボックスから自動フィットし、v7 の手打ちカメラを全廃する。

**Tech Stack:** TypeScript 5.9 / React 19 / three.js 0.185 / Vite 7 / Playwright（msedge channel）/ Python + Pillow

**設計書:** [docs/superpowers/specs/2026-08-21-pose-image-pipeline-design.md](../specs/2026-08-21-pose-image-pipeline-design.md)

## Global Constraints

- 出力画像: 1024×1024 でレンダ → 512×512 へダウンスケール、WebP lossy q=88、アルファ必須
- 出力先: `public/poses/<file>`。`poseImages.ts` の `file` フィールドの値をそのまま使う（拡張子 `.webp`）
- `src/data/poseImages.ts`・`src/components/PoseImage.tsx`・`src/data/maneuvers.ts` は変更しない
- ゲームの画面・データ・表示コンポーネントへの変更は `src/styles/global.css` の `.posefilm-stage { aspect-ratio }` 1行のみ。`src/App.tsx` はプロトタイプルートの追加（Task 8）に限り変更してよく、ゲーム側の分岐には触れない
- `tsconfig.json` は `allowImportingTsExtensions: false`・`include: ["src"]`。**アプリコードの相対 import は拡張子なし**（`./poses`）。`scripts/` 配下の Node スクリプトのみ `.ts` 拡張子付きで import する（`scripts/` は tsc の対象外）
- **Node から `src/` のモジュールを読むには `scripts/rig-ts-loader.mjs` の登録が必要**（Task 4 で追加）。Node の ESM 解決は拡張子なしの相対指定を解決できず、`src/` 内のモジュールが互いを拡張子なしで import しているため、`ERR_MODULE_NOT_FOUND` になる。検証スクリプトは先頭で `register('./rig-ts-loader.mjs', import.meta.url)` してから `await import('../src/rig/<module>.ts')` する。leaf モジュール（`poses.ts`）だけは静的 import でも動くが、`scene.ts` と `catalog.ts` は動かない
- `strict: true`・`noUnusedLocals: true`・`noUnusedParameters: true`。抽出時に未使用 import を残さない
- テストランナーは導入しない。検証は `node scripts/verify_*.mjs` と `python scripts/verify_*.py` が非ゼロ終了する形で書く
- 骨長の許容誤差は既存 `validateRig` と同じ `1e-8`
- 患者座標系: 患者正面 +Z・頭上 +Y のとき**患者左が +X**。`makePose` は `shoulderLeft` を `+width` 側に置く
- `sideLying()` の `direction` は転倒方向を意味する。`+1` = 患者左へ倒す、`-1` = 患者右へ倒す

---

## File Structure

| ファイル | 責務 |
|---|---|
| `src/rig/poses.ts` | ポーズ数学とポーズデータ。`three` の `Vector3` のみ依存。React・DOM・シーン非依存 |
| `src/rig/scene.ts` | three.js のメッシュ組み立て、ルーム、矢印、カメラ（レビュー用プリセットと自動フィット） |
| `src/rig/catalog.ts` | `PoseImageId` → 撮影仕様。ゲーム本体の ID とリグを型で接続する唯一の場所 |
| `src/prototypes/ManeuverRigPrototype.tsx` | レビューUI。上記3つを import するだけになる |
| `src/prototypes/PoseExportRoute.tsx` | 書き出し専用ルート。透過・UIなし・1リクエスト1パネル |
| `scripts/verify_rig_geometry.mjs` | 幾何不変量テスト |
| `scripts/capture_pose_images.mjs` | Playwright 撮影 |
| `scripts/compose_pose_images.py` | 帯状合成と WebP 変換 |
| `scripts/verify_pose_images.py` | 画像・判読性検証 |

---

## Task 1: `src/rig/poses.ts` を抽出する

**Files:**
- Create: `src/rig/poses.ts`
- Create: `scripts/verify_rig_geometry.mjs`
- Modify: `src/prototypes/ManeuverRigPrototype.tsx:1-268`（該当部を削除し import に置換）

**Interfaces:**
- Consumes: なし
- Produces:
  - `type ManeuverId = 'dix-hallpike' | 'epley' | 'gufoni-geotropic' | 'gufoni-apogeotropic' | 'supine-roll'`
  - `type RigPose = { id: string; label: string; note: string; holdMs: number; joints: Record<string, THREE.Vector3>; faceDirection: THREE.Vector3; headUp: THREE.Vector3; upperBodyOnly?: boolean; fallSide?: 'left' | 'right' }`
  - `type Maneuver = { id: ManeuverId; shortLabel: string; title: string; subtitle: string; camera: 'posterior' | 'lateral'; bedAxis: 'longitudinal' | 'transverse'; pillow: 'shoulder' | 'none'; poses: RigPose[] }`
  - `const MANEUVERS: Record<ManeuverId, Maneuver>`
  - `const TREE: Array<[string, string]>`
  - `const LENGTHS`, `const HEAD_RADIUS: number`
  - `function makePose(recipe: PoseRecipe): RigPose`
  - `function interpolatePose(from: RigPose, to: RigPose, t: number): RigPose`
  - `function neckToHead(pose: RigPose): THREE.Vector3`
  - `function bodyAxis(pose: RigPose): THREE.Vector3`
  - `function widthAxis(pose: RigPose): THREE.Vector3`
  - `function validateRig(): void`
  - `const V`, `const unit`, `const step`

- [ ] **Step 1: `src/rig/poses.ts` を作る**

`ManeuverRigPrototype.tsx` の以下をそのまま移す。行番号は**着手前の現行ファイル**のもの。Task 4 でも同じファイルから抽出するが、そちらは行番号ではなくシンボル名で指定してある。

- 5-26行（`ManeuverId` / `RigPose` / `Maneuver` の型）
- 28-31行（`V` / `unit` / `step`）
- 39-40行（`HEAD_RADIUS`）※ `HEAD_SCALE` は `scene.ts` に残す
- 42-55行（`LENGTHS`）
- 57-74行（`PoseRecipe`）
- 76-118行（`makePose`）
- 120-166行（`seated` / `hanging` / `sideSeated` / `epleySideSit` / `sideLying` / `supine` / `RIGHT` / `HANG_RIGHT` / `HANG_LEFT`）
- 168-231行（`MANEUVERS`）
- 233-241行（`TREE`）
- 243-268行（`validateRig` と末尾の `validateRig()` 呼び出し）
- 271-283行（`interpolatePose`）

先頭は `import * as THREE from 'three'` のみ。`RigPose` に `fallSide?: 'left' | 'right'` を追加し、`sideLying` が設定するようにする。

```ts
export type RigPose = {
  id: string
  label: string
  note: string
  holdMs: number
  joints: Record<string, THREE.Vector3>
  faceDirection: THREE.Vector3
  headUp: THREE.Vector3
  upperBodyOnly?: boolean
  /** 側臥位ポーズで、どちらへ倒れた結果かを記録する。下になる肩の検証に使う */
  fallSide?: 'left' | 'right'
}
```

`sideLying` の `makePose` 呼び出し結果に付与する。

```ts
function sideLying(id: string, label: string, note: string, direction: 1 | -1, nose: 'down' | 'up' | 'front') {
  const body = V(direction, 0, 0)
  const width = V(0, 1, 0)
  const face = nose === 'front' ? V(0, 0, 1) : nose === 'down' ? V(0, -1, 0.08) : V(0, 1, 0.08)
  const pose = makePose({
    id, label, note, holdMs: 1500, pelvis: V(0, 1.00, 0.88), body, width, head: body, face,
    headUp: nose === 'down' ? V(-direction, 0, 0) : V(direction, 0, 0),
    thighs: V(-direction, 0, -0.05), shins: V(-direction, 0, -0.05),
    arms: V(-direction, 0.05, 0.15), forearms: V(-direction, 0.05, 0.12),
  })
  return { ...pose, fallSide: direction === 1 ? ('left' as const) : ('right' as const) }
}
```

**この時点ではバグ（`width` 固定と `headUp` 特例）はそのまま残す。** 修正は Task 2 で行う。

末尾に軸ヘルパーを追加する。

```ts
/** 頸→頭の向き。頭頂の向き（headUp）が正しいかの基準になる */
export function neckToHead(pose: RigPose): THREE.Vector3 {
  return pose.joints.head.clone().sub(pose.joints.neck).normalize()
}

/** 骨盤→頸の体幹軸 */
export function bodyAxis(pose: RigPose): THREE.Vector3 {
  return pose.joints.neck.clone().sub(pose.joints.pelvis).normalize()
}

/** 患者左を指す肩幅軸 */
export function widthAxis(pose: RigPose): THREE.Vector3 {
  return pose.joints.shoulderLeft.clone().sub(pose.joints.shoulderRight).normalize()
}
```

- [ ] **Step 2: `scripts/verify_rig_geometry.mjs` を作る**

```js
import assert from 'node:assert/strict'
import { MANEUVERS, TREE, bodyAxis, widthAxis } from '../src/rig/poses.ts'

const allPoses = () => Object.values(MANEUVERS).flatMap((maneuver) => maneuver.poses)
const failures = []
const check = (name, fn) => {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
    console.log(`  FAIL ${name}`)
  }
}

check('骨長が全ポーズで一致する', () => {
  const poses = allPoses()
  const reference = poses[0]
  for (const pose of poses) {
    for (const [start, end] of TREE) {
      const expected = reference.joints[start].distanceTo(reference.joints[end])
      const actual = pose.joints[start].distanceTo(pose.joints[end])
      assert.ok(
        Math.abs(expected - actual) <= 1e-8,
        `${pose.id} の ${start}-${end} が ${expected} から ${actual} へ変化した`,
      )
    }
  }
})

check('肩幅軸と体幹軸が直交する', () => {
  for (const pose of allPoses()) {
    const dot = Math.abs(widthAxis(pose).dot(bodyAxis(pose)))
    assert.ok(dot < 1e-6, `${pose.id} で肩幅軸と体幹軸の内積が ${dot}`)
  }
})

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log('\n幾何検証を通過した')
```

- [ ] **Step 3: テストを実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（2件 ok、「幾何検証を通過した」）

- [ ] **Step 4: `ManeuverRigPrototype.tsx` を import に切り替える**

移した 5-283 行を削除し、先頭を次のようにする。`HEAD_SCALE` の定義（40行）と色定数（33-38行）はシーン側なので `ManeuverRigPrototype.tsx` に残す。

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  HEAD_RADIUS, MANEUVERS, TREE, interpolatePose,
  type Maneuver, type ManeuverId, type RigPose,
} from '../rig/poses'
import './dixHallpikeRig.css'
```

`V` は `makeHead` などが使うので、`const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)` をシーン側にも置くか `poses` から import する。`poses` から import する。

- [ ] **Step 5: ビルドと型検査を通す**

Run: `npm run build`
Expected: PASS（エラーなし、`ManeuverRigPrototype-*.js` が生成される）

- [ ] **Step 6: レビューUIの表示が変わっていないことを確認する**

`.claude/launch.json` の `vertigo-dev` を起動し、`http://localhost:5173/?prototype=maneuver-rig` を開く。5つの手技タブが出てポーズ切り替えが動き、コンソールエラーが 0 件であることを確認する。

- [ ] **Step 7: コミット**

```bash
git add src/rig/poses.ts scripts/verify_rig_geometry.mjs src/prototypes/ManeuverRigPrototype.tsx
git commit -m "refactor: extract pure rig pose math into src/rig/poses.ts"
```

---

## Task 2: Gufoni の頭部反転と側臥位左右を修正する

**Files:**
- Modify: `scripts/verify_rig_geometry.mjs`（検査を2件追加）
- Modify: `src/rig/poses.ts`（`sideLying` の2行）

**Interfaces:**
- Consumes: Task 1 の `MANEUVERS`, `neckToHead`, `RigPose.fallSide`
- Produces: 修正済み `MANEUVERS`。`gufoni-geotropic` の側臥位ポーズが左肩下になる

- [ ] **Step 1: 失敗する検査を追加する**

`scripts/verify_rig_geometry.mjs` の import に `neckToHead` を足し、既存の `check` の後に追加する。

```js
check('頭頂の向きが頸→頭の向きと揃っている', () => {
  for (const pose of allPoses()) {
    const dot = pose.headUp.dot(neckToHead(pose))
    assert.ok(dot > 0.9, `${pose.id} で headUp・neckToHead = ${dot.toFixed(2)}（頭部が反転している）`)
  }
})

check('側臥位で下になる肩が転倒方向と一致する', () => {
  for (const pose of allPoses()) {
    if (!pose.fallSide) continue
    const lower = pose.joints.shoulderLeft.y < pose.joints.shoulderRight.y ? 'left' : 'right'
    assert.equal(
      lower, pose.fallSide,
      `${pose.id} は ${pose.fallSide} へ倒れたのに ${lower} 肩が下になっていない`,
    )
  }
})
```

- [ ] **Step 2: 実行して失敗することを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: FAIL。次の2件が出る。

```
FAIL 頭頂の向きが頸→頭の向きと揃っている
FAIL 側臥位で下になる肩が転倒方向と一致する
```

詳細に `gufoni-g-down で headUp・neckToHead = -1.00` と `gufoni-g-fall は left へ倒れたのに left 肩が下になっていない` が含まれること。

- [ ] **Step 3: `sideLying` を修正する**

`src/rig/poses.ts` の `sideLying` の2箇所を書き換える。

```ts
function sideLying(id: string, label: string, note: string, direction: 1 | -1, nose: 'down' | 'up' | 'front') {
  const body = V(direction, 0, 0)
  // 転倒方向の肩が下になる。患者左が +X なので、左へ倒す(direction=+1)と左肩が -Y へ回る
  const width = V(0, -direction, 0)
  const face = nose === 'front' ? V(0, 0, 1) : nose === 'down' ? V(0, -1, 0.08) : V(0, 1, 0.08)
  const pose = makePose({
    id, label, note, holdMs: 1500, pelvis: V(0, 1.00, 0.88), body, width, head: body, face,
    // 鼻を床/天井へ向けるのは体軸まわりのロールであり、頭頂の向きは変わらない
    headUp: V(direction, 0, 0),
    thighs: V(-direction, 0, -0.05), shins: V(-direction, 0, -0.05),
    arms: V(-direction, 0.05, 0.15), forearms: V(-direction, 0.05, 0.12),
  })
  return { ...pose, fallSide: direction === 1 ? ('left' as const) : ('right' as const) }
}
```

- [ ] **Step 4: 実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（4件 ok）

- [ ] **Step 5: レビューUIで目視確認する**

`?prototype=maneuver-rig&maneuver=gufoni-geotropic&pose=2` を開き、頭頂が足側でなく体軸方向を向き、鼻が床を向いていることを確認する。`&maneuver=gufoni-apogeotropic&pose=2` も同様に鼻が天井を向くことを確認する。

- [ ] **Step 6: コミット**

```bash
git add src/rig/poses.ts scripts/verify_rig_geometry.mjs
git commit -m "fix: correct Gufoni head roll and lateral decubitus side"
```

---

## Task 3: `mirrorPose` を実装する

**Files:**
- Modify: `src/rig/poses.ts`
- Modify: `scripts/verify_rig_geometry.mjs`

**Interfaces:**
- Consumes: Task 1 の `RigPose`
- Produces: `function mirrorPose(pose: RigPose): RigPose`

- [ ] **Step 1: 失敗する検査を追加する**

`scripts/verify_rig_geometry.mjs` の import に `mirrorPose` を足し、追加する。

```js
check('ミラーは X 反転で、2回かけると元に戻る', () => {
  for (const pose of allPoses()) {
    const mirrored = mirrorPose(pose)
    assert.ok(
      Math.abs(mirrored.faceDirection.x + pose.faceDirection.x) < 1e-9,
      `${pose.id} のミラーで鼻の X が反転していない`,
    )
    assert.ok(
      Math.abs(mirrored.joints.shoulderLeft.x + pose.joints.shoulderRight.x) < 1e-9,
      `${pose.id} のミラーで左右の肩が入れ替わっていない`,
    )
    const back = mirrorPose(mirrored)
    for (const name of Object.keys(pose.joints)) {
      assert.ok(
        back.joints[name].distanceTo(pose.joints[name]) < 1e-9,
        `${pose.id} の ${name} が2回ミラーで元に戻らない`,
      )
    }
  }
})
```

- [ ] **Step 2: 実行して失敗することを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: FAIL with "The requested module '../src/rig/poses.ts' does not provide an export named 'mirrorPose'"

- [ ] **Step 3: `mirrorPose` を実装する**

`src/rig/poses.ts` の末尾に追加する。

```ts
const swapSide = (name: string) =>
  name.includes('Left') ? name.replace('Left', 'Right')
  : name.includes('Right') ? name.replace('Right', 'Left')
  : name

/**
 * 左右を反転したポーズを返す。
 *
 * 画像の水平反転ではなくポーズデータを反転するのは、キーライトが非対称なため。
 * 画像を反転すると陰の向きが画像間で揃わなくなる。
 */
export function mirrorPose(pose: RigPose): RigPose {
  const flip = (vector: THREE.Vector3) => new THREE.Vector3(-vector.x, vector.y, vector.z)
  const joints: Record<string, THREE.Vector3> = {}
  for (const [name, point] of Object.entries(pose.joints)) joints[swapSide(name)] = flip(point)
  return {
    ...pose,
    id: `${pose.id}-mirrored`,
    joints,
    faceDirection: flip(pose.faceDirection),
    headUp: flip(pose.headUp),
    fallSide: pose.fallSide === 'left' ? 'right' : pose.fallSide === 'right' ? 'left' : undefined,
  }
}
```

- [ ] **Step 4: 実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（5件 ok）

- [ ] **Step 5: コミット**

```bash
git add src/rig/poses.ts scripts/verify_rig_geometry.mjs
git commit -m "feat: add mirrorPose for left-side variants"
```

---

## Task 4: `src/rig/scene.ts` を抽出し `fitCamera` を実装する

**Files:**
- Create: `src/rig/scene.ts`
- Modify: `src/prototypes/ManeuverRigPrototype.tsx`
- Modify: `scripts/verify_rig_geometry.mjs`

**Interfaces:**
- Consumes: Task 1-3 の `poses.ts` 全 export
- Produces:
  - `type View = 'front' | 'lateral' | 'cranial'`
  - `type Framing = 'full' | 'head'`
  - `type ArrowKind = 'fall-left' | 'fall-right' | 'roll-left' | 'roll-right'`
  - `function makePatient(pose: RigPose, options?: { skeleton?: boolean; noseArrow?: boolean }): THREE.Group`
  - `function makeRoom(maneuver: Maneuver, options?: { floor?: boolean }): THREE.Group`
  - `function makeDirectionArrow(pose: RigPose, kind: ArrowKind): THREE.Group`
  - `function faceQuaternion(forward: THREE.Vector3, up: THREE.Vector3): THREE.Quaternion`
  - `function positionCamera(camera: THREE.PerspectiveCamera, maneuver: Maneuver, view: 'review' | 'oblique'): void`
  - `function viewDirection(pose: RigPose, view: View): THREE.Vector3`
  - `function framingPoints(pose: RigPose, framing: Framing): THREE.Vector3[]`
  - `function fitCamera(camera: THREE.PerspectiveCamera, pose: RigPose, view: View, framing: Framing, margin?: number): void`

- [ ] **Step 1: `viewDirection` と `framingPoints` の失敗する検査を追加する**

`scripts/verify_rig_geometry.mjs` の先頭に import を足す。

```js
import { framingPoints, viewDirection } from '../src/rig/scene.ts'
```

`three` のシーン API は Node でも `Vector3` しか触らない限り動く。検査を追加する。

```js
check('視点方向が患者相対で定義されている', () => {
  const dix = MANEUVERS['dix-hallpike'].poses[0]
  const front = viewDirection(dix, 'front')
  assert.ok(front.dot(dix.faceDirection) < -0.99, `front の視線が顔の逆を向いていない: ${front.dot(dix.faceDirection)}`)
  const lateral = viewDirection(dix, 'lateral')
  assert.ok(lateral.dot(widthAxis(dix)) > 0.99, 'lateral の視線が患者左向きでない')
  const cranial = viewDirection(dix, 'cranial')
  assert.ok(cranial.dot(bodyAxis(dix)) < -0.99, 'cranial の視線が頭側からでない')
})

check('head フレーミングは頭と肩だけを対象にする', () => {
  const pose = MANEUVERS.epley.poses[2]
  const full = framingPoints(pose, 'full')
  const head = framingPoints(pose, 'head')
  assert.ok(head.length < full.length, 'head の対象点が full より少なくない')
  for (const point of head) {
    assert.ok(
      point.distanceTo(pose.joints.head) < 1.2,
      `head の対象点が頭から離れすぎている: ${point.distanceTo(pose.joints.head)}`,
    )
  }
})
```

- [ ] **Step 2: 実行して失敗することを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: FAIL with "Cannot find module .../src/rig/scene.ts"

- [ ] **Step 3: `src/rig/scene.ts` を作る**

`ManeuverRigPrototype.tsx` から次のシンボルを移す（Task 1 で行番号が動いているため名前で指定する）。

- 色定数 `SKIN` / `SKIN_SHADOW` / `HAIR` / `SHIRT` / `SHIRT_DARK` / `TROUSERS` / `SHOES` / `BONE` と `HEAD_SCALE`
- `mat` / `segment`
- `faceQuaternion`
- `makeHead`
- `makePatient`
- `makeRoom`
- `positionCamera`

先頭の import は次のとおり。`V` と `HEAD_RADIUS` と軸ヘルパーは `poses` から取る。

```ts
import * as THREE from 'three'
import {
  HEAD_RADIUS, TREE, V, bodyAxis, widthAxis,
  type Maneuver, type RigPose,
} from './poses'
```

`makePatient` の第2・第3引数を options オブジェクトに変える。

```ts
export function makePatient(
  pose: RigPose,
  options: { skeleton?: boolean; noseArrow?: boolean } = {},
): THREE.Group {
  const { skeleton = false, noseArrow = true } = options
  // ...本体は既存のまま。showSkeleton → skeleton、showDirection → noseArrow に置換
}
```

`makeRoom` に床を落とすオプションを足す。

```ts
export function makeRoom(maneuver: Maneuver, options: { floor?: boolean } = {}): THREE.Group {
  const { floor: withFloor = true } = options
  const group = new THREE.Group()
  if (withFloor) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat(0xd6d9d8))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    group.add(floor)
  }
  // ...以降は既存のまま
}
```

新規に視点・フレーミング・自動フィットを追加する。

```ts
export type View = 'front' | 'lateral' | 'cranial'
export type Framing = 'full' | 'head'

/** カメラが向く方向。カメラ位置は注視点からこの逆向きに離れた場所になる */
export function viewDirection(pose: RigPose, view: View): THREE.Vector3 {
  if (view === 'front') return pose.faceDirection.clone().negate()
  if (view === 'lateral') return widthAxis(pose)
  return bodyAxis(pose).negate()
}

/** head は頭と肩に絞る。「体は動かさず頭だけ回す」ポーズで体幹の静止が見えるよう肩を含める */
export function framingPoints(pose: RigPose, framing: Framing): THREE.Vector3[] {
  if (framing === 'full') return Object.values(pose.joints).map((point) => point.clone())
  const core = ['head', 'neck', 'shoulderCenter', 'shoulderLeft', 'shoulderRight']
  const points = core.map((name) => pose.joints[name].clone())
  // 頭部の体積を含めるため、頭関節まわりに軸方向の6点を足す
  for (const axis of [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)]) {
    points.push(pose.joints.head.clone().add(axis.multiplyScalar(HEAD_RADIUS * 1.15)))
  }
  return points
}

/**
 * 被写体のバウンディングボックスからカメラ距離と注視点を解く。
 *
 * v7 はポーズごとにカメラ座標を手で打っていたため、人物が小さすぎたり
 * 肝心の回旋が見えない画角になっていた。ここを機械化するのが判読性の根治になる。
 * 画面上の上方向は常に世界の +Y にする。床と天井の区別が臨床的な意味を持つため。
 */
export function fitCamera(
  camera: THREE.PerspectiveCamera,
  pose: RigPose,
  view: View,
  framing: Framing,
  margin = 0.08,
): void {
  const direction = viewDirection(pose, view)
  const worldUp = Math.abs(direction.y) > 0.95 ? pose.faceDirection.clone() : V(0, 1, 0)
  const right = worldUp.clone().cross(direction).normalize()
  const up = direction.clone().cross(right).normalize()

  const points = framingPoints(pose, framing)
  let minRight = Infinity, maxRight = -Infinity
  let minUp = Infinity, maxUp = -Infinity
  let minDepth = Infinity
  for (const point of points) {
    const alongRight = point.dot(right)
    const alongUp = point.dot(up)
    const alongDepth = point.dot(direction)
    minRight = Math.min(minRight, alongRight); maxRight = Math.max(maxRight, alongRight)
    minUp = Math.min(minUp, alongUp); maxUp = Math.max(maxUp, alongUp)
    minDepth = Math.min(minDepth, alongDepth)
  }

  const centerRight = (minRight + maxRight) / 2
  const centerUp = (minUp + maxUp) / 2
  const halfWidth = ((maxRight - minRight) / 2) * (1 + margin)
  const halfHeight = ((maxUp - minUp) / 2) * (1 + margin)

  const target = right.clone().multiplyScalar(centerRight)
    .add(up.clone().multiplyScalar(centerUp))
    .add(direction.clone().multiplyScalar(minDepth))

  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2
  const distanceForHeight = halfHeight / Math.tan(halfFov)
  const distanceForWidth = halfWidth / (Math.tan(halfFov) * camera.aspect)
  const distance = Math.max(distanceForHeight, distanceForWidth) + (maxRight - minRight)

  camera.up.copy(up)
  camera.position.copy(target).addScaledVector(direction, -distance)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}
```

矢印を追加する。`fall-*` は倒れる向きの直線矢印、`roll-*` は体軸まわりの回転を示す弧の矢印。

```ts
export type ArrowKind = 'fall-left' | 'fall-right' | 'roll-left' | 'roll-right'

const ARROW_COLOR = 0xe23b32

/** 図の一部として描く方向指示。鼻方向のデバッグ矢印とは別物で、書き出しにも含める */
export function makeDirectionArrow(pose: RigPose, kind: ArrowKind): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshToonMaterial({ color: ARROW_COLOR })
  const origin = pose.joints.shoulderCenter.clone()

  if (kind === 'fall-left' || kind === 'fall-right') {
    const towards = widthAxis(pose).multiplyScalar(kind === 'fall-left' ? 1 : -1)
    const start = origin.clone().addScaledVector(towards, 0.55)
    const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.55, 6, 12), material)
    shaft.position.copy(start).addScaledVector(towards, 0.35)
    shaft.quaternion.setFromUnitVectors(V(0, 1, 0), towards)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 16), material)
    tip.position.copy(start).addScaledVector(towards, 0.78)
    tip.quaternion.setFromUnitVectors(V(0, 1, 0), towards)
    group.add(shaft, tip)
    return group
  }

  const axis = bodyAxis(pose)
  const sign = kind === 'roll-left' ? 1 : -1
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 8, 32, Math.PI * 0.75), material)
  arc.position.copy(origin)
  arc.quaternion.setFromUnitVectors(V(0, 0, 1), axis.clone().multiplyScalar(sign))
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 16), material)
  const tipAngle = Math.PI * 0.75
  tip.position.copy(origin).add(
    new THREE.Vector3(Math.cos(tipAngle) * 0.85, Math.sin(tipAngle) * 0.85, 0)
      .applyQuaternion(arc.quaternion),
  )
  tip.quaternion.copy(arc.quaternion)
  group.add(arc, tip)
  return group
}
```

- [ ] **Step 4: 実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（7件 ok）

- [ ] **Step 5: `ManeuverRigPrototype.tsx` を import に切り替える**

移した定義を削除し、import を次にする。`makePatient` の呼び出しを options 形式に直す。

```tsx
import { makePatient, makeRoom, positionCamera } from '../rig/scene'
```

```tsx
patientRef.current = makePatient(pose, { skeleton: showSkeleton, noseArrow: !exportMode })
```

- [ ] **Step 6: ビルドと実機確認**

Run: `npm run build`
Expected: PASS

dev サーバで `?prototype=maneuver-rig` を開き、5手技のポーズ切り替えと骨格表示トグルが動き、コンソールエラーが 0 件であることを確認する。

- [ ] **Step 7: コミット**

```bash
git add src/rig/scene.ts src/prototypes/ManeuverRigPrototype.tsx scripts/verify_rig_geometry.mjs
git commit -m "refactor: extract three.js scene builders and add bbox-fit camera"
```

---

## Task 5: 単体ポーズ6種をリグに追加する

**Files:**
- Modify: `src/rig/poses.ts`
- Modify: `scripts/verify_rig_geometry.mjs`

**Interfaces:**
- Consumes: Task 1-4
- Produces: `MANEUVERS['supine-roll'].poses` に `roll-right-45` / `roll-left-45`、`MANEUVERS` に新手技 `'basic-positions'`（`sitting-front` / `supine-full` / `prone` / `sit-up` の4ポーズ）。`ManeuverId` に `'basic-positions'` を追加

- [ ] **Step 1: 失敗する検査を追加する**

```js
check('カタログが要求する単体ポーズが存在する', () => {
  const required = {
    'supine-roll': ['roll-neutral', 'roll-right-45', 'roll-right', 'roll-left-45', 'roll-left'],
    'basic-positions': ['sitting-front', 'supine-full', 'prone', 'sit-up'],
  }
  for (const [maneuverId, poseIds] of Object.entries(required)) {
    const maneuver = MANEUVERS[maneuverId]
    assert.ok(maneuver, `手技 ${maneuverId} が無い`)
    for (const poseId of poseIds) {
      assert.ok(maneuver.poses.some((pose) => pose.id === poseId), `${maneuverId} に ${poseId} が無い`)
    }
  }
})

check('腹臥位は鼻が床を向く', () => {
  const prone = MANEUVERS['basic-positions'].poses.find((pose) => pose.id === 'prone')
  assert.ok(prone.faceDirection.y < -0.8, `腹臥位の鼻が下を向いていない: y=${prone.faceDirection.y}`)
})

check('45度頭位が正中と90度頭位の中間にある', () => {
  const poses = MANEUVERS['supine-roll'].poses
  const faceOf = (id) => poses.find((pose) => pose.id === id).faceDirection
  const neutral = faceOf('roll-neutral')
  // 正中と90度は直交するので、45度の定義は「両端との内積が等しい」こと。
  // 内積の不等式で挟むだけだと 31〜72度が通ってしまい、検査にならない
  for (const [halfId, fullId] of [['roll-right-45', 'roll-right'], ['roll-left-45', 'roll-left']]) {
    const half = faceOf(halfId)
    const toNeutral = half.dot(neutral)
    const toFull = half.dot(faceOf(fullId))
    assert.ok(
      Math.abs(toNeutral - toFull) < 0.05,
      `${halfId} が中間でない: 正中との内積 ${toNeutral.toFixed(3)}、90度との内積 ${toFull.toFixed(3)}`,
    )
    assert.ok(toNeutral > 0.5, `${halfId} が正中から離れすぎている: ${toNeutral.toFixed(3)}`)
  }
})
```

- [ ] **Step 2: 実行して失敗することを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: FAIL with "手技 basic-positions が無い"

- [ ] **Step 3: ポーズを追加する**

`src/rig/poses.ts` の `ManeuverId` に `'basic-positions'` を足す。`supine-roll` の `poses` を差し替える。

```ts
'supine-roll': {
  id: 'supine-roll', shortLabel: 'Supine Head Roll', title: 'Supine Head Roll Test',
  subtitle: '枕なしの上半身モデルで、頭部約30°前屈と左右90°を表示', camera: 'posterior',
  bedAxis: 'longitudinal', pillow: 'none',
  poses: [
    supine('roll-neutral', '1. 仰臥位・正中', '頭部を約30°前屈して水平半規管面を整える', V(0, 0.50, 0.866)),
    supine('roll-right-45', '2. 右へ45°', '正中から患者右へ45°', V(-0.707, 0.354, 0.612)),
    supine('roll-right', '3. 右へ90°', '眼振を観察し、消退するまで保持', V(-1, 0, 0)),
    supine('roll-left-45', '4. 左へ45°', '正中から患者左へ45°', V(0.707, 0.354, 0.612)),
    supine('roll-left', '5. 左へ90°', '反対側の眼振方向と強度を観察', V(1, 0, 0)),
  ],
},
```

`MANEUVERS` に新手技を足す。

```ts
'basic-positions': {
  id: 'basic-positions', shortLabel: '基本体位', title: '基本体位',
  subtitle: '手技の選択肢で使う坐位・仰臥位・腹臥位・起坐', camera: 'lateral',
  bedAxis: 'longitudinal', pillow: 'none',
  poses: [
    // 正面座位。診察台に腰かけ検者と向かい合う
    makePose({
      id: 'sitting-front', label: '正面を向いた坐位', note: '診察台に腰かけ正面を向く',
      pelvis: V(0, 1.00, 0.88), body: V(0, 1, 0), head: V(0, 1, 0), face: V(0, 0, 1),
      thighs: V(0, -0.46, 0.89), shins: V(0, -1, 0),
      arms: V(0, -0.96, 0.28), forearms: V(0, -0.92, 0.38),
    }),
    // 全身仰臥位。supine() は上半身のみなので別に作る
    makePose({
      id: 'supine-full', label: '仰臥位', note: '診察台に仰向け。顔は天井を向く',
      holdMs: 1300, pelvis: V(0, 1.00, 0.38), body: V(0, 0.12, -0.993),
      head: V(0, 0.12, -0.993), face: V(0, 1, 0.08), headUp: V(0, 0.12, -0.993),
      legs: V(0, 0.02, 1), arms: V(0.10, -0.02, 0.995), forearms: V(-0.06, 0.02, 0.998),
    }),
    // 腹臥位。仰臥位から体軸まわりに180°ロールし、鼻を床へ
    makePose({
      id: 'prone', label: '腹臥位（うつ伏せ）', note: '診察台にうつ伏せ。後頭部が見えている',
      holdMs: 1300, pelvis: V(0, 1.00, 0.38), body: V(0, 0.12, -0.993), width: V(-1, 0, 0),
      head: V(0, 0.12, -0.993), face: V(0, -1, -0.08), headUp: V(0, 0.12, -0.993),
      legs: V(0, 0.02, 1), arms: V(0.10, 0.02, 0.995), forearms: V(-0.06, -0.02, 0.998),
    }),
    // 介助起坐。側臥位から支えて起こす途中
    makePose({
      id: 'sit-up', label: 'ゆっくり起坐させる', note: '側臥位から支えてゆっくり坐位へ戻す',
      holdMs: 1500, pelvis: V(0, 1.00, 0.72), body: V(0, 0.82, 0.57),
      head: V(0, 0.94, 0.34), face: V(0, 0.10, 0.995), headUp: V(0, 0.94, 0.34),
      thighs: V(0, -0.42, 0.91), shins: V(0, -0.98, 0.20),
      arms: V(0, -0.72, 0.69), forearms: V(0, -0.55, 0.84),
    }),
  ],
},
```

`makePose` の `width` 既定は `V(1, 0, 0)`。腹臥位では体軸まわりに 180° 回った結果として患者左が -X に来るため `width: V(-1, 0, 0)` を渡す。

- [ ] **Step 4: 実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（10件 ok）。骨長・頭頂向き・肩幅直交の既存検査も新ポーズを含めて通ること。

- [ ] **Step 5: レビューUIで目視確認する**

`?prototype=maneuver-rig&maneuver=basic-positions&pose=0` から `pose=3` まで開き、坐位・仰臥位・腹臥位・起坐が意図どおりに見えることを確認する。

- [ ] **Step 6: コミット**

```bash
git add src/rig/poses.ts scripts/verify_rig_geometry.mjs
git commit -m "feat: add basic positions and 45-degree head roll poses"
```

---

## Task 6: Lempert 手技をリグに追加する

**Files:**
- Modify: `src/rig/poses.ts`
- Modify: `scripts/verify_rig_geometry.mjs`

**Interfaces:**
- Consumes: Task 1-5
- Produces: `ManeuverId` に `'lempert'`。`MANEUVERS.lempert.poses` = `lempert-supine` / `lempert-side` / `lempert-prone` / `lempert-side-far` / `lempert-sit` の5ポーズ

**チェックポイント:** このタスク完了後に一度止めて、レビューUIのスクリーンショットを人が確認する。Lempert は既存の参照実装が無く、見積もりが最もぶれる。

- [ ] **Step 1: 失敗する検査を追加する**

```js
check('Lempert は仰臥位から健側方向へ90度ずつ一周する', () => {
  const poses = MANEUVERS.lempert.poses
  assert.deepEqual(
    poses.map((pose) => pose.id),
    ['lempert-supine', 'lempert-side', 'lempert-prone', 'lempert-side-far', 'lempert-sit'],
  )
  // 鼻の向きが 天井 → 側方 → 床 → 反対側方 と単調に回る
  const noseY = poses.slice(0, 4).map((pose) => pose.faceDirection.y)
  assert.ok(noseY[0] > 0.8, `開始が仰臥位でない: ${noseY[0]}`)
  assert.ok(Math.abs(noseY[1]) < 0.35, `2番目が側臥位でない: ${noseY[1]}`)
  assert.ok(noseY[2] < -0.8, `3番目が腹臥位でない: ${noseY[2]}`)
  assert.ok(Math.abs(noseY[3]) < 0.35, `4番目が側臥位でない: ${noseY[3]}`)
  // 側臥位2つは反対側を向く
  assert.ok(
    poses[1].faceDirection.x * poses[3].faceDirection.x < 0,
    '2つの側臥位が同じ側を向いている',
  )
})

check('Lempert は健側（患者左）から先に下になる', () => {
  const poses = MANEUVERS.lempert.poses
  const faceDown = (id) => widthAxis(poses.find((pose) => pose.id === id))
  // widthAxis は患者左を指すので、左が下になれば y < 0。
  // 鼻の向きだけを見る検査では、回転を逆にした（患側から先に倒す）実装を
  // 素通ししてしまう。絶対的な左右を明示的に固定する
  const near = faceDown('lempert-side')
  const far = faceDown('lempert-side-far')
  assert.ok(near.y < -0.9, `2番目の側臥位で患者左が下になっていない: widthAxis.y = ${near.y.toFixed(3)}`)
  assert.ok(far.y > 0.9, `4番目の側臥位で患者右が下になっていない: widthAxis.y = ${far.y.toFixed(3)}`)
})
```

- [ ] **Step 2: 実行して失敗することを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: FAIL with "Cannot read properties of undefined (reading 'poses')"

- [ ] **Step 3: Lempert を追加する**

`ManeuverId` に `'lempert'` を足し、`MANEUVERS` に追加する。仰臥位の体軸 `V(0, 0.12, -0.993)` を保ったまま `width` を回して体軸まわりのロールを表現する。右患側なら健側＝左方向へ回すので、患者左（+X）が下へ向かう順に回す。

```ts
lempert: {
  id: 'lempert', shortLabel: 'Lempert', title: 'Lempert法（右・向地性）',
  subtitle: '仰臥位から健側（左）方向へ90°ずつ、360°まで回す', camera: 'posterior',
  bedAxis: 'longitudinal', pillow: 'none',
  poses: [
    lempertStep('lempert-supine', '1. 仰臥位', '仰臥位から開始する', 0),
    lempertStep('lempert-side', '2. 健側へ90°', '患側上・健側下の側臥位。各頭位を30〜60秒維持', 1),
    lempertStep('lempert-prone', '3. さらに90°で腹臥位', '体ごと回して腹臥位にする', 2),
    lempertStep('lempert-side-far', '4. さらに90°で患側下', '反対の側臥位へ', 3),
    makePose({
      id: 'lempert-sit', label: '5. 坐位へ戻す', note: '270〜360°まで回してから起坐させる',
      holdMs: 1500, pelvis: V(0, 1.00, 0.72), body: V(0, 0.82, 0.57),
      head: V(0, 0.94, 0.34), face: V(0, 0.10, 0.995), headUp: V(0, 0.94, 0.34),
      thighs: V(0, -0.42, 0.91), shins: V(0, -0.98, 0.20),
      arms: V(0, -0.72, 0.69), forearms: V(0, -0.55, 0.84),
    }),
  ],
},
```

`lempertStep` を `MANEUVERS` の手前に定義する。

```ts
/**
 * 仰臥位の体軸を保ったまま、体軸まわりに quarter × 90° ロールした体位を作る。
 * quarter: 0=仰臥位 1=左下側臥位 2=腹臥位 3=右下側臥位
 */
function lempertStep(id: string, label: string, note: string, quarter: 0 | 1 | 2 | 3): RigPose {
  const bodyDirection = V(0, 0.12, -0.993)
  const angle = (Math.PI / 2) * quarter
  const rotate = (vector: THREE.Vector3) =>
    vector.clone().applyAxisAngle(unit(bodyDirection), angle)
  return makePose({
    id, label, note, holdMs: 1500,
    pelvis: V(0, 1.00, 0.38), body: bodyDirection, width: rotate(V(1, 0, 0)),
    head: bodyDirection, face: rotate(V(0, 1, 0.08)), headUp: bodyDirection,
    legs: V(0, 0.02, 1),
    arms: rotate(V(0.10, -0.02, 0.10)).add(V(0, 0, 0.99)),
    forearms: rotate(V(-0.06, 0.02, 0.06)).add(V(0, 0, 0.99)),
  })
}
```

- [ ] **Step 4: 実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（11件 ok）

- [ ] **Step 5: レビューUIで目視確認しスクリーンショットを撮る**

`?prototype=maneuver-rig&maneuver=lempert&pose=0` から `pose=4` まで開く。仰臥位→側臥位→腹臥位→反対側臥位→坐位が連続した回転として見えることを確認し、5枚のスクリーンショットを人のレビューに出す。

- [ ] **Step 6: コミット**

```bash
git add src/rig/poses.ts scripts/verify_rig_geometry.mjs
git commit -m "feat: add Lempert barbecue rotation maneuver"
```

---

## Task 7: `src/rig/catalog.ts` を作る

**Files:**
- Create: `src/rig/catalog.ts`
- Modify: `scripts/verify_rig_geometry.mjs`

**Interfaces:**
- Consumes: Task 4 の `View` / `Framing` / `ArrowKind`、Task 5-6 の `MANEUVERS`
- Produces:
  - `type PanelSpec = { maneuver: ManeuverId; pose: string; view: View; framing: Framing; mirror?: boolean; arrow?: ArrowKind }`
  - `type CaptureSpec = PanelSpec | { panels: PanelSpec[] }`
  - `const POSE_CATALOG: Record<PoseImageId, CaptureSpec>`
  - `const POSE_IDS: PoseImageId[]`
  - `function resolvePanels(id: PoseImageId): PanelSpec[]`
  - `function resolvePose(panel: PanelSpec): RigPose`

- [ ] **Step 1: 失敗する検査を追加する**

```js
check('カタログが全ポーズIDを網羅し、参照先が実在する', async () => {
  const { POSE_CATALOG, POSE_IDS, resolvePanels, resolvePose } = await import('../src/rig/catalog.ts')
  assert.equal(POSE_IDS.length, 27, `ID数が 27 でない: ${POSE_IDS.length}`)
  for (const id of POSE_IDS) {
    assert.ok(POSE_CATALOG[id], `${id} のカタログ項目が無い`)
    const panels = resolvePanels(id)
    assert.ok(panels.length >= 1, `${id} のパネルが空`)
    for (const panel of panels) {
      const pose = resolvePose(panel)
      assert.ok(pose, `${id} の参照先 ${panel.maneuver}/${panel.pose} が解決できない`)
    }
  }
})

check('帯状合成は lempert_full と lempert_half のみ', async () => {
  const { POSE_CATALOG, POSE_IDS, resolvePanels } = await import('../src/rig/catalog.ts')
  const strips = POSE_IDS.filter((id) => 'panels' in POSE_CATALOG[id])
  assert.deepEqual(strips.sort(), ['lempert_full', 'lempert_half'])
  assert.equal(resolvePanels('lempert_full').length, 5)
  assert.equal(resolvePanels('lempert_half').length, 3)
})
```

`check` を await できるよう、`check` の定義を非同期対応にする。

```js
const check = async (name, fn) => {
  try {
    await fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
    console.log(`  FAIL ${name}`)
  }
}
```

既存の `check(...)` 呼び出しをすべて `await check(...)` に変える。トップレベル await は `.mjs` で使える。

- [ ] **Step 2: 実行して失敗することを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: FAIL with "Cannot find module .../src/rig/catalog.ts"

- [ ] **Step 3: `src/rig/catalog.ts` を作る**

```ts
import { MANEUVERS, mirrorPose, type ManeuverId, type RigPose } from './poses'
import type { ArrowKind, Framing, View } from './scene'
import type { PoseImageId } from '../data/poseImages'

export type PanelSpec = {
  maneuver: ManeuverId
  pose: string
  view: View
  framing: Framing
  mirror?: boolean
  arrow?: ArrowKind
}

export type CaptureSpec = PanelSpec | { panels: PanelSpec[] }

const panel = (
  maneuver: ManeuverId, pose: string, view: View, framing: Framing,
  extra: { mirror?: boolean; arrow?: ArrowKind } = {},
): PanelSpec => ({ maneuver, pose, view, framing, ...extra })

/**
 * ゲーム本体の体位画像IDと、リグのポーズを結ぶ唯一の場所。
 *
 * `satisfies Record<PoseImageId, CaptureSpec>` により、poseImages.ts に
 * ID を足してここを更新し忘れると tsc が落ちる。
 */
export const POSE_CATALOG = {
  headroll_c: panel('supine-roll', 'roll-neutral', 'cranial', 'head'),
  headroll_r45: panel('supine-roll', 'roll-right-45', 'cranial', 'head'),
  headroll_r90: panel('supine-roll', 'roll-right', 'cranial', 'head'),
  headroll_l45: panel('supine-roll', 'roll-left-45', 'cranial', 'head'),
  headroll_l90: panel('supine-roll', 'roll-left', 'cranial', 'head'),

  sitting_front: panel('basic-positions', 'sitting-front', 'front', 'full'),
  supine: panel('basic-positions', 'supine-full', 'cranial', 'full'),
  prone: panel('basic-positions', 'prone', 'cranial', 'full'),
  sit_up: panel('basic-positions', 'sit-up', 'lateral', 'full'),

  dh_sit_r: panel('dix-hallpike', 'dix-yaw', 'lateral', 'full'),
  dh_sit_l: panel('dix-hallpike', 'dix-yaw', 'lateral', 'full', { mirror: true }),
  dh_hang_r: panel('dix-hallpike', 'dix-hang', 'lateral', 'full'),
  dh_hang_l: panel('dix-hallpike', 'dix-hang', 'lateral', 'full', { mirror: true }),

  ep_cross_r: panel('epley', 'epley-hang-left', 'lateral', 'head'),
  ep_cross_l: panel('epley', 'epley-hang-left', 'lateral', 'head', { mirror: true }),

  side_r: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'cranial', 'full'),
  side_l: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'cranial', 'full', { mirror: true }),
  side_r_facedown: panel('gufoni-geotropic', 'gufoni-g-down', 'cranial', 'head', { mirror: true }),
  side_l_facedown: panel('gufoni-geotropic', 'gufoni-g-down', 'cranial', 'head'),
  side_r_faceup: panel('gufoni-apogeotropic', 'gufoni-a-up', 'cranial', 'head'),
  side_l_faceup: panel('gufoni-apogeotropic', 'gufoni-a-up', 'cranial', 'head', { mirror: true }),

  gufoni_fall_r: panel('gufoni-apogeotropic', 'gufoni-a-fall', 'front', 'full', { arrow: 'fall-right' }),
  gufoni_fall_l: panel('gufoni-geotropic', 'gufoni-g-fall', 'front', 'full', { arrow: 'fall-left' }),

  lempert_roll_r: panel('lempert', 'lempert-side', 'cranial', 'full', { mirror: true, arrow: 'roll-right' }),
  lempert_roll_l: panel('lempert', 'lempert-side', 'cranial', 'full', { arrow: 'roll-left' }),

  lempert_full: {
    panels: [
      panel('lempert', 'lempert-supine', 'cranial', 'full'),
      panel('lempert', 'lempert-side', 'cranial', 'full'),
      panel('lempert', 'lempert-prone', 'cranial', 'full'),
      panel('lempert', 'lempert-side-far', 'cranial', 'full'),
      panel('lempert', 'lempert-sit', 'lateral', 'full'),
    ],
  },
  lempert_half: {
    panels: [
      panel('lempert', 'lempert-supine', 'cranial', 'full'),
      panel('lempert', 'lempert-side', 'cranial', 'full'),
      panel('lempert', 'lempert-prone', 'cranial', 'full'),
    ],
  },
} satisfies Record<PoseImageId, CaptureSpec>

export const POSE_IDS = Object.keys(POSE_CATALOG) as PoseImageId[]

export function resolvePanels(id: PoseImageId): PanelSpec[] {
  const spec: CaptureSpec = POSE_CATALOG[id]
  return 'panels' in spec ? spec.panels : [spec]
}

export function resolvePose(spec: PanelSpec): RigPose {
  const pose = MANEUVERS[spec.maneuver].poses.find((item) => item.id === spec.pose)
  if (!pose) throw new Error(`ポーズが見つからない: ${spec.maneuver}/${spec.pose}`)
  return spec.mirror ? mirrorPose(pose) : pose
}
```

`side_r`（右が下）は `gufoni-a-fall`（direction -1 = 患者右へ倒す = 右肩が下）をそのまま使う。`side_l` はそのミラー。`side_*_facedown` は向地性の鼻下ポーズ（direction +1 = 左が下）を基準にし、右下版はミラーで作る。

- [ ] **Step 4: 実行して通ることを確認する**

Run: `node scripts/verify_rig_geometry.mjs`
Expected: PASS（13件 ok）

- [ ] **Step 5: 型の網羅を確認する**

Run: `npm run typecheck`
Expected: PASS。試しに `POSE_CATALOG` から `prone:` の行を一時的に消すと `satisfies` でエラーになることを確認し、元に戻す。

- [ ] **Step 6: コミット**

```bash
git add src/rig/catalog.ts scripts/verify_rig_geometry.mjs
git commit -m "feat: add typed pose capture catalog covering all 27 game image ids"
```

---

## Task 8: 書き出し専用ルートを作る

**Files:**
- Create: `src/prototypes/PoseExportRoute.tsx`
- Modify: `src/App.tsx:9-20`
- Modify: `src/prototypes/dixHallpikeRig.css`

**Interfaces:**
- Consumes: Task 4 の `scene.ts`、Task 7 の `catalog.ts`
- Produces: `?prototype=pose-export&id=<PoseImageId>&panel=<N>` で 1024×1024 の透過キャンバスを描画するルート。準備完了で `.pose-export-canvas` の `dataset.ready === '1'`、`window.__POSE_IDS__` に ID 一覧

- [ ] **Step 1: `src/prototypes/PoseExportRoute.tsx` を作る**

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { POSE_IDS, resolvePanels, resolvePose } from '../rig/catalog'
import { fitCamera, makeDirectionArrow, makePatient, makeRoom } from '../rig/scene'
import { MANEUVERS } from '../rig/poses'
import type { PoseImageId } from '../data/poseImages'
import './dixHallpikeRig.css'

const SIZE = 1024

declare global {
  interface Window {
    __POSE_IDS__?: PoseImageId[]
  }
}

/**
 * 書き出し専用ルート。1リクエストで1パネルだけを透過で描く。
 *
 * レビューUIとは別ルートにしている。UI装飾・鼻方向の赤矢印・背景・床は
 * 書き出しに入れてはならないため、条件分岐で共用すると事故りやすい。
 */
export function PoseExportRoute() {
  const mountRef = useRef<HTMLDivElement>(null)
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id') as PoseImageId | null
  const panelIndex = Number(params.get('panel') ?? 0) || 0

  useEffect(() => {
    window.__POSE_IDS__ = POSE_IDS
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !id) return

    const panels = resolvePanels(id)
    const spec = panels[Math.min(panels.length - 1, Math.max(0, panelIndex))]
    const pose = resolvePose(spec)

    const scene = new THREE.Scene()
    scene.background = null
    scene.add(new THREE.HemisphereLight(0xffffff, 0x687982, 2.25))
    const key = new THREE.DirectionalLight(0xffffff, 3.5)
    key.position.set(3.5, 7, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)

    scene.add(makeRoom(MANEUVERS[spec.maneuver], { floor: false }))
    scene.add(makePatient(pose, { skeleton: false, noseArrow: false }))
    if (spec.arrow) scene.add(makeDirectionArrow(pose, spec.arrow))

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
    fitCamera(camera, pose, spec.view, spec.framing)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(SIZE, SIZE, false)
    renderer.setClearAlpha(0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    mount.dataset.ready = '1'

    return () => {
      mount.dataset.ready = '0'
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [id, panelIndex])

  if (!id) {
    return <div className="pose-export-list">{POSE_IDS.join(',')}</div>
  }
  return <main className="pose-export"><div ref={mountRef} className="pose-export-canvas" /></main>
}
```

- [ ] **Step 2: CSS を足す**

`src/prototypes/dixHallpikeRig.css` の末尾に追加する。背景を透明にすることがスクリーンショットの透過に必要。

```css
.pose-export {
  width: 1024px;
  height: 1024px;
  margin: 0;
  background: transparent;
}

.pose-export-canvas,
.pose-export-canvas canvas {
  width: 1024px;
  height: 1024px;
  display: block;
}

.pose-export-list {
  font: 12px/1.4 ui-monospace, monospace;
  word-break: break-all;
}
```

- [ ] **Step 3: `src/App.tsx` にルートを足す**

既存の条件分岐に `pose-export` を追加する。**この際、条件付き `useReducer`（Rules of Hooks 違反）は直さない。設計書 §11 でスコープ外としている。**

```tsx
const ManeuverRigPrototype = lazy(() =>
  import('./prototypes/ManeuverRigPrototype').then((module) => ({ default: module.ManeuverRigPrototype })),
)
const PoseExportRoute = lazy(() =>
  import('./prototypes/PoseExportRoute').then((module) => ({ default: module.PoseExportRoute })),
)

export default function App() {
  const prototype = new URLSearchParams(window.location.search).get('prototype') ?? ''
  if (prototype === 'pose-export') {
    return (
      <Suspense fallback={<div className="rig-loading">読み込み中...</div>}>
        <PoseExportRoute />
      </Suspense>
    )
  }
  if (['dix-rig', 'maneuver-rig'].includes(prototype)) {
    return (
      <Suspense fallback={<div className="rig-loading">3Dモデルを読み込み中...</div>}>
        <ManeuverRigPrototype />
      </Suspense>
    )
  }
  // ...以降は既存のまま
}
```

- [ ] **Step 4: ビルドを通す**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: 手動で数枚を目視確認する**

dev サーバで次を順に開き、人物が画面いっぱいに写り、背景が透明（ブラウザの白地が見える）で、UI装飾も赤い鼻矢印も写っていないことを確認する。

- `?prototype=pose-export&id=dh_hang_r`
- `?prototype=pose-export&id=side_r_facedown`
- `?prototype=pose-export&id=gufoni_fall_l`
- `?prototype=pose-export&id=headroll_r90`

- [ ] **Step 6: コミット**

```bash
git add src/prototypes/PoseExportRoute.tsx src/prototypes/dixHallpikeRig.css src/App.tsx
git commit -m "feat: add transparent pose export route driven by the catalog"
```

---

## Task 9: 撮影スクリプトを作る

**Files:**
- Create: `scripts/capture_pose_images.mjs`

**Interfaces:**
- Consumes: Task 8 のルート
- Produces: `public/poses/_raw/<id>-<panel>.png`（1024×1024 透過 PNG）

- [ ] **Step 0: playwright を devDependency に追加する**

`playwright` はインストールされていない。既存の `scripts/capture_maneuver_rig_frames.mjs` も動かない状態になっている。

```bash
npm install --save-dev playwright
```

`channel: 'msedge'` でシステムの Edge を使うため、`npx playwright install` によるブラウザ本体のダウンロードは不要。`package.json` と `package-lock.json` の変更をコミットに含める。

- [ ] **Step 1: `scripts/capture_pose_images.mjs` を作る**

`scripts/capture_maneuver_rig_frames.mjs` と同じ流儀（`createRequire` で playwright、`channel: 'msedge'`）に合わせる。

```js
import { createRequire } from 'node:module'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const baseUrl = process.env.POSE_EXPORT_URL ?? 'http://127.0.0.1:5173/'
const rawRoot = path.resolve('public/poses/_raw')
const SIZE = 1024

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
})

const listUrl = new URL(baseUrl)
listUrl.searchParams.set('prototype', 'pose-export')
await page.goto(listUrl.toString(), { waitUntil: 'networkidle' })
const allIds = await page.evaluate(() => window.__POSE_IDS__)
if (!Array.isArray(allIds) || allIds.length === 0) throw new Error('ID一覧を取得できなかった')

// POSE_EXPORT_ONLY にカンマ区切りで ID を渡すと、その分だけ撮る（判読性の試写用）
const only = (process.env.POSE_EXPORT_ONLY ?? '').split(',').map((item) => item.trim()).filter(Boolean)
for (const id of only) {
  if (!allIds.includes(id)) throw new Error(`POSE_EXPORT_ONLY に未知の ID: ${id}`)
}
const ids = only.length > 0 ? only : allIds

// 部分撮影のときは既存を消さない。全件撮影のときだけ作り直す
if (only.length === 0) await rm(rawRoot, { recursive: true, force: true })
await mkdir(rawRoot, { recursive: true })

const manifest = []
for (const id of ids) {
  for (let panelIndex = 0; ; panelIndex += 1) {
    const url = new URL(baseUrl)
    url.searchParams.set('prototype', 'pose-export')
    url.searchParams.set('id', id)
    url.searchParams.set('panel', String(panelIndex))
    await page.goto(url.toString(), { waitUntil: 'networkidle' })
    const canvas = page.locator('.pose-export-canvas')
    await canvas.waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.querySelector('.pose-export-canvas')?.dataset.ready === '1')

    const panelCount = await page.evaluate(() => Number(document.body.dataset.panelCount ?? '1'))
    const destination = path.join(rawRoot, `${id}-${panelIndex}.png`)
    await canvas.screenshot({ path: destination, omitBackground: true, animations: 'disabled' })
    manifest.push({ id, panel: panelIndex, file: path.basename(destination) })
    if (panelIndex + 1 >= panelCount) break
  }
  console.log(`captured ${id}`)
}

await writeFile(path.join(rawRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
await browser.close()
console.log(`\n${manifest.length} panels captured for ${ids.length} ids`)
```

パネル数をページから読むため、`PoseExportRoute.tsx` の `useEffect` に1行足す。

```tsx
useEffect(() => {
  window.__POSE_IDS__ = POSE_IDS
  if (id) document.body.dataset.panelCount = String(resolvePanels(id).length)
}, [id])
```

- [ ] **Step 2: dev サーバを起動して数枚だけ試す**

`.claude/launch.json` の `vertigo-dev` を起動する。全件回す前に4種だけ撮って判読性を確認する。

```bash
POSE_EXPORT_ONLY=dh_hang_r,side_r_facedown,gufoni_fall_l,lempert_full node scripts/capture_pose_images.mjs
```

Expected: `public/poses/_raw/` に 8 枚の PNG（単体3種＋`lempert_full` の5パネル）、`4 ids`

- [ ] **Step 3: 撮れた PNG を目視確認する**

4種を開き、人物がフレームの過半を占め、背景が透過し、頭位が判別できることを確認する。占有率が足りなければ `fitCamera` の `margin` を下げるか、カタログの `framing` を `head` に変える。

- [ ] **Step 4: 全件を撮る**

```bash
node scripts/capture_pose_images.mjs
```

Expected: `33 panels captured for 27 ids`（単体25種×1 ＋ `lempert_full` 5 ＋ `lempert_half` 3 = 33）

- [ ] **Step 5: コミット**

`_raw` は中間成果物なので追跡しない。`.gitignore` に足す。

```bash
echo "public/poses/_raw/" >> .gitignore
git add scripts/capture_pose_images.mjs src/prototypes/PoseExportRoute.tsx .gitignore
git commit -m "feat: add playwright capture script for pose images"
```

---

## Task 10: 合成と WebP 変換スクリプトを作る

**Files:**
- Create: `scripts/compose_pose_images.py`

**Interfaces:**
- Consumes: Task 9 の `public/poses/_raw/*.png` と `manifest.json`
- Produces: `public/poses/<file>.webp`（512×512、`poseImages.ts` の `file` 名）

- [ ] **Step 1: `scripts/compose_pose_images.py` を作る**

```python
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = ROOT / "public" / "poses" / "_raw"
OUT_ROOT = ROOT / "public" / "poses"
SIZE = 512
QUALITY = 88

# poseImages.ts の file フィールドから id -> ファイル名を読む
POSE_IMAGES_TS = ROOT / "src" / "data" / "poseImages.ts"
ENTRY = re.compile(r"^  ([a-z0-9_]+): \{\s*\n\s*file: '([^']+)'", re.MULTILINE)


def file_names() -> dict[str, str]:
    text = POSE_IMAGES_TS.read_text(encoding="utf-8")
    names = {pose_id: file for pose_id, file in ENTRY.findall(text)}
    if len(names) != 27:
        raise SystemExit(f"poseImages.ts から読めた ID が 27 件でない: {len(names)}")
    return names


def trim_to_square(image: Image.Image) -> Image.Image:
    """被写体のアルファ境界で切り出し、正方形に整えてから縮小する。"""
    box = image.getbbox()
    if box is None:
        raise SystemExit("被写体が空の画像がある")
    cropped = image.crop(box)
    side = max(cropped.width, cropped.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def compose_strip(panels: list[Image.Image]) -> Image.Image:
    """複数コマを横に並べ、全体を SIZE 幅の帯に収める。"""
    trimmed = []
    for panel in panels:
        box = panel.getbbox()
        if box is None:
            raise SystemExit("帯状合成のパネルが空")
        trimmed.append(panel.crop(box))
    height = max(item.height for item in trimmed)
    gap = height // 12
    width = sum(item.width for item in trimmed) + gap * (len(trimmed) - 1)
    strip = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = 0
    for item in trimmed:
        strip.paste(item, (x, (height - item.height) // 2))
        x += item.width + gap
    side = max(strip.width, strip.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(strip, ((side - strip.width) // 2, (side - strip.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def main() -> None:
    names = file_names()
    manifest = json.loads((RAW_ROOT / "manifest.json").read_text(encoding="utf-8"))
    grouped: dict[str, list[Path]] = {}
    for entry in manifest:
        grouped.setdefault(entry["id"], []).append(RAW_ROOT / entry["file"])

    written = 0
    for pose_id, paths in grouped.items():
        if pose_id not in names:
            raise SystemExit(f"poseImages.ts に無い ID: {pose_id}")
        panels = [Image.open(path).convert("RGBA") for path in sorted(paths)]
        result = trim_to_square(panels[0]) if len(panels) == 1 else compose_strip(panels)
        destination = OUT_ROOT / names[pose_id]
        result.save(destination, "WEBP", quality=QUALITY, method=6)
        written += 1
        print(f"wrote {destination.name}")

    if written != 27:
        raise SystemExit(f"書き出した画像が 27 件でない: {written}")
    print(f"\n{written} images written")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 実行する**

Run: `python scripts/compose_pose_images.py`
Expected: `27 images written`。`public/poses/` に 27 個の `.webp`

- [ ] **Step 3: 既存 headroll が上書きされたことを確認する**

Run: `python -c "from PIL import Image; im = Image.open('public/poses/headroll-c.webp'); print(im.mode, im.size)"`
Expected: `RGBA (512, 512)`

- [ ] **Step 4: コミット**

```bash
git add scripts/compose_pose_images.py public/poses
git commit -m "feat: compose and export 27 transparent pose images from the rig"
```

---

## Task 11: 画像検証スクリプトを作る

**Files:**
- Create: `scripts/verify_pose_images.py`

**Interfaces:**
- Consumes: Task 10 の `public/poses/*.webp`
- Produces: 非ゼロ終了で違反を報告する検証コマンド

- [ ] **Step 1: `scripts/verify_pose_images.py` を作る**

```python
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POSES = ROOT / "public" / "poses"
POSE_IMAGES_TS = ROOT / "src" / "data" / "poseImages.ts"
SIZE = 512
MIN_FILL = 0.55
# 頭部寄りは頭と肩しか写らないので、より高い占有率を要求できる。
# 頭部 bbox そのものは画像単体からは測れないため、全体占有率で代用する
MIN_FILL_HEAD = 0.70

ENTRY = re.compile(r"^  ([a-z0-9_]+): \{\s*\n\s*file: '([^']+)'", re.MULTILINE)
# head フレーミングで書き出す ID。src/rig/catalog.ts と一致させること
HEAD_FRAMED = {
    "headroll_c", "headroll_r45", "headroll_r90", "headroll_l45", "headroll_l90",
    "ep_cross_r", "ep_cross_l",
    "side_r_facedown", "side_l_facedown", "side_r_faceup", "side_l_faceup",
}
STRIPS = {"lempert_full", "lempert_half"}


def main() -> None:
    text = POSE_IMAGES_TS.read_text(encoding="utf-8")
    names = {pose_id: file for pose_id, file in ENTRY.findall(text)}
    failures: list[str] = []
    signatures: dict[bytes, str] = {}

    for pose_id, file in sorted(names.items()):
        path = POSES / file
        if not path.exists():
            failures.append(f"{pose_id}: {file} が無い")
            continue
        image = Image.open(path).convert("RGBA")
        if image.size != (SIZE, SIZE):
            failures.append(f"{pose_id}: サイズが {image.size}、{SIZE}x{SIZE} でない")
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] != 0:
            failures.append(f"{pose_id}: 完全透明な画素が無い（背景が抜けていない）")

        box = alpha.getbbox()
        if box is None:
            failures.append(f"{pose_id}: 被写体が空")
            continue
        # 帯状合成は横長になるので、縦の占有率だけを見る
        fill_x = (box[2] - box[0]) / SIZE
        fill_y = (box[3] - box[1]) / SIZE
        if pose_id in STRIPS:
            if fill_x < 0.9:
                failures.append(f"{pose_id}: 帯の横占有率が {fill_x:.2f}（0.90 未満）")
        else:
            minimum = MIN_FILL_HEAD if pose_id in HEAD_FRAMED else MIN_FILL
            if fill_x < minimum or fill_y < minimum:
                failures.append(
                    f"{pose_id}: 被写体占有率が {fill_x:.2f}x{fill_y:.2f}（{minimum} 未満）"
                )

        signature = image.tobytes()
        if signature in signatures:
            failures.append(f"{pose_id}: {signatures[signature]} と同一画像")
        signatures[signature] = pose_id

    if failures:
        print(f"{len(failures)} 件失敗")
        for line in failures:
            print(f"  - {line}")
        raise SystemExit(1)
    print(f"画像検証を通過した: {len(names)} 枚")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 実行する**

Run: `python scripts/verify_pose_images.py`
Expected: `画像検証を通過した: 27 枚`

落ちた場合、原因はほぼ `fitCamera` の余白かフレーミング指定である。`margin` を下げるか `framing` を `head` に変え、Task 9 の撮影から回し直す。

- [ ] **Step 3: 検証が実際に効くことを確認する**

`MIN_FILL` を一時的に `0.99` にして実行し、複数件の失敗が出て非ゼロ終了することを確認してから戻す。

Run: `python scripts/verify_pose_images.py; echo "exit=$?"`
Expected: `exit=1`

- [ ] **Step 4: コミット**

```bash
git add scripts/verify_pose_images.py
git commit -m "test: verify pose image size, alpha, fill ratio, and uniqueness"
```

---

## Task 12: ゲームへ統合する

**Files:**
- Modify: `src/styles/global.css:453-460`
- Modify: `vite.config.ts:31-43`

**Interfaces:**
- Consumes: Task 10 の `public/poses/*.webp`
- Produces: プレースホルダのないゲーム画面

- [ ] **Step 1: `.posefilm-stage` のアスペクト比を直す**

`src/styles/global.css` の `.posefilm-stage` の `aspect-ratio: 480 / 470;` を `aspect-ratio: 1 / 1;` にする。コメントもあわせて直す。

```css
.posefilm-stage {
  position: relative;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  /* 画像は正方形。切り替えで高さが動かないよう場所を確保する */
  aspect-ratio: 1 / 1;
}
```

- [ ] **Step 2: PWA precache から v7 を外す**

`vite.config.ts` の `globIgnores` に2行足す。

```ts
globIgnores: [
  '**/vertigo-maneuvers-v2/**',
  '**/vertigo-maneuvers-v3/**',
  '**/vertigo-maneuvers-v3/sources/**',
  '**/vertigo-maneuvers-v3/**/frames/**',
  '**/vertigo-maneuvers-v3/**/review/**',
  '**/vertigo-maneuvers-v3/shared/*-master.png',
  '**/vertigo-maneuvers-v4/**',
  '**/vertigo-maneuvers-v5/**',
  '**/vertigo-maneuvers-v6-prototype/**',
  '**/vertigo-maneuvers-v7-rig/**',
  '**/DixHallpikeRigPrototype-*.*',
  '**/ManeuverRigPrototype-*.*',
  '**/PoseExportRoute-*.*',
],
```

- [ ] **Step 3: ビルドして precache を確認する**

Run: `npm run build`
Expected: PASS。`precache` のエントリ数とサイズが減っていること（v7 の 100 ファイル 4.1MiB と ManeuverRigPrototype の 548KB が消え、`public/poses/` の 27 枚が入る）

precache の中身を数える。`dist/sw.js` の precache manifest は `url:"..."` の形で埋め込まれている。

```bash
node --input-type=module -e "import {readFileSync} from 'node:fs'; const urls=[...readFileSync('dist/sw.js','utf8').matchAll(/url:\"([^\"]+)\"/g)].map(m=>m[1]); console.log('total', urls.length, '| v7', urls.filter(u=>u.includes('v7-rig')).length, '| poses', urls.filter(u=>u.startsWith('poses/')).length);"
```

Expected: `v7 0`、`poses 27`

- [ ] **Step 4: 実機でプレースホルダが消えたことを確認する**

dev サーバを起動し、ビューポートを 375×812 にする。ゲームを進めて耳石置換法ミニゲームを開き、次を確認する。

- 「イラスト準備中」のプレースホルダが1つも出ない
- 選択肢タイル（実質110px前後）で頭位・倒す向きが判別できる
- Exam 画面の Supine Head Roll でコマ送りが動く
- コンソールエラーが 0 件

選択肢タイルの実寸スクリーンショットを撮って人のレビューに出す。

- [ ] **Step 5: 全検証を通す**

```bash
node scripts/verify_rig_geometry.mjs && python scripts/verify_pose_images.py && npm run build
```
Expected: すべて PASS

- [ ] **Step 6: コミット**

```bash
git add src/styles/global.css vite.config.ts
git commit -m "feat: wire rig-rendered pose images into the game and trim PWA precache"
```

---

## Task 13: medical-maneuver-gif スキルを更新する

**Files:**
- Modify: `skills/medical-maneuver-gif/references/rigged-3d-workflow.md`
- Modify: `skills/medical-maneuver-gif/SKILL.md`
- Delete: `.skill_staging/`（git 追跡から外す）

**Interfaces:**
- Consumes: Task 1-12 で得た知見
- Produces: 更新されたスキル正本

`skills/` が正本、`.claude/skills/` と `.agents/skills/` は正本を指すアダプタなので**正本のみ更新する**。

- [ ] **Step 1: `rigged-3d-workflow.md` の Required automated checks を拡張する**

現行の "expected nose direction for every directional pose" の直後に2項目を足す。今回の Gufoni バグは鼻方向だけを見る検査では検出できなかった。

```markdown
- expected nose direction for every directional pose;
- head-up alignment for every pose: the head-up vector must agree with the neck-to-head
  direction (dot product > 0.9). A pose that rolls the head about the body axis must not
  change which way the crown points. Checking nose direction alone does not catch a
  180-degree head flip;
- lateral decubitus side: for every side-lying pose, the shoulder that ends up lower must
  match the fall direction the maneuver declares. Record the fall side on the pose data so
  the check has something to compare against;
```

- [ ] **Step 2: `rigged-3d-workflow.md` の Rendering and export にカメラ規定を足す**

"Render at the final aspect ratio, preferably at least 768 × 512." の段落の直後に足す。

```markdown
Do not hand-set camera coordinates per pose. Derive the camera from the pose itself:
choose the view direction from the pose's own anatomical frame (face direction, shoulder
width axis, body axis) so that mirrored poses get a correct camera for free, then solve
distance and target by fitting the bounding box of the points that matter for the
question the image answers. Hand-tuned cameras drift pose by pose and are the most
common cause of an anatomically correct rig producing an unreadable figure.

Keep screen-up as world-up whenever floor and ceiling carry clinical meaning, such as
nose-to-floor versus nose-to-ceiling variants.
```

- [ ] **Step 3: `rigged-3d-workflow.md` に判読性予算の節を新設する**

"## Required automated checks" の直前に足す。

```markdown
## Legibility budget

Resolution is not legibility. An asset rendered at 768 x 512 can still be unreadable if
the subject occupies a quarter of the frame and the consumer displays it at 110 px.

Before rendering, record the smallest width at which the consuming surface actually
displays the asset. Measure it in the consumer, do not assume it. Then:

- pick the framing from the question the image answers. A "which way did the head turn"
  image needs the head and shoulders, not the whole body; a "which way did the patient
  fall" image needs the whole body;
- require the subject bounding box to fill a declared minimum fraction of the frame, and
  assert it automatically on every exported image;
- verify at the real display size, not at full resolution. Render the asset at the
  consumer's smallest display width and confirm the distinguishing feature is still
  visible.

Two assets that answer different questions must not be pixel-identical. Assert that too;
it catches catalog mistakes that no geometry check will find.
```

- [ ] **Step 4: `SKILL.md` に静止画セットの出力形態を足す**

"Create pose-to-pose educational animations..." の段落の直後に足す。

```markdown
The deliverable is not always a GIF. When the consumer is an application that already has
its own frame-stepping or selection UI, the right output is a set of registered
transparent still images keyed by the consumer's own identifiers. The clinical rules,
review gates, and rig invariants in this skill apply unchanged to that form. Bind the
generated set to the consumer's identifiers in a way the type system or build can check,
so a missing or renamed asset fails the build instead of silently rendering a
placeholder.
```

- [ ] **Step 5: `SKILL.md` の完了条件に実表示サイズの確認を足す**

"## Completion and stopping rules" の箇条書きに追加する。

```markdown
- Confirm legibility at the consumer's real display size before declaring completion. An
  asset that is correct at full resolution and unreadable in the consuming UI is not done.
```

- [ ] **Step 6: `.skill_staging/` を git 追跡から外す**

作業ツリーでは既に削除済みで、`skills/` が後継になっている。

```bash
git rm -r --cached .skill_staging
```

- [ ] **Step 7: スキルの記述が実装と一致することを確認する**

`scripts/verify_rig_geometry.mjs` に head-up 検査と側臥位検査が実在すること、`scripts/verify_pose_images.py` に占有率検査と同一画像検査が実在することを目視で突き合わせる。スキルが要求する検査が実装に無ければ、どちらかを直す。

- [ ] **Step 8: コミット**

`.skill_staging` は Step 6 の `git rm -r --cached` で既にステージ済み。作業ツリーに実体が無いので `git add .skill_staging` はパスが一致せずエラーになる。ステージ済みの削除をそのままコミットする。

```bash
git add skills/medical-maneuver-gif
git commit -m "docs: teach medical-maneuver-gif skill the head-up, decubitus, and legibility lessons"
```

---

## 完了条件

- `node scripts/verify_rig_geometry.mjs` が通る
- `python scripts/verify_pose_images.py` が通る
- `npm run build` が通り、precache に v7 が含まれない
- 375×812 の実機でプレースホルダが 0 件、選択肢タイルで頭位が判別できる
- `skills/medical-maneuver-gif/` の要求と `scripts/verify_*` の実装が一致している
