/**
 * RecommendationLab
 *
 * Enable to:
 *   1. Highlight unclaimed zones on the map; click a zone card to generate
 *      targeted content recommendations for claiming that territory.
 *   2. Switch to "Pick Target" mode: click any point on the map to generate
 *      recommendations for moving toward that exact semantic position.
 *
 * Results include a 250-word content draft that can be sent directly to
 * Content Lab for verification.
 */

import { useState, useEffect } from 'react'
import type { BlueOceanZone, PcaInterpretation, RecommendationResult } from '../../api/types'
import { generateRecommendation } from '../../api/client'
import { useAnalysis } from '../../contexts/AnalysisContext'

type LabMode = 'zones' | 'pick'

interface Props {
  enabled: boolean
  onToggle: () => void
  blueOceanZones: BlueOceanZone[]
  interpretations: PcaInterpretation[]
  userCentroid: { x: number; y: number } | null
  pickPointMode: boolean
  onSetPickMode: (active: boolean) => void
  recommendationTarget: { x: number; y: number } | null  // set when user clicks map in pick mode
  onRemovePin: () => void
  onPrefillContentLab: (draft: string) => void
}

export default function RecommendationLab({
  enabled,
  onToggle,
  blueOceanZones,
  interpretations,
  userCentroid,
  pickPointMode,
  onSetPickMode,
  recommendationTarget,
  onRemovePin,
  onPrefillContentLab,
}: Props) {
  const { backendSessionId, openaiKeyRef } = useAnalysis()
  const [mode, setMode] = useState<LabMode>('zones')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [targetLabel, setTargetLabel] = useState<string>('')

  const canGenerate = !!backendSessionId && !!userCentroid && !loading

  async function generate(targetX: number, targetY: number, label: string) {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setResult(null)
    setTargetLabel(label)
    try {
      const data = await generateRecommendation(
        backendSessionId!,
        targetX,
        targetY,
        userCentroid!.x,
        userCentroid!.y,
        openaiKeyRef?.current ?? '',
      )
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Trigger generation when user clicks the map in pick-point mode
  useEffect(() => {
    if (!recommendationTarget || mode !== 'pick') return
    onSetPickMode(false)
    generate(
      recommendationTarget.x,
      recommendationTarget.y,
      `Point (${recommendationTarget.x.toFixed(2)}, ${recommendationTarget.y.toFixed(2)})`,
    )
  }, [recommendationTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleZoneClick(zone: BlueOceanZone) {
    generate(zone.x, zone.y, 'Unclaimed Territory')
  }

  function sendToContentLab() {
    if (result?.content_draft) {
      onPrefillContentLab(result.content_draft)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header toggle */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: enabled ? 'oklch(0.47 0.07 210 / 0.10)' : 'var(--bg-mid)',
          border: `1px solid ${enabled ? 'oklch(0.47 0.07 210 / 0.35)' : 'var(--border-subtle)'}`,
          borderRadius: 10,
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.2s',
          boxShadow: enabled ? 'var(--shadow-1)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🧭</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Recommendation Lab</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {enabled ? 'Active — click a zone or pick a point' : 'Generate content to claim new territory'}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: enabled ? 'var(--color-accent)' : 'var(--text-muted)',
          padding: '3px 8px',
          border: `1px solid ${enabled ? 'oklch(0.47 0.07 210 / 0.40)' : 'var(--border-subtle)'}`,
          borderRadius: 99,
          background: enabled ? 'oklch(0.47 0.07 210 / 0.12)' : 'transparent',
        }}>
          {enabled ? 'ON' : 'OFF'}
        </div>
      </button>

      {!enabled && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: '10px 0 4px' }}>
          Enable to highlight unclaimed zones and generate AI content recommendations.
        </div>
      )}

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>

          {!backendSessionId && (
            <div style={{ padding: '8px 12px', background: 'oklch(0.75 0.14 80 / 0.08)', border: '1px solid oklch(0.75 0.14 80 / 0.25)', borderRadius: 8, fontSize: 11, color: 'var(--score-mid)' }}>
              Run an analysis first to enable recommendations.
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['zones', 'pick'] as LabMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); if (m !== 'pick') onSetPickMode(false) }}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
                  background: mode === m ? 'oklch(0.52 0.07 230 / 0.12)' : 'var(--bg-mid)',
                  border: mode === m ? '1px solid oklch(0.52 0.07 230 / 0.40)' : '1px solid var(--border-subtle)',
                  color: mode === m ? 'var(--color-secondary)' : 'var(--text-muted)',
                }}
              >
                {m === 'zones' ? '🌊 Zones' : '🎯 Pick Point'}
              </button>
            ))}
          </div>

          {/* ZONES mode */}
          {mode === 'zones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                UNCLAIMED TERRITORIES — click to generate recommendations
              </div>
              {blueOceanZones.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
                  No unclaimed zones detected in this analysis.
                </div>
              )}
              {blueOceanZones.map((zone, i) => {
                const xi = interpretations[0]
                const yi = interpretations[1]
                const xDesc = xi ? (zone.x > 0 ? xi.positive_end : xi.negative_end) : 'mixed'
                const yDesc = yi ? (zone.y > 0 ? yi.positive_end : yi.negative_end) : ''
                return (
                  <button
                    key={i}
                    onClick={() => handleZoneClick(zone)}
                    disabled={!canGenerate}
                    style={{
                      padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                      background: 'oklch(0.47 0.07 210 / 0.05)',
                      border: '1px solid oklch(0.47 0.07 210 / 0.28)',
                      borderRadius: 8, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.47 0.07 210 / 0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'oklch(0.47 0.07 210 / 0.05)')}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ocean-unclaimed)', marginBottom: 3 }}>
                      🌊 Unclaimed Zone {i + 1}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {xDesc}{yDesc ? ` · ${yDesc}` : ''} area
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* PICK POINT mode */}
          {mode === 'pick' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                CLICK ANY POINT ON THE MAP
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onSetPickMode(!pickPointMode)}
                  disabled={!canGenerate}
                  style={{
                    flex: 1, padding: '10px 14px', cursor: 'pointer', borderRadius: 8,
                    background: pickPointMode ? 'oklch(0.52 0.07 230 / 0.15)' : 'var(--bg-mid)',
                    border: pickPointMode ? '1px solid oklch(0.52 0.07 230 / 0.50)' : '1px solid var(--border-subtle)',
                    color: pickPointMode ? 'var(--color-secondary)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  {pickPointMode ? '🎯 Click map to place…' : '🎯 Activate Picker'}
                </button>

                {recommendationTarget && !pickPointMode && (
                  <button
                    onClick={onRemovePin}
                    title="Remove pin from map"
                    style={{
                      padding: '10px 12px', cursor: 'pointer', borderRadius: 8,
                      background: 'oklch(0.55 0.22 25 / 0.08)',
                      border: '1px solid oklch(0.55 0.22 25 / 0.3)',
                      color: 'var(--score-low)',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    ✕ Pin
                  </button>
                )}
              </div>

              {pickPointMode && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Cursor is now a crosshair. Click anywhere on the ocean to place the 🎯 target and generate recommendations.
                </div>
              )}
              {recommendationTarget && !pickPointMode && (
                <div style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.05em' }}>
                  🎯 Pin active at ({recommendationTarget.x.toFixed(2)}, {recommendationTarget.y.toFixed(2)})
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }} className="animate-float">🧭</div>
              <div style={{ fontSize: 12, color: 'var(--color-secondary)' }}>Charting your course…</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 12px', background: 'oklch(0.55 0.22 25 / 0.08)', border: '1px solid oklch(0.55 0.22 25 / 0.25)', borderRadius: 8, fontSize: 11, color: 'var(--score-low)' }}>
              {error}
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--color-secondary)', letterSpacing: '0.08em' }}>
                RECOMMENDATIONS FOR: {targetLabel.toUpperCase()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    padding: '8px 10px',
                    background: 'oklch(0.52 0.07 230 / 0.05)',
                    border: '1px solid oklch(0.52 0.07 230 / 0.18)',
                    borderRadius: 7,
                    fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5,
                    display: 'flex', gap: 8,
                  }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    {rec}
                  </div>
                ))}
              </div>

              {result.content_draft && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 4 }}>
                    CONTENT DRAFT — test in Content Lab ↓
                  </div>
                  <div style={{
                    padding: '10px 12px',
                    background: 'var(--bg-bottom)',
                    border: '1px solid oklch(0.52 0.07 230 / 0.25)',
                    borderRadius: 8,
                    fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6,
                    maxHeight: 180, overflowY: 'auto',
                  }}>
                    {result.content_draft}
                  </div>
                  <button
                    onClick={sendToContentLab}
                    style={{
                      padding: '9px 14px', cursor: 'pointer', borderRadius: 8,
                      background: 'oklch(0.52 0.07 230 / 0.10)',
                      border: '1px solid oklch(0.52 0.07 230 / 0.40)',
                      color: 'var(--color-secondary)',
                      fontSize: 12, fontWeight: 700,
                      boxShadow: 'var(--shadow-1)',
                    }}
                  >
                    🧪 Send Draft to Content Lab
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Export the handleMapClick function shape for ResultsPage to wire up
export type { Props as RecommendationLabProps }
