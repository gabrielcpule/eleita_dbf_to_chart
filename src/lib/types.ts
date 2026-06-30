export interface DbfField {
  name: string
  type: string
  length: number
  decimals: number
}

export interface DbfSchema {
  fields: DbfField[]
  recordCount: number
  lastUpdate: Date
}

export interface SurveyRecord {
  [column: string]: string
}

export interface ParsedDbf {
  schema: DbfSchema
  records: SurveyRecord[]
}

export type QuestionColumn = string

export interface LetterLabelMap {
  [letter: string]: string
}

export interface QuestionConfig {
  column: QuestionColumn
  label: string
  alternatives: number
  letterLabels: LetterLabelMap
}

export type ChartType = 'bar' | 'horizontal-bar' | 'pie' | 'table'

export interface ChartConfig {
  id: string
  questionConfigs: QuestionConfig[]
  chartType: ChartType
}

export interface DemographicsFilter {
  LOCAL: string
  SEXO: string
  IDADE: string
  INSTRUCAO: string
  RENDA: string
  BAIRRO: string
}

export type StepIndex = 0 | 1

export const STEP_LABELS: Record<StepIndex, string> = {
  0: 'Upload',
  1: 'Charts',
} as const

export type SurveyAction =
  | { type: 'SET_RAW_DATA'; payload: ParsedDbf }
  | { type: 'SET_DEMOGRAPHICS_FILTER'; payload: Partial<DemographicsFilter> }
  | { type: 'SET_EXCLUDE_EMPTY_COLUMNS'; payload: string[] }
  | { type: 'ADD_CHART' }
  | { type: 'REMOVE_CHART'; payload: string }
  | { type: 'UPDATE_CHART'; payload: ChartConfig }
  | { type: 'SET_ACTIVE_CHART_INDEX'; payload: number }
  | { type: 'LOAD_CONFIG'; payload: ChartConfig[] }
  | { type: 'SET_STEP'; payload: StepIndex }

export const INITIAL_DEMOGRAPHICS_FILTER: DemographicsFilter = {
  LOCAL: '',
  SEXO: '',
  IDADE: '',
  INSTRUCAO: '',
  RENDA: '',
  BAIRRO: '',
}

export const DEMOGRAPHIC_COLUMNS = ['LOCAL', 'SEXO', 'IDADE', 'INSTRUCAO', 'RENDA', 'BAIRRO'] as const

export function generateId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function detectQuestionColumns(fields: { name: string }[]): string[] {
  return fields
    .map((f) => f.name)
    .filter((name) => /^R\d+$/i.test(name))
    .sort((a, b) => {
      const na = parseInt(a.replace(/^R/i, ''), 10)
      const nb = parseInt(b.replace(/^R/i, ''), 10)
      return na - nb
    })
}

export function createEmptyChartConfig(): ChartConfig {
  return {
    id: generateId(),
    questionConfigs: [],
    chartType: 'bar',
  }
}

export interface SurveyState {
  raw: ParsedDbf | null
  filters: {
    demographics: DemographicsFilter
    excludeEmptyColumns: string[]
  }
  chartConfigs: ChartConfig[]
  activeChartIndex: number
  step: StepIndex
}

export const INITIAL_STATE: SurveyState = {
  raw: null,
  filters: {
    demographics: { ...INITIAL_DEMOGRAPHICS_FILTER },
    excludeEmptyColumns: [],
  },
  chartConfigs: [],
  activeChartIndex: 0,
  step: 0,
}
