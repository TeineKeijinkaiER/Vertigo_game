import assert from 'node:assert/strict'
import { MANEUVERS, TREE, bodyAxis, widthAxis, neckToHead, mirrorPose } from '../src/rig/poses.ts'

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

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}
console.log('\n幾何検証を通過した')
