import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { SurveyState, SurveyAction } from './types'
import { INITIAL_STATE, createEmptyChartConfig } from './types'

function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    case 'SET_RAW_DATA':
      return { ...state, raw: action.payload, step: 1 }

    case 'SET_DEMOGRAPHICS_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          demographics: { ...state.filters.demographics, ...action.payload },
        },
      }

    case 'SET_EXCLUDE_EMPTY_COLUMNS':
      return {
        ...state,
        filters: { ...state.filters, excludeEmptyColumns: action.payload },
      }

    case 'ADD_CHART':
      return {
        ...state,
        chartConfigs: [...state.chartConfigs, createEmptyChartConfig()],
        activeChartIndex: state.chartConfigs.length,
      }

    case 'REMOVE_CHART': {
      const filtered = state.chartConfigs.filter((c) => c.id !== action.payload)
      return {
        ...state,
        chartConfigs: filtered,
        activeChartIndex: Math.min(state.activeChartIndex, Math.max(0, filtered.length - 1)),
      }
    }

    case 'UPDATE_CHART':
      return {
        ...state,
        chartConfigs: state.chartConfigs.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      }

    case 'SET_ACTIVE_CHART_INDEX':
      return { ...state, activeChartIndex: action.payload }

    case 'LOAD_CONFIG':
      return { ...state, chartConfigs: action.payload, activeChartIndex: 0 }

    case 'SET_STEP':
      return { ...state, step: action.payload }

    default:
      return state
  }
}

interface SurveyContextValue {
  state: SurveyState
  dispatch: Dispatch<SurveyAction>
}

const SurveyContext = createContext<SurveyContextValue | null>(null)

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(surveyReducer, INITIAL_STATE)

  return (
    <SurveyContext.Provider value={{ state, dispatch }}>
      {children}
    </SurveyContext.Provider>
  )
}

export function useSurvey(): SurveyContextValue {
  const ctx = useContext(SurveyContext)
  if (!ctx) {
    throw new Error('useSurvey must be used within a SurveyProvider')
  }
  return ctx
}
