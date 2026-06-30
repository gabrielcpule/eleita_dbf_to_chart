import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { computeChartData } from '../lib/chart-data'
import { useFilteredRecords, useAnsweredColumns } from '../lib/hooks'
import { useSurvey } from '../lib/survey-context'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#d97706', '#4f46e5', '#059669', '#c026d3',
  '#0d9488', '#ea580c', '#6366f1', '#65a30d', '#e11d48',
]

const TYPE_LABEL: Record<string, string> = {
  bar: 'Bar',
  'horizontal-bar': 'Horizontal bar',
  pie: 'Pie / Donut',
  table: 'Table',
}

export function ChartDisplay() {
  const { state, dispatch } = useSurvey()
  const filteredRecords = useFilteredRecords()
  const answeredColumns = useAnsweredColumns()
  const activeChart = state.chartConfigs[state.activeChartIndex]

  const chartSeries = useMemo(() => {
    if (!activeChart) return []
    return computeChartData(filteredRecords, activeChart, answeredColumns)
  }, [activeChart, filteredRecords, answeredColumns])

  if (!activeChart) {
    return (
      <div className="flex flex-col items-center justify-center h-72 rounded-xl border border-dashed text-center text-muted-foreground gap-1">
        <p className="text-sm font-medium">No chart selected</p>
        <p className="text-xs">Create a chart to start visualizing responses.</p>
      </div>
    )
  }

  if (chartSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 rounded-xl border border-dashed text-center text-muted-foreground text-sm">
        No answered questions found in this file.
      </div>
    )
  }

  const usingAll = activeChart.questionConfigs.length === 0
  const navigate = (dir: -1 | 1) => {
    const newIdx = state.activeChartIndex + dir
    if (newIdx >= 0 && newIdx < state.chartConfigs.length) {
      dispatch({ type: 'SET_ACTIVE_CHART_INDEX', payload: newIdx })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            disabled={state.activeChartIndex === 0}
            className="text-sm h-7 w-7 grid place-items-center rounded border hover:bg-muted disabled:opacity-30"
            aria-label="Previous chart"
          >
            ◀
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Chart {state.activeChartIndex + 1} of {state.chartConfigs.length}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={state.activeChartIndex >= state.chartConfigs.length - 1}
            className="text-sm h-7 w-7 grid place-items-center rounded border hover:bg-muted disabled:opacity-30"
            aria-label="Next chart"
          >
            ▶
          </button>
        </div>
        {usingAll && (
          <Badge variant="secondary" className="text-xs font-normal">
            Showing all {chartSeries.length} questions
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {chartSeries.map((series) => (
          <Card
            key={series.questionColumn}
            className="p-4"
            id={`chart-${series.questionColumn}`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold truncate">
                {series.questionLabel || series.questionColumn}
              </h3>
              <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                {TYPE_LABEL[series.chartType]}
              </Badge>
            </div>

            {series.chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={series.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Responses" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {series.chartType === 'horizontal-bar' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={series.data}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" name="Responses" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {series.chartType === 'pie' && (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={series.data}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={40}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {series.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}

            {series.chartType === 'table' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Answer</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.data.map((d) => {
                    const total = series.data.reduce((s, x) => s + x.count, 0)
                    return (
                      <TableRow key={d.letter}>
                        <TableCell className="font-mono text-sm">{d.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {total > 0 ? ((d.count / total) * 100).toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
