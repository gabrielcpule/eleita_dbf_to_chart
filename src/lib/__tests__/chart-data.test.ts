import { describe, it, expect } from 'vitest'
import { computeChartData } from '../chart-data'
import type { ChartConfig } from '../types'

const baseConfig: ChartConfig = {
  id: 'chart-1',
  chartType: 'bar',
  colors: {},
  questionConfigs: [
    {
      column: 'R01',
      label: 'Aprovação',
      alternatives: 3,
      letterLabels: { A: 'Bom', B: 'Regular', C: 'Ruim' },
    },
  ],
}

describe('computeChartData — single dimension (no compareBy)', () => {
  it('returns percentages of answered respondents', () => {
    const records = [{ R01: 'A' }, { R01: 'A' }, { R01: 'B' }, { R01: 'C' }, { R01: '' }]
    const [series] = computeChartData(records, baseConfig)
    expect(series.comparing).toBe(false)
    expect(series.total).toBe(4) // blank excluded
    expect(series.groups).toHaveLength(1)
    const a = series.rows.find((r) => r.letter === 'A')!
    const b = series.rows.find((r) => r.letter === 'B')!
    expect(a.counts['__all__']).toBe(2)
    expect(a.values['__all__']).toBeCloseTo(50) // 2 of 4
    expect(b.values['__all__']).toBeCloseTo(25) // 1 of 4
    // percentages across rows sum to 100
    const sum = series.rows.reduce((s, r) => s + r.values['__all__'], 0)
    expect(sum).toBeCloseTo(100)
  })

  it('assigns per-answer colours from the palette and honours overrides', () => {
    const config = { ...baseConfig, colors: { 'ans:B': '#000000' } }
    const [series] = computeChartData([{ R01: 'A' }, { R01: 'B' }], config)
    const a = series.rows.find((r) => r.letter === 'A')!
    const b = series.rows.find((r) => r.letter === 'B')!
    expect(a.color).toBe('#2563eb') // palette[0]
    expect(b.color).toBe('#000000') // override
  })

  it('groups unexpected letters under Outros', () => {
    const records = [{ R01: 'A' }, { R01: 'D' }, { R01: 'E' }]
    const [series] = computeChartData(records, baseConfig)
    const outros = series.rows.find((r) => r.letter === 'OUTROS')!
    expect(outros.counts['__all__']).toBe(2)
  })
})

describe('computeChartData — compareBy', () => {
  const config: ChartConfig = {
    ...baseConfig,
    compareBy: 'SEXO',
    questionConfigs: [
      { column: 'R01', label: 'Q1', alternatives: 2, letterLabels: { A: 'Sim', B: 'Não' } },
    ],
  }
  const records = [
    { R01: 'A', SEXO: 'M' },
    { R01: 'A', SEXO: 'F' },
    { R01: 'B', SEXO: 'M' },
    { R01: 'A', SEXO: 'M' },
  ]

  it('splits each answer by the comparison dimension, sorted', () => {
    const [series] = computeChartData(records, config)
    expect(series.comparing).toBe(true)
    expect(series.groups.map((g) => g.key)).toEqual(['F', 'M'])
    const a = series.rows.find((r) => r.letter === 'A')!
    expect(a.counts.M).toBe(2)
    expect(a.counts.F).toBe(1)
    expect(a.values.M).toBeCloseTo(50) // 2 of 4 total
    expect(a.values.F).toBeCloseTo(25)
  })

  it('all cells sum to 100% (percentage of all answered)', () => {
    const [series] = computeChartData(records, config)
    let sum = 0
    for (const row of series.rows) for (const g of series.groups) sum += row.values[g.key]
    expect(sum).toBeCloseTo(100)
  })

  it('uses demographic labels for group names and honours group colour overrides', () => {
    const withColors = { ...config, colors: { 'grp:M': '#123456' } }
    const [series] = computeChartData(records, withColors, [], {
      SEXO: { M: 'Masculino', F: 'Feminino' },
    })
    const m = series.groups.find((g) => g.key === 'M')!
    const f = series.groups.find((g) => g.key === 'F')!
    expect(m.label).toBe('Masculino')
    expect(f.label).toBe('Feminino')
    expect(m.color).toBe('#123456') // override
    expect(f.color).toBe('#2563eb') // palette[0]; F sorts first
  })

  it('excludes records with a blank comparison value from totals', () => {
    const recs = [...records, { R01: 'A', SEXO: '' }]
    const [series] = computeChartData(recs, config)
    expect(series.total).toBe(4) // blank-SEXO row ignored
  })
})

describe('computeChartData — fallback render-all', () => {
  it('renders all answered columns when nothing is selected', () => {
    const config: ChartConfig = { id: 'c', chartType: 'bar', colors: {}, questionConfigs: [] }
    const [s1, s2] = computeChartData(
      [{ R01: 'A', R02: 'B' }, { R01: 'A', R02: 'B' }],
      config,
      ['R01', 'R02']
    )
    expect(s1.questionColumn).toBe('R01')
    expect(s2.questionColumn).toBe('R02')
  })
})
