import { roleName } from '../profile/roles'
import type { PlayResult, RoleId } from '../profile/types'
import { isValidGasUrl, loadTelemetryUrl } from './config'

export { isValidGasUrl }

export const APP_VERSION = 'vertigo-v0.2'

/**
 * スプレッドシートに1行として積まれる内容。
 * 個人を特定する情報は含めない。送るのは職種と成績だけ。
 */
export interface TelemetryPayload {
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
    completedAt: new Date(input.completedAt).toISOString(),
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

/**
 * 送信は best-effort。失敗してもゲームを止めない。
 * 研修中の学習者にネットワークエラーを見せる意味がない。
 */
export async function sendResult(payload: TelemetryPayload): Promise<void> {
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
