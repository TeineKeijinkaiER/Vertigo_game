import { roleName } from '../profile/roles'
import type { PlayResult, RoleId } from '../profile/types'
import type { BppvLesson } from '../data/bppvLessons'
import { isValidGasUrl, loadTelemetryUrl } from './config'

export { isValidGasUrl }

export const APP_VERSION = 'vertigo-v0.2'

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

/** BPPV学習画面で、どの型を参照したかの記録。1回の選択が1行になる */
export interface BppvLearnViewPayload {
  kind: 'bppv_learn_view'
  viewedAt: string
  roleId: RoleId | ''
  roleName: string
  lessonId: string
  family: string
  side: string
  title: string
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

export function buildBppvLearnPayload(input: {
  lesson: BppvLesson
  roleId: RoleId | ''
  viewedAt: number
  pageUrl: string
}): BppvLearnViewPayload {
  return {
    kind: 'bppv_learn_view',
    viewedAt: new Date(input.viewedAt).toISOString(),
    roleId: input.roleId,
    roleName: roleName(input.roleId),
    lessonId: input.lesson.id,
    family: input.lesson.family,
    side: input.lesson.side,
    title: input.lesson.title,
    appVersion: APP_VERSION,
    pageUrl: input.pageUrl,
  }
}

/**
 * 送信は best-effort。失敗してもゲーム・学習画面の操作を止めない。
 * 研修中の学習者にネットワークエラーを見せる意味がない。
 */
async function postTelemetry(payload: TelemetryPayload | BppvLearnViewPayload): Promise<void> {
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

export function sendBppvLearnView(payload: BppvLearnViewPayload): Promise<void> {
  return postTelemetry(payload)
}
