import assert from 'node:assert/strict'
import { register } from 'node:module'

// src/rig/scene.ts imports src/rig/poses.ts with an extensionless specifier
// (the project-wide convention inside src/). Plain Node ESM resolution can't
// follow that on its own, so register a tiny loader before pulling either
// module in. See scripts/rig-ts-loader.mjs.
register('./rig-ts-loader.mjs', import.meta.url)

const { MANEUVERS, TREE, HEAD_RADIUS, V, bodyAxis, widthAxis, neckToHead, mirrorPose } = await import('../src/rig/poses.ts')
const { framingPoints, viewDirection, screenUp } = await import('../src/rig/scene.ts')

const allPoses = () => Object.values(MANEUVERS).flatMap((maneuver) => maneuver.poses)
const failures = []
const check = async (name, fn) => {
  try {
    await fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
    console.log(`  FAIL ${name}`)
  }
}

await check('骨長が全ポーズで一致する', () => {
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

await check('肩幅軸と体幹軸が直交する', () => {
  for (const pose of allPoses()) {
    const dot = Math.abs(widthAxis(pose).dot(bodyAxis(pose)))
    assert.ok(dot < 1e-6, `${pose.id} で肩幅軸と体幹軸の内積が ${dot}`)
  }
})

await check('頭頂の向きが頸→頭の向きと揃っている', () => {
  for (const pose of allPoses()) {
    const dot = pose.headUp.dot(neckToHead(pose))
    assert.ok(dot > 0.9, `${pose.id} で headUp・neckToHead = ${dot.toFixed(2)}（頭部が反転している）`)
  }
})

await check('側臥位で下になる肩が転倒方向と一致する', () => {
  for (const pose of allPoses()) {
    if (!pose.fallSide) continue
    const lower = pose.joints.shoulderLeft.y < pose.joints.shoulderRight.y ? 'left' : 'right'
    assert.equal(
      lower, pose.fallSide,
      `${pose.id} は ${pose.fallSide} へ倒れたのに ${lower} 肩が下になっていない`,
    )
  }
})

await check('ミラーは X 反転で、2回かけると元に戻る', () => {
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

await check('視点方向が患者相対で定義されている', () => {
  const dix = MANEUVERS['dix-hallpike'].poses[0]
  const front = viewDirection(dix, 'front')
  assert.ok(front.dot(dix.faceDirection) < -0.99, `front の視線が顔の逆を向いていない: ${front.dot(dix.faceDirection)}`)
  const lateral = viewDirection(dix, 'lateral')
  assert.ok(lateral.dot(widthAxis(dix)) > 0.99, 'lateral の視線が患者左向きでない')
  const cranial = viewDirection(dix, 'cranial')
  assert.ok(cranial.dot(bodyAxis(dix)) < -0.99, 'cranial の視線が頭側からでない')
})

await check('head フレーミングは頭と肩だけを対象にする', () => {
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

await check('画角の対象点が頭部の体積（半径 HEAD_RADIUS）を包含する', async () => {
  // framingPoints は関節「点」を囲むだけだと頭の球がはみ出す。full/head どちらの
  // フレーミングでも、頭関節を中心に6方向すべてで半径分の余裕があることを検証する。
  // カタログの各パネルが実際に使う framing を総当たりするので、
  // 特定ポーズだけを個別に見るより取りこぼしがない
  const { POSE_IDS, resolvePanels, resolvePose } = await import('../src/rig/catalog.ts')
  const axes = [
    ['+x', V(1, 0, 0)], ['-x', V(-1, 0, 0)],
    ['+y', V(0, 1, 0)], ['-y', V(0, -1, 0)],
    ['+z', V(0, 0, 1)], ['-z', V(0, 0, -1)],
  ]
  for (const id of POSE_IDS) {
    for (const spec of resolvePanels(id)) {
      const pose = resolvePose(spec)
      const points = framingPoints(pose, spec.framing)
      for (const [axisName, axis] of axes) {
        const covered = points.some((point) => point.clone().sub(pose.joints.head).dot(axis) >= HEAD_RADIUS)
        assert.ok(
          covered,
          `${id} (${spec.maneuver}/${spec.pose}, framing=${spec.framing}) の画角対象点が頭部の ${axisName} 方向を覆っていない`,
        )
      }
    }
  }
})

await check('カタログが要求する単体ポーズが存在する', () => {
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

await check('腹臥位は鼻が床を向く', () => {
  const prone = MANEUVERS['basic-positions'].poses.find((pose) => pose.id === 'prone')
  assert.ok(prone.faceDirection.y < -0.8, `腹臥位の鼻が下を向いていない: y=${prone.faceDirection.y}`)
})

await check('45度頭位が正中と90度頭位の中間にある', () => {
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

await check('Lempert は仰臥位から健側方向へ90度ずつ一周する', () => {
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

await check('Lempert は健側（患者左）から先に下になる', () => {
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

await check('カタログが全ポーズIDを網羅し、参照先が実在する', async () => {
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

await check('帯状合成は lempert_full と lempert_half のみ', async () => {
  const { POSE_CATALOG, POSE_IDS, resolvePanels } = await import('../src/rig/catalog.ts')
  const strips = POSE_IDS.filter((id) => 'panels' in POSE_CATALOG[id])
  assert.deepEqual(strips.sort(), ['lempert_full', 'lempert_half'])
  assert.equal(resolvePanels('lempert_full').length, 5)
  assert.equal(resolvePanels('lempert_half').length, 3)
})

await check('倒れる方向の矢印が水平で、左右の名前どおりの向きを指す', async () => {
  // makeDirectionArrow の fall-left/fall-right 分岐と同じ計算
  // (widthAxis(pose) を fall-left なら +1、fall-right なら -1 倍) を
  // カタログが参照するポーズに対して行い、矢印が実際にどちらを向くかを検証する。
  // 倒れた後のポーズ（sideLying の width = V(0, -direction, 0)）を参照すると
  // 矢印が垂直（真下）になり左右の区別がつかなくなるので、それを検出する
  const { POSE_IDS, resolvePanels, resolvePose } = await import('../src/rig/catalog.ts')
  const fmt = (v) => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`
  for (const id of POSE_IDS) {
    for (const spec of resolvePanels(id)) {
      if (spec.arrow !== 'fall-left' && spec.arrow !== 'fall-right') continue
      const pose = resolvePose(spec)
      const sign = spec.arrow === 'fall-left' ? 1 : -1
      const direction = widthAxis(pose).multiplyScalar(sign)
      assert.ok(
        Math.abs(direction.y) < 0.3,
        `${id} (${spec.maneuver}/${spec.pose}, ${spec.arrow}) の矢印が水平でない: ${fmt(direction)}`,
      )
      const wantsLeft = spec.arrow === 'fall-left'
      assert.ok(
        wantsLeft ? direction.x > 0.3 : direction.x < -0.3,
        `${id} (${spec.maneuver}/${spec.pose}) の矢印 ${spec.arrow} が名前どおりの向き（x${wantsLeft ? '>0' : '<0'}）でない: ${fmt(direction)}`,
      )
    }
  }
})

await check('坐位は体幹が起き、肘が曲がり、真横からでも左右の脚が分かれる', () => {
  for (const [maneuverId, poseId] of [['basic-positions', 'sit-up'], ['lempert', 'lempert-sit']]) {
    const pose = MANEUVERS[maneuverId].poses.find((item) => item.id === poseId)
    assert.ok(pose, `${maneuverId}/${poseId} が無い`)

    const trunk = bodyAxis(pose)
    assert.ok(trunk.y > 0.9, `${poseId} の体幹が前傾しすぎている: bodyAxis.y = ${trunk.y.toFixed(2)}`)

    for (const side of ['Left', 'Right']) {
      const upper = pose.joints[`elbow${side}`].clone().sub(pose.joints[`shoulder${side}`]).normalize()
      const fore = pose.joints[`wrist${side}`].clone().sub(pose.joints[`elbow${side}`]).normalize()
      const bend = (Math.acos(Math.min(1, Math.max(-1, upper.dot(fore)))) * 180) / Math.PI
      assert.ok(bend > 20, `${poseId} の${side}肘がほぼ直線: ${bend.toFixed(0)}度`)
    }

    // lateral 画角は視線が widthAxis。その成分を落とした平面で左右の関節が
    // どれだけ離れているかが、画像上で脚を見分けられるかを決める
    const direction = viewDirection(pose, 'lateral')
    const flatten = (point) => point.clone().addScaledVector(direction, -point.dot(direction))
    for (const joint of ['knee', 'ankle']) {
      const gap = flatten(pose.joints[`${joint}Left`]).distanceTo(flatten(pose.joints[`${joint}Right`]))
      assert.ok(gap > 0.12, `${poseId} の左右の${joint}が真横投影で重なる: 距離 ${gap.toFixed(3)}`)
    }
  }
})

await check('どの視点も頭頂を正面から見ない', async () => {
  const { POSE_IDS, resolvePanels, resolvePose } = await import('../src/rig/catalog.ts')
  for (const id of POSE_IDS) {
    for (const spec of resolvePanels(id)) {
      const pose = resolvePose(spec)
      const direction = viewDirection(pose, spec.view)
      // 頸→頭の向きと視線が平行だと、頭頂を正面から見ることになり
      // 顔も体幹も頭部の陰に隠れる
      const alignment = Math.abs(direction.dot(neckToHead(pose)))
      assert.ok(
        alignment < 0.85,
        `${id} (${spec.view}) の視線が頭頂を向いている: |視線・頸→頭| = ${alignment.toFixed(2)}`,
      )
    }
  }
})

await check('頭側視点は真上からの俯瞰で、画面上方向が体軸に固定される', async () => {
  const { POSE_IDS, resolvePanels, resolvePose } = await import('../src/rig/catalog.ts')
  for (const id of POSE_IDS) {
    for (const spec of resolvePanels(id)) {
      if (spec.view !== 'cranial') continue
      const pose = resolvePose(spec)
      const direction = viewDirection(pose, spec.view)
      assert.ok(
        direction.y < -0.9,
        `${id} の頭側視点が俯瞰になっていない: 視線の y = ${direction.y.toFixed(2)}`,
      )
      // 顔の向きが変わっても画面の上下が回らないこと。
      // 頭部回旋のコマ送りで画像全体が回転すると動きが読めなくなる
      const up = screenUp(pose, spec.view)
      const alongBody = Math.abs(up.dot(bodyAxis(pose)))
      assert.ok(
        alongBody > 0.9,
        `${id} の画面上方向が体軸に沿っていない: |上方向・体軸| = ${alongBody.toFixed(2)}`,
      )
    }
  }
})

await check('upper フレーミングは下肢を含まない', async () => {
  const { POSE_IDS, resolvePanels, resolvePose } = await import('../src/rig/catalog.ts')
  let seen = 0
  for (const id of POSE_IDS) {
    for (const spec of resolvePanels(id)) {
      if (spec.framing !== 'upper') continue
      seen += 1
      const pose = resolvePose(spec)
      const points = framingPoints(pose, 'upper')
      for (const name of ['hipLeft', 'hipRight', 'kneeLeft', 'kneeRight', 'ankleLeft', 'ankleRight', 'toeLeft', 'toeRight']) {
        const joint = pose.joints[name]
        assert.ok(
          !points.some((point) => point.distanceTo(joint) < 1e-9),
          `${id} の upper フレーミングに下肢 ${name} が含まれている`,
        )
      }
      // 上半身だけでも頭の体積は必要
      const reach = Math.max(...points.map((point) => point.distanceTo(pose.joints.head)))
      assert.ok(reach >= HEAD_RADIUS, `${id} の upper フレーミングが頭部体積を含まない`)
    }
  }
  assert.ok(seen >= 6, `upper フレーミングの ID が少なすぎる: ${seen}`)
})

await check('俯瞰の臥位は upper フレーミングを使う', async () => {
  const { POSE_CATALOG, POSE_IDS, resolvePanels } = await import('../src/rig/catalog.ts')
  for (const id of ['supine', 'prone', 'side_r', 'side_l', 'lempert_roll_r', 'lempert_roll_l']) {
    assert.ok(POSE_IDS.includes(id), `${id} が無い`)
    const spec = resolvePanels(id)[0]
    assert.equal(spec.view, 'cranial', `${id} の view が cranial でない`)
    assert.equal(spec.framing, 'upper', `${id} の framing が upper でない`)
  }
  // 帯の cranial パネルも上半身に寄せる
  for (const id of ['lempert_full', 'lempert_half']) {
    for (const spec of resolvePanels(id)) {
      if (spec.view !== 'cranial') continue
      assert.equal(spec.framing, 'upper', `${id} の cranial パネルが upper でない`)
    }
  }
  void POSE_CATALOG
})

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log('\n幾何検証を通過した')
