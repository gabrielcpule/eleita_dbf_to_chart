import { useSurvey } from '../lib/survey-context'
import { ChartConfigPanel } from './chart-config-panel'
import { ChartDisplay } from './chart-display'
import { ExportMenu } from './export-menu'
import { Button } from './ui/button'

export function ChartWorkspace() {
  const { dispatch } = useSurvey()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          ← Back to Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 border rounded-lg p-4 bg-card">
            <ChartConfigPanel />
          </div>
        </div>

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
