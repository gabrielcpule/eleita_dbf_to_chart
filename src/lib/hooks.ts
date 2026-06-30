import { useMemo } from 'react'
import { useSurvey } from './survey-context'
import { applyFilters } from './filter-engine'
import { detectQuestionColumns } from './types'
import type { SurveyRecord } from './types'

export function useFilteredRecords(): SurveyRecord[] {
  const { state } = useSurvey()

  return useMemo(() => {
    if (!state.raw) return []

    // Auto-detect all R columns from schema
    const allRColumns = detectQuestionColumns(state.raw.schema.fields)

    // Collect all question columns selected in any chart config
    const chartColumns = new Set<string>()
    for (const config of state.chartConfigs) {
      for (const qc of config.questionConfigs) {
        chartColumns.add(qc.column)
      }
    }

    // Always exclude rows where selected chart columns are empty
    // Also exclude rows that have no answers in any R column
    const excludeColumns = chartColumns.size > 0
      ? Array.from(chartColumns)
      : allRColumns

    return applyFilters(
      state.raw.records,
      state.filters.demographics,
      excludeColumns
    )
  }, [state.raw, state.filters, state.chartConfigs])
}
