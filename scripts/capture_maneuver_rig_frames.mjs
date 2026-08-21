import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const baseUrl = process.env.MANEUVER_RIG_URL ?? 'http://127.0.0.1:4173/'
const outputRoot = path.resolve('public/assets/vertigo-maneuvers-v7-rig')
const tweenSteps = 5

const maneuvers = [
  { id: 'dix-hallpike', slug: 'dix-hallpike-right', order: [0, 1, 0], holds: [1100, 1500, 900] },
  { id: 'epley', slug: 'epley-right', order: [0, 1, 2, 3, 4], holds: [1100, 1500, 1500, 1600, 1500] },
  { id: 'gufoni-geotropic', slug: 'gufoni-geotropic-right', order: [0, 1, 2, 3], holds: [1100, 1500, 1500, 1100] },
  { id: 'gufoni-apogeotropic', slug: 'gufoni-appiani-right', order: [0, 1, 2, 3], holds: [1100, 1500, 1500, 1100] },
  { id: 'supine-roll', slug: 'supine-head-roll', order: [0, 1, 2, 3, 2], holds: [1300, 1300, 800, 1300, 900] },
]

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 768, height: 512 }, deviceScaleFactor: 1 })

async function capture(url, destination) {
  await page.goto(url, { waitUntil: 'networkidle' })
  const canvas = page.locator('.rig-canvas')
  await canvas.waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelector('.rig-canvas')?.dataset.ready === '1')
  await canvas.screenshot({ path: destination, animations: 'disabled' })
}

for (const maneuver of maneuvers) {
  const root = path.join(outputRoot, maneuver.slug)
  const framesRoot = path.join(root, 'frames')
  await mkdir(framesRoot, { recursive: true })
  const manifest = []
  let frameIndex = 1

  for (let sequenceIndex = 0; sequenceIndex < maneuver.order.length; sequenceIndex += 1) {
    const pose = maneuver.order[sequenceIndex]
    const filename = `frame-${String(frameIndex).padStart(3, '0')}.png`
    const url = new URL(baseUrl)
    url.searchParams.set('prototype', 'maneuver-rig')
    url.searchParams.set('export', '1')
    url.searchParams.set('maneuver', maneuver.id)
    url.searchParams.set('pose', String(pose))
    await capture(url.toString(), path.join(framesRoot, filename))
    manifest.push({ file: `frames/${filename}`, duration_ms: maneuver.holds[sequenceIndex], pose, key_pose: true })
    frameIndex += 1

    if (sequenceIndex === maneuver.order.length - 1) continue
    const nextPose = maneuver.order[sequenceIndex + 1]
    for (let tweenIndex = 1; tweenIndex < tweenSteps; tweenIndex += 1) {
      const tweenFilename = `frame-${String(frameIndex).padStart(3, '0')}.png`
      const tweenUrl = new URL(baseUrl)
      tweenUrl.searchParams.set('prototype', 'maneuver-rig')
      tweenUrl.searchParams.set('export', '1')
      tweenUrl.searchParams.set('maneuver', maneuver.id)
      tweenUrl.searchParams.set('from', String(pose))
      tweenUrl.searchParams.set('to', String(nextPose))
      tweenUrl.searchParams.set('t', String(tweenIndex / tweenSteps))
      await capture(tweenUrl.toString(), path.join(framesRoot, tweenFilename))
      manifest.push({ file: `frames/${tweenFilename}`, duration_ms: 140, pose: `${pose}->${nextPose}`, key_pose: false })
      frameIndex += 1
    }
  }

  await BunWriteCompat(path.join(root, 'capture-manifest.json'), JSON.stringify({ maneuver: maneuver.id, canvas: [768, 512], frames: manifest }, null, 2))
}

await browser.close()

async function BunWriteCompat(destination, contents) {
  const { writeFile } = await import('node:fs/promises')
  await writeFile(destination, `${contents}\n`, 'utf8')
}
