import { SurveyProvider, useSurvey } from './lib/survey-context'
import { StepIndicator } from './components/step-indicator'
import { UploadView } from './components/upload-view'
import { FilterView } from './components/filter-view'
import { ChartWorkspace } from './components/chart-workspace'
import { Toaster } from './components/ui/sonner'

// Placeholder — will be replaced in Task 12
function ConfigSaveLoad() {
  return null
}

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

export default function App() {
  return (
    <SurveyProvider>
      <AppContent />
    </SurveyProvider>
  )
}
