import { useState, useMemo } from 'react'
import { useSurvey } from '../lib/survey-context'
import { useFilteredRecords } from '../lib/hooks'
import { getUniqueValues } from '../lib/filter-engine'
import { DEMOGRAPHIC_COLUMNS, type DemographicsFilter } from '../lib/types'
import { ChartConfigPanel } from './chart-config-panel'
import { ChartDisplay } from './chart-display'
import { ExportMenu } from './export-menu'
import { Button } from './ui/button'
import { Card } from './ui/card'
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
      {/* Back navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => dispatch({ type: 'SET_STEP', payload: 0 })}>
          {'←'} Back to Upload
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Hide Table' : 'Show Table'}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {DEMOGRAPHIC_COLUMNS.map((col) => (
            <div key={col} className="flex flex-col gap-1.5 min-w-[140px]">
              <label htmlFor={`filter-${col}`} className="text-sm font-medium">
                {col}
              </label>
              <Select
                value={state.filters.demographics[col] || 'all'}
                onValueChange={(v) => handleDemographicChange(col, v ?? 'all')}
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
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {rawRecords.length} records
          {filteredRecords.length === 0 && (
            <span className="text-destructive ml-2">
              {'—'} No records match. Try adjusting your filters.
            </span>
          )}
        </div>
      </Card>

      {/* Data table (collapsible) */}
      {showTable && (
        <div className="overflow-x-auto rounded-lg border">
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
                    <TableCell key={field.name} className="text-xs font-mono whitespace-nowrap">
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
      )}

      {/* Pagination for table */}
      {showTable && totalPages > 1 && (
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

      {/* Chart workspace: config left, display right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 border rounded-lg p-4 bg-card">
            <ChartConfigPanel />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-end">
            <ExportMenu />
          </div>
          <ChartDisplay />
        </div>
      </div>
    </div>
  )
}
