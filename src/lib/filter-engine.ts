import type { SurveyRecord, DemographicsFilter } from './types'

export function getUniqueValues(records: SurveyRecord[], column: string): string[] {
  const values = new Set<string>()
  for (const record of records) {
    const val = (record[column] || '').trim()
    if (val) values.add(val)
  }
  return Array.from(values).sort()
}

export function applyFilters(
  records: SurveyRecord[],
  demographics: DemographicsFilter,
  excludeEmptyColumns: string[]
): SurveyRecord[] {
  return records.filter((record) => {
    for (const [column, value] of Object.entries(demographics)) {
      if (value && (record[column] || '').trim() !== value) {
        return false
      }
    }

    for (const column of excludeEmptyColumns) {
      if (!(record[column] || '').trim()) {
        return false
      }
    }

    return true
  })
}
