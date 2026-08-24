import type { Category } from '../data/types'
import { isRoleId } from './roles'
import type { ClearRecord, HistoryEntry, PlayResult, Profile, Rank } from './types'

export const STORAGE_KEY = 'vertigo_profile_v1'
export const SCHEMA_VERSION = 1
export const HISTORY_LIMIT = 50

export function defaultProfile(): Profile {
  return {
    schemaVersion: SCHEMA_VERSION,
    roleId: '',
    muted: false,
    howtoAcknowledged: false,
    clears: {},
    history: [],
  }
}

/**
 * 保存データの読み取り。
 * 壊れていても投げない。記録が消えるのは残念だが、
 * 記録のせいでゲームが起動しないほうが困る。
 */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return defaultProfile()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaultProfile()
  }
  if (typeof parsed !== 'object' || parsed === null) return defaultProfile()

  const o = parsed as Record<string, unknown>
  if (o.schemaVersion !== SCHEMA_VERSION) return defaultProfile()

  return {
    schemaVersion: SCHEMA_VERSION,
    roleId: isRoleId(o.roleId) ? o.roleId : '',
    muted: o.muted === true,
    howtoAcknowledged: o.howtoAcknowledged === true,
    clears:
      typeof o.clears === 'object' && o.clears !== null && !Array.isArray(o.clears)
        ? (o.clears as Record<number, ClearRecord>)
        : {},
    history: Array.isArray(o.history) ? (o.history as HistoryEntry[]) : [],
  }
}

export function loadProfile(): Profile {
  try {
    return parseProfile(localStorage.getItem(STORAGE_KEY))
  } catch {
    // プライベートブラウズなどで localStorage 自体が触れないことがある
    return defaultProfile()
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // 保存できなくても遊べるので黙って諦める
  }
}

/** クリアの条件はランク A 以上（85点以上） */
export function isCleared(rank: Rank): boolean {
  return rank === 'S' || rank === 'A'
}

/**
 * `clears` は Record<number, ClearRecord> なので、tsconfig に
 * noUncheckedIndexedAccess が無い以上、素の添字アクセスは
 * 「必ず存在する」型になってしまう。未記録を扱えるようここで型を付け直す。
 */
export function clearOf(p: Profile, caseId: number): ClearRecord | undefined {
  return p.clears[caseId] as ClearRecord | undefined
}

/**
 * 1症例分の結果を Profile に畳み込む（純関数）。
 * `now` は epoch ms。テストしやすいように引数で受ける。
 */
export function recordResult(p: Profile, r: PlayResult, now: number): Profile {
  const prev = clearOf(p, r.caseId)
  const clearedNow = isCleared(r.rank) ? new Date(now).toISOString() : null

  const record: ClearRecord =
    prev === undefined
      ? { firstClearedAt: clearedNow, bestRank: r.rank, bestScore: r.score, plays: 1 }
      : {
          // 一度入った初クリア日時は上書きしない
          firstClearedAt: prev.firstClearedAt ?? clearedNow,
          // 更新はスコアを厳密に上回ったときだけ。同点では最初の記録を残す
          bestRank: r.score > prev.bestScore ? r.rank : prev.bestRank,
          bestScore: r.score > prev.bestScore ? r.score : prev.bestScore,
          plays: prev.plays + 1,
        }

  const entry: HistoryEntry = {
    ts: now,
    caseId: r.caseId,
    caseTitle: r.caseTitle,
    category: r.category,
    rank: r.rank,
    score: r.score,
    ending: r.ending,
    roleId: p.roleId,
    fromRandom: r.fromRandom,
  }

  return {
    ...p,
    clears: { ...p.clears, [r.caseId]: record },
    history: [entry, ...p.history].slice(0, HISTORY_LIMIT),
  }
}

export function clearedSummary(p: Profile): { cleared: number; starred: number } {
  const records = Object.values(p.clears)
  return {
    cleared: records.filter((c) => c.firstClearedAt !== null).length,
    starred: records.filter((c) => c.bestRank === 'S').length,
  }
}

export function filterHistory(
  history: HistoryEntry[],
  category: Category | 'all',
): HistoryEntry[] {
  return category === 'all' ? history : history.filter((h) => h.category === category)
}
