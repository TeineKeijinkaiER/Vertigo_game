import type { ManeuverAttempt } from '../data/maneuvers'
import type { Side, VestibularType } from '../data/types'

/**
 * 診察を終えると、すぐに鑑別診断 → 方針決定に進む。
 * GRACE-3の分類とHOWTO 4条件は独立した画面ではなく、
 * 診察フェーズの「みたてる」コマンドとして扱う。
 */
export type Phase = 'title' | 'select' | 'brief' | 'exam' | 'diagnosis' | 'disposition' | 'result'

export interface LogEntry {
  actionId: string
  label: string
  text: string
}

export interface GameState {
  phase: Phase
  caseId: number | null
  /** 実施した診察・検査・治療コマンド（順序を保つ） */
  performed: string[]
  log: LogEntry[]
  vestibularAnswer: VestibularType | null
  criteriaAnswers: boolean[]
  /** 耳石置換法の実施内容。組み立てを誤っていても記録する */
  maneuver: ManeuverAttempt | null
  diagnosisAnswer: string | null
  sideAnswer: Side
  dispositionChoice: string | null
}

export const initialState: GameState = {
  phase: 'title',
  caseId: null,
  performed: [],
  log: [],
  vestibularAnswer: null,
  criteriaAnswers: [false, false, false, false],
  maneuver: null,
  diagnosisAnswer: null,
  sideAnswer: null,
  dispositionChoice: null,
}

export type Action =
  | { type: 'GOTO'; phase: Phase }
  | { type: 'START_CASE'; caseId: number }
  | { type: 'PERFORM'; entry: LogEntry }
  | { type: 'SET_VESTIBULAR'; value: VestibularType }
  | { type: 'TOGGLE_CRITERION'; index: number }
  | { type: 'CONFIRM_ASSESS'; id: 'as_grace' | 'as_criteria' }
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
      return { ...initialState, phase: 'brief', caseId: action.caseId }

    case 'PERFORM':
      if (state.performed.includes(action.entry.actionId)) return state
      return {
        ...state,
        performed: [...state.performed, action.entry.actionId],
        log: [...state.log, action.entry],
      }

    case 'SET_VESTIBULAR':
      return { ...state, vestibularAnswer: action.value }

    case 'TOGGLE_CRITERION': {
      const next = [...state.criteriaAnswers]
      next[action.index] = !next[action.index]
      return { ...state, criteriaAnswers: next }
    }

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

    case 'SET_DIAGNOSIS':
      return { ...state, diagnosisAnswer: action.value }

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
