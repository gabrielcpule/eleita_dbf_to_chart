# DBF to Chart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static React SPA that uploads DBF survey files, filters records by demographics, lets users configure chartable questions with per-question labels, and exports charts as PNG/SVG/CSV.

**Architecture:** Single-page React app with a step-indicator workflow (Upload → Filter → Configure → Visualize → Export). State lives in a single `SurveyContext` reducer. Four pure-logic modules (DBF parser, CSV generator, chart data computer, filter engine) feed four view components (Upload, Filter+Table, Chart Config, Chart Display+Export). Deployed to GitHub Pages.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, html-to-image, JSZip

## Global Constraints

- Static client-side only — no backend, no server processing
- Bundle size under 500KB gzipped
- Modern evergreen browsers only (Chrome, Firefox, Safari, Edge)
- Responsive: stacked layout below 768px
- All UI text in English (survey labels can be any language)
- Deploy target: GitHub Pages via `gh-pages` branch
- shadcn/ui components for all interactive elements (accessibility built-in)
- Recharts for all chart rendering (bar, horizontal bar, pie, summary table)

## File Structure

```
eleita_dbf_to_chart/
├── aguasbel.DBF                          # Template file (existing, unchanged)
├── CLAUDE.md                             # Project docs (existing)
├── docs/superpowers/
│   ├── specs/2026-06-29-dbf-to-chart-design.md
│   └── plans/2026-06-29-dbf-to-chart-plan.md
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json                       # shadcn/ui config
├── .github/workflows/deploy.yml          # GitHub Pages deploy action
└── src/
    ├── main.tsx                          # ReactDOM entry
    ├── App.tsx                           # Step state machine + shell layout
    ├── index.css                         # Tailwind directives + custom styles
    ├── lib/
    │   ├── types.ts                      # All TypeScript types/interfaces
    │   ├── dbf-parser.ts                 # DBF binary → { fields, records }
    │   ├── csv-generator.ts              # Records[] → CSV string
    │   ├── chart-data.ts                 # Filtered records + config → Recharts series
    │   └── survey-context.tsx            # React context + provider + reducer
    └── components/
        ├── ui/                           # shadcn/ui generated components
        │   ├── button.tsx
        │   ├── card.tsx
        │   ├── select.tsx
        │   ├── checkbox.tsx
        │   ├── input.tsx
        │   ├── table.tsx
        │   ├── accordion.tsx
        │   ├── dropdown-menu.tsx
        │   ├── badge.tsx
        │   ├── separator.tsx
        │   └── sonner.tsx                # Toast notifications
        ├── step-indicator.tsx            # ①–⑤ navigation bar
        ├── upload-view.tsx               # File input + parse trigger
        ├── filter-view.tsx               # Data table + filter sidebar
        ├── chart-workspace.tsx           # Split-panel: config left, display+export right
        ├── chart-config-panel.tsx        # Chart list + per-question question config
        ├── chart-display.tsx             # Recharts renderer
        └── export-menu.tsx               # PNG/SVG/CSV/All export + config save/load
```

**Responsibility boundaries:**
- `lib/` files are pure logic with zero React imports — testable in isolation
- `components/ui/` are shadcn/ui primitives — no app logic
- `components/*.tsx` (non-ui) are connected view components that consume `SurveyContext`
- `App.tsx` owns the step state machine and top-level layout
- `survey-context.tsx` is the single source of truth — all mutations go through dispatch

---
````

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tailwind.config.js`, `postcss.config.js`, `components.json`
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: Runnable `npm run dev` project with React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /home/gabrielp/Projects/eleita_dbf_to_chart
npm create vite@latest . -- --template react-ts
```

Expected: Vite scaffolds into current directory (it will ask to confirm overwrite — confirm). If it refuses because directory is non-empty, use a temp dir and move files:

```bash
cd /tmp && npm create vite@latest dbf-scaffold -- --template react-ts
cp -r /tmp/dbf-scaffold/* /home/gabrielp/Projects/eleita_dbf_to_chart/
cp /tmp/dbf-scaffold/.[!.]* /home/gabrielp/Projects/eleita_dbf_to_chart/ 2>/dev/null || true
rm -rf /tmp/dbf-scaffold
cd /home/gabrielp/Projects/eleita_dbf_to_chart
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: installs react, react-dom, typescript, vite, @vitejs/plugin-react

- [ ] **Step 3: Install Tailwind CSS**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Configure `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/eleita_dbf_to_chart/',
})
```

Replace `src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- TypeScript: yes
- Style: Default
- Base color: Slate
- CSS variables: yes

Expected: creates `components.json` and `src/lib/utils.ts`, updates `src/index.css` with CSS variables.

- [ ] **Step 5: Add shadcn/ui components**

```bash
npx shadcn@latest add button card select checkbox input table accordion dropdown-menu badge separator
npx shadcn@latest add sonner
```

Expected: creates `src/components/ui/` with all listed components.

- [ ] **Step 6: Install application dependencies**

```bash
npm install recharts html-to-image jszip
npm install -D @types/jszip
```

- [ ] **Step 7: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Append to `vite.config.ts`:

```typescript
/// <reference types="vitest" />
// ... existing config ...
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create initial types file**

Create `src/lib/types.ts`:

```typescript
export interface DbfField {
  name: string
  type: string       // 'C' | 'N' | 'D' | 'L'
  length: number
  decimals: number
}

export interface DbfSchema {
  fields: DbfField[]
  recordCount: number
  lastUpdate: Date
}

export interface SurveyRecord {
  [column: string]: string
}

export interface ParsedDbf {
  schema: DbfSchema
  records: SurveyRecord[]
}

export type QuestionColumn = string  // e.g. "R01", "R05"

export interface LetterLabelMap {
  [letter: string]: string  // e.g. { "A": "Ótimo", "B": "Bom" }
}

export interface QuestionConfig {
  column: QuestionColumn
  label: string              // "R01" → "Aprovação do prefeito"
  alternatives: number       // How many letters to show (2-15)
  letterLabels: LetterLabelMap
}

export type ChartType = 'bar' | 'horizontal-bar' | 'pie' | 'table'

export interface ChartConfig {
  id: string
  questionConfigs: QuestionConfig[]  // One per selected question column
  chartType: ChartType
}

export interface DemographicsFilter {
  LOCAL: string
  SEXO: string
  IDADE: string
  INSTRUCAO: string
  RENDA: string
  BAIRRO: string
}

export type StepIndex = 0 | 1 | 2 | 3 | 4

