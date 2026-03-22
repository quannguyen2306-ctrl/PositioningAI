import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../contexts/AnalysisContext'
import type { AnalysisRequest } from '../api/types'

const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 5.3) % 90}%`,
  size: 6 + (i * 7) % 28,
  duration: 8 + (i * 3.7) % 14,
  delay: (i * 1.3) % 8,
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
  const [customQs, setCustomQs] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const req: AnalysisRequest = {
      url: url.trim(),
      openai_key: openaiKey.trim(),
      serper_key: serperKey.trim(),
      n_competitors: nCompetitors,
      n_questions: nQuestions,
      custom_questions: customQs
        ? customQs.split('\n').map(q => q.trim()).filter(Boolean)
        : undefined,
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
    <div
      className="ocean-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated bubbles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
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
            }}
          />
        ))}
      </div>

      {/* Light ray */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '25%',
        width: '50%',
        height: '55%',
        background: 'linear-gradient(180deg, rgba(0,90,180,0.07) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="animate-float" style={{ fontSize: 56, marginBottom: 14, display: 'inline-block' }}>
            🌊
          </div>
          <h1 style={{
            fontSize: 44,
            fontWeight: 700,
            margin: '0 0 8px',
            background: 'linear-gradient(135deg, #e0f4ff 0%, #00b4d8 50%, #00f5d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}>
            Blue Ocean
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px', fontSize: 16 }}>
            AI Visibility Intelligence
          </p>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>
            Discover your territory in the AI ocean — and claim the unclaimed
          </p>
        </div>

        {/* Form */}
        <div className="glass glow-blue" style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em' }}>
                YOUR WEBSITE
              </label>
              <input
                className="ocean-input"
                type="url"
                placeholder="https://yourbusiness.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em' }}>
                  OPENAI KEY
                </label>
                <div style={{ position: 'relative' }}>
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
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
                  >
                    {showOpenai ? '👁' : '○'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em' }}>
                  SERPER KEY
                </label>
                <div style={{ position: 'relative' }}>
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
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
                  >
                    {showSerper ? '👁' : '○'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdvanced(v => !v)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 11,
                letterSpacing: '0.05em',
                marginBottom: advanced ? 12 : 20,
              }}
            >
              <span>ADVANCED SETTINGS</span>
              <span style={{ transform: advanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {advanced && (
              <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
                    <span>COMPETITORS TO SCAN</span>
                    <span style={{ color: 'var(--glow-blue)' }}>{nCompetitors}</span>
                  </label>
                  <input type="range" min={5} max={20} value={nCompetitors} onChange={e => setNCompetitors(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--glow-blue)' }} />
                </div>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
                    <span>TEST QUESTIONS</span>
                    <span style={{ color: 'var(--glow-blue)' }}>{nQuestions}</span>
                  </label>
                  <input type="range" min={5} max={15} value={nQuestions} onChange={e => setNQuestions(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--glow-blue)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>
                    CUSTOM QUESTIONS (optional, one per line)
                  </label>
                  <textarea
                    className="ocean-input"
                    rows={3}
                    value={customQs}
                    onChange={e => setCustomQs(e.target.value)}
                    placeholder="What is the best X for Y?&#10;Top solutions in [city]?"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,35,60,0.08)', border: '1px solid rgba(239,35,60,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--score-low)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-ocean"
              disabled={!canSubmit}
              style={{ width: '100%', fontSize: 15, padding: '13px 24px' }}
            >
              {loading ? '🌊 Diving in…' : 'Dive into the Ocean →'}
            </button>
          </form>
        </div>

        {/* Recent sessions */}
        {sessionHistory.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>RECENT DIVES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sessionHistory.slice(0, 3).map(s => (
                <button
                  key={s.id}
                  onClick={() => { restoreSession(s); navigate(`/results/${s.id}`) }}
                  className="glass-light"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                      {(() => { try { return new URL(s.businessUrl).hostname } catch { return s.businessUrl } })()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(Number(s.id)).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.overallScore), fontFamily: 'monospace' }}>
                    {s.overallScore?.toFixed(1)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-dim)' }}>
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
