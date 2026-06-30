import type { SurveyRecord, ChartConfig, QuestionConfig } from './types'

/** Returns the subset of `columns` that have at least one non-empty answer. */
export function getAnsweredColumns(
  records: SurveyRecord[],
  columns: string[]
): string[] {
  return columns.filter((col) =>
    records.some((r) => (r[col] || '').trim() !== '')
  )
}

/** Number of distinct answers in a column, clamped to the supported 2–15 range. */
export function countUniqueLetters(
  records: SurveyRecord[],
  column: string
): number {
  const letters = new Set<string>()
  for (const r of records) {
    const v = (r[column] || '').trim()
    if (v) letters.add(v)
  }
  return Math.max(2, Math.min(15, letters.size))
}

/**
 * Resolves the questions a chart should actually render.
 *
 * - When the chart has explicit question selections, those are used (each
 *   inheriting the chart's default type unless it carries its own override).
 * - When nothing is selected, falls back to every answered column so a brand
 *   new chart shows all questions by default.
 */
export function getEffectiveQuestionConfigs(
  config: ChartConfig,
  answeredColumns: string[],
  records: SurveyRecord[]
): QuestionConfig[] {
  if (config.questionConfigs.length > 0) {
    return config.questionConfigs.map((qc) => ({
      ...qc,
      chartType: qc.chartType ?? config.chartType,
    }))
  }

  return answeredColumns.map((column) => ({
    column,
    label: '',
    alternatives: countUniqueLetters(records, column),
    letterLabels: {},
    chartType: config.chartType,
  }))
}
