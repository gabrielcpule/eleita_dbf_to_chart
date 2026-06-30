# DBF to Chart — Design Spec

**Date:** 2026-06-29
**Status:** Draft
**Deploy target:** GitHub Pages

## Overview

A static client-side web application that lets researchers upload DBF survey data files, filter records by demographics, configure chartable questions, and export visualizations.

**Audience:** Non-technical researchers and analysts. UX must be guided and jargon-light.

**Template file:** `aguasbel.DBF` — 800 records, 57 fields, 35 question columns (R01-R35).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 | Complex state management (filters, multiple chart configs) |
| Build | Vite | Fast dev, easy static output, GitHub Pages compatible |
| Charts | Recharts | Declarative React API, covers bar/pie/h-bar |
| UI Kit | shadcn/ui + Tailwind | Polished, accessible components; good for non-technical UX |
| DBF Parsing | Custom parser (or slim library) | Runs entirely in browser, no server needed |
| Export (images) | html-to-image | Captures chart DOM as PNG/SVG |
| Export (data) | PapaParse or manual CSV | Generate CSV from filtered records in-memory |
| Deployment | GitHub Pages via `gh-pages` branch | Zero-cost static hosting |

---

## Architecture

Four self-contained modules sharing state via a single React context (`SurveyContext`):

```
Browser (Static SPA)
├── 1. DBF Parser    — ArrayBuffer → { fields, records }
├── 2. Table + Filter — Browse parsed data, filter by demographics, exclude unanswered
├── 3. Chart Builder  — Select questions, configure labels & alternatives, pick chart type
└── 4. Export Panel   — PNG / SVG / CSV / all per chart
```

**Step indicator at top:** ① Upload → ② Filter → ③ Configure → ④ Visualize → ⑤ Export. User can jump back freely.

**No router needed.** Linear-ish workflow with back-navigation.

---

## Data Flow

```
Upload DBF
  → Parse into { fields: [...], records: [...] }
    → Show raw table (paginated, read-only)
      → Apply filters (demographic dropdowns + "exclude unanswered" toggles)
        → Compute filtered record subset
          → User creates chart configs (pick R columns, set labels, alternatives, type)
            → Render charts live from filtered data
              → Export individual charts or all
```

### State Shape (`SurveyContext`)

```js
{
  raw: { fields, records },          // Parsed DBF
  filters: {                          // Active filters
    demographics: { LOCAL: "S", SEXO: "M", ... },
    excludeEmpty: ["R01", "R05"]      // Rows missing answers in these columns removed
  },
  chartConfigs: [
    {
      id: "chart-1",
      questionColumns: ["R01", "R05"],
      questionLabels: { "R01": "Aprovação do prefeito", "R05": "Avaliação da saúde" },
      alternatives: { "R01": 5, "R05": 3 },
      letterLabels: {
        "R01": { A: "Ótimo", B: "Bom", C: "Regular", D: "Ruim", E: "Péssimo" },
        "R05": { A: "Satisfeito", B: "Neutro", C: "Insatisfeito" }
      },
      chartType: "bar"                // "bar" | "horizontal-bar" | "pie" | "table"
    }
  ],
  activeChartIndex: 0                // Which chart is displayed
}
```

---

## Module Details

### 1. DBF Parser

- **Input:** `File` object from `<input type="file">`
- **Output:** `{ fields: [{name, type, length}], records: [{...}, ...] }`
- **Validation:** Check DBF header byte (version 3/4), minimum record count, presence of columns that look like questions (R-prefixed or single-char value columns). If no question columns detected, warn but still proceed — let user designate columns manually.
- **Performance:** For files up to 50k records, parse synchronously. Above that, show a progress indicator. Paginate table display.

### 2. Table + Filter

**Table view:**
- Paginated (50 rows/page), horizontally scrollable
- Columns auto-detected: demographics, label columns (NOME*), metadata, question columns (R01-R35)
- Read-only display

**Filter panel (left sidebar or collapsible):**
- Dropdown per demographic column (LOCAL, SEXO, IDADE, INSTRUCAO, RENDA, BAIRRO). Populated from unique values in the data.
- Dropdowns combine with **AND logic**
- **"Exclude unanswered"** section: lists each R column that's been selected for any chart. Toggle per column — when on, rows where that column is blank/empty are removed. Multiple toggles also AND together.
- **Live row count:** "Showing 47 of 800 records"
- **Data dependency:** The "exclude unanswered" toggles are derived from which question columns are selected across all chart configs. When a chart adds/removes a question column, the available toggles in the Filter panel update accordingly.

### 3. Chart Builder

**Left panel — Chart list + configuration:**
- "+ New Chart" button
- Tabs or accordion list of existing charts (Chart 1, Chart 2, ...)
- Each chart expands to show:
  - **Question selector:** Checkboxes for R01 through R35 (or auto-detected question columns)
  - Per selected question, an expandable sub-section:
    - **Question label** (text input): "R01" → user types the actual question text
    - **Number of alternatives** (number input or dropdown 2-15): Controls which letters are considered (A through N). Default: auto-detect unique values in the column.
    - **Letter-to-label mapping** (text inputs): A [Ótimo], B [Bom], C [Regular], D [Ruim], E [Péssimo]. Dynamic — changes when alternatives count changes.
  - **Chart type selector:** Dropdown — Bar (vertical), Horizontal Bar, Pie/Donut, Summary Table

