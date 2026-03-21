import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useAnalysis } from '../../../contexts/AnalysisContext'

export function SettingsPanel() {
  const navigate = useNavigate()
  const { analysisRequest, startAnalysis } = useAnalysis()

  const [url, setUrl] = useState(analysisRequest?.url || '')
  const [openaiKey, setOpenaiKey] = useState(analysisRequest?.openai_key || '')
  const [serperKey, setSerperKey] = useState(analysisRequest?.serper_key || '')
  const [nCompetitors, setNCompetitors] = useState(analysisRequest?.n_competitors ?? 10)
  const [nQuestions, setNQuestions] = useState(analysisRequest?.n_questions ?? 10)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showSerperKey, setShowSerperKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = url.trim() && openaiKey.trim() && serperKey.trim()

  const handleRerun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      const sessionId = await startAnalysis({
        url: url.trim(),
        openai_key: openaiKey.trim(),
        serper_key: serperKey.trim(),
        n_competitors: nCompetitors,
        n_questions: nQuestions,
      })
      navigate(`/results/${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleRerun} className="max-w-xl space-y-5">
      {/* Analysis Target */}
      <div className="card p-5 space-y-4">
        <p className="font-display font-semibold text-sm uppercase tracking-widest text-text-secondary">
          Analysis Target
        </p>
        <div>
          <label className="input-label">Website URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            disabled={loading}
            className="input-base"
          />
        </div>
      </div>

      {/* API Keys */}
      <div className="card p-5 space-y-4">
        <p className="font-display font-semibold text-sm uppercase tracking-widest text-text-secondary">
          API Keys
        </p>
        <div>
          <label className="input-label">OpenAI API Key</label>
          <div className="relative">
            <input
              type={showOpenaiKey ? 'text' : 'password'}
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              disabled={loading}
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(v => !v)}
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
            >
              {showOpenaiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="input-label">Serper API Key</label>
          <div className="relative">
            <input
              type={showSerperKey ? 'text' : 'password'}
              value={serperKey}
              onChange={e => setSerperKey(e.target.value)}
              placeholder="..."
              disabled={loading}
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowSerperKey(v => !v)}
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
            >
              {showSerperKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Settings */}
      <div className="card p-5 space-y-5">
        <p className="font-display font-semibold text-sm uppercase tracking-widest text-text-secondary">
          Analysis Settings
        </p>
        <div>
          <label className="input-label">
            <span className="font-mono text-text-primary">{nCompetitors}</span> Competitors
          </label>
          <input
            type="range"
            min="5"
            max="20"
            value={nCompetitors}
            onChange={e => setNCompetitors(parseInt(e.target.value))}
            disabled={loading}
            className="w-full"
            style={{ '--slider-fill': `${((nCompetitors - 5) / 15) * 100}%` } as React.CSSProperties}
          />
          <div className="text-xs text-text-muted mt-1.5">5 – 20 domains</div>
        </div>
        <div>
          <label className="input-label">
            <span className="font-mono text-text-primary">{nQuestions}</span> Questions
          </label>
          <input
            type="range"
            min="5"
            max="15"
            value={nQuestions}
            onChange={e => setNQuestions(parseInt(e.target.value))}
            disabled={loading}
            className="w-full"
            style={{ '--slider-fill': `${((nQuestions - 5) / 10) * 100}%` } as React.CSSProperties}
          />
          <div className="text-xs text-text-muted mt-1.5">5 – 15 questions</div>
        </div>
      </div>

      {error && (
        <div className="bg-score-low/10 border border-score-low rounded-lg px-4 py-3">
          <p className="text-score-low text-sm">{error}</p>
        </div>
      )}

      <button type="submit" disabled={!isValid || loading} className="btn-accent flex items-center justify-center gap-2">
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Running Analysis...' : 'Re-run Analysis'}
      </button>
    </form>
  )
}
