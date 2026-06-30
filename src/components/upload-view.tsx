import { useCallback, useState, type DragEvent, type ChangeEvent } from 'react'
import { useSurvey } from '../lib/survey-context'
import { parseDbf, DbfParseError } from '../lib/dbf-parser'
import { detectQuestionColumns } from '../lib/types'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { toast } from 'sonner'

export function UploadView() {
  const { dispatch } = useSurvey()
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.dbf')) {
        toast.error('Please upload a .DBF file.')
        return
      }

      setIsParsing(true)
      try {
        const buffer = await file.arrayBuffer()
        const parsed = parseDbf(buffer)

        if (parsed.records.length === 0) {
          toast.error('This file contains no records.')
          return
        }

        const questionCols = detectQuestionColumns(parsed.schema.fields)

        if (questionCols.length === 0) {
          toast.warning(
            'No question columns (R01, R02, etc.) detected. You can still browse the data, but charting may be limited.'
          )
        }

        dispatch({ type: 'SET_RAW_DATA', payload: parsed })
        toast.success(`Loaded ${parsed.records.length} records with ${parsed.schema.fields.length} fields.`)
      } catch (err) {
        if (err instanceof DbfParseError) {
          toast.error(err.message)
        } else {
          toast.error('Failed to parse file. Ensure it is a valid DBF file.')
        }
      } finally {
        setIsParsing(false)
      }
    },
    [dispatch]
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Card
        className={`
          w-full max-w-lg p-12 text-center border-2 border-dashed
          transition-colors cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => document.getElementById('dbf-file-input')?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <svg
            className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>

          {isParsing ? (
            <p className="text-lg text-muted-foreground">Parsing file...</p>
          ) : (
            <>
              <p className="text-lg font-medium">
                Drag and drop your DBF file here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </>
          )}
        </div>

        <input
          id="dbf-file-input"
          type="file"
          accept=".dbf,.DBF"
          className="hidden"
          onChange={onFileChange}
          aria-label="Upload DBF file"
        />
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Supports dBASE III+ (.DBF) survey files
      </p>
    </div>
  )
}