**Right panel — Live chart display:**
- Renders the active chart from filtered data
- Bars/slices use the question labels and letter labels
- Summary table shows raw counts and percentages
- Chart navigation: "◀ Chart 1 of 3 ▶" to flip between charts

**Auto-detection for alternatives count:** On selecting a question column, scan the filtered records, count unique non-empty values, and set as default alternatives count. User can override.

### 4. Export Panel

Per chart, available from a dropdown or button on the chart display:

- **PNG** — captures the chart DIV via html-to-image
- **SVG** — same approach
- **CSV** — the filtered records used by that specific chart, with applied labels as column headers
- **All** — single ZIP containing PNG + SVG + CSV for the current chart

**Bulk export:** "Export all charts" button — zips all charts' PNGs + CSVs.

**Config export/import:** "Save configuration" downloads the entire `chartConfigs` array as JSON. "Load configuration" lets user re-apply to a different DBF file. This means researchers can set up their labels and question mappings once, reuse across multiple survey files.

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  DBF to Chart                              [Load Config] [Save]  │
│  ① Upload → ② Filter → ③ Configure → ●④ Visualize → ⑤ Export   │
├───────────────┬──────────────────────────────────────────────────┤
│               │                                                  │
│  ┌──────────┐ │  ┌────────────────────────────────────────────┐  │
│  │ + New    │ │  │                                            │  │
│  │ Chart    │ │  │         ████████  Aprovação do prefeito    │  │
│  └──────────┘ │  │         ██████    ████ A - Ótimo    42     │  │
│               │  │         ████      ████ B - Bom      31     │  │
│  ● Chart 1    │  │         ██        ████ C - Regular   18     │  │
│    Chart 2    │  │         █         ████ D - Ruim       7     │  │
│               │  │                   ████ E - Péssimo    2     │  │
│  ───────────  │  │  ──────────────────────────────────────────  │  │
│               │  │  [Bar ▼]  [◀ 1 of 2 ▶]  [Export ▼]         │  │
│  ▶ Chart 1    │  │                                                  │
│               │  │                                                  │
│  Questions:   │  │                                                  │
│  [✓] R01     │  │                                                  │
│  [ ] R02     │  │                                                  │
│  [✓] R05     │  │                                                  │
│  [ ] R03     │  │                                                  │
│  ...          │  │                                                  │
│               │  │                                                  │
│  ▾ R01        │  │                                                  │
│    Q label:   │  │                                                  │
│    [Aprovação │  │                                                  │
│    do prefeito│  │                                                  │
│    Alt count: │  │                                                  │
│    [5]        │  │                                                  │
│    Labels:    │  │                                                  │
│    A [Ótimo ] │  │                                                  │
│    B [Bom   ] │  │                                                  │
│    C [Regular] │  │                                                  │
│    D [Ruim   ] │  │                                                  │
│    E [Péssimo] │  │                                                  │
│               │  │                                                  │
│  ▸ R05        │  │                                                  │
│               │  │                                                  │
│  Chart type:  │  │                                                  │
│  [Bar ▼]      │  │                                                  │
│               │  │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Invalid file (not DBF) | Validate header bytes. Error toast: "This file is not a valid DBF. Please upload a .DBF file." |
| DBF has unexpected structure | Auto-detect question columns (R-prefixed or single-char values). If none found, warn but still show table. Let user manually mark columns. |
| Zero records in file | "This file contains no records." Block further steps. |
| Large file (>10k records) | Paginate table. Show parse progress. Charts aggregate by counting — performant up to ~100k records. |
| Filters produce zero records | "No records match these filters. Try adjusting your selections." Highlight which filter is most restrictive. |
| No alternatives count set | Auto-detect unique letters in column as default. User can override. |
| Mismatched alternatives count | Extra letters grouped under "Outros" in chart with a subtle indicator. |
| No label mappings set | Show raw letters (A, B, C). Functional, just less readable. |
| Export blocked by browser | Fallback: show data as selectable text. |
| Page refresh with unsaved work | `beforeunload` warning. Prominent "Save config" button. |
| Multiple charts referencing same question | Allowed. Each chart is independent. |

---

## Non-Functional Requirements

- **Accessibility:** shadcn/ui provides good defaults. Ensure form inputs are labeled, charts have accessible descriptions.
- **Responsiveness:** Side-by-side layout collapses to stacked on narrow screens (<768px). Table horizontally scrolls.
- **Performance:** Table virtualization not needed (survey files are typically <20k records). Pagination is sufficient.
- **Bundle size:** Keep under 500KB gzipped. Recharts tree-shakes well. shadcn/ui is on-demand.
- **Browser support:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE11.

---

## What's Out of Scope

- User accounts / authentication
- Server-side processing / database storage
- Real-time collaboration
- Multi-language (i18n) — English UI for v1, though survey labels can be in any language
- Comparing across multiple DBF files simultaneously
- Statistical analysis (cross-tabulation, significance testing)
- Print/PDF report generation (user can export PNG + CSV and assemble externally)
