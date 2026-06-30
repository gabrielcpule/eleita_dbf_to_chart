import { describe, it, expect } from 'vitest'
import { applyFilters, getUniqueValues } from '../filter-engine'

const records = [
  { LOCAL: 'S', SEXO: 'M', IDADE: '1', R01: 'A', R02: 'B' },
  { LOCAL: 'S', SEXO: 'F', IDADE: '2', R01: 'C', R02: '' },
  { LOCAL: 'N', SEXO: 'M', IDADE: '1', R01: '', R02: 'D' },
  { LOCAL: 'N', SEXO: 'F', IDADE: '3', R01: 'A', R02: 'E' },
]

describe('getUniqueValues', () => {
  it('returns sorted unique values', () => {
    const values = getUniqueValues(records, 'LOCAL')
    expect(values).toEqual(['N', 'S'])
  })

  it('excludes empty strings', () => {
    const values = getUniqueValues(records, 'R01')
    expect(values).toEqual(['A', 'C'])
  })
})

describe('applyFilters', () => {
  it('returns all records when no filters set', () => {
    const result = applyFilters(records, { LOCAL: '', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(4)
  })

  it('filters by single demographic', () => {
    const result = applyFilters(records, { LOCAL: 'S', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.LOCAL === 'S')).toBe(true)
  })

  it('filters by multiple demographics (AND logic)', () => {
    const result = applyFilters(records, { LOCAL: 'S', SEXO: 'M', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(1)
    expect(result[0].LOCAL).toBe('S')
    expect(result[0].SEXO).toBe('M')
  })

  it('excludes rows with empty answers', () => {
    const result = applyFilters(records, { LOCAL: '', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, ['R01'])
    expect(result).toHaveLength(3)
    expect(result.every((r) => r.R01 !== '')).toBe(true)
  })

  it('combines demographics and exclude-empty (AND)', () => {
    const result = applyFilters(records, { LOCAL: 'S', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, ['R02'])
    expect(result).toHaveLength(1)
    expect(result[0].LOCAL).toBe('S')
    expect(result[0].R02).not.toBe('')
  })

  it('returns empty when no records match', () => {
    const result = applyFilters(records, { LOCAL: 'X', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(0)
  })
})
