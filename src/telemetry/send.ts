import { roleName } from '../profile/roles'
import type { PlayResult, RoleId } from '../profile/types'
import { isValidGasUrl, loadTelemetryUrl } from './config'

export { isValidGasUrl }

export const APP_VERSION = 'vertigo-v1.0'

/**
 * 記録の時刻は日本時刻（JST）の "YYYY-MM-DD HH:mm:ss" で送る。
 * スプレッドシートに UTC の ISO 文字列が並ぶと、そのまま読んだ人が
 * 9時間ずれた時刻として受け取ってしまうため。
 * JST は夏時間を持たない固定 +09:00 なので、単純な加算で足りる。
 */
export function formatJst(ms: number): string {
  const d = new Date(ms + 9 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  )
}

/**
 * スプレッドシートに1行として積まれる内容。
 * 個人を特定する情報は含めない。送るのは職種と成績だけ。
 */
export interface TelemetryPayload {
  kind: 'game_result'
  completedAt: string
  roleId: RoleId | ''
  roleName: string
  caseId: number
  caseTitle: string
  category: string
  rank: string
  score: number
  endingTier: string
  diagnosisCorrect: boolean
  sideCorrect: boolean
  maneuverPerfect: boolean | null
  fromRandom: boolean
  appVersion: string
  pageUrl: string
}

/**
 * BPPVれんしゅうを開いた、という閲覧履歴。1回の起動が1行になる。
 * 型や左右をどう選んだかは記録しない（同じ利用を何度も送る意味がない）。
 */
export interface BppvPracticeOpenPayload {
  kind: 'bppv_practice_open'
  openedAt: string
  roleId: RoleId | ''
  roleName: string
  appVersion: string
  pageUrl: string
}

export function buildPayload(input: {
  play: PlayResult
  roleId: RoleId | ''
  maneuverPerfect: boolean | null
  diagnosisCorrect: boolean
  sideCorrect: boolean
  completedAt: number
  pageUrl: string
}): TelemetryPayload {
  return {
    kind: 'game_result',
    completedAt: formatJst(input.completedAt),
    roleId: input.roleId,
    roleName: roleName(input.roleId),
    caseId: input.play.caseId,
    caseTitle: input.play.caseTitle,
    category: input.play.category,
    rank: input.play.rank,
    score: input.play.score,
    endingTier: input.play.ending,
    diagnosisCorrect: input.diagnosisCorrect,
    sideCorrect: input.sideCorrect,
    maneuverPerfect: input.maneuverPerfect,
    fromRandom: input.play.fromRandom,
    appVersion: APP_VERSION,
    pageUrl: input.pageUrl,
  }
}

export function buildBppvPracticeOpenPayload(input: {
  roleId: RoleId | ''
  openedAt: number
  pageUrl: string
}): BppvPracticeOpenPayload {
  return {
    kind: 'bppv_practice_open',
    openedAt: formatJst(input.openedAt),
    roleId: input.roleId,
    roleName: roleName(input.roleId),
    appVersion: APP_VERSION,
    pageUrl: input.pageUrl,
  }
}

/**
 * 送信は best-effort。失敗してもゲーム・学習画面の操作を止めない。
 * 研修中の学習者にネットワークエラーを見せる意味がない。
 */
async function postTelemetry(payload: TelemetryPayload | BppvPracticeOpenPayload): Promise<void> {
  try {
    const url = await loadTelemetryUrl()
    if (!isValidGasUrl(url)) {
      if (url) console.warn('[telemetry] googleSheetsWebAppUrl の形式が違うので送信しません:', url)
      return
    }

    const body = JSON.stringify(payload)

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=utf-8' }))
      if (queued) return
    }

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: true,
    })
  } catch (e) {
    console.error('[telemetry] 送信に失敗しました', e)
  }
}

export function sendResult(payload: TelemetryPayload): Promise<void> {
  return postTelemetry(payload)
}

export function sendBppvPracticeOpen(payload: BppvPracticeOpenPayload): Promise<void> {
  return postTelemetry(payload)
}
