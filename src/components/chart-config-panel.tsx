import { useMemo } from 'react'
import { useSurvey } from '../lib/survey-context'
import { useAnsweredColumns } from '../lib/hooks'
import { countUniqueLetters } from '../lib/questions'
import { demographicLabel } from '../lib/demographics'
import { resolveColor, groupColorKey, answerColorKey } from '../lib/colors'
import {
  DEMOGRAPHIC_COLUMNS,
  type ChartConfig,
  type ChartType,
  type QuestionConfig,
} from '../lib/types'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { ScrollArea } from './ui/scroll-area'

const ALPHABET = 'ABCDEFGHIJKLMNO'

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Bar (vertical)' },
  { value: 'horizontal-bar', label: 'Horizontal bar' },
  { value: 'pie', label: 'Pie / Donut' },
  { value: 'table', label: 'Summary table' },
]

function distinctSorted(records: Record<string, string>[], column: string): string[] {
  const set = new Set<string>()
  for (const r of records) {
    const v = (r[column] || '').trim()
    if (v) set.add(v)
  }
  return Array.from(set).sort()
}

function ChartTypeSelect({
  value,
  onChange,
  className,
}: {
  value: ChartType
  onChange: (v: ChartType) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as ChartType)}>
      <SelectTrigger className={className ?? 'h-8'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CHART_TYPES.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface QuestionConfigSectionProps {
  config: QuestionConfig
  defaultType: ChartType
  onChange: (updated: QuestionConfig) => void
}

function QuestionConfigSection({ config, defaultType, onChange }: QuestionConfigSectionProps) {
  const letterInputs = ALPHABET.slice(0, config.alternatives).split('').map((letter) => (
    <div key={letter} className="flex items-center gap-2">
      <span className="w-6 text-sm font-mono font-bold text-primary">{letter}</span>
      <Input
        value={config.letterLabels[letter] || ''}
        onChange={(e) =>
          onChange({
            ...config,
            letterLabels: { ...config.letterLabels, [letter]: e.target.value },
          })
        }
        placeholder={letter}
        className="h-8 text-sm"
        aria-label={`Label for ${letter}`}
      />
    </div>
  ))

  return (
    <div className="space-y-3 pl-3 border-l-2 border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Chart type</label>
          <ChartTypeSelect
            value={config.chartType ?? defaultType}
            onChange={(v) => onChange({ ...config, chartType: v })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Alternatives</label>
          <Select
            value={String(config.alternatives)}
            onValueChange={(v) => {
              const n = parseInt(v ?? '', 10)
              const newLabels = { ...config.letterLabels }
              const validLetters = ALPHABET.slice(0, n)
              for (const key of Object.keys(newLabels)) {
                if (!validLetters.includes(key)) delete newLabels[key]
              }
              onChange({ ...config, alternatives: n, letterLabels: newLabels })
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 14 }, (_, i) => i + 2).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} ({ALPHABET.slice(0, n)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Question label</label>
        <Input
          value={config.label}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
          placeholder={`Question ${config.column}`}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Answer labels</label>
        <div className="space-y-1.5">{letterInputs}</div>
      </div>
    </div>
  )
}

export function ChartConfigPanel() {
  const { state, dispatch } = useSurvey()

  const rawRecords = state.raw?.records || []
  const questionColumns = useAnsweredColumns()
  const activeId = state.chartConfigs[state.activeChartIndex]?.id

  // Demographics usable as a comparison axis (need ≥2 distinct values).
  const comparableDemographics = useMemo(
    () =>
      DEMOGRAPHIC_COLUMNS.filter((col) => {
        const seen = new Set<string>()
        for (const r of rawRecords) {
          const v = (r[col] || '').trim()
          if (v) seen.add(v)
          if (seen.size > 1) return true
        }
        return false
      }),
    [rawRecords]
  )

  const handleAddChart = () => dispatch({ type: 'ADD_CHART' })
  const handleRemoveChart = (id: string) => dispatch({ type: 'REMOVE_CHART', payload: id })
  const handleUpdateChart = (config: ChartConfig) =>
    dispatch({ type: 'UPDATE_CHART', payload: config })

  const handleToggleQuestion = (chart: ChartConfig, column: string, checked: boolean) => {
    if (checked) {
      const newConfig: QuestionConfig = {
        column,
        label: '',
        alternatives: countUniqueLetters(rawRecords, column),
        letterLabels: {},
      }
      handleUpdateChart({
        ...chart,
        questionConfigs: [...chart.questionConfigs, newConfig].sort((a, b) =>
          a.column.localeCompare(b.column)
        ),
      })
    } else {
      handleUpdateChart({
        ...chart,
        questionConfigs: chart.questionConfigs.filter((qc) => qc.column !== column),
      })
    }
  }

  const handleUpdateQuestionConfig = (
    chart: ChartConfig,
    column: string,
    updated: QuestionConfig
  ) => {
    handleUpdateChart({
      ...chart,
      questionConfigs: chart.questionConfigs.map((qc) =>
        qc.column === column ? updated : qc
      ),
    })
  }

  const setColor = (chart: ChartConfig, key: string, value: string) =>
    handleUpdateChart({ ...chart, colors: { ...(chart.colors || {}), [key]: value } })

  // The swatches to show for the currently-coloured dimension.
  const colorEntries = (chart: ChartConfig): { key: string; label: string; color: string }[] => {
    if (chart.compareBy) {
      return distinctSorted(rawRecords, chart.compareBy).map((v, i) => {
        const key = groupColorKey(v)
        return {
          key,
          label: demographicLabel(state.demographicLabels, chart.compareBy!, v),
          color: resolveColor(chart.colors, key, i),
        }
      })
    }
    const maxAlt = chart.questionConfigs.length
      ? Math.max(...chart.questionConfigs.map((q) => q.alternatives))
      : Math.max(2, ...questionColumns.map((c) => countUniqueLetters(rawRecords, c)))
    return ALPHABET.slice(0, maxAlt)
      .split('')
      .map((letter, i) => {
        const key = answerColorKey(letter)
        return { key, label: letter, color: resolveColor(chart.colors, key, i) }
      })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-sm">Chart builder</h2>
          <p className="text-xs text-muted-foreground">
            {state.chartConfigs.length} chart{state.chartConfigs.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button size="sm" onClick={handleAddChart}>
          + New chart
        </Button>
      </div>

      {state.chartConfigs.length === 0 ? (
        <div className="rounded-lg border border-dashed text-center py-10 px-4">
          <p className="text-sm text-muted-foreground">No charts yet.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={handleAddChart}>
            Create your first chart
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <Accordion
            value={activeId ? [activeId] : []}
            onValueChange={(ids) => {
              const id = ids[0]
              if (id) {
                const idx = state.chartConfigs.findIndex((c) => c.id === id)
                if (idx >= 0) dispatch({ type: 'SET_ACTIVE_CHART_INDEX', payload: idx })
              }
            }}
          >
            {state.chartConfigs.map((chart, chartIndex) => {
              const selectedCols = chart.questionConfigs.map((qc) => qc.column)
              const usingAll = selectedCols.length === 0

              return (
                <AccordionItem key={chart.id} value={chart.id}>
                  <div className="flex items-center">
                    <AccordionTrigger className="flex-1 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary text-xs font-semibold">
                          {chartIndex + 1}
                        </span>
                        Chart {chartIndex + 1}
                        <span className="text-xs text-muted-foreground font-normal">
                          {usingAll
                            ? `all ${questionColumns.length}`
                            : `${selectedCols.length} selected`}
                        </span>
                      </span>
                    </AccordionTrigger>
                    {state.chartConfigs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 mr-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveChart(chart.id)
                        }}
                        aria-label={`Remove Chart ${chartIndex + 1}`}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-4 px-1 pb-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">
                            Default chart type
                          </label>
                          <ChartTypeSelect
                            value={chart.chartType}
                            onChange={(v) => handleUpdateChart({ ...chart, chartType: v })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">
                            Compare by
                          </label>
                          <Select
                            value={chart.compareBy ?? 'none'}
                            onValueChange={(v) =>
                              handleUpdateChart({
                                ...chart,
                                compareBy: !v || v === 'none' ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Don&apos;t split</SelectItem>
                              {comparableDemographics.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Questions
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {questionColumns.map((col) => (
                            <label
                              key={col}
                              className="flex items-center gap-1.5 text-sm cursor-pointer py-0.5 rounded hover:bg-muted/60 px-1"
                            >
                              <Checkbox
                                checked={selectedCols.includes(col)}
                                onCheckedChange={(c) =>
                                  handleToggleQuestion(chart, col, c === true)
                                }
                              />
                              {col}
                            </label>
                          ))}
                        </div>
                        {usingAll && (
                          <p className="text-[11px] text-muted-foreground">
                            Nothing selected — showing all {questionColumns.length} questions.
                            Check specific ones to narrow down.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          {chart.compareBy ? `Colours — ${chart.compareBy} groups` : 'Colours — answers'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {colorEntries(chart).map((e) => (
                            <label
                              key={e.key}
                              className="flex items-center gap-1.5 text-xs"
                              title={e.label}
                            >
                              <input
                                type="color"
                                value={e.color}
                                onChange={(ev) => setColor(chart, e.key, ev.target.value)}
                                className="h-6 w-6 rounded border cursor-pointer bg-transparent p-0"
                                aria-label={`Colour for ${e.label}`}
                              />
                              <span className="max-w-[84px] truncate">{e.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {chart.questionConfigs.map((qc) => (
                        <div key={qc.column} className="space-y-2">
                          <h4 className="text-sm font-semibold">{qc.column}</h4>
                          <QuestionConfigSection
                            config={qc}
                            defaultType={chart.chartType}
                            onChange={(updated) =>
                              handleUpdateQuestionConfig(chart, qc.column, updated)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </ScrollArea>
      )}
    </div>
  )
}
