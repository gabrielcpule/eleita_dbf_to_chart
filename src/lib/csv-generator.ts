import type { SurveyRecord } from './types'

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function generateCsv(
  records: SurveyRecord[],
  columns: string[],
  columnLabels: Record<string, string>
): string {
  const header = columns
    .map((col) => escapeCsvField(columnLabels[col] || col))
    .join(',')

  const rows = records.map((record) =>
    columns.map((col) => escapeCsvField(record[col] ?? '')).join(',')
  )

  return [header, ...rows].join('\n') + '\n'
}
