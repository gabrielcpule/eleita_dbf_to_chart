# eleita_dbf_to_chart

A browser-based tool for turning DBF survey/poll files into charts. Upload a
`.DBF`, filter respondents by demographics, and build labelled bar / pie / table
charts from the coded question columns — all client-side, no server, no upload
of your data anywhere.

🔗 **Live:** https://gabrielcpule.github.io/eleita_dbf_to_chart/

## What it does

1. **Upload** — drag in a dBASE III/IV `.DBF` file. Parsing happens entirely in
   the browser.
2. **Build charts** — a two-pane workspace:
   - **Filter respondents** by the demographic columns (`LOCAL`, `SEXO`,
     `IDADE`, `INSTRUCAO`, `RENDA`, `BAIRRO`), with active-filter chips and a
     live respondent count.
   - **Chart builder** — pick question columns (`R01`…`Rnn`), set per-question
     answer labels, choose a chart type **per question** (bar, horizontal bar,
     pie/donut, or summary table), and add multiple charts.
   - **Export** to PNG, SVG, or CSV (single chart or zipped batch), and
     **save/load** chart configurations as JSON.

### Defaults that match how the data behaves

- **Unanswered question columns are hidden.** Columns with zero answers across
  the file (e.g. `R19`–`R35` in the sample) never appear in the picker.
- **Show-all by default.** A chart with nothing selected renders *every*
  answered question; checking specific questions narrows it down.
- **Respondent fallback.** With no chart selected, rows that answered nothing
  are excluded so the count reflects real respondents.

## Data format

Built around dBASE III+ survey exports. The sample `aguasbel.DBF` (800 records,
57 fields) has:

- **Demographics:** `CODFORM`, `LOCAL`, `SEXO`, `INSTRUCAO`, `IDADE`, `RENDA`,
  `BAIRRO`
- **Label fields:** `NOMELOCAL`, `NOMESEXO`, … (human-readable, hidden in the
  table view)
- **Responses:** `R01`–`R35`, single-character coded answers (`A`–`O`)

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Recharts ·
Vitest + Testing Library.

## Development

```bash
npm install
npm run dev        # dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npx vitest run     # run the test suite
npx oxlint         # lint
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `dist/` to GitHub Pages. The Vite `base` is set to
`/eleita_dbf_to_chart/` to match the Pages path.
