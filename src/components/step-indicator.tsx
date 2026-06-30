import { useSurvey } from '../lib/survey-context'
import type { StepIndex } from '../lib/types'
import { STEP_LABELS } from '../lib/types'

export function StepIndicator() {
  const { state, dispatch } = useSurvey()
  const currentStep = state.step

  return (
    <nav className="flex items-center justify-center gap-2 py-4" aria-label="Workflow steps">
      {([0, 1] as StepIndex[]).map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <button
            onClick={() => {
              if (step <= currentStep) {
                dispatch({ type: 'SET_STEP', payload: step })
              }
            }}
            disabled={step > currentStep}
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
          {i < 1 && (
            <div className="h-px w-8 bg-border hidden sm:block" aria-hidden="true" />
          )}
        </div>
      ))}
    </nav>
  )
}
