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
import { useFilteredRecords } from '../lib/hooks'
import { useSurvey } from '../lib/survey-context'
import { Card } from './ui/card'
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

export function ChartDisplay() {
  const { state, dispatch } = useSurvey()
  const filteredRecords = useFilteredRecords()
  const activeChart = state.chartConfigs[state.activeChartIndex]

  const chartSeries = useMemo(() => {
    if (!activeChart || activeChart.questionConfigs.length === 0) return []
    return computeChartData(filteredRecords, activeChart)
  }, [activeChart, filteredRecords])

  if (!activeChart) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No chart selected. Create a chart to get started.
      </div>
    )
  }

  if (activeChart.questionConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Select at least one question column to visualize.
      </div>
    )
  }

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
            className="text-sm px-2 py-1 rounded border hover:bg-muted disabled:opacity-30"
            aria-label="Previous chart"
          >
            ◀
          </button>
          <span className="text-sm text-muted-foreground">
            Chart {state.activeChartIndex + 1} of {state.chartConfigs.length}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={state.activeChartIndex >= state.chartConfigs.length - 1}
            className="text-sm px-2 py-1 rounded border hover:bg-muted disabled:opacity-30"
            aria-label="Next chart"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {chartSeries.map((series) => (
          <Card key={series.questionColumn} className="p-4" id={`chart-${series.questionColumn}`}>
            <h3 className="text-sm font-semibold mb-3">
              {series.questionLabel || series.questionColumn}
            </h3>
            {activeChart.chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={series.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Responses" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChart.chartType === 'horizontal-bar' && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={series.data}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" name="Responses" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChart.chartType === 'pie' && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={series.data}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
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

            {activeChart.chartType === 'table' && (
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
                        <TableCell className="text-right">{d.count}</TableCell>
                        <TableCell className="text-right">
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
