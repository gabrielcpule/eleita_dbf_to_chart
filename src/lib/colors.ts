/** Shared categorical palette for chart series (answers and comparison groups). */
export const CHART_PALETTE = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#d97706', '#4f46e5', '#059669', '#c026d3',
  '#0d9488', '#ea580c', '#6366f1', '#65a30d', '#e11d48',
] as const

/** Colour-map key for a comparison group (e.g. a SEXO value). */
export const groupColorKey = (value: string) => `grp:${value}`

/** Colour-map key for an answer option letter. */
export const answerColorKey = (letter: string) => `ans:${letter}`

/** Resolve a colour from a config override map, falling back to the palette. */
export function resolveColor(
  colors: Record<string, string> | undefined,
  key: string,
  index: number
): string {
  const override = colors?.[key]
  return override || CHART_PALETTE[index % CHART_PALETTE.length]
}
