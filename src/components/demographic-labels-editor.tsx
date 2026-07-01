import { useState, useMemo } from 'react'
import { useSurvey } from '../lib/survey-context'
import { DEMOGRAPHIC_COLUMNS } from '../lib/types'
import { Input } from './ui/input'

/** Collapsible editor for renaming raw demographic codes (e.g. INSTRUCAO 0 → "Sem ensino"). */
export function DemographicLabelsEditor() {
  const { state, dispatch } = useSurvey()
  const [open, setOpen] = useState(false)
  const records = state.raw?.records || []

  const valuesByColumn = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const col of DEMOGRAPHIC_COLUMNS) {
      const set = new Set<string>()
      for (const r of records) {
        const v = (r[col] || '').trim()
        if (v) set.add(v)
      }
      out[col] = Array.from(set).sort()
    }
    return out
  }, [records])

  const editable = DEMOGRAPHIC_COLUMNS.filter((c) => valuesByColumn[c].length > 0)

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? '▾' : '▸'} Rename demographic values
      </button>

      {open && (
        <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {editable.map((col) => (
            <div key={col} className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {col}
              </div>
              {valuesByColumn[col].map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs font-mono text-muted-foreground truncate" title={v}>
                    {v}
                  </span>
                  <Input
                    value={state.demographicLabels[col]?.[v] || ''}
                    placeholder={v}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_DEMOGRAPHIC_LABEL',
                        payload: { column: col, value: v, label: e.target.value },
                      })
                    }
                    className="h-7 text-xs"
                    aria-label={`Label for ${col} ${v}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