export const STEP_LABELS: Record<StepIndex, string> = {
  0: 'Upload',
  1: 'Filter',
  2: 'Configure',
  3: 'Visualize',
  4: 'Export',
} as const

export type SurveyAction =
  | { type: 'SET_RAW_DATA'; payload: ParsedDbf }
  | { type: 'SET_DEMOGRAPHICS_FILTER'; payload: Partial<DemographicsFilter> }
  | { type: 'SET_EXCLUDE_EMPTY_COLUMNS'; payload: string[] }
  | { type: 'ADD_CHART' }
  | { type: 'REMOVE_CHART'; payload: string }
  | { type: 'UPDATE_CHART'; payload: ChartConfig }
  | { type: 'SET_ACTIVE_CHART_INDEX'; payload: number }
  | { type: 'LOAD_CONFIG'; payload: ChartConfig[] }
  | { type: 'SET_STEP'; payload: StepIndex }
```

- [ ] **Step 9: Verify scaffolding**

```bash
npm run dev
```

Expected: dev server starts without errors. Visit http://localhost:5173 — see Vite + React default page.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + shadcn/ui project

- Vite with react-ts template, Tailwind CSS v4 via @tailwindcss/vite plugin
- shadcn/ui initialized with button, card, select, checkbox, input, table, accordion, dropdown-menu, badge, separator, sonner
- Recharts, html-to-image, jszip added for charts and export
- Vitest + React Testing Library configured
- Type definitions scaffolded in src/lib/types.ts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: DBF Parser

**Files:**
- Create: `src/lib/dbf-parser.ts`
- Create: `src/lib/__tests__/dbf-parser.test.ts`
- Modify: `src/test-setup.ts` (already exists from Task 1)

**Interfaces:**
- Produces: `parseDbf(buffer: ArrayBuffer): ParsedDbf`
- Throws: `DbfParseError` for invalid files

- [ ] **Step 1: Write tests for DBF parser**

Create `src/lib/__tests__/dbf-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseDbf, DbfParseError } from '../dbf-parser'

// Build a minimal valid DBF file in memory
function makeMinimalDbf(records: Array<Record<string, string>>): ArrayBuffer {
  const fields = Object.keys(records[0] || {})
  const fieldLen = fields.reduce((sum, f) => sum + 1, 0) // each field 1 char
  const recordLen = fieldLen + 1 // +1 for deletion flag
  const headerLen = 32 + (fields.length * 32) + 1 // +1 for terminator
  const buffer = new ArrayBuffer(headerLen + (records.length * recordLen))
  const view = new DataView(buffer)
  const encoder = new TextEncoder()

  // Header
  view.setUint8(0, 0x03) // dBASE III+
  view.setUint8(1, 126)  // year - 1900
  view.setUint8(2, 6)    // month
  view.setUint8(3, 29)   // day
  view.setUint32(4, records.length, true) // record count
  view.setUint16(8, headerLen, true)      // header length
  view.setUint16(10, recordLen, true)     // record length

  // Field descriptors
  let offset = 32
  for (const field of fields) {
    const nameBytes = encoder.encode(field.padEnd(11, '\x00'))
    new Uint8Array(buffer).set(nameBytes, offset)
    view.setUint8(offset + 11, 0x43) // 'C' for character
    view.setUint8(offset + 16, 1)    // length = 1
    view.setUint8(offset + 17, 0)    // decimals = 0
    offset += 32
  }
  // Terminator
  view.setUint8(offset, 0x0D)

  // Records
  offset = headerLen
  for (const record of records) {
    view.setUint8(offset, 0x20) // active record
    offset++
    for (const field of fields) {
      view.setUint8(offset, (record[field] || ' ').charCodeAt(0))
      offset++
    }
  }

  return buffer
}

