import assert from 'node:assert/strict'
import { register } from 'node:module'

// src/rig/scene.ts imports src/rig/poses.ts with an extensionless specifier
// (the project-wide convention inside src/). Plain Node ESM resolution can't
// follow that on its own, so register a tiny loader before pulling either
// module in. See scripts/rig-ts-loader.mjs.
register('./rig-ts-loader.mjs', import.meta.url)

const { MANEUVERS, TREE, bodyAxis, widthAxis, neckToHead, mirrorPose } = await import('../src/rig/poses.ts')
const { framingPoints, viewDirection } = await import('../src/rig/scene.ts')

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

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log('\n幾何検証を通過した')
