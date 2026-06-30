import { useCallback, useMemo } from 'react'
import { toPng, toSvg } from 'html-to-image'
import JSZip from 'jszip'
import { useSurvey } from '../lib/survey-context'
import { useFilteredRecords, useAnsweredColumns } from '../lib/hooks'
import { getEffectiveQuestionConfigs } from '../lib/questions'
import { generateCsv } from '../lib/csv-generator'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { toast } from 'sonner'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportMenu() {
  const { state } = useSurvey()
  const filteredRecords = useFilteredRecords()
  const answeredColumns = useAnsweredColumns()
  const activeChart = state.chartConfigs[state.activeChartIndex]

  // The questions actually rendered — explicit selections, or all answered
  // columns when nothing is selected (render-all fallback).
  const effectiveConfigs = useMemo(
    () =>
      activeChart
        ? getEffectiveQuestionConfigs(activeChart, answeredColumns, filteredRecords)
        : [],
    [activeChart, answeredColumns, filteredRecords]
  )

  const exportPng = useCallback(async () => {
    if (!activeChart) return
    const containers = effectiveConfigs
      .map((qc) => document.getElementById(`chart-${qc.column}`))
      .filter(Boolean) as HTMLElement[]

    if (containers.length === 0) {
      toast.error('No chart to export.')
      return
    }

    try {
      if (containers.length === 1) {
        const dataUrl = await toPng(containers[0], { backgroundColor: '#fff' })
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        downloadBlob(blob, `chart-${activeChart.id}.png`)
      } else {
        const zip = new JSZip()
        for (const container of containers) {
          const dataUrl = await toPng(container, { backgroundColor: '#fff' })
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const qCol = container.id.replace('chart-', '')
          zip.file(`chart-${qCol}.png`, blob)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        downloadBlob(zipBlob, `charts-${activeChart.id}.zip`)
      }
      toast.success('Chart exported as PNG.')
    } catch {
      toast.error('Failed to export PNG.')
    }
  }, [activeChart, effectiveConfigs])

  const exportSvg = useCallback(async () => {
    if (!activeChart) return
    const containers = effectiveConfigs
      .map((qc) => document.getElementById(`chart-${qc.column}`))
      .filter(Boolean) as HTMLElement[]

    if (containers.length === 0) {
      toast.error('No chart to export.')
      return
    }

    try {
      if (containers.length === 1) {
        const dataUrl = await toSvg(containers[0], { backgroundColor: '#fff' })
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        downloadBlob(blob, `chart-${activeChart.id}.svg`)
      } else {
        const zip = new JSZip()
        for (const container of containers) {
          const dataUrl = await toSvg(container, { backgroundColor: '#fff' })
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const qCol = container.id.replace('chart-', '')
          zip.file(`chart-${qCol}.svg`, blob)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        downloadBlob(zipBlob, `charts-${activeChart.id}.zip`)
      }
      toast.success('Chart exported as SVG.')
    } catch {
      toast.error('Failed to export SVG.')
    }
  }, [activeChart, effectiveConfigs])

  const exportCsv = useCallback(() => {
    if (!activeChart) return
    const columns = effectiveConfigs.map((qc) => qc.column)
    const labels: Record<string, string> = {}
    for (const qc of effectiveConfigs) {
      labels[qc.column] = qc.label || qc.column
    }
    const csv = generateCsv(filteredRecords, columns, labels)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `data-${activeChart.id}.csv`)
    toast.success('Data exported as CSV.')
  }, [activeChart, effectiveConfigs, filteredRecords])

  const exportAll = useCallback(async () => {
    await exportPng()
    await exportSvg()
    exportCsv()
  }, [exportPng, exportSvg, exportCsv])

  if (!activeChart) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm">Export ▼</Button>} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPng}>Export PNG</DropdownMenuItem>
        <DropdownMenuItem onClick={exportSvg}>Export SVG</DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv}>Export CSV (data)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportAll}>Export All</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ConfigSaveLoad() {
  const { state, dispatch } = useSurvey()

  const saveConfig = useCallback(() => {
    const json = JSON.stringify(state.chartConfigs, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    downloadBlob(blob, 'dbf-chart-config.json')
    toast.success('Configuration saved.')
  }, [state.chartConfigs])

  const loadConfig = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const configs = JSON.parse(text)
        if (!Array.isArray(configs)) throw new Error('Invalid format')
        dispatch({ type: 'LOAD_CONFIG', payload: configs })
        toast.success('Configuration loaded.')
      } catch {
        toast.error('Invalid configuration file.')
      }
    }
    input.click()
  }, [dispatch])

  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={saveConfig}>
        Save Config
      </Button>
      <Button variant="ghost" size="sm" onClick={loadConfig}>
        Load Config
      </Button>
    </div>
  )
}
