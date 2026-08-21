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

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log('\n幾何検証を通過した')
