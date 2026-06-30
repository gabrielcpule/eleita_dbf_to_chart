import { useMemo } from 'react'
import { useSurvey } from './survey-context'
import { applyFilters } from './filter-engine'
import { detectQuestionColumns } from './types'
import { getAnsweredColumns } from './questions'
import type { SurveyRecord } from './types'

/** Question columns that actually have answers in the loaded data (e.g. R01–R18). */
export function useAnsweredColumns(): string[] {
  const { state } = useSurvey()

  return useMemo(() => {
    if (!state.raw) return []
    const allRColumns = detectQuestionColumns(state.raw.schema.fields)
    return getAnsweredColumns(state.raw.records, allRColumns)
  }, [state.raw])
}

export function useFilteredRecords(): SurveyRecord[] {
  const { state } = useSurvey()

  return useMemo(() => {
    if (!state.raw) return []

    const allRColumns = detectQuestionColumns(state.raw.schema.fields)
    const answeredColumns = getAnsweredColumns(state.raw.records, allRColumns)

    // Columns explicitly selected in any chart config.
    const chartColumns = new Set<string>()
    for (const config of state.chartConfigs) {
      for (const qc of config.questionConfigs) {
        chartColumns.add(qc.column)
      }
    }

    // When specific questions are charted, drop rows that didn't answer them so
    // percentages reflect "of those who answered". Otherwise apply demographics
    // only and drop fully-blank rows (respondents who answered nothing).
    const demographicsFiltered = applyFilters(
      state.raw.records,
      state.filters.demographics,
      chartColumns.size > 0 ? Array.from(chartColumns) : []
    )

    if (chartColumns.size > 0) return demographicsFiltered

    return demographicsFiltered.filter((record) =>
      answeredColumns.some((col) => (record[col] || '').trim() !== '')
    )
  }, [state.raw, state.filters, state.chartConfigs])
}
