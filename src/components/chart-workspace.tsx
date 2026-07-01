import { useState, useMemo } from 'react'
import { useSurvey } from '../lib/survey-context'
import { useFilteredRecords } from '../lib/hooks'
import { getUniqueValues } from '../lib/filter-engine'
import { demographicLabel } from '../lib/demographics'
import { DEMOGRAPHIC_COLUMNS, type DemographicsFilter } from '../lib/types'
import { ChartConfigPanel } from './chart-config-panel'
import { ChartDisplay } from './chart-display'
import { DemographicLabelsEditor } from './demographic-labels-editor'
import { ExportMenu } from './export-menu'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

const ROWS_PER_PAGE = 50

export function ChartWorkspace() {
  const { state, dispatch } = useSurvey()
  const filteredRecords = useFilteredRecords()
  const [page, setPage] = useState(0)
  const [showTable, setShowTable] = useState(false)

  const rawRecords = state.raw?.records || []
  const rawFields = state.raw?.schema.fields || []

  const demographicOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const col of DEMOGRAPHIC_COLUMNS) {
      opts[col] = getUniqueValues(rawRecords, col)
    }
    return opts
  }, [rawRecords])

  const activeFilters = useMemo(
    () =>
      DEMOGRAPHIC_COLUMNS.filter(
        (col) => (state.filters.demographics[col] || '').trim() !== ''
      ),
    [state.filters.demographics]
  )

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE))
  const pagedRecords = filteredRecords.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE
  )

  const handleDemographicChange = (column: string, value: string) => {
    dispatch({
      type: 'SET_DEMOGRAPHICS_FILTER',
      payload: { [column]: value === 'all' ? '' : value } as Partial<DemographicsFilter>,
    })
    setPage(0)
  }

  const clearAllFilters = () => {
    const cleared = Object.fromEntries(
      DEMOGRAPHIC_COLUMNS.map((c) => [c, ''])
    ) as Partial<DemographicsFilter>
    dispatch({ type: 'SET_DEMOGRAPHICS_FILTER', payload: cleared })
    setPage(0)
  }

  if (!state.raw) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No data loaded. Please upload a DBF file first.
      </div>
    )
  }

  const displayFields = rawFields.filter(
    (f) => f.name && !f.name.startsWith('NOME') && f.name !== ''
  )
  const visibleFields = displayFields.slice(0, 20)
  const pct = rawRecords.length
    ? Math.round((filteredRecords.length / rawRecords.length) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Workspace toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 0 })}>
          {'←'} Back to upload
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <div className="text-lg font-semibold tabular-nums">
              {filteredRecords.length.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">
                {' / '}
                {rawRecords.length.toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              respondents · {pct}%
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTable((s) => !s)}>
            {showTable ? 'Hide data' : 'View data'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filter respondents
            </span>
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {activeFilters.length} active
              </Badge>
            )}
          </div>
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DEMOGRAPHIC_COLUMNS.map((col) => (
            <div key={col} className="flex flex-col gap-1.5">
              <label
                htmlFor={`filter-${col}`}
                className="text-[11px] font-medium text-muted-foreground"
              >
                {col}
              </label>
              <Select
                value={state.filters.demographics[col] || 'all'}
                onValueChange={(v) => handleDemographicChange(col, v ?? 'all')}
              >
                <SelectTrigger id={`filter-${col}`} className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {demographicOptions[col]?.map((val) => (
                    <SelectItem key={val} value={val}>
                      {demographicLabel(state.demographicLabels, col, val)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activeFilters.map((col) => (
              <button
                key={col}
                onClick={() => handleDemographicChange(col, 'all')}
                className="group inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs hover:bg-muted transition-colors"
              >
                <span className="font-medium">{col}</span>
                <span className="text-muted-foreground">
                  {demographicLabel(state.demographicLabels, col, state.filters.demographics[col])}
                </span>
                <span className="text-muted-foreground group-hover:text-destructive">×</span>
              </button>
            ))}
          </div>
        )}

        {filteredRecords.length === 0 && (
          <p className="mt-3 text-sm text-destructive">
            No records match these filters. Try clearing some.
          </p>
        )}

        <DemographicLabelsEditor />
      </Card>

      {/* Data table drawer */}
      {showTable && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleFields.map((field) => (
                    <TableHead key={field.name} className="whitespace-nowrap text-xs">
                      {field.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecords.map((record, i) => (
                  <TableRow key={i}>
                    {visibleFields.map((field) => (
                      <TableCell
                        key={field.name}
                        className="text-xs font-mono whitespace-nowrap"
                      >
                        {record[field.name] || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {pagedRecords.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={visibleFields.length}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No records to display
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Builder rail + chart canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-4">
            <Card className="p-4 flex flex-col lg:max-h-[calc(100vh-2rem)] overflow-hidden">
              <ChartConfigPanel />
            </Card>
          </div>
        </aside>

        <section className="lg:col-span-8 xl:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </h2>
            <ExportMenu />
          </div>
          <ChartDisplay />
        </section>
      </div>
    </div>
  )
}
