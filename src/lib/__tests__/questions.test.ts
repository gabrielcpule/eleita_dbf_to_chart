import { describe, it, expect } from 'vitest'
import {
  getAnsweredColumns,
  countUniqueLetters,
  getEffectiveQuestionConfigs,
} from '../questions'
import type { ChartConfig } from '../types'

const records = [
  { R01: 'A', R02: 'B', R03: '' },
  { R01: 'B', R02: '', R03: '' },
  { R01: 'A', R02: 'A', R03: '' },
]

describe('getAnsweredColumns', () => {
  it('keeps only columns with at least one non-empty answer', () => {
    expect(getAnsweredColumns(records, ['R01', 'R02', 'R03'])).toEqual(['R01', 'R02'])
  })

  it('preserves input order', () => {
    expect(getAnsweredColumns(records, ['R02', 'R01'])).toEqual(['R02', 'R01'])
  })

  it('treats whitespace-only as empty', () => {
    expect(getAnsweredColumns([{ R09: '   ' }], ['R09'])).toEqual([])
  })

  it('returns empty for no records', () => {
    expect(getAnsweredColumns([], ['R01'])).toEqual([])
  })
})

describe('countUniqueLetters', () => {
  it('counts distinct non-empty answers', () => {
    expect(countUniqueLetters(records, 'R01')).toBe(2)
  })

  it('clamps to a minimum of 2', () => {
    expect(countUniqueLetters([{ R01: 'A' }], 'R01')).toBe(2)
  })

  it('clamps to a maximum of 15', () => {
    const many = 'ABCDEFGHIJKLMNOPQRST'.split('').map((l) => ({ R01: l }))
    expect(countUniqueLetters(many, 'R01')).toBe(15)
  })
})

describe('getEffectiveQuestionConfigs', () => {
  const base: ChartConfig = { id: 'c1', questionConfigs: [], chartType: 'pie' }

  it('falls back to all answered columns when none are selected', () => {
    const result = getEffectiveQuestionConfigs(base, ['R01', 'R02'], records)
    expect(result.map((q) => q.column)).toEqual(['R01', 'R02'])
    // fallback questions inherit the chart-level default type
    expect(result.every((q) => q.chartType === 'pie')).toBe(true)
    // and derive their alternative count from the data
    expect(result[0].alternatives).toBe(2)
  })

  it('uses explicit configs when present, inheriting the default type when unset', () => {
    const config: ChartConfig = {
      ...base,
      chartType: 'bar',
      questionConfigs: [
        { column: 'R01', label: 'Q1', alternatives: 2, letterLabels: {} },
        { column: 'R02', label: 'Q2', alternatives: 2, letterLabels: {}, chartType: 'table' },
      ],
    }
    const result = getEffectiveQuestionConfigs(config, ['R01', 'R02', 'R03'], records)
    expect(result.map((q) => q.column)).toEqual(['R01', 'R02'])
    expect(result[0].chartType).toBe('bar') // inherited default
    expect(result[1].chartType).toBe('table') // per-question override preserved
  })
})
