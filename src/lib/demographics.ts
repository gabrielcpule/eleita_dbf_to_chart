import type { SurveyRecord, DemographicLabels } from './types'

/** Demographic column -> the DBF field that carries its human-readable label. */
export const DEMOGRAPHIC_NOME: Record<string, string> = {
  LOCAL: 'NOMELOCAL',
  SEXO: 'NOMESEXO',
  IDADE: 'NOMEIDADE',
  INSTRUCAO: 'NOMEINSTRU',
  RENDA: 'NOMERENDA',
}

/**
 * Best-effort initial labels for demographic codes, read from the paired NOME*
 * field. Where a code maps to several labels (the source data is inconsistent),
 * the most frequent one wins — the user can then edit it.
 */
export function deriveDemographicLabels(
  records: SurveyRecord[],
  columns: string[]
): DemographicLabels {
  const out: DemographicLabels = {}

  for (const col of columns) {
    const nome = DEMOGRAPHIC_NOME[col]
    if (!nome) continue

    const freq: Record<string, Record<string, number>> = {}
    for (const r of records) {
      const code = (r[col] || '').trim()
      const label = (r[nome] || '').trim()
      if (!code || !label) continue
      freq[code] = freq[code] || {}
      freq[code][label] = (freq[code][label] || 0) + 1
    }

    const map: Record<string, string> = {}
    for (const code of Object.keys(freq)) {
      let best = ''
      let bestCount = -1
      for (const [label, count] of Object.entries(freq[code])) {
        if (count > bestCount) {
          best = label
          bestCount = count
        }
      }
      if (best) map[code] = best
    }

    if (Object.keys(map).length > 0) out[col] = map
  }

  return out
}

/** Display label for a demographic value, falling back to the raw value. */
export function demographicLabel(
  labels: DemographicLabels | undefined,
  column: string,
  value: string
): string {
  return labels?.[column]?.[value] || value
}
