import { useMemo } from 'react'
import { useSurvey } from './survey-context'
import { applyFilters } from './filter-engine'
import type { SurveyRecord } from './types'

export function useFilteredRecords(): SurveyRecord[] {
  const { state } = useSurvey()

  return useMemo(() => {
    if (!state.raw) return []
    return applyFilters(
      state.raw.records,
      state.filters.demographics,
      state.filters.excludeEmptyColumns
    )
  }, [state.raw, state.filters])
}