describe('parseDbf', () => {
  it('parses header fields correctly', () => {
    const buf = makeMinimalDbf([{ X: 'A' }, { X: 'B' }])
    const result = parseDbf(buf)
    expect(result.schema.recordCount).toBe(2)
    expect(result.schema.fields).toHaveLength(1)
    expect(result.schema.fields[0].name).toBe('X')
    expect(result.schema.fields[0].type).toBe('C')
  })

  it('parses records', () => {
    const buf = makeMinimalDbf([{ X: 'A' }, { X: 'B' }, { X: 'C' }])
    const result = parseDbf(buf)
    expect(result.records).toHaveLength(3)
    expect(result.records[0]).toEqual({ X: 'A' })
    expect(result.records[1]).toEqual({ X: 'B' })
  })

  it('parses multiple fields per record', () => {
    const buf = makeMinimalDbf([
      { NAME: 'J', AGE: '3' },
      { NAME: 'M', AGE: '5' },
    ])
    const result = parseDbf(buf)
    expect(result.schema.fields).toHaveLength(2)
    expect(result.records[0]).toEqual({ NAME: 'J', AGE: '3' })
  })

  it('skips deleted records (0x2A flag)', () => {
    // Build manually to insert a deleted record
    const records = [{ X: 'A' }, { X: 'B' }, { X: 'C' }]
    const fields = ['X']
    const headerLen = 32 + (1 * 32) + 1
    const recordLen = 2 // 1 deletion flag + 1 data byte
    const buf = new ArrayBuffer(headerLen + (3 * recordLen))
    const view = new DataView(buf)
    const encoder = new TextEncoder()

    view.setUint8(0, 0x03)
    view.setUint8(1, 126); view.setUint8(2, 6); view.setUint8(3, 29)
    view.setUint32(4, 3, true)
    view.setUint16(8, headerLen, true)
    view.setUint16(10, recordLen, true)

    const nameBytes = encoder.encode('X'.padEnd(11, '\x00'))
    new Uint8Array(buf).set(nameBytes, 32)
    view.setUint8(32 + 11, 0x43); view.setUint8(32 + 16, 1); view.setUint8(32 + 17, 0)
    view.setUint8(64, 0x0D)

    // Record 0: active
    view.setUint8(65, 0x20); view.setUint8(66, 0x41) // 'A'
    // Record 1: deleted
    view.setUint8(67, 0x2A); view.setUint8(68, 0x42) // 'B'
    // Record 2: active
    view.setUint8(69, 0x20); view.setUint8(70, 0x43) // 'C'

    const result = parseDbf(buf)
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toEqual({ X: 'A' })
    expect(result.records[1]).toEqual({ X: 'C' })
  })

  it('trims whitespace from field values', () => {
    // Build with padded values
    const fields = ['X']
    const headerLen = 32 + (1 * 32) + 1
    const recordLen = 4 // 1 flag + 3 data bytes
    const buf = new ArrayBuffer(headerLen + (1 * recordLen))
    const view = new DataView(buf)
    const encoder = new TextEncoder()

    view.setUint8(0, 0x03)
    view.setUint8(1, 126); view.setUint8(2, 6); view.setUint8(3, 29)
    view.setUint32(4, 1, true)
    view.setUint16(8, headerLen, true)
    view.setUint16(10, recordLen, true)

    const nameBytes = encoder.encode('X'.padEnd(11, '\x00'))
    new Uint8Array(buf).set(nameBytes, 32)
    view.setUint8(32 + 11, 0x43); view.setUint8(32 + 16, 3); view.setUint8(32 + 17, 0)
    view.setUint8(64, 0x0D)

    view.setUint8(65, 0x20)
    view.setUint8(66, 0x41); view.setUint8(67, 0x20); view.setUint8(68, 0x20) // "A  "

    const result = parseDbf(buf)
    expect(result.records[0]).toEqual({ X: 'A' })
  })

  it('throws DbfParseError on invalid header', () => {
    const buf = new ArrayBuffer(10)
    new Uint8Array(buf).fill(0xFF)
    expect(() => parseDbf(buf)).toThrow(DbfParseError)
  })

  it('throws DbfParseError on empty file', () => {
    expect(() => parseDbf(new ArrayBuffer(0))).toThrow(DbfParseError)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/__tests__/dbf-parser.test.ts
```

Expected: all tests FAIL — `parseDbf` and `DbfParseError` not defined.

- [ ] **Step 3: Implement DBF parser**

Create `src/lib/dbf-parser.ts`:

```typescript
import type { DbfField, DbfSchema, ParsedDbf, SurveyRecord } from './types'

export class DbfParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbfParseError'
  }
}

const VALID_VERSIONS = new Set([0x02, 0x03, 0x04, 0x30, 0x43, 0x83, 0x8B])

export function parseDbf(buffer: ArrayBuffer): ParsedDbf {
  if (buffer.byteLength < 32) {
    throw new DbfParseError('File is too small to be a valid DBF.')
  }

  const view = new DataView(buffer)
  const version = view.getUint8(0)

  if (!VALID_VERSIONS.has(version)) {
    throw new DbfParseError(
      `Unsupported DBF version: ${version}. Expected dBASE III+ (0x03) or compatible.`
    )
  }

  const year = view.getUint8(1) + 1900
  const month = view.getUint8(2)
  const day = view.getUint8(3)
  const recordCount = view.getUint32(4, true)
  const headerLength = view.getUint16(8, true)
  const recordLength = view.getUint16(10, true)

  if (recordCount === 0) {
    return {
      schema: { fields: [], recordCount: 0, lastUpdate: new Date(year, month - 1, day) },
      records: [],
    }
  }

  if (headerLength < 33 || headerLength > buffer.byteLength) {
    throw new DbfParseError('Invalid header length in DBF file.')
  }

  // Parse field descriptors
  const fields: DbfField[] = []
  let offset = 32

  while (offset < headerLength - 1) {
    const terminator = view.getUint8(offset)
    if (terminator === 0x0D) break

    const nameBytes = new Uint8Array(buffer, offset, 11)
    let nameEnd = 0
    while (nameEnd < 11 && nameBytes[nameEnd] !== 0x00) nameEnd++
    const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd)).trim()

    const fieldType = String.fromCharCode(view.getUint8(offset + 11))
    const fieldLength = view.getUint8(offset + 16)
    const decimals = view.getUint8(offset + 17)

    if (name) {
      fields.push({ name, type: fieldType, length: fieldLength, decimals })
    }
    offset += 32
  }

  // Parse records
  const records: SurveyRecord[] = []
  const decoder = new TextDecoder()

  for (let i = 0; i < recordCount; i++) {
    const recordOffset = headerLength + (i * recordLength)
    if (recordOffset + recordLength > buffer.byteLength) break

    const deletionFlag = view.getUint8(recordOffset)
    if (deletionFlag === 0x2A) continue // Deleted record

    const record: SurveyRecord = {}
    let fieldOffset = recordOffset + 1

    for (const field of fields) {
      const bytes = new Uint8Array(buffer, fieldOffset, field.length)
      const value = decoder.decode(bytes).trim()
      record[field.name] = value
      fieldOffset += field.length
    }
    records.push(record)
  }

  return {
    schema: {
      fields,
      recordCount: records.length,
      lastUpdate: new Date(year, month - 1, day),
    },
    records,
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/__tests__/dbf-parser.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Test with real aguasbel.DBF**

```bash
node -e "
const fs = require('fs');
const buf = fs.readFileSync('aguasbel.DBF').buffer;
// We'll verify via vitest instead
"
```

Run a quick smoke test:

```bash
npx vitest run -t "parses header"
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/dbf-parser.ts src/lib/__tests__/dbf-parser.test.ts
git commit -m "feat: add DBF parser with tests

Parses dBASE III+ files into { schema, records }. Handles deletion
flags, trims field values, validates header bytes and version.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: CSV Generator

**Files:**
- Create: `src/lib/csv-generator.ts`
- Create: `src/lib/__tests__/csv-generator.test.ts`

**Interfaces:**
- Consumes: `SurveyRecord` from `types.ts`
- Produces: `generateCsv(records: SurveyRecord[], columns: string[], columnLabels: Record<string, string>): string`

- [ ] **Step 1: Write tests**

Create `src/lib/__tests__/csv-generator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateCsv } from '../csv-generator'

describe('generateCsv', () => {
  it('generates header row from column labels', () => {
    const records = [{ R01: 'A', R05: 'B' }]
    const result = generateCsv(records, ['R01', 'R05'], { R01: 'Question 1', R05: 'Question 5' })
    expect(result).toContain('"Question 1","Question 5"')
  })

  it('falls back to column name when no label', () => {
    const records = [{ R01: 'A' }]
    const result = generateCsv(records, ['R01'], {})
    expect(result).toContain('"R01"')
  })

  it('generates data rows', () => {
    const records = [
      { R01: 'A', R02: 'B' },
      { R01: 'C', R02: 'D' },
    ]
    const result = generateCsv(records, ['R01', 'R02'], {})
    const lines = result.trim().split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('"A"')
    expect(lines[2]).toContain('"D"')
  })

  it('escapes quotes in values', () => {
    const records = [{ R01: 'A"B' }]
    const result = generateCsv(records, ['R01'], {})
    expect(result).toContain('"A""B"')
  })

  it('returns header-only for empty records', () => {
    const result = generateCsv([], ['R01'], { R01: 'Q1' })
    expect(result).toBe('"Q1"\n')
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/csv-generator.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement CSV generator**

Create `src/lib/csv-generator.ts`:

```typescript
import type { SurveyRecord } from './types'

function escapeCsvField(value: string): string {
  // Escape double quotes by doubling them, wrap in quotes
  return `"${value.replace(/"/g, '""')}"`
}

export function generateCsv(
  records: SurveyRecord[],
  columns: string[],
  columnLabels: Record<string, string>
): string {
  const header = columns
    .map((col) => escapeCsvField(columnLabels[col] || col))
    .join(',')

  const rows = records.map((record) =>
    columns.map((col) => escapeCsvField(record[col] ?? '')).join(',')
  )

  return [header, ...rows].join('\n') + '\n'
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npx vitest run src/lib/__tests__/csv-generator.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv-generator.ts src/lib/__tests__/csv-generator.test.ts
git commit -m "feat: add CSV generator with tests

Generates CSV from survey records with labeled headers.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Chart Data Computer

**Files:**
- Create: `src/lib/chart-data.ts`
- Create: `src/lib/__tests__/chart-data.test.ts`

**Interfaces:**
- Consumes: `SurveyRecord`, `ChartConfig` from `types.ts`
- Produces: `computeChartData(records: SurveyRecord[], config: ChartConfig): ChartSeries[]`

- [ ] **Step 1: Write tests**

Create `src/lib/__tests__/chart-data.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeChartData } from '../chart-data'
import type { ChartConfig } from '../types'

const baseConfig: ChartConfig = {
  id: 'chart-1',
  questionConfigs: [
    {
      column: 'R01',
      label: 'Aprovação',
      alternatives: 3,
      letterLabels: { A: 'Bom', B: 'Regular', C: 'Ruim' },
    },
  ],
  chartType: 'bar',
}

describe('computeChartData', () => {
  it('counts responses per letter', () => {
    const records = [
      { R01: 'A' },
      { R01: 'A' },
      { R01: 'B' },
      { R01: 'C' },
      { R01: 'A' },
    ]
    const result = computeChartData(records, baseConfig)
    expect(result).toHaveLength(1)
    const series = result[0]
    expect(series.questionLabel).toBe('Aprovação')
    expect(series.data).toEqual([
      { letter: 'A', label: 'Bom', count: 3 },
      { letter: 'B', label: 'Regular', count: 1 },
      { letter: 'C', label: 'Ruim', count: 1 },
    ])
  })

  it('groups extra letters under "Outros"', () => {
    const records = [{ R01: 'A' }, { R01: 'D' }, { R01: 'E' }]
    // alternatives=3 means only A,B,C are expected
    const config = { ...baseConfig, questionConfigs: [{ ...baseConfig.questionConfigs[0], alternatives: 3 }] }
    const result = computeChartData(records, config)
    const series = result[0]
    const outros = series.data.find((d) => d.letter === 'OUTROS')
    expect(outros).toBeDefined()
    expect(outros!.count).toBe(2)
  })

  it('handles empty records', () => {
    const result = computeChartData([], baseConfig)
    expect(result).toHaveLength(1)
    expect(result[0].data.every((d) => d.count === 0)).toBe(true)
  })

  it('handles multiple question columns', () => {
    const config: ChartConfig = {
      id: 'chart-1',
      questionConfigs: [
        { column: 'R01', label: 'Q1', alternatives: 2, letterLabels: { A: 'Sim', B: 'Não' } },
        { column: 'R02', label: 'Q2', alternatives: 2, letterLabels: { A: 'Sim', B: 'Não' } },
      ],
      chartType: 'bar',
    }
    const records = [
      { R01: 'A', R02: 'B' },
      { R01: 'A', R02: 'A' },
    ]
    const result = computeChartData(records, config)
    expect(result).toHaveLength(2)
    expect(result[0].questionLabel).toBe('Q1')
    expect(result[1].questionLabel).toBe('Q2')
  })

  it('shows raw letters when no labels set', () => {
    const config: ChartConfig = {
      id: 'chart-1',
      questionConfigs: [{ column: 'R01', label: 'Q1', alternatives: 3, letterLabels: {} }],
      chartType: 'bar',
    }
    const records = [{ R01: 'A' }, { R01: 'B' }]
    const result = computeChartData(records, config)
    expect(result[0].data[0].label).toBe('A')
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/chart-data.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement chart data computer**

Create `src/lib/chart-data.ts`:

```typescript
import type { SurveyRecord, ChartConfig } from './types'

const ALPHABET = 'ABCDEFGHIJKLMNO'

export interface ChartDataPoint {
  letter: string
  label: string
  count: number
}

export interface ChartSeries {
  questionColumn: string
  questionLabel: string
  data: ChartDataPoint[]
}

export function computeChartData(
  records: SurveyRecord[],
  config: ChartConfig
): ChartSeries[] {
  return config.questionConfigs.map((qc) => {
    const expectedLetters = ALPHABET.slice(0, qc.alternatives).split('')
    const counts: Record<string, number> = {}
    let outrosCount = 0

    // Initialize counts to 0 for all expected letters
    for (const letter of expectedLetters) {
      counts[letter] = 0
    }

    for (const record of records) {
      const value = (record[qc.column] || '').trim()
      if (!value) continue
      if (counts.hasOwnProperty(value)) {
        counts[value]++
      } else {
        outrosCount++
      }
    }

    const data: ChartDataPoint[] = expectedLetters.map((letter) => ({
      letter,
      label: qc.letterLabels[letter] || letter,
      count: counts[letter],
    }))

    if (outrosCount > 0) {
      data.push({ letter: 'OUTROS', label: 'Outros', count: outrosCount })
    }

    return {
      questionColumn: qc.column,
      questionLabel: qc.label || qc.column,
      data,
    }
  })
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npx vitest run src/lib/__tests__/chart-data.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chart-data.ts src/lib/__tests__/chart-data.test.ts
git commit -m "feat: add chart data computer with tests

Transforms filtered records + chart config into Recharts-ready series.
Auto-groups letters beyond alternatives count under 'Outros'.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Survey Context (State Management)

**Files:**
- Create: `src/lib/survey-context.tsx`
- Create: `src/lib/__tests__/survey-context.test.tsx`
- Modify: `src/lib/types.ts` (already exists — add `SurveyState` interface)

**Interfaces:**
- Produces: `SurveyProvider`, `useSurvey()` hook
- State shape matches spec: `{ raw: ParsedDbf | null, filters: {...}, chartConfigs: ChartConfig[], activeChartIndex: number, step: StepIndex }`

- [ ] **Step 1: Add SurveyState to types**

Append to `src/lib/types.ts`:

```typescript
export interface SurveyState {
  raw: ParsedDbf | null
  filters: {
    demographics: DemographicsFilter
    excludeEmptyColumns: string[]
  }
  chartConfigs: ChartConfig[]
  activeChartIndex: number
  step: StepIndex
}

export const INITIAL_DEMOGRAPHICS_FILTER: DemographicsFilter = {
  LOCAL: '',
  SEXO: '',
  IDADE: '',
  INSTRUCAO: '',
  RENDA: '',
  BAIRRO: '',
}

export const INITIAL_STATE: SurveyState = {
  raw: null,
  filters: {
    demographics: { ...INITIAL_DEMOGRAPHICS_FILTER },
    excludeEmptyColumns: [],
  },
  chartConfigs: [],
  activeChartIndex: 0,
  step: 0,
}

export function generateId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyChartConfig(): ChartConfig {
  return {
    id: generateId(),
    questionConfigs: [],
    chartType: 'bar',
  }
}

export const DEMOGRAPHIC_COLUMNS = ['LOCAL', 'SEXO', 'IDADE', 'INSTRUCAO', 'RENDA', 'BAIRRO'] as const

export function detectQuestionColumns(fields: { name: string }[]): string[] {
  return fields
    .map((f) => f.name)
    .filter((name) => /^R\d+$/i.test(name))
    .sort((a, b) => {
      const na = parseInt(a.replace(/^R/i, ''), 10)
      const nb = parseInt(b.replace(/^R/i, ''), 10)
      return na - nb
    })
}
```

- [ ] **Step 2: Write context tests**

Create `src/lib/__tests__/survey-context.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SurveyProvider, useSurvey } from '../survey-context'
import { createEmptyChartConfig } from '../types'
import React from 'react'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SurveyProvider>{children}</SurveyProvider>
)

describe('SurveyContext', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    expect(result.current.state.raw).toBeNull()
    expect(result.current.state.step).toBe(0)
    expect(result.current.state.chartConfigs).toHaveLength(0)
  })

  it('sets step', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'SET_STEP', payload: 2 }))
    expect(result.current.state.step).toBe(2)
  })

  it('adds a chart', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    expect(result.current.state.chartConfigs).toHaveLength(1)
    expect(result.current.state.chartConfigs[0].chartType).toBe('bar')
  })

  it('removes a chart', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    const id = result.current.state.chartConfigs[0].id
    act(() => result.current.dispatch({ type: 'REMOVE_CHART', payload: id }))
    expect(result.current.state.chartConfigs).toHaveLength(1)
  })

  it('updates a chart config', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    const updated = {
      ...result.current.state.chartConfigs[0],
      chartType: 'pie' as const,
    }
    act(() => result.current.dispatch({ type: 'UPDATE_CHART', payload: updated }))
    expect(result.current.state.chartConfigs[0].chartType).toBe('pie')
  })

  it('sets demographics filter', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'SET_DEMOGRAPHICS_FILTER', payload: { LOCAL: 'S' } }))
    expect(result.current.state.filters.demographics.LOCAL).toBe('S')
  })
})
```

- [ ] **Step 3: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/survey-context.test.tsx
```

Expected: FAIL — `SurveyProvider` and `useSurvey` not defined.

- [ ] **Step 4: Implement context**

Create `src/lib/survey-context.tsx`:

```typescript
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { SurveyState, SurveyAction } from './types'
import { INITIAL_STATE, createEmptyChartConfig } from './types'

function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    case 'SET_RAW_DATA':
      return { ...state, raw: action.payload, step: 1 }

    case 'SET_DEMOGRAPHICS_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          demographics: { ...state.filters.demographics, ...action.payload },
        },
      }

    case 'SET_EXCLUDE_EMPTY_COLUMNS':
      return {
        ...state,
        filters: { ...state.filters, excludeEmptyColumns: action.payload },
      }

    case 'ADD_CHART':
      return {
        ...state,
        chartConfigs: [...state.chartConfigs, createEmptyChartConfig()],
        activeChartIndex: state.chartConfigs.length,
      }

    case 'REMOVE_CHART': {
      const filtered = state.chartConfigs.filter((c) => c.id !== action.payload)
      return {
        ...state,
        chartConfigs: filtered,
        activeChartIndex: Math.min(state.activeChartIndex, Math.max(0, filtered.length - 1)),
      }
    }

    case 'UPDATE_CHART':
      return {
        ...state,
        chartConfigs: state.chartConfigs.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      }

    case 'SET_ACTIVE_CHART_INDEX':
      return { ...state, activeChartIndex: action.payload }

    case 'LOAD_CONFIG':
      return { ...state, chartConfigs: action.payload, activeChartIndex: 0 }

    case 'SET_STEP':
      return { ...state, step: action.payload }

    default:
      return state
  }
}

