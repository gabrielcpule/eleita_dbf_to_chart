import { describe, it, expect } from 'vitest'
import { deriveDemographicLabels, demographicLabel } from '../demographics'

describe('deriveDemographicLabels', () => {
  it('maps each code to its most frequent NOME label', () => {
    const records = [
      { INSTRUCAO: '0', NOMEINSTRU: 'ATE PRIMARIO' },
      { INSTRUCAO: '0', NOMEINSTRU: 'ATE PRIMARIO' },
      { INSTRUCAO: '0', NOMEINSTRU: '2o.GRAU COMPLETO' }, // less frequent -> ignored
      { INSTRUCAO: '3', NOMEINSTRU: 'NIVEL SUPERIOR' },
    ]
    const labels = deriveDemographicLabels(records, ['INSTRUCAO'])
    expect(labels.INSTRUCAO['0']).toBe('ATE PRIMARIO')
    expect(labels.INSTRUCAO['3']).toBe('NIVEL SUPERIOR')
  })

  it('skips columns with no NOME field (e.g. BAIRRO)', () => {
    const labels = deriveDemographicLabels([{ BAIRRO: 'AF' }], ['BAIRRO'])
    expect(labels.BAIRRO).toBeUndefined()
  })

  it('ignores blank codes and blank labels', () => {
    const records = [
      { SEXO: '', NOMESEXO: 'X' },
      { SEXO: 'M', NOMESEXO: '' },
    ]
    const labels = deriveDemographicLabels(records, ['SEXO'])
    expect(labels.SEXO).toBeUndefined()
  })
})

describe('demographicLabel', () => {
  const labels = { SEXO: { M: 'Masculino', F: 'Feminino' } }
  it('returns the override when present', () => {
    expect(demographicLabel(labels, 'SEXO', 'M')).toBe('Masculino')
  })
  it('falls back to the raw value', () => {
    expect(demographicLabel(labels, 'IDADE', '2')).toBe('2')
    expect(demographicLabel(undefined, 'SEXO', 'M')).toBe('M')
  })
})
