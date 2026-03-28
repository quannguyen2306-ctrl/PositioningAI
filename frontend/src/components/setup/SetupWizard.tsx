import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { usePreFillForm } from '../../hooks/usePreFillForm.tsx'
import type { AnalysisRequest } from '../../api/types'

export interface WizardFormData {
  url: string
  openai_key: string
  serper_key: string
  n_competitors: number
  n_questions: number
}

interface SetupWizardProps {
  onSubmit: (data: WizardFormData) => void
  isLoading?: boolean
  error?: string | null
}

export default function SetupWizard({ onSubmit, isLoading = false, error = null }: SetupWizardProps) {
  const { preFillRequest, clear: clearPreFill } = usePreFillForm()

  const [currentStep, setCurrentStep] = useState(1)
  const [showOpenai, setShowOpenai] = useState(false)
  const [showSerper, setShowSerper] = useState(false)
  const [stepErrors, setStepErrors] = useState<string | null>(null)

  const [formData, setFormData] = useState<WizardFormData>({
    url: '',
    openai_key: '',
    serper_key: '',
    n_competitors: 8,
    n_questions: 10,
  })

  useEffect(() => {
    if (preFillRequest) {
      setFormData({
        url: preFillRequest.url,
        openai_key: preFillRequest.openai_key,
        serper_key: preFillRequest.serper_key,
        n_competitors: preFillRequest.n_competitors,
        n_questions: preFillRequest.n_questions,
      })
      clearPreFill()
    }
  }, [preFillRequest, clearPreFill])

  const updateFormData = <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const validateOpenaiKey = (key: string): boolean => {
    return key.trim().startsWith('sk-')
  }

  const handleStepValidation = (): boolean => {
    setStepErrors(null)

    if (currentStep === 1) {
      if (!formData.url.trim()) {
        setStepErrors('URL is required')
        return false
      }
      if (!validateUrl(formData.url)) {
        setStepErrors('Please enter a valid URL')
        return false
      }
      return true
    }

    if (currentStep === 2) {
      if (!formData.openai_key.trim()) {
        setStepErrors('OpenAI key is required')
        return false
      }
      if (!validateOpenaiKey(formData.openai_key)) {
        setStepErrors('OpenAI key must start with sk-')
        return false
      }
      if (!formData.serper_key.trim()) {
        setStepErrors('Serper key is required')
        return false
      }
      return true
    }

    return true
  }

  const handleNext = () => {
    if (!handleStepValidation()) return
    setCurrentStep(prev => Math.min(prev + 1, 3))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = () => {
    if (!handleStepValidation()) return
    onSubmit({
      url: formData.url.trim(),
      openai_key: formData.openai_key.trim(),
      serper_key: formData.serper_key.trim(),
      n_competitors: formData.n_competitors,
      n_questions: formData.n_questions,
    })
  }

  return (
    <div className="setup-wizard">
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Step {currentStep} of 3
        </div>
        <div className="w-full bg-gray-300 rounded-full h-1.5" style={{ backgroundColor: 'var(--subtle-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(currentStep / 3) * 100}%`,
              backgroundColor: 'var(--color-primary)',
            }}
          />
        </div>
      </div>

      {/* Error Display */}
      {(stepErrors || error) && (
        <div
          className="p-3 rounded-lg text-sm mb-4"
          style={{
            background: 'rgba(239,35,60,0.08)',
            border: '1px solid rgba(239,35,60,0.25)',
            color: 'var(--score-low)',
          }}
          role="alert"
        >
          {stepErrors || error}
        </div>
      )}

      {/* Step 1: URL */}
      {currentStep === 1 && (
        <div className="step-content">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Your Website
          </h2>
          <div>
            <label htmlFor="url" className="input-label">
              Website URL
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://yourcompany.com"
              value={formData.url}
              onChange={e => updateFormData('url', e.target.value)}
              disabled={isLoading}
              className="ocean-input"
            />
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Enter the URL of the business website to analyze
            </p>
          </div>
        </div>
      )}

      {/* Step 2: API Keys */}
      {currentStep === 2 && (
        <div className="step-content space-y-5">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            API Keys
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Your API keys are used securely and never stored on our servers
          </p>

          {/* OpenAI Key */}
          <div>
            <label htmlFor="openai-key" className="input-label">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                id="openai-key"
                type={showOpenai ? 'text' : 'password'}
                placeholder="sk-…"
                value={formData.openai_key}
                onChange={e => updateFormData('openai_key', e.target.value)}
                disabled={isLoading}
                className="ocean-input"
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowOpenai(v => !v)}
                aria-label={showOpenai ? 'Hide OpenAI key' : 'Show OpenAI key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer flex items-center"
                style={{ color: 'var(--text-muted)' }}
                disabled={isLoading}
              >
                {showOpenai ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Serper Key */}
          <div>
            <label htmlFor="serper-key" className="input-label">
              Serper API Key
            </label>
            <div className="relative">
              <input
                id="serper-key"
                type={showSerper ? 'text' : 'password'}
                placeholder="your key"
                value={formData.serper_key}
                onChange={e => updateFormData('serper_key', e.target.value)}
                disabled={isLoading}
                className="ocean-input"
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowSerper(v => !v)}
                aria-label={showSerper ? 'Hide Serper key' : 'Show Serper key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer flex items-center"
                style={{ color: 'var(--text-muted)' }}
                disabled={isLoading}
              >
                {showSerper ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Analysis Settings */}
      {currentStep === 3 && (
        <div className="step-content space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Analysis Settings
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Adjust the number of competitors and questions to analyze
            </p>
          </div>

          {/* Competitors Slider */}
          <div>
            <label htmlFor="competitors-slider" className="input-label">
              <span className="font-mono">{formData.n_competitors}</span> Competitors
            </label>
            <input
              id="competitors-slider"
              type="range"
              min="3"
              max="20"
              value={formData.n_competitors}
              onChange={e => updateFormData('n_competitors', parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full"
              style={{ '--slider-fill': `${((formData.n_competitors - 3) / 17) * 100}%` } as React.CSSProperties}
              aria-label="Competitors"
            />
            <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              3 – 20 domains
            </div>
          </div>

          {/* Questions Slider */}
          <div>
            <label htmlFor="questions-slider" className="input-label">
              <span className="font-mono">{formData.n_questions}</span> Questions
            </label>
            <input
              id="questions-slider"
              type="range"
              min="5"
              max="30"
              value={formData.n_questions}
              onChange={e => updateFormData('n_questions', parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full"
              style={{ '--slider-fill': `${((formData.n_questions - 5) / 25) * 100}%` } as React.CSSProperties}
              aria-label="Questions"
            />
            <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              5 – 30 questions
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex gap-3">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isLoading}
            className="btn-secondary flex-1"
            style={{
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Back
          </button>
        )}

        {currentStep < 3 && (
          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="btn-ocean flex-1"
            style={{
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        )}

        {currentStep === 3 && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-ocean flex-1"
            style={{
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        )}
      </div>
    </div>
  )
}