interface SurveyContextValue {
  state: SurveyState
  dispatch: Dispatch<SurveyAction>
}

const SurveyContext = createContext<SurveyContextValue | null>(null)

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(surveyReducer, INITIAL_STATE)

  return (
    <SurveyContext.Provider value={{ state, dispatch }}>
      {children}
    </SurveyContext.Provider>
  )
}

export function useSurvey(): SurveyContextValue {
  const ctx = useContext(SurveyContext)
  if (!ctx) {
    throw new Error('useSurvey must be used within a SurveyProvider')
  }
  return ctx
}
```

- [ ] **Step 5: Run tests — verify pass**

```bash
npx vitest run src/lib/__tests__/survey-context.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/survey-context.tsx src/lib/__tests__/survey-context.test.tsx
git commit -m "feat: add SurveyContext with reducer and tests

Single context for all app state: parsed data, filters,
chart configs, step navigation. All mutations via dispatch.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Filter Engine (Pure Logic)

**Files:**
- Create: `src/lib/filter-engine.ts`
- Create: `src/lib/__tests__/filter-engine.test.ts`

**Interfaces:**
- Consumes: `SurveyRecord`, `DemographicsFilter` from `types.ts`
- Produces: `applyFilters(records: SurveyRecord[], demographics: DemographicsFilter, excludeEmptyColumns: string[]): SurveyRecord[]`
- Produces: `getUniqueValues(records: SurveyRecord[], column: string): string[]`

