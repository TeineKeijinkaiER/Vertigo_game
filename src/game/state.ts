import type { Side, VestibularType } from '../data/types'

export type Phase =
  | 'title'
  | 'select'
  | 'brief'
  | 'exam'
  | 'triage'
  | 'criteria'
  | 'studies'
  | 'studyResult'
  | 'disposition'
  | 'day2'
  | 'diagnosis'
  | 'treatment'
  | 'result'

export interface LogEntry {
  actionId: string
  label: string
  text: string
}

export interface GameState {
  phase: Phase
  caseId: number | null
  /** 実施した診察コマンド（順序を保つ） */
  performed: string[]
  log: LogEntry[]
  vestibularAnswer: VestibularType | null
  criteriaAnswers: boolean[]
  studiesOrdered: string[]
  dispositionChoice: string | null
  day2Seen: boolean
  diagnosisAnswer: string | null
  sideAnswer: Side
  treatmentsChosen: string[]
}

export const initialState: GameState = {
  phase: 'title',
  caseId: null,
  performed: [],
  log: [],
  vestibularAnswer: null,
  criteriaAnswers: [false, false, false, false],
  studiesOrdered: [],
  dispositionChoice: null,
  day2Seen: false,
  diagnosisAnswer: null,
  sideAnswer: null,
  treatmentsChosen: [],
}

export type Action =
  | { type: 'GOTO'; phase: Phase }
  | { type: 'START_CASE'; caseId: number }
  | { type: 'PERFORM'; entry: LogEntry }
  | { type: 'SET_VESTIBULAR'; value: VestibularType }
  | { type: 'TOGGLE_CRITERION'; index: number }
  | { type: 'TOGGLE_STUDY'; id: string }
  | { type: 'SET_DISPOSITION'; id: string }
  | { type: 'SEE_DAY2' }
  | { type: 'SET_DIAGNOSIS'; value: string }
  | { type: 'SET_SIDE'; value: Side }
  | { type: 'TOGGLE_TREATMENT'; id: string }
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

    case 'TOGGLE_STUDY': {
      const has = state.studiesOrdered.includes(action.id)
      return {
        ...state,
        studiesOrdered: has
          ? state.studiesOrdered.filter((s) => s !== action.id)
          : [...state.studiesOrdered, action.id],
      }
    }

    case 'SET_DISPOSITION':
      return { ...state, dispositionChoice: action.id }

    case 'SEE_DAY2':
      return { ...state, day2Seen: true }

    case 'SET_DIAGNOSIS':
      return { ...state, diagnosisAnswer: action.value }

    case 'SET_SIDE':
      return { ...state, sideAnswer: action.value }

    case 'TOGGLE_TREATMENT': {
      const has = state.treatmentsChosen.includes(action.id)
      return {
        ...state,
        treatmentsChosen: has
          ? state.treatmentsChosen.filter((t) => t !== action.id)
          : [...state.treatmentsChosen, action.id],
      }
    }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}
