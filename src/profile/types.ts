import type { Category } from '../data/types'
import type { EndingTier, ScoreResult } from '../game/scoring'

/** 職種。TKH-ER-Quiz と同じ8種に揃えてある */
export type RoleId =
  | 'pgy1'
  | 'pgy2'
  | 'senior'
  | 'er'
  | 'other_doctor'
  | 'nurse'
  | 'student'
  | 'other'

export type Rank = ScoreResult['rank']

/** 症例ごとの成績。プレイするたびに更新する */
export interface ClearRecord {
  /** A以上を最初に取った日時(ISO)。未クリアなら null。一度入ったら上書きしない */
  firstClearedAt: string | null
  bestRank: Rank
  bestScore: number
  plays: number
}

export interface HistoryEntry {
  ts: number
  caseId: number
  caseTitle: string
  category: Category
  rank: Rank
  score: number
  ending: EndingTier
  roleId: RoleId | ''
  /** 「しんさつかいし」から始めたなら true */
  fromRandom: boolean
}

export interface Profile {
  schemaVersion: 1
  roleId: RoleId | ''
  muted: boolean
  howtoAcknowledged: boolean
  clears: Record<number, ClearRecord>
  /** 新しい順。HISTORY_LIMIT 件を超えたら古いものから捨てる */
  history: HistoryEntry[]
}

/** 1症例を解き終えた結果。Profile への記録とテレメトリ送信の入力になる */
export interface PlayResult {
  caseId: number
  caseTitle: string
  category: Category
  rank: Rank
  score: number
  ending: EndingTier
  fromRandom: boolean
}