- [ ] **Step 1: Write tests**

Create `src/lib/__tests__/filter-engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyFilters, getUniqueValues } from '../filter-engine'

const records = [
  { LOCAL: 'S', SEXO: 'M', IDADE: '1', R01: 'A', R02: 'B' },
  { LOCAL: 'S', SEXO: 'F', IDADE: '2', R01: 'C', R02: '' },
  { LOCAL: 'N', SEXO: 'M', IDADE: '1', R01: '', R02: 'D' },
  { LOCAL: 'N', SEXO: 'F', IDADE: '3', R01: 'A', R02: 'E' },
]

describe('getUniqueValues', () => {
  it('returns sorted unique values', () => {
    const values = getUniqueValues(records, 'LOCAL')
    expect(values).toEqual(['N', 'S'])
  })

  it('excludes empty strings', () => {
    const values = getUniqueValues(records, 'R01')
    expect(values).toEqual(['A', 'C'])
  })
})

describe('applyFilters', () => {
  it('returns all records when no filters set', () => {
    const result = applyFilters(records, { LOCAL: '', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(4)
  })

  it('filters by single demographic', () => {
    const result = applyFilters(records, { LOCAL: 'S', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.LOCAL === 'S')).toBe(true)
  })

  it('filters by multiple demographics (AND logic)', () => {
    const result = applyFilters(records, { LOCAL: 'S', SEXO: 'M', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(1)
    expect(result[0].LOCAL).toBe('S')
    expect(result[0].SEXO).toBe('M')
  })

  it('excludes rows with empty answers in specified columns', () => {
    const result = applyFilters(records, { LOCAL: '', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, ['R01'])
    expect(result).toHaveLength(3)
    expect(result.every((r) => r.R01 !== '')).toBe(true)
  })

  it('combines demographics and exclude-empty (AND)', () => {
    const result = applyFilters(records, { LOCAL: 'S', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, ['R02'])
    expect(result).toHaveLength(1)
    expect(result[0].LOCAL).toBe('S')
    expect(result[0].R02).not.toBe('')
  })

  it('returns empty when no records match', () => {
    const result = applyFilters(records, { LOCAL: 'X', SEXO: '', IDADE: '', INSTRUCAO: '', RENDA: '', BAIRRO: '' }, [])
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/filter-engine.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement filter engine**

Create `src/lib/filter-engine.ts`:

```typescript
import type { SurveyRecord, DemographicsFilter } from './types'

