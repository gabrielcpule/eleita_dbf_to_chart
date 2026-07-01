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
import { computeChartData, type ChartSeries } from '../lib/chart-data'
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

const TYPE_LABEL: Record<string, string> = {
  bar: 'Bar',
  'horizontal-bar': 'Horizontal bar',
  pie: 'Pie / Donut',
  table: 'Table',
}

const pctFmt = (v: number) => `${v.toFixed(v < 10 ? 1 : 0)}%`

/** Recharts row objects keyed by group; values are percentages. */
function toBarData(series: ChartSeries) {
  return series.rows.map((r) => {
    const o: Record<string, string | number> = { label: r.label }
    for (const g of series.groups) o[g.key] = r.values[g.key]
    return o
  })
}

function BarSeries({ series, horizontal }: { series: ChartSeries; horizontal: boolean }) {
  const data = toBarData(series)
  const bars = series.comparing ? (
    series.groups.map((g) => (
      <Bar
        key={g.key}
        dataKey={g.key}
        name={g.label || g.key}
        fill={g.color}
        radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
      />
    ))
  ) : (
    <Bar dataKey="__all__" name="Share" radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}>
      {series.rows.map((r) => (
        <Cell key={r.letter} fill={r.color} />
      ))}
    </Bar>
  )

  return (
    <ResponsiveContainer width="100%" height={horizontal ? 300 : 280}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 20, bottom: 5, left: horizontal ? 80 : 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={pctFmt} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={70} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={pctFmt} />
          </>
        )}
        {bars}
        <Tooltip formatter={(value) => pctFmt(Number(value))} />
        {series.comparing && <Legend />}
      </BarChart>
    </ResponsiveContainer>
  )
}

function PieSeries({ series }: { series: ChartSeries }) {
  // One donut per comparison group (within-group proportions), or a single donut.
  return (
    <div className="flex flex-wrap justify-around gap-2">
      {series.groups.map((g) => {
        const groupTotal = series.rows.reduce((s, r) => s + r.counts[g.key], 0)
        const data = series.rows
          .map((r) => ({
            name: r.label,
            value: r.counts[g.key],
            pct: groupTotal > 0 ? (r.counts[g.key] / groupTotal) * 100 : 0,
            color: r.color,
          }))
          .filter((d) => d.value > 0)

        return (
          <div key={g.key} className="flex flex-col items-center">
            {series.comparing && (
              <span className="text-xs font-medium text-muted-foreground mb-1">
                {g.label || g.key}
              </span>
            )}
            <ResponsiveContainer width={series.comparing ? 200 : 320} height={240}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={series.comparing ? 70 : 95}
                  innerRadius={series.comparing ? 30 : 40}
                  label={({ payload }) => pctFmt(payload.pct)}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(_v, _n, item: { payload?: { pct?: number } }) =>
                    pctFmt(item?.payload?.pct ?? 0)
                  }
                />
                {!series.comparing && <Legend />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}

function TableSeries({ series }: { series: ChartSeries }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Answer</TableHead>
          {series.comparing ? (
            series.groups.map((g) => (
              <TableHead key={g.key} className="text-right">
                {g.label || g.key}
              </TableHead>
            ))
          ) : (
            <>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">n</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {series.rows.map((r) => (
          <TableRow key={r.letter}>
            <TableCell className="font-mono text-sm">{r.label}</TableCell>
            {series.comparing ? (
              series.groups.map((g) => (
                <TableCell key={g.key} className="text-right tabular-nums">
                  {pctFmt(r.values[g.key])}
                </TableCell>
              ))
            ) : (
              <>
                <TableCell className="text-right tabular-nums">
                  {pctFmt(r.values.__all__)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.counts.__all__}
                </TableCell>
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ChartDisplay() {
  const { state, dispatch } = useSurvey()
  const filteredRecords = useFilteredRecords()
  const answeredColumns = useAnsweredColumns()
  const activeChart = state.chartConfigs[state.activeChartIndex]

  const chartSeries = useMemo(() => {
    if (!activeChart) return []
    return computeChartData(filteredRecords, activeChart, answeredColumns, state.demographicLabels)
  }, [activeChart, filteredRecords, answeredColumns, state.demographicLabels])

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
        <div className="flex items-center gap-2">
          {activeChart.compareBy && (
            <Badge variant="outline" className="text-xs font-normal">
              Split by {activeChart.compareBy}
            </Badge>
          )}
          {usingAll && (
            <Badge variant="secondary" className="text-xs font-normal">
              Showing all {chartSeries.length} questions
            </Badge>
          )}
        </div>
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

            {(series.chartType === 'bar' || series.chartType === 'horizontal-bar') && (
              <BarSeries series={series} horizontal={series.chartType === 'horizontal-bar'} />
            )}
            {series.chartType === 'pie' && <PieSeries series={series} />}
            {series.chartType === 'table' && <TableSeries series={series} />}
          </Card>
        ))}
      </div>
    </div>
  )
}
