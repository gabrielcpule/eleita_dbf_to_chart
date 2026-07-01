import { describe, it, expect, beforeAll } from 'vitest'
import { useEffect, useRef } from 'react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SurveyProvider, useSurvey } from '../../lib/survey-context'
import { ChartWorkspace } from '../chart-workspace'
import { parseDbf } from '../../lib/dbf-parser'
import type { ParsedDbf } from '../../lib/types'

// Recharts' ResponsiveContainer needs a measured size that jsdom can't provide;
// stub it so chart cards still render their headings/badges for assertions.
import { vi } from 'vitest'
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 280 }}>{children}</div>
    ),
  }
})

let data: ParsedDbf

beforeAll(() => {
  const buf = readFileSync(resolve(__dirname, '../../../aguasbel.DBF'))
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  data = parseDbf(ab)
})

function Harness() {
  const { dispatch } = useSurvey()
  useEffect(() => {
    dispatch({ type: 'SET_RAW_DATA', payload: data })
  }, [dispatch])
  return <ChartWorkspace />
}

function renderWorkspace() {
  return render(
    <SurveyProvider>
      <Harness />
    </SurveyProvider>
  )
}

describe('ChartWorkspace integration (real aguasbel.DBF)', () => {
  it('shows 320 of 800 respondents after the answered-column fallback', () => {
    const { container } = renderWorkspace()
    expect(container.textContent).toContain('320')
    expect(container.textContent).toContain('800')
    expect(screen.getByText(/respondents · 40%/)).toBeInTheDocument()
  })

  it('hides unanswered question columns (R19–R35) from the picker', () => {
    const { container } = renderWorkspace()
    // Picker shows R01–R18 only.
    const builder = screen.getByText('Questions').closest('div')!
    expect(within(builder).getByText('R01')).toBeInTheDocument()
    expect(within(builder).getByText('R18')).toBeInTheDocument()
    expect(within(builder).queryByText('R19')).not.toBeInTheDocument()
    expect(within(builder).queryByText('R35')).not.toBeInTheDocument()
    // And no empty column leaks into the rendered charts either.
    expect(container.querySelector('#chart-R19')).toBeNull()
  })

  it('renders all 18 answered questions by default when nothing is selected', () => {
    const { container } = renderWorkspace()
    expect(screen.getByText(/Showing all 18 questions/)).toBeInTheDocument()
    expect(container.querySelector('#chart-R01')).not.toBeNull()
    expect(container.querySelector('#chart-R18')).not.toBeNull()
    const cards = container.querySelectorAll('[id^="chart-R"]')
    expect(cards).toHaveLength(18)
  })

  it('narrows to the selected question once one is checked', () => {
    const { container } = renderWorkspace()
    const builder = screen.getByText('Questions').closest('div')!
    const r01Label = within(builder).getByText('R01').closest('label')!
    fireEvent.click(within(r01Label).getByRole('checkbox'))
    expect(container.querySelector('#chart-R01')).not.toBeNull()
    expect(container.querySelector('#chart-R02')).toBeNull()
    expect(screen.queryByText(/Showing all 18 questions/)).not.toBeInTheDocument()
  })

  it('renders a comparison split by SEXO without crashing', () => {
    function CompareHarness() {
      const { state, dispatch } = useSurvey()
      const done = useRef(false)
      useEffect(() => {
        dispatch({ type: 'SET_RAW_DATA', payload: data })
      }, [dispatch])
      useEffect(() => {
        const chart = state.chartConfigs[0]
        if (state.raw && chart && !done.current) {
          done.current = true
          dispatch({
            type: 'UPDATE_CHART',
            payload: {
              ...chart,
              compareBy: 'SEXO',
              questionConfigs: [
                { column: 'R01', label: '', alternatives: 6, letterLabels: {} },
              ],
            },
          })
        }
      }, [state.raw, state.chartConfigs, dispatch])
      return <ChartWorkspace />
    }
    const { container } = render(
      <SurveyProvider>
        <CompareHarness />
      </SurveyProvider>
    )
    expect(screen.getByText(/Split by SEXO/)).toBeInTheDocument()
    expect(container.querySelector('#chart-R01')).not.toBeNull()
    // demographic labels auto-derived from NOMESEXO appear (color editor group swatch)
    expect(screen.getAllByText('MASCULINO').length).toBeGreaterThan(0)
  })
})
