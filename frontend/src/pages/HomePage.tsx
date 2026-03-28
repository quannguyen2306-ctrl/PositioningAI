import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Waves } from 'lucide-react'
import { useAnalysis } from '../contexts/AnalysisContext'
import type { AnalysisRequest } from '../api/types'

const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 5.3) % 90}%`,
  size: 6 + (i * 7) % 28,
  duration: 9 + (i * 3.7) % 16,
  delay: (i * 1.3) % 10,
  borderRadius: `${50 + (i * 3) % 12}% ${50 - (i * 2) % 8}% ${50 + (i * 4) % 10}% ${50 - (i * 3) % 6}%`,
}))

export default function HomePage() {
  const navigate = useNavigate()
  const { startAnalysis, sessionHistory, restoreSession } = useAnalysis()

  const [url, setUrl] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [showOpenai, setShowOpenai] = useState(false)
  const [showSerper, setShowSerper] = useState(false)
  const [nCompetitors, setNCompetitors] = useState(8)
  const [nQuestions, setNQuestions] = useState(10)
  const [customQuestions, setCustomQuestions] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [perplexityKey, setPerplexityKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const sk = localStorage.getItem('serper_key') ?? ''
    const ok = localStorage.getItem('openai_key') ?? ''
    if (sk) setSerperKey(sk)
    if (ok) setOpenaiKey(ok)
  }, [])

  const canSubmit = url.trim() && openaiKey.trim() && serperKey.trim() && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    localStorage.setItem('openai_key', openaiKey)
    localStorage.setItem('serper_key', serperKey)

    setLoading(true)
    setError(null)

    const customQuestionsArray = customQuestions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)

    const req: AnalysisRequest = {
      url: url.trim(),
      openai_key: openaiKey.trim(),
      serper_key: serperKey.trim(),
      google_key: googleKey.trim() || undefined,
      anthropic_key: anthropicKey.trim() || undefined,
      perplexity_key: perplexityKey.trim() || undefined,
      n_competitors: nCompetitors,
      n_questions: nQuestions,
      custom_questions: customQuestionsArray.length > 0 ? customQuestionsArray : undefined,
    }

    try {
      const sid = await startAnalysis(req)
      navigate(`/results/${sid}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  return (
    <div className="ocean-bg min-h-screen flex items-center justify-center px-6 py-6 relative overflow-hidden">
      {/* Animated bubbles */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {BUBBLES.map(b => (
          <div
            key={b.id}
            className="bubble"
            style={{
              left: b.left,
              bottom: 0,
              width: b.size,
              height: b.size,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              borderRadius: b.borderRadius,
            }}
          />
        ))}
      </div>

      {/* Light ray */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '55%',
        background: 'linear-gradient(180deg, oklch(0.47 0.07 210 / 0.10) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div className="relative w-full max-w-[560px]" style={{ zIndex: 1 }}>
        {/* Hero */}
        <div className="text-center mb-9">
          <div className="animate-float inline-block mb-3" style={{ color: 'var(--color-secondary)' }}>
            <Waves size={52} strokeWidth={1.2} />
          </div>
          <h1 style={{
            fontSize: 44,
            fontWeight: 700,
            margin: '0 0 8px',
            background: 'linear-gradient(135deg, var(--color-text) 0%, var(--color-secondary) 50%, var(--color-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}>
            One Piece
          </h1>
          <p className="text-[16px] mb-1" style={{ color: 'var(--text-secondary)' }}>
            AI Visibility Intelligence
          </p>
          <p className="text-[13px] m-0" style={{ color: 'var(--text-muted)' }}>
            Discover your territory in the AI ocean — and claim the unclaimed
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
              className="ocean-input"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-subtle" />

          {/* Required API Keys */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  OPENAI KEY
                </label>
                <div className="relative">
                  <input
                    className="ocean-input"
                    type={showOpenai ? 'text' : 'password'}
                    placeholder="sk-…"
                    value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)}
                    style={{ paddingRight: 36 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenai(v => !v)}
                    aria-label={showOpenai ? 'Hide OpenAI key' : 'Show OpenAI key'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer flex items-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showOpenai ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  SERPER KEY
                </label>
                <div className="relative">
                  <input
                    className="ocean-input"
                    type={showSerper ? 'text' : 'password'}
                    placeholder="your key"
                    value={serperKey}
                    onChange={e => setSerperKey(e.target.value)}
                    style={{ paddingRight: 36 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSerper(v => !v)}
                    aria-label={showSerper ? 'Hide Serper key' : 'Show Serper key'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer flex items-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showSerper ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              aria-expanded={showAdvanced}
              aria-label={showAdvanced ? 'Collapse advanced settings' : 'Expand advanced settings'}
              className="w-full flex justify-between items-center py-2 bg-transparent border-none cursor-pointer text-[11px] tracking-wide"
              style={{
                color: 'var(--text-muted)',
                borderTop: '1px solid oklch(0.52 0.07 230 / 0.12)',
                paddingTop: 8,
              }}
            >
              <span>ADVANCED SETTINGS</span>
              <span style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {/* Collapsible Content */}
            <div
              className={`advanced-settings ${showAdvanced ? 'open' : ''}`}
              style={{ overflow: 'hidden', maxHeight: showAdvanced ? '900px' : '0' }}
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
                <div>
                  <label className="block text-[10px] tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    CUSTOM QUESTIONS (optional, one per line)
                  </label>
                  <textarea
                    className="ocean-input"
                    rows={3}
                    value={customQuestions}
                    onChange={e => setCustomQuestions(e.target.value)}
                    placeholder="What is the best X for Y?&#10;Top solutions in [city]?"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Multi-AI Engine Keys (Optional) */}
                <div className="border-t border-subtle pt-4">
                  <p className="input-label mb-4">
                    Multi-AI Engine Keys{' '}
                    <span className="text-text-muted font-normal normal-case tracking-normal">
                      — Optional. Test across ChatGPT, Claude, Gemini &amp; Perplexity.
                    </span>
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="anthropicKey" className="input-label">
                        Anthropic API Key (Claude)
                      </label>
                      <input
                        id="anthropicKey"
                        type="password"
                        placeholder="sk-ant-..."
                        value={anthropicKey}
                        onChange={e => setAnthropicKey(e.target.value)}
                        disabled={loading}
                        className="ocean-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="googleKey" className="input-label">
                        Google API Key (Gemini)
                      </label>
                      <input
                        id="googleKey"
                        type="password"
                        placeholder="AIza..."
                        value={googleKey}
                        onChange={e => setGoogleKey(e.target.value)}
                        disabled={loading}
                        className="ocean-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="perplexityKey" className="input-label">
                        Perplexity API Key
                      </label>
                      <input
                        id="perplexityKey"
                        type="password"
                        placeholder="pplx-..."
                        value={perplexityKey}
                        onChange={e => setPerplexityKey(e.target.value)}
                        disabled={loading}
                        className="ocean-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-[12px]" style={{ background: 'rgba(239,35,60,0.08)', border: '1px solid rgba(239,35,60,0.25)', color: 'var(--score-low)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-ocean w-full"
              disabled={!canSubmit}
              style={{ fontSize: 15, padding: '13px 24px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Waves size={16} strokeWidth={1.5} className="animate-float" /> Diving in…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Dive into the Ocean <ArrowRight size={16} strokeWidth={2} />
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Recent sessions */}
        {sessionHistory.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>RECENT DIVES</div>
            <div className="flex flex-col gap-1.5">
              {sessionHistory.slice(0, 3).map(s => (
                <button
                  key={s.id}
                  onClick={() => { restoreSession(s); navigate(`/results/${s.id}`) }}
                  className="glass-light w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer"
                  style={{ border: 'none', color: 'var(--text-secondary)' }}
                >
                  <div>
                    <div className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                      {(() => { try { return new URL(s.businessUrl).hostname } catch { return s.businessUrl } })()}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(Number(s.id)).toLocaleDateString()}</div>
                  </div>
                  <div className="text-lg font-bold" style={{ color: scoreColor(s.overallScore), fontFamily: 'var(--font-body)' }}>
                    {s.overallScore?.toFixed(1)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          API keys stored locally · never sent to our servers
        </div>
      </div>
    </div>
  )
}

function scoreColor(score?: number): string {
  if (!score) return 'var(--text-muted)'
  if (score >= 7) return 'var(--score-high)'
  if (score >= 4) return 'var(--score-mid)'
  return 'var(--score-low)'
}
