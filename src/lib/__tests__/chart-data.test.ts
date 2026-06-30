import { describe, it, expect } from 'vitest'
import { computeChartData } from '../chart-data'
import type { ChartConfig } from '../types'

const baseConfig: ChartConfig = {
  id: 'chart-1',
  questionConfigs: [
    {
      column: 'R01',
      label: 'Aprovação',
      alternatives: 3,
      letterLabels: { A: 'Bom', B: 'Regular', C: 'Ruim' },
    },
  ],
  chartType: 'bar',
}

describe('computeChartData', () => {
  it('counts responses per letter', () => {
    const records = [
      { R01: 'A' },
      { R01: 'A' },
      { R01: 'B' },
      { R01: 'C' },
      { R01: 'A' },
    ]
    const result = computeChartData(records, baseConfig)
    expect(result).toHaveLength(1)
    const series = result[0]
    expect(series.questionLabel).toBe('Aprovação')
    expect(series.data).toEqual([
      { letter: 'A', label: 'Bom', count: 3 },
      { letter: 'B', label: 'Regular', count: 1 },
      { letter: 'C', label: 'Ruim', count: 1 },
    ])
  })

  it('groups extra letters under "Outros"', () => {
    const records = [{ R01: 'A' }, { R01: 'D' }, { R01: 'E' }]
    const config = { ...baseConfig, questionConfigs: [{ ...baseConfig.questionConfigs[0], alternatives: 3 }] }
    const result = computeChartData(records, config)
    const series = result[0]
    const outros = series.data.find((d) => d.letter === 'OUTROS')
    expect(outros).toBeDefined()
    expect(outros!.count).toBe(2)
  })

  it('handles empty records', () => {
    const result = computeChartData([], baseConfig)
    expect(result).toHaveLength(1)
    expect(result[0].data.every((d) => d.count === 0)).toBe(true)
  })

  it('handles multiple question columns', () => {
    const config: ChartConfig = {
      id: 'chart-1',
      questionConfigs: [
        { column: 'R01', label: 'Q1', alternatives: 2, letterLabels: { A: 'Sim', B: 'Não' } },
        { column: 'R02', label: 'Q2', alternatives: 2, letterLabels: { A: 'Sim', B: 'Não' } },
      ],
      chartType: 'bar',
    }
    const records = [
      { R01: 'A', R02: 'B' },
      { R01: 'A', R02: 'A' },
    ]
    const result = computeChartData(records, config)
    expect(result).toHaveLength(2)
    expect(result[0].questionLabel).toBe('Q1')
    expect(result[1].questionLabel).toBe('Q2')
  })

  it('shows raw letters when no labels set', () => {
    const config: ChartConfig = {
      id: 'chart-1',
      questionConfigs: [{ column: 'R01', label: 'Q1', alternatives: 3, letterLabels: {} }],
      chartType: 'bar',
    }
    const records = [{ R01: 'A' }, { R01: 'B' }]
    const result = computeChartData(records, config)
    expect(result[0].data[0].label).toBe('A')
  })

  it('tags each series with its effective chart type (per-question override wins)', () => {
    const config: ChartConfig = {
      id: 'chart-1',
      chartType: 'bar',
      questionConfigs: [
        { column: 'R01', label: 'Q1', alternatives: 2, letterLabels: {} },
        { column: 'R02', label: 'Q2', alternatives: 2, letterLabels: {}, chartType: 'pie' },
      ],
    }
    const result = computeChartData([{ R01: 'A', R02: 'B' }], config)
    expect(result[0].chartType).toBe('bar') // inherits chart default
    expect(result[1].chartType).toBe('pie') // per-question override
  })

  it('renders all answered columns when no questions are selected (fallback)', () => {
    const config: ChartConfig = { id: 'chart-1', questionConfigs: [], chartType: 'bar' }
    const records = [
      { R01: 'A', R02: 'B' },
      { R01: 'A', R02: 'C' },
    ]
    const result = computeChartData(records, config, ['R01', 'R02'])
    expect(result.map((s) => s.questionColumn)).toEqual(['R01', 'R02'])
    expect(result[0].data.find((d) => d.letter === 'A')?.count).toBe(2)
  })

  it('renders nothing when no questions selected and no fallback columns given', () => {
    const config: ChartConfig = { id: 'chart-1', questionConfigs: [], chartType: 'bar' }
    expect(computeChartData([{ R01: 'A' }], config)).toHaveLength(0)
  })
})
