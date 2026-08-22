import { createRequire } from 'node:module'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const baseUrl = process.env.POSE_EXPORT_URL ?? 'http://127.0.0.1:5173/'
const rawRoot = path.resolve('public/poses/_raw')
const filmsRoot = path.join(rawRoot, 'films')
const SIZE = 1024

// POSE_EXPORT_FILMS_ONLY=1 で静止画を飛ばしてフィルムだけ撮る
const filmsOnly = process.env.POSE_EXPORT_FILMS_ONLY === '1'

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
const allFilmIds = await page.evaluate(() => window.__FILM_IDS__)
if (!Array.isArray(allFilmIds) || allFilmIds.length === 0) throw new Error('フィルムID一覧を取得できなかった')

// POSE_EXPORT_ONLY にカンマ区切りで ID を渡すと、その分だけ撮る（判読性の試写用）
const only = (process.env.POSE_EXPORT_ONLY ?? '').split(',').map((item) => item.trim()).filter(Boolean)
for (const id of only) {
  if (!allIds.includes(id)) throw new Error(`POSE_EXPORT_ONLY に未知の ID: ${id}`)
}
const ids = only.length > 0 ? only : allIds

let manifest = []
if (!filmsOnly) {
  // 部分撮影のときは既存を消さない。全件撮影のときだけ作り直す
  if (only.length === 0) await rm(rawRoot, { recursive: true, force: true })
  await mkdir(rawRoot, { recursive: true })

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
  console.log(`\n${manifest.length} panels captured for ${ids.length} ids`)
}

await mkdir(filmsRoot, { recursive: true })
const films = []
for (const filmId of allFilmIds) {
  const filmDir = path.join(filmsRoot, filmId)
  await rm(filmDir, { recursive: true, force: true })
  await mkdir(filmDir, { recursive: true })

  const listPageUrl = new URL(baseUrl)
  listPageUrl.searchParams.set('prototype', 'pose-export')
  listPageUrl.searchParams.set('film', filmId)
  listPageUrl.searchParams.set('frame', '0')
  await page.goto(listPageUrl.toString(), { waitUntil: 'networkidle' })
  const frameCount = await page.evaluate(() => Number(document.body.dataset.filmFrames ?? '0'))
  const durations = await page.evaluate(() => window.__FILM_DURATIONS__)
  const caption = await page.evaluate((id) => window.__FILM_CAPTIONS__?.[id], filmId)
  if (!Number.isFinite(frameCount) || frameCount < 1) throw new Error(`${filmId} のフレーム数を取得できなかった`)
  if (!Array.isArray(durations) || durations.length !== frameCount) {
    throw new Error(`${filmId} の duration 数がフレーム数と一致しない: ${durations?.length} != ${frameCount}`)
  }

  const frames = []
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const url = new URL(baseUrl)
    url.searchParams.set('prototype', 'pose-export')
    url.searchParams.set('film', filmId)
    url.searchParams.set('frame', String(frameIndex))
    await page.goto(url.toString(), { waitUntil: 'networkidle' })
    const canvas = page.locator('.pose-export-canvas')
    await canvas.waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.querySelector('.pose-export-canvas')?.dataset.ready === '1')

    const file = `frame-${String(frameIndex).padStart(3, '0')}.png`
    const destination = path.join(filmDir, file)
    await canvas.screenshot({ path: destination, omitBackground: true, animations: 'disabled' })
    frames.push({ file, duration_ms: durations[frameIndex] })
  }
  films.push({ id: filmId, caption: caption ?? '', frames })
  console.log(`captured film ${filmId} (${frameCount} frames)`)
}

await writeFile(path.join(rawRoot, 'films.json'), `${JSON.stringify(films, null, 2)}\n`, 'utf8')
await browser.close()
const totalFilmFrames = films.reduce((sum, film) => sum + film.frames.length, 0)
console.log(`\n${totalFilmFrames} film frames captured for ${films.length} films`)
