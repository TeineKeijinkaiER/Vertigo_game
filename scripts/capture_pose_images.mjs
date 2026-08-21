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