export function getUniqueValues(records: SurveyRecord[], column: string): string[] {
  const values = new Set<string>()
  for (const record of records) {
    const val = (record[column] || '').trim()
    if (val) values.add(val)
  }
  return Array.from(values).sort()
}

export function applyFilters(
  records: SurveyRecord[],
  demographics: DemographicsFilter,
  excludeEmptyColumns: string[]
): SurveyRecord[] {
  return records.filter((record) => {
    // Demographic filters (AND)
    for (const [column, value] of Object.entries(demographics)) {
      if (value && (record[column] || '').trim() !== value) {
        return false
      }
    }

    // Exclude empty answers (AND)
    for (const column of excludeEmptyColumns) {
      if (!(record[column] || '').trim()) {
        return false
      }
    }

    return true
  })
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npx vitest run src/lib/__tests__/filter-engine.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter-engine.ts src/lib/__tests__/filter-engine.test.ts
git commit -m "feat: add filter engine with tests

Applies demographic AND-filters and exclude-empty-column filters.
getUniqueValues for populating filter dropdowns.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: App Shell + Step Indicator

**Files:**
- Create: `src/components/step-indicator.tsx`
- Modify: `src/App.tsx` (scaffolded in Task 1 — replace content)
- Modify: `src/main.tsx` (wrap with SurveyProvider)

**Interfaces:**
- Consumes: `useSurvey()` for `state.step` and `dispatch`
- Produces: Navigable step bar + content area that switches views per step

- [ ] **Step 1: Implement step indicator**

Create `src/components/step-indicator.tsx`:

```typescript
import { useSurvey } from '../lib/survey-context'
import type { StepIndex } from '../lib/types'
import { STEP_LABELS } from '../lib/types'

export function StepIndicator() {
  const { state, dispatch } = useSurvey()
  const currentStep = state.step

  const canNavigate = state.raw !== null || currentStep === 0

  return (
    <nav className="flex items-center justify-center gap-2 py-4" aria-label="Workflow steps">
      {([0, 1, 2, 3, 4] as StepIndex[]).map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <button
            onClick={() => {
              if (step <= currentStep || (canNavigate && step === 0)) {
                dispatch({ type: 'SET_STEP', payload: step })
              }
            }}
            disabled={step > currentStep && !canNavigate}
            className={`
              flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
              transition-colors
              ${step === currentStep
                ? 'bg-primary text-primary-foreground'
                : step < currentStep
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
            aria-current={step === currentStep ? 'step' : undefined}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/20 text-xs font-bold">
              {step + 1}
            </span>
            <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
          </button>
          {i < 4 && (
            <div className="h-px w-8 bg-border hidden sm:block" aria-hidden="true" />
          )}
        </div>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Implement App.tsx shell**

Replace `src/App.tsx`:

```typescript
import { SurveyProvider, useSurvey } from './lib/survey-context'
import { StepIndicator } from './components/step-indicator'
import { UploadView } from './components/upload-view'
import { FilterView } from './components/filter-view'
import { ChartWorkspace } from './components/chart-workspace'
import { Toaster } from './components/ui/sonner'

function AppContent() {
  const { state } = useSurvey()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">DBF to Chart</h1>
          <div className="flex gap-2">
            <ConfigSaveLoad />
          </div>
        </div>
        <StepIndicator />
      </header>

      <main className="container mx-auto px-4 py-6">
        {state.step === 0 && <UploadView />}
        {state.step === 1 && <FilterView />}
        {(state.step === 2 || state.step === 3 || state.step === 4) && <ChartWorkspace />}
      </main>

      <Toaster />
    </div>
  )
}

// Placeholder — full implementation in Task 11
function ConfigSaveLoad() {
  return null
}

export default function App() {
  return (
    <SurveyProvider>
      <AppContent />
    </SurveyProvider>
  )
}
```

- [ ] **Step 3: Update main.tsx to remove default Vite styles**

Replace `src/main.tsx`:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Verify it compiles (will fail on missing components — expected at this stage)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about missing `UploadView`, `FilterView`, `ChartWorkspace` imports. That's fine — they're built next.

- [ ] **Step 5: Add placeholder components so app compiles**

Create minimal placeholder files:

`src/components/upload-view.tsx`:
```typescript
export function UploadView() {
  return <div className="p-8 text-center text-muted-foreground">Upload DBF file</div>
}
```

`src/components/filter-view.tsx`:
```typescript
export function FilterView() {
  return <div className="p-8 text-center text-muted-foreground">Filter data</div>
}
```

`src/components/chart-workspace.tsx`:
```typescript
export function ChartWorkspace() {
  return <div className="p-8 text-center text-muted-foreground">Chart workspace</div>
}
```

- [ ] **Step 6: Verify dev server starts cleanly**

```bash
npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1 2>/dev/null
```

Expected: HTML response, no build errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/step-indicator.tsx src/components/upload-view.tsx src/components/filter-view.tsx src/components/chart-workspace.tsx src/App.tsx src/main.tsx
git commit -m "feat: add App shell with step indicator and placeholder views

SurveyProvider wraps app. Step indicator shows 5-step workflow.
Placeholder components for Upload, Filter, Chart views.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Upload View

**Files:**
- Modify: `src/components/upload-view.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `useSurvey()` for `dispatch`
- Produces: File input → parses DBF → dispatches `SET_RAW_DATA`

- [ ] **Step 1: Replace upload view**

Replace `src/components/upload-view.tsx`:

```typescript
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/upload-view.tsx
git commit -m "feat: implement Upload view with drag-and-drop

Supports drag-and-drop and click-to-browse. Parses DBF in browser,
shows success/error toasts via sonner. Auto-detects question columns.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Filter View (Data Table + Filter Panel)

**Files:**
- Modify: `src/components/filter-view.tsx` (replace placeholder)
- Create: `src/lib/hooks.ts` (filtered records memo hook)

**Interfaces:**
- Consumes: `useSurvey()` for state and dispatch
- Consumes: `applyFilters`, `getUniqueValues` from filter engine
- Produces: Paginated table + demographic dropdowns + exclude-empty toggles

- [ ] **Step 1: Create filtered records hook**

Create `src/lib/hooks.ts`:

```typescript
import { useMemo } from 'react'
import { useSurvey } from './survey-context'
import { applyFilters } from './filter-engine'
import type { SurveyRecord } from './types'

export function useFilteredRecords(): SurveyRecord[] {
  const { state } = useSurvey()

  return useMemo(() => {
    if (!state.raw) return []
    return applyFilters(
      state.raw.records,
      state.filters.demographics,
      state.filters.excludeEmptyColumns
    )
  }, [state.raw, state.filters])
}
```

- [ ] **Step 2: Implement filter view**

Replace `src/components/filter-view.tsx`:

```typescript
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

  // Collect all question columns referenced in any chart config
  const allChartQuestionColumns = useMemo(() => {
    const cols = new Set<string>()
    for (const config of state.chartConfigs) {
      for (const qc of config.questionConfigs) {
        cols.add(qc.column)
      }
    }
    return Array.from(cols)
  }, [state.chartConfigs])

  // Compute unique values for each demographic column
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

  // Determine which fields to show: filter out label columns (NOME*) for cleaner table
  const displayFields = rawFields.filter(
    (f) => f.name && !f.name.startsWith('NOME') && f.name !== ''
  )
  // Limit displayed columns for performance — show first 20, let table scroll
  const visibleFields = displayFields.slice(0, 20)

  return (
    <div className="flex flex-col gap-4">
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
                onValueChange={(v) => handleDemographicChange(col, v)}
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
              — No records match. Try adjusting your filters.
            </span>
          )}
        </div>
      </Card>

      {/* Data table */}
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

      {/* Pagination */}
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
          ← Back to Upload
        </Button>
        <Button onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>
          Configure Charts →
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/filter-view.tsx src/lib/hooks.ts
git commit -m "feat: implement Filter view with table and demographic dropdowns

Paginated data table (50 rows/page), dropdown per demographic column
with AND-logic, exclude-unanswered toggles for chart columns, live row count.
Back/forward navigation buttons.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Chart Config Panel

**Files:**
- Create: `src/components/chart-config-panel.tsx`

**Interfaces:**
- Consumes: `useSurvey()` for state + dispatch
- Produces: Chart list accordion + per-question config inputs

- [ ] **Step 1: Implement chart config panel**

Create `src/components/chart-config-panel.tsx`:

```typescript
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
            // Remove labels for letters beyond new count
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
          No charts yet. Click "+ New Chart" to start.
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
                      {/* Question selector */}
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

                      {/* Per-question config */}
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

                      {/* Chart type */}
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
```

- [ ] **Step 2: Add ScrollArea component from shadcn**

```bash
npx shadcn@latest add scroll-area
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors (may warn about ScrollArea import — fix if needed).

- [ ] **Step 4: Commit**

```bash
git add src/components/chart-config-panel.tsx src/components/ui/scroll-area.tsx
git commit -m "feat: implement Chart Config panel with accordion UI

Per-chart accordion with question checkboxes, auto-detected alternatives
count, letter-to-label inputs, and chart type selector.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Chart Display (Recharts Rendering)

**Files:**
- Create: `src/components/chart-display.tsx`

**Interfaces:**
- Consumes: `computeChartData` from chart-data.ts + filtered records
- Produces: Rendered Recharts component (bar, horizontal bar, pie, or summary table)

- [ ] **Step 1: Implement chart display**

Create `src/components/chart-display.tsx`:

```typescript
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
      {/* Chart type selector + navigation */}
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

      {/* Render each question's chart */}
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
                    label={({ label, count }) => `${label}: ${count}`}
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/chart-display.tsx
git commit -m "feat: implement Chart Display with Recharts

Renders bar, horizontal bar, pie/donut, and summary table views
from filtered records + chart config. Chart navigation arrows.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Chart Workspace + Export Menu + Config Save/Load

**Files:**
- Modify: `src/components/chart-workspace.tsx` (replace placeholder — split-panel layout)
- Create: `src/components/export-menu.tsx`
- Modify: `src/App.tsx` (wire ConfigSaveLoad)

**Interfaces:**
- Consumes: `ChartConfigPanel`, `ChartDisplay`
- Produces: Split-panel workspace with export per chart + config save/load

- [ ] **Step 1: Implement export menu**

Create `src/components/export-menu.tsx`:

```typescript
import { useCallback } from 'react'
import { toPng, toSvg } from 'html-to-image'
import JSZip from 'jszip'
import { useSurvey } from '../lib/survey-context'
import { useFilteredRecords } from '../lib/hooks'
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
  const activeChart = state.chartConfigs[state.activeChartIndex]

  const exportPng = useCallback(async () => {
    if (!activeChart) return
    // Find the chart container — each series renders in a Card with id
    const containers = activeChart.questionConfigs
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
  }, [activeChart])

  const exportSvg = useCallback(async () => {
    if (!activeChart) return
    const containers = activeChart.questionConfigs
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
  }, [activeChart])

  const exportCsv = useCallback(() => {
    if (!activeChart) return
    const columns = activeChart.questionConfigs.map((qc) => qc.column)
    const labels: Record<string, string> = {}
    for (const qc of activeChart.questionConfigs) {
      labels[qc.column] = qc.label || qc.column
    }
    const csv = generateCsv(filteredRecords, columns, labels)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `data-${activeChart.id}.csv`)
    toast.success('Data exported as CSV.')
  }, [activeChart, filteredRecords])

  const exportAll = useCallback(async () => {
    await exportPng()
    await exportSvg()
    exportCsv()
  }, [exportPng, exportSvg, exportCsv])

  if (!activeChart) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Export ▼
        </Button>
      </DropdownMenuTrigger>
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
```

- [ ] **Step 2: Replace chart workspace**

Replace `src/components/chart-workspace.tsx`:

```typescript
import { useSurvey } from '../lib/survey-context'
import { ChartConfigPanel } from './chart-config-panel'
import { ChartDisplay } from './chart-display'
import { ExportMenu } from './export-menu'
import { Button } from './ui/button'

export function ChartWorkspace() {
  const { state, dispatch } = useSurvey()

  return (
    <div className="flex flex-col gap-4">
      {/* Back navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          ← Back to Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config panel */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 border rounded-lg p-4 bg-card">
            <ChartConfigPanel />
          </div>
        </div>

        {/* Right: Chart display + export */}
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
```

- [ ] **Step 3: Wire ConfigSaveLoad in App.tsx**

Update `src/App.tsx` — replace the placeholder `ConfigSaveLoad` function with the import:

```typescript
import { ExportMenu, ConfigSaveLoad } from './components/export-menu'
```

Remove the local placeholder `ConfigSaveLoad` function near the bottom of `App.tsx`.

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/chart-workspace.tsx src/components/export-menu.tsx src/App.tsx
git commit -m "feat: implement chart workspace, export menu, and config save/load

Split-panel workspace: ChartConfigPanel left, ChartDisplay right.
Export menu: PNG (html-to-image), SVG, CSV per chart. Config
save/load as JSON for reuse across DBF files.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Polish — Error Handling, Empty States, Responsiveness, beforeunload

**Files:**
- Modify: `src/App.tsx` (add beforeunload)
- Create: `src/components/empty-state.tsx` (inline, small)

**Interfaces:**
- Produces: Production-ready error boundaries, mobile-responsive layout, unsaved-work warning

- [ ] **Step 1: Add beforeunload warning**

Add to `src/App.tsx` inside `AppContent`, before the return:

```typescript
import { useEffect } from 'react'

// ... inside AppContent():
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (state.raw !== null || state.chartConfigs.length > 0) {
      e.preventDefault()
    }
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [state.raw, state.chartConfigs])
```

- [ ] **Step 2: Add "no records after filter" highlight**

This is already handled in FilterView with the conditional message. Verify it renders correctly.

- [ ] **Step 3: Responsive layout check**

The grid layout in ChartWorkspace already uses `grid-cols-1 lg:grid-cols-3`. The step indicator hides labels on small screens (`hidden sm:inline`). The filter bar uses `flex-wrap`. These handle the responsive requirements from the spec.

- [ ] **Step 4: Verify the app starts and runs a basic flow**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add beforeunload warning and responsive polish

Warns on page refresh when data or charts are present.
Responsive grid layout already in place from previous tasks.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: Auto-deployed static site on push to main

- [ ] **Step 1: Create deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] **Step 2: Verify vite.config.ts has correct base path**

Confirm `vite.config.ts` contains `base: '/eleita_dbf_to_chart/'` (set in Task 1).

- [ ] **Step 3: Create .gitignore if missing**

Check `.gitignore` exists and includes `node_modules/` and `dist/`:

```bash
cat .gitignore
```

If missing or incomplete, ensure it has at minimum:
```
node_modules
dist
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml .gitignore
git commit -m "ci: add GitHub Pages deploy workflow

Auto-builds and deploys to gh-pages branch on push to main.
Uses peaceiris/actions-gh-pages action.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: End-to-End Smoke Test with Real DBF

**Files:**
- None (verification only)

**Interfaces:**
- Verifies: Full flow works with aguasbel.DBF

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests from Tasks 2-5 pass.

- [ ] **Step 2: Build production bundle**

```bash
npm run build
```

Expected: succeeds. Check bundle size:

```bash
du -sh dist/
```

Should be under ~2MB uncompressed (gzipped will be well under 500KB).

- [ ] **Step 3: Preview the build**

```bash
npm run preview &
sleep 2
echo "Open http://localhost:4173 to test manually"
```

Manual verification — follow this script:
1. Open browser to localhost:4173
2. Drag aguasbel.DBF onto the upload area
3. Verify table shows 800 records
4. Set filter: SEXO = M → verify count drops
5. Click "Configure Charts →"
6. Click "+ New Chart"
7. Check R01, set alternatives to 5, add labels
8. Verify bar chart renders with labeled bars
9. Switch to pie chart → verify donut renders
10. Click Export → PNG → verify download
11. Click "Save Config" → verify JSON downloads
12. Refresh page → verify beforeunload warning appears

- [ ] **Step 4: Kill preview server**

```bash
kill %1 2>/dev/null
```

- [ ] **Step 5: Final commit with any fixups**

```bash
git status
# If clean:
echo "All good"
```

---

## Plan Self-Review

Before execution, verify:

1. **Spec coverage**: Each spec requirement maps to a task:
   - DBF Parsing → Task 2
   - Table + Filter → Task 9
   - Chart Builder (config) → Task 10
   - Chart Display (rendering) → Task 11
   - Export (PNG/SVG/CSV/All) → Task 12
   - Config save/load → Task 12
   - Error handling → Task 8 (upload), Task 9 (filter), Task 13 (beforeunload)
   - Step indicator → Task 7
   - State management → Task 5
   - Responsiveness → Task 13
   - Deploy → Task 14

2. **No placeholders**: All code blocks are complete. No TBDs, TODOs.

3. **Type consistency**: Types defined in Task 1 (`types.ts`) are referenced consistently across all tasks. `SurveyAction`, `ChartConfig`, `QuestionConfig`, `ParsedDbf` all used as defined.

4. **Test coverage**: Pure logic modules (dbf-parser, csv-generator, chart-data, filter-engine, survey-context) have dedicated test files with explicit test cases.
