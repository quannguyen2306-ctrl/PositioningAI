import { useState } from 'react'
import { useAnalysis } from '../../contexts/AnalysisContext'

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export default function ContentLab({ isOpen, onToggle }: Props) {
  const { submitToContentLab, contentLabLoading, contentLabError, contentLabResult, clearContentLab, backendSessionId } = useAnalysis()
  const [text, setText] = useState('')

  const canSubmit = text.trim().length > 50 && !!backendSessionId && !contentLabLoading

  const handleSubmit = async () => {
    if (!canSubmit) return
    await submitToContentLab(text.trim())
  }

  const handleClear = () => {
    setText('')
    clearContentLab()
  }

  const newScore = contentLabResult?.eval?.avg_visibility_score

  return (
    <div
      className="glass"
      style={{
        border: '1px solid rgba(0,180,216,0.25)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🧪</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Content Lab</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Test new content without re-running the full analysis
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--glow-blue)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▲
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!backendSessionId && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,179,71,0.08)',
              border: '1px solid rgba(255,179,71,0.25)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--score-mid)',
            }}>
              Run an analysis first to enable the Content Lab.
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              PASTE NEW CONTENT (homepage copy, about page, blog post…)
            </label>
            <textarea
              className="ocean-input"
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the new content you want to test here. The AI will re-evaluate your visibility in the ocean with this content instead of your current website copy…"
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              disabled={!backendSessionId}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {text.length} chars {text.length < 50 && text.length > 0 ? '— add at least 50 characters' : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-unclaimed"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ flex: 1 }}
            >
              {contentLabLoading ? '🌊 Testing in the ocean…' : '🌊 Test in the Ocean'}
            </button>
            {(contentLabResult || text) && (
              <button className="btn-ghost" onClick={handleClear}>
                Reset
              </button>
            )}
          </div>

          {contentLabError && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,35,60,0.08)',
              border: '1px solid rgba(239,35,60,0.25)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--score-low)',
            }}>
              {contentLabError}
            </div>
          )}

          {contentLabResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}>
                <MetricCell
                  label="New Score"
                  value={`${newScore?.toFixed(1) ?? '—'}/10`}
                  color={scoreColor(newScore)}
                  highlight
                />
                <MetricCell
                  label="Mention Rate"
                  value={`${((contentLabResult.eval.mention_rate ?? 0) * 100).toFixed(0)}%`}
                  color="var(--glow-blue)"
                />
                <MetricCell
                  label="Blue Oceans"
                  value={String(contentLabResult.blue_ocean_opportunities?.length ?? 0)}
                  color="var(--ocean-unclaimed)"
                />
              </div>

              {contentLabResult.archetype && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(0,245,212,0.05)',
                  border: '1px solid rgba(0,245,212,0.2)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    NEW ARCHETYPE WITH THIS CONTENT
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ocean-unclaimed)' }}>
                    {contentLabResult.archetype.icon} {contentLabResult.archetype.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {contentLabResult.archetype.tagline}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                The cyan dots on the map show your new position with this content.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCell({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: string
  color: string
  highlight?: boolean
}) {
  return (
    <div style={{
      padding: '10px',
      background: highlight ? 'rgba(0,245,212,0.05)' : 'rgba(0,29,61,0.5)',
      border: `1px solid ${highlight ? 'rgba(0,245,212,0.2)' : 'rgba(0,180,216,0.1)'}`,
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'monospace' }}>
        {value}
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
