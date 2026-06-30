import { describe, it, expect } from 'vitest'
import { generateCsv } from '../csv-generator'

describe('generateCsv', () => {
  it('generates header row from column labels', () => {
    const records = [{ R01: 'A', R05: 'B' }]
    const result = generateCsv(records, ['R01', 'R05'], { R01: 'Question 1', R05: 'Question 5' })
    expect(result).toContain('"Question 1","Question 5"')
  })

  it('falls back to column name when no label', () => {
    const records = [{ R01: 'A' }]
    const result = generateCsv(records, ['R01'], {})
    expect(result).toContain('"R01"')
  })

  it('generates data rows', () => {
    const records = [
      { R01: 'A', R02: 'B' },
      { R01: 'C', R02: 'D' },
    ]
    const result = generateCsv(records, ['R01', 'R02'], {})
    const lines = result.trim().split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('"A"')
    expect(lines[2]).toContain('"D"')
  })

  it('escapes quotes in values', () => {
    const records = [{ R01: 'A"B' }]
    const result = generateCsv(records, ['R01'], {})
    expect(result).toContain('"A""B"')
  })

  it('returns header-only for empty records', () => {
    const result = generateCsv([], ['R01'], { R01: 'Q1' })
    expect(result).toBe('"Q1"\n')
  })
})
