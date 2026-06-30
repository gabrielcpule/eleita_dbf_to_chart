import { useMemo } from 'react'
import { useSurvey } from '../lib/survey-context'
import { detectQuestionColumns, type ChartConfig, type QuestionConfig } from '../lib/types'
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

function countUniqueLetters(records: Record<string, string>[], column: string): number {
  const letters = new Set<string>()
  for (const r of records) {
    const v = (r[column] || '').trim()
    if (v) letters.add(v)
  }
  return Math.max(2, Math.min(15, letters.size))
}

const ALPHABET = 'ABCDEFGHIJKLMNO'

interface QuestionConfigSectionProps {
  config: QuestionConfig
  onChange: (updated: QuestionConfig) => void
}

function QuestionConfigSection({ config, onChange }: QuestionConfigSectionProps) {
  const letterInputs = ALPHABET.slice(0, config.alternatives).split('').map((letter) => (
    <div key={letter} className="flex items-center gap-2">
      <span className="w-6 text-sm font-mono font-bold">{letter}</span>
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
    <div className="space-y-3 pl-4 border-l-2 border-muted">
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
        <label className="text-xs font-medium text-muted-foreground">
          Number of alternatives
        </label>
        <Select
          value={String(config.alternatives)}
          onValueChange={(v) => {
            const n = parseInt(v, 10)
            const newLabels = { ...config.letterLabels }
            const validLetters = ALPHABET.slice(0, n)
            for (const key of Object.keys(newLabels)) {
              if (!validLetters.includes(key)) delete newLabels[key]
            }
            onChange({ ...config, alternatives: n, letterLabels: newLabels })
          }}
        >
          <SelectTrigger className="h-8 w-24">
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
  const questionColumns = useMemo(
    () => (state.raw ? detectQuestionColumns(state.raw.schema.fields) : []),
    [state.raw]
  )

  const handleAddChart = () => {
    dispatch({ type: 'ADD_CHART' })
  }

  const handleRemoveChart = (id: string) => {
    dispatch({ type: 'REMOVE_CHART', payload: id })
  }

  const handleUpdateChart = (config: ChartConfig) => {
    dispatch({ type: 'UPDATE_CHART', payload: config })
  }

  const handleToggleQuestion = (chart: ChartConfig, column: string, checked: boolean) => {
    if (checked) {
      const alternatives = countUniqueLetters(rawRecords, column)
      const newConfig: QuestionConfig = {
        column,
        label: '',
        alternatives,
        letterLabels: {},
      }
      handleUpdateChart({
        ...chart,
        questionConfigs: [...chart.questionConfigs, newConfig],
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Charts</h2>
        <Button size="sm" variant="outline" onClick={handleAddChart}>
          + New Chart
        </Button>
      </div>

      {state.chartConfigs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No charts yet. Click &quot;+ New Chart&quot; to start.
        </p>
      ) : (
        <ScrollArea className="flex-1">
          <Accordion
            type="single"
            value={state.chartConfigs[state.activeChartIndex]?.id}
            onValueChange={(id) => {
              if (id) {
                const idx = state.chartConfigs.findIndex((c) => c.id === id)
                if (idx >= 0) dispatch({ type: 'SET_ACTIVE_CHART_INDEX', payload: idx })
              }
            }}
          >
            {state.chartConfigs.map((chart) => {
              const selectedCols = chart.questionConfigs.map((qc) => qc.column)

              return (
                <AccordionItem key={chart.id} value={chart.id}>
                  <div className="flex items-center">
                    <AccordionTrigger className="flex-1 text-sm">
                      Chart {state.chartConfigs.indexOf(chart) + 1}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({chart.questionConfigs.length} questions)
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
                        aria-label={`Remove Chart ${state.chartConfigs.indexOf(chart) + 1}`}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-4 px-1">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Questions
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {questionColumns.map((col) => (
                            <label
                              key={col}
                              className="flex items-center gap-1.5 text-sm cursor-pointer py-0.5"
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
                      </div>

                      {chart.questionConfigs.map((qc) => (
                        <div key={qc.column} className="space-y-2">
                          <h4 className="text-sm font-medium">{qc.column}</h4>
                          <QuestionConfigSection
                            config={qc}
                            onChange={(updated) =>
                              handleUpdateQuestionConfig(chart, qc.column, updated)
                            }
                          />
                        </div>
                      ))}

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Chart type
                        </label>
                        <Select
                          value={chart.chartType}
                          onValueChange={(v) =>
                            handleUpdateChart({
                              ...chart,
                              chartType: v as ChartConfig['chartType'],
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Bar (Vertical)</SelectItem>
                            <SelectItem value="horizontal-bar">Horizontal Bar</SelectItem>
                            <SelectItem value="pie">Pie / Donut</SelectItem>
                            <SelectItem value="table">Summary Table</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
