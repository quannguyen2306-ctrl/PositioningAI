import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useAnalysis } from '../contexts/AnalysisContext'
import type { AnalysisRequest } from '../api/types'

export function HomePage() {
  const navigate = useNavigate()
  const { startAnalysis } = useAnalysis()

  const [url, setUrl] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [nCompetitors, setNCompetitors] = useState(10)
  const [nQuestions, setNQuestions] = useState(10)
  const [customQuestions, setCustomQuestions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showSerperKey, setShowSerperKey] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isFormValid = url.trim() && openaiKey.trim() && serperKey.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setError(null)

    try {
      const customQuestionsArray = customQuestions
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0)

      const req: AnalysisRequest = {
        url: url.trim(),
        openai_key: openaiKey.trim(),
        serper_key: serperKey.trim(),
        n_competitors: nCompetitors,
        n_questions: nQuestions,
        custom_questions: customQuestionsArray.length > 0 ? customQuestionsArray : undefined,
      }

      const sessionId = await startAnalysis(req)
      navigate(`/results/${sessionId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start analysis'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base text-text-primary flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-2xl">
        {/* Header with Icon */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-full blur-2xl opacity-30 animate-pulse" />
              <Eye size={48} className="text-accent relative z-10" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold mb-3 text-text-primary">
            LLM Visibility Diagnostic
          </h1>
          <p className="text-lg text-text-muted">
            See how AI sees your business — and what to fix.
          </p>
        </div>

        {/* Main Form Card */}
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* URL Input Section */}
          <div>
            <label htmlFor="url" className="input-label">
              Your Website URL
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://yourcompany.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={loading}
              className="input-base"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-subtle" />

          {/* API Keys Section */}
          <div className="space-y-5">
            {/* OpenAI Key */}
            <div>
              <label htmlFor="openaiKey" className="input-label">
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  id="openaiKey"
                  type={showOpenaiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  disabled={loading}
                  className="input-base pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
                  aria-label={showOpenaiKey ? 'Hide OpenAI key' : 'Show OpenAI key'}
                >
                  {showOpenaiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Serper Key */}
            <div>
              <label htmlFor="serperKey" className="input-label">
                Serper API Key{' '}
                <a
                  href="https://serper.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-light hover:text-accent text-xs font-normal"
                >
                  (Free at serper.dev)
                </a>
              </label>
              <div className="relative">
                <input
                  id="serperKey"
                  type={showSerperKey ? 'text' : 'password'}
                  placeholder="..."
                  value={serperKey}
                  onChange={e => setSerperKey(e.target.value)}
                  disabled={loading}
                  className="input-base pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowSerperKey(!showSerperKey)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
                  aria-label={showSerperKey ? 'Hide Serper key' : 'Show Serper key'}
                >
                  {showSerperKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Settings Collapsible */}
          <div className="border-t border-subtle pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={loading}
              className="w-full flex items-center justify-between text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 py-2"
            >
              <span className="font-display font-semibold text-sm uppercase tracking-widest">
                Advanced Settings
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Collapsible Content */}
            <div
              className={`advanced-settings ${showAdvanced ? 'open' : ''}`}
              style={{ overflow: 'hidden', maxHeight: showAdvanced ? '500px' : '0' }}
            >
              <div className="pt-4 space-y-6">
                {/* Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Competitors Slider */}
                  <div>
                    <label htmlFor="nCompetitors" className="input-label">
                      <span className="font-mono">{nCompetitors}</span> Competitors
                    </label>
                    <input
                      id="nCompetitors"
                      type="range"
                      min="5"
                      max="20"
                      value={nCompetitors}
                      onChange={e => setNCompetitors(parseInt(e.target.value))}
                      disabled={loading}
                      className="w-full"
                      style={{ '--slider-fill': `${((nCompetitors - 5) / 15) * 100}%` } as React.CSSProperties}
                    />
                    <div className="text-xs text-text-muted mt-2">5 – 20 domains</div>
                  </div>

                  {/* Questions Slider */}
                  <div>
                    <label htmlFor="nQuestions" className="input-label">
                      <span className="font-mono">{nQuestions}</span> Questions
                    </label>
                    <input
                      id="nQuestions"
                      type="range"
                      min="5"
                      max="15"
                      value={nQuestions}
                      onChange={e => setNQuestions(parseInt(e.target.value))}
                      disabled={loading}
                      className="w-full"
                      style={{ '--slider-fill': `${((nQuestions - 5) / 10) * 100}%` } as React.CSSProperties}
                    />
                    <div className="text-xs text-text-muted mt-2">5 – 15 questions</div>
                  </div>
                </div>

                {/* Custom Questions */}
                <div>
                  <label htmlFor="customQuestions" className="input-label">
                    Custom Questions (Optional)
                  </label>
                  <textarea
                    id="customQuestions"
                    placeholder="One question per line..."
                    value={customQuestions}
                    onChange={e => setCustomQuestions(e.target.value)}
                    disabled={loading}
                    className="input-base min-h-[100px] font-mono text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-score-low/10 border border-score-low rounded-lg px-4 py-3">
              <p className="text-score-low text-sm">{error}</p>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="bg-accent/5 border border-accent rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <p className="text-text-secondary text-sm">Analyzing your business...</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="btn-accent w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze →'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-12 text-center text-text-muted text-sm space-y-2">
          <p>
            This tool analyzes how LLMs perceive your business compared to competitors.
          </p>
          <p>
            All analysis happens securely using your own API keys.
          </p>
        </div>
      </div>
    </div>
  )
}
