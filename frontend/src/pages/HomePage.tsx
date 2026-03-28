import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { useAnalysis } from '../contexts/AnalysisContext'
import SetupWizard, { type WizardFormData } from '../components/setup/SetupWizard'
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWizardSubmit = async (data: WizardFormData) => {
    sessionStorage.setItem('openai_key', data.openai_key)
    sessionStorage.setItem('serper_key', data.serper_key)

    setLoading(true)
    setError(null)

    const req: AnalysisRequest = {
      url: data.url,
      openai_key: data.openai_key,
      serper_key: data.serper_key,
      n_competitors: data.n_competitors,
      n_questions: data.n_questions,
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

        {/* Setup Wizard */}
        <div className="card">
          <SetupWizard onSubmit={handleWizardSubmit} isLoading={loading} error={error} />
        </div>

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
