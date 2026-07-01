import type { SurveyRecord, ChartConfig, ChartType, DemographicLabels } from './types'
import { getEffectiveQuestionConfigs } from './questions'
import { resolveColor, groupColorKey, answerColorKey } from './colors'
import { demographicLabel } from './demographics'

const ALPHABET = 'ABCDEFGHIJKLMNO'
const ALL_KEY = '__all__'

export interface ChartGroup {
  key: string
  label: string
  color: string
}

export interface ChartRow {
  letter: string
  label: string
  /** Colour used when the answer option is the coloured dimension (pies, single-series bars). */
  color: string
  /** groupKey -> percentage of all answered respondents (0–100). */
  values: Record<string, number>
  /** groupKey -> raw response count. */
  counts: Record<string, number>
}

export interface ChartSeries {
  questionColumn: string
  questionLabel: string
  chartType: ChartType
  comparing: boolean
  /** Comparison groups, or a single synthetic `__all__` group when not comparing. */
  groups: ChartGroup[]
  rows: ChartRow[]
  /** Total respondents who answered (and, when comparing, belong to a group). */
  total: number
}

function distinctSorted(records: SurveyRecord[], column: string): string[] {
  const set = new Set<string>()
  for (const r of records) {
    const v = (r[column] || '').trim()
    if (v) set.add(v)
  }
  return Array.from(set).sort()
}

export function computeChartData(
  records: SurveyRecord[],
  config: ChartConfig,
  answeredColumns: string[] = [],
  demographicLabels: DemographicLabels = {}
): ChartSeries[] {
  const effective = getEffectiveQuestionConfigs(config, answeredColumns, records)
  const compareBy = config.compareBy
  const comparing = !!compareBy

  const groups: ChartGroup[] = comparing
    ? distinctSorted(records, compareBy!).map((value, i) => ({
        key: value,
        label: demographicLabel(demographicLabels, compareBy!, value),
        color: resolveColor(config.colors, groupColorKey(value), i),
      }))
    : [{ key: ALL_KEY, label: '', color: resolveColor(config.colors, groupColorKey(ALL_KEY), 0) }]

  return effective.map((qc) => {
    const expectedLetters = ALPHABET.slice(0, qc.alternatives).split('')
    const expectedSet = new Set(expectedLetters)

    // groupKey -> letter(or OUTROS) -> count
    const counts: Record<string, Record<string, number>> = {}
    for (const g of groups) counts[g.key] = {}
    let total = 0
    let hasOutros = false

    for (const record of records) {
      const value = (record[qc.column] || '').trim()
      if (!value) continue

      let groupKey = ALL_KEY
      if (comparing) {
        const gv = (record[compareBy!] || '').trim()
        if (!gv) continue // unassignable to a group
        groupKey = gv
      }
      if (!counts[groupKey]) continue // group value not in the (filtered) set

      const bucket = expectedSet.has(value) ? value : 'OUTROS'
      if (bucket === 'OUTROS') hasOutros = true
      counts[groupKey][bucket] = (counts[groupKey][bucket] || 0) + 1
      total++
    }

    const letters = [...expectedLetters, ...(hasOutros ? ['OUTROS'] : [])]
    const rows: ChartRow[] = letters.map((letter, i) => {
      const values: Record<string, number> = {}
      const rowCounts: Record<string, number> = {}
      for (const g of groups) {
        const c = counts[g.key][letter] || 0
        rowCounts[g.key] = c
        values[g.key] = total > 0 ? (c / total) * 100 : 0
      }
      return {
        letter,
        label: letter === 'OUTROS' ? 'Outros' : qc.letterLabels[letter] || letter,
        color: resolveColor(config.colors, answerColorKey(letter), i),
        values,
        counts: rowCounts,
      }
    })

    return {
      questionColumn: qc.column,
      questionLabel: qc.label || qc.column,
      chartType: qc.chartType ?? config.chartType,
      comparing,
      groups,
      rows,
      total,
    }
  })
}
