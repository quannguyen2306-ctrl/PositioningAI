import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface TutorialOverlayProps {
  onDismiss?: () => void
}

interface TutorialStep {
  title: string
  description: string
}

const STORAGE_KEY = 'posai_tutorial_dismissed'

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Your GEO Health Score',
    description: 'This score shows how often AI search engines surface your business when customers ask relevant questions.',
  },
  {
    title: 'See Why You\'re Losing',
    description: 'Click any question in the Evaluation panel to see which competitors AI mentioned instead of you.',
  },
  {
    title: 'Your Action Plan',
    description: 'The Recommendations panel lists specific content changes ranked by impact. Start with Priority 1.',
  },
]

export default function TutorialOverlay({ onDismiss }: TutorialOverlayProps): JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    setIsDismissed(dismissed)
  }, [])

  if (isDismissed) {
    return null
  }

  const handleDismiss = (): void => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleNext = (): void => {
    setCurrentStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))
  }

  const handlePrevious = (): void => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const step = TUTORIAL_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  return (
    <div
      className="fixed bottom-5 right-5 z-50"
      style={{
        maxWidth: 380,
        animation: 'fadeInUp 0.4s ease-out',
      }}
      role="region"
      aria-label="Tutorial guide"
      aria-live="polite"
    >
      <div className="glass card p-6" style={{ borderRadius: 12 }}>
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close tutorial"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Step number indicator */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            marginBottom: 12,
            textTransform: 'uppercase',
          }}
        >
          Step {currentStep + 1} of {TUTORIAL_STEPS.length}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 10,
          }}
        >
          {step.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: 0,
            marginBottom: 20,
          }}
        >
          {step.description}
        </p>

        {/* Step indicator dots */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 20,
            justifyContent: 'center',
          }}
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={TUTORIAL_STEPS.length}
          aria-label="Tutorial progress"
        >
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStep ? 8 : 6,
                height: idx === currentStep ? 8 : 6,
                borderRadius: '50%',
                background: idx === currentStep ? 'var(--color-primary)' : 'var(--border-subtle)',
                transition: 'all 0.3s ease',
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                type="button"
                aria-label="Go to previous step"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
            )}

            {!isLastStep && (
              <button
                onClick={handleNext}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                type="button"
                aria-label="Go to next step"
              >
                Next
                <ChevronRight size={14} />
              </button>
            )}

            {isLastStep && (
              <button
                onClick={handleDismiss}
                className="btn-ocean"
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                type="button"
              >
                Got it, I'm done
              </button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-2xs text-text-muted hover:text-color-primary transition-colors"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            type="button"
          >
            Skip tour
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
