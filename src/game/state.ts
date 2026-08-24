import type { ManeuverAttempt } from '../data/maneuvers'
import { asksSide } from '../data/actions'
import type { VestibularChoice } from '../data/actions'
import type { AtaxiaGrade, Side } from '../data/types'

/**
 * 診察を終えると、すぐに鑑別診断 → 方針決定に進む。
 * GRACE-3の分類とHOWTO 4条件は独立した画面ではなく、
 * 診察フェーズの「みたてる」コマンドとして扱う。
 */
export type Phase =
  | 'title'
  | 'select'
  | 'learn'
  | 'brief'
  | 'exam'
  | 'diagnosis'
  | 'disposition'
  | 'result'

export interface LogEntry {
  actionId: string
  label: string
  text: string
}

export interface GameState {
  phase: Phase
  caseId: number | null
  /** 「しんさつかいし」から始めたか。履歴と送信データに残す */
  fromRandom: boolean
  /** 実施した診察・検査・治療コマンド（順序を保つ） */
  performed: string[]
  log: LogEntry[]
  vestibularAnswer: VestibularChoice | null
  subtypeAnswer: string | null
  criteriaAnswers: boolean[]
  /** 起立・歩行の観察後にプレイヤーが選んだ失調Grade */
  ataxiaAnswer: AtaxiaGrade | null
  /** 耳石置換法の実施内容。組み立てを誤っていても記録する */
  maneuver: ManeuverAttempt | null
  diagnosisAnswer: string | null
  sideAnswer: Side
  dispositionChoice: string | null
}

export const initialState: GameState = {
  phase: 'title',
  caseId: null,
  fromRandom: false,
  performed: [],
  log: [],
  vestibularAnswer: null,
  subtypeAnswer: null,
  criteriaAnswers: [false, false, false, false],
  ataxiaAnswer: null,
  maneuver: null,
  diagnosisAnswer: null,
  sideAnswer: null,
  dispositionChoice: null,
}

export type Action =
  | { type: 'GOTO'; phase: Phase }
  | { type: 'START_CASE'; caseId: number; fromRandom: boolean }
  | { type: 'PERFORM'; entry: LogEntry }
  | { type: 'SET_VESTIBULAR'; value: VestibularChoice }
  | { type: 'SET_SUBTYPE'; value: string }
  | { type: 'TOGGLE_CRITERION'; index: number }
  | { type: 'SET_ATAXIA'; value: AtaxiaGrade }
  | { type: 'CONFIRM_ASSESS'; id: 'as_dx' | 'im_criteria' }
  | { type: 'SET_MANEUVER'; attempt: ManeuverAttempt; entry: LogEntry }
  | { type: 'SET_DIAGNOSIS'; value: string }
  | { type: 'SET_SIDE'; value: Side }
  | { type: 'SET_DISPOSITION'; id: string }
  | { type: 'RESET' }

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'GOTO':
      return { ...state, phase: action.phase }

    case 'START_CASE':
      return { ...initialState, phase: 'brief', caseId: action.caseId, fromRandom: action.fromRandom }

    // performed は採点用の実施済み集合なので重複させない。log には毎回積み、
    // 何度でも同じ所見を選び直して見返せるようにする
    case 'PERFORM':
      return {
        ...state,
        performed: state.performed.includes(action.entry.actionId)
          ? state.performed
          : [...state.performed, action.entry.actionId],
        log: [...state.log, action.entry],
      }

    case 'SET_VESTIBULAR':
      // 分類を選び直したら細かい鑑別はいったん白紙に戻す
      return { ...state, vestibularAnswer: action.value, subtypeAnswer: null }

    case 'SET_SUBTYPE':
      return { ...state, subtypeAnswer: action.value }

    case 'TOGGLE_CRITERION': {
      const next = [...state.criteriaAnswers]
      next[action.index] = !next[action.index]
      return { ...state, criteriaAnswers: next }
    }

    case 'SET_ATAXIA':
      return { ...state, ataxiaAnswer: action.value }

    // 「どれも該当しない」が正解の症例があるので、
    // 選択の有無ではなく決定したことをもって実施済みとする
    case 'CONFIRM_ASSESS':
      return state.performed.includes(action.id)
        ? state
        : { ...state, performed: [...state.performed, action.id] }

    case 'SET_MANEUVER':
      return {
        ...state,
        maneuver: action.attempt,
        performed: state.performed.includes('tx_maneuver')
          ? state.performed
          : [...state.performed, 'tx_maneuver'],
        log: [...state.log, action.entry],
      }

    // 左右を問わない診断に選び直したら、患側の回答は残さない
    case 'SET_DIAGNOSIS':
      return {
        ...state,
        diagnosisAnswer: action.value,
        sideAnswer: asksSide(action.value) ? state.sideAnswer : null,
      }

    case 'SET_SIDE':
      return { ...state, sideAnswer: action.value }

    case 'SET_DISPOSITION':
      return { ...state, dispositionChoice: action.id }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}
