import type { SurveyRecord, ChartConfig } from './types'

const ALPHABET = 'ABCDEFGHIJKLMNO'

export interface ChartDataPoint {
  letter: string
  label: string
  count: number
}

export interface ChartSeries {
  questionColumn: string
  questionLabel: string
  data: ChartDataPoint[]
}

export function computeChartData(
  records: SurveyRecord[],
  config: ChartConfig
): ChartSeries[] {
  return config.questionConfigs.map((qc) => {
    const expectedLetters = ALPHABET.slice(0, qc.alternatives).split('')
    const counts: Record<string, number> = {}
    let outrosCount = 0

    for (const letter of expectedLetters) {
      counts[letter] = 0
    }

    for (const record of records) {
      const value = (record[qc.column] || '').trim()
      if (!value) continue
      if (counts.hasOwnProperty(value)) {
        counts[value]++
      } else {
        outrosCount++
      }
    }

    const data: ChartDataPoint[] = expectedLetters.map((letter) => ({
      letter,
      label: qc.letterLabels[letter] || letter,
      count: counts[letter],
    }))

    if (outrosCount > 0) {
      data.push({ letter: 'OUTROS', label: 'Outros', count: outrosCount })
    }

    return {
      questionColumn: qc.column,
      questionLabel: qc.label || qc.column,
      data,
    }
  })
}
