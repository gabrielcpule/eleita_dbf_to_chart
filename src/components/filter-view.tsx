import { useState, useMemo } from 'react'
import { useSurvey } from '../lib/survey-context'
import { useFilteredRecords } from '../lib/hooks'
import { getUniqueValues } from '../lib/filter-engine'
import { DEMOGRAPHIC_COLUMNS, type DemographicsFilter } from '../lib/types'
import { Button } from './ui/button'
import { Card } from './ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Checkbox } from './ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

const ROWS_PER_PAGE = 50

export function FilterView() {
  const { state, dispatch } = useSurvey()
  const filteredRecords = useFilteredRecords()
  const [page, setPage] = useState(0)

  const rawRecords = state.raw?.records || []
  const rawFields = state.raw?.schema.fields || []

  const allChartQuestionColumns = useMemo(() => {
    const cols = new Set<string>()
    for (const config of state.chartConfigs) {
      for (const qc of config.questionConfigs) {
        cols.add(qc.column)
      }
    }
    return Array.from(cols)
  }, [state.chartConfigs])

  const demographicOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const col of DEMOGRAPHIC_COLUMNS) {
      opts[col] = getUniqueValues(rawRecords, col)
    }
    return opts
  }, [rawRecords])

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

  const handleExcludeEmptyToggle = (column: string, checked: boolean) => {
    const current = state.filters.excludeEmptyColumns
    const updated = checked
      ? [...current, column]
      : current.filter((c) => c !== column)
    dispatch({ type: 'SET_EXCLUDE_EMPTY_COLUMNS', payload: updated })
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

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {DEMOGRAPHIC_COLUMNS.map((col) => (
            <div key={col} className="flex flex-col gap-1.5 min-w-[140px]">
              <label htmlFor={`filter-${col}`} className="text-sm font-medium">
                {col}
              </label>
              <Select
                value={state.filters.demographics[col] || 'all'}
                onValueChange={(v) => v !== null && handleDemographicChange(col, v)}
              >
                <SelectTrigger id={`filter-${col}`}>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {demographicOptions[col]?.map((val) => (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {allChartQuestionColumns.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Exclude unanswered</span>
              <div className="flex flex-wrap gap-3">
                {allChartQuestionColumns.map((col) => (
                  <label key={col} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={state.filters.excludeEmptyColumns.includes(col)}
                      onCheckedChange={(c) => handleExcludeEmptyToggle(col, c === true)}
                    />
                    {col}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {rawRecords.length} records
          {filteredRecords.length === 0 && (
            <span className="text-destructive ml-2">
              &mdash; No records match. Try adjusting your filters.
            </span>
          )}
        </div>
      </Card>

      <Card className="overflow-auto">
        <div className="min-w-[800px]">
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
                    <TableCell key={field.name} className="text-xs font-mono">
                      {record[field.name] || ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {pagedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleFields.length} className="text-center py-8 text-muted-foreground">
                    No records to display
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
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

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => dispatch({ type: 'SET_STEP', payload: 0 })}>
          &larr; Back to Upload
        </Button>
        <Button onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          Configure Charts &rarr;
        </Button>
      </div>
    </div>
  )
}
