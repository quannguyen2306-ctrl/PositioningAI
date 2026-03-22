import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../contexts/AnalysisContext'
import OceanMap, { type OceanPoint } from '../components/ocean/OceanMap'
import ArchetypeCard from '../components/ocean/ArchetypeCard'
import FishLegend from '../components/ocean/FishLegend'
import ContentLab from '../components/ocean/ContentLab'
import RecommendationLab from '../components/ocean/RecommendationLab'
import type { PcaInterpretation } from '../api/types'

type Tab = 'map' | 'eval' | 'recommendations'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { results, progress, error, clearSession, contentLabResult } = useAnalysis()
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('map')
  const [contentLabOpen, setContentLabOpen] = useState(true)
  const [expandedQ, setExpandedQ] = useState<number | null>(null)

  // Right panel tab
  const [rightTab, setRightTab] = useState<'reclab' | 'contentlab'>('reclab')

  // Recommendation Lab state
  const [recLabEnabled, setRecLabEnabled] = useState(false)
  const [pickPointMode, setPickPointMode] = useState(false)
  const [recommendationTarget, setRecommendationTarget] = useState<{ x: number; y: number } | null>(null)
  const [contentLabPrefill, setContentLabPrefill] = useState('')

  const handleMapClick = useCallback((dataX: number, dataY: number) => {
    setRecommendationTarget({ x: dataX, y: dataY })
  }, [])

  // Build OceanPoints from coords + pca_meta
  const points: OceanPoint[] = useMemo(() => {
    if (!results) return []
    return results.coords.map((c, i) => ({
      x: c[0],
      y: c[1],
      source: (results.pca_meta[i]?.source ?? 'competitor') as 'user' | 'competitor',
      domain: results.pca_meta[i]?.domain ?? '',
      text: '',
    }))
  }, [results])

  const contentLabPoints: OceanPoint[] | undefined = useMemo(() => {
    if (!contentLabResult) return undefined
    return contentLabResult.pca_points.map(p => ({
      x: p.components[0],
      y: p.components[1],
      source: p.source as 'user' | 'competitor',
      domain: p.domain,
      text: p.text,
    }))
  }, [contentLabResult])

  // Canonical domain order from PCA points — shared by OceanMap and FishLegend
  // so fish emojis and colors are always consistent between map and legend.
  const domains = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const p of points) {
      if (p.source === 'competitor' && p.domain && !seen.has(p.domain)) {
        seen.add(p.domain)
        list.push(p.domain)
      }
    }
    return list
  }, [points])

  // User centroid in PCA data coordinates (for recommendation lab)
  const userCentroid = useMemo(() => {
    const userPts = points.filter(p => p.source === 'user')
    if (!userPts.length) return null
    const x = userPts.reduce((s, p) => s + p.x, 0) / userPts.length
    const y = userPts.reduce((s, p) => s + p.y, 0) / userPts.length
    return { x, y }
  }, [points])

  const interps: PcaInterpretation[] = results?.interps ?? []
  const archetype = contentLabResult?.archetype ?? results?.archetype
  // Keep original zones stable for recommendation lab (numbered Zone 1/2/3…).
  // Content Lab re-runs zone detection but we don't renumber — use original on map/rec lab.
  const blueOceanZones = results?.blue_ocean_zones ?? []
  const blueOceanOpps = contentLabResult?.blue_ocean_opportunities ?? results?.blue_ocean_opportunities ?? []
  const evalResults = contentLabResult?.eval ?? results?.eval
  const avgScore = evalResults?.avg_visibility_score ?? 0

  // Loading state
  if (!results && progress) {
    return <LoadingView progress={progress.percent} message={progress.message} />
  }

  if (error) {
    return (
      <div className="ocean-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌊</div>
          <div style={{ fontSize: 16, color: 'var(--score-low)', marginBottom: 8 }}>The ocean is rough</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{error}</div>
          <button className="btn-ocean" onClick={() => { clearSession(); navigate('/') }}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="ocean-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} className="animate-float">🌊</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No dive data found.</div>
          <button className="btn-ocean" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            Start a Dive
          </button>
        </div>
      </div>
    )
  }

  const biz = results.biz
  const topDomains = results.eval.top_competitor_domains

  return (
    <div
      className="ocean-bg"
      style={{
        height: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: '240px 1fr 320px',
        gridTemplateAreas: `
          "header header header"
          "left   main   right"
        `,
        overflow: 'hidden',
        gap: 0,
      }}
    >
      {/* ── HEADER ── */}
      <header style={{
        gridArea: 'header',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(0,8,20,0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { clearSession(); navigate('/') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}
          >
            🌊
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {biz.business_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {biz.industry} · {biz.location}
            </div>
          </div>
        </div>

        {/* Score pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>VISIBILITY</div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: scoreColor(avgScore),
            }}>
              {avgScore.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/10</span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>COVERAGE</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: 'var(--glow-cyan)' }}>
              {((evalResults?.mention_rate ?? 0) * 100).toFixed(0)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>BLUE OCEANS</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: 'var(--ocean-unclaimed)' }}>
              {blueOceanOpps.length}
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {(['map', 'eval', 'recommendations'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="btn-ghost"
              style={{
                fontSize: 11,
                padding: '6px 12px',
                background: activeTab === t ? 'rgba(0,180,216,0.12)' : 'transparent',
                color: activeTab === t ? 'var(--glow-blue)' : 'var(--text-muted)',
                border: activeTab === t ? '1px solid rgba(0,180,216,0.3)' : '1px solid transparent',
              }}
            >
              {t === 'map' ? '🗺 Map' : t === 'eval' ? '📊 Eval' : '💡 Recs'}
            </button>
          ))}
        </nav>
      </header>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{
        gridArea: 'left',
        padding: '16px 12px',
        overflowY: 'auto',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {archetype && <ArchetypeCard archetype={archetype} />}

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
            OCEAN TERRITORY
          </div>
          <FishLegend
            domains={domains}
            userBizName={biz.business_name}
            topDomains={topDomains}
            onHover={setHoveredDomain}
            hoveredDomain={hoveredDomain}
          />
        </div>

        {/* Score breakdown */}
        <div className="glass-light" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
            SCORE BREAKDOWN
          </div>
          <ScoreBar label="High (8-10)" value={evalResults?.score_breakdown['high (8-10)'] ?? 0} total={evalResults?.total_questions ?? 1} color="var(--score-high)" />
          <ScoreBar label="Medium (5-7)" value={evalResults?.score_breakdown['medium (5-7)'] ?? 0} total={evalResults?.total_questions ?? 1} color="var(--score-mid)" />
          <ScoreBar label="Low (0-4)" value={evalResults?.score_breakdown['low (0-4)'] ?? 0} total={evalResults?.total_questions ?? 1} color="var(--score-low)" />
        </div>

        {interps.length > 0 && (
          <div className="glass-light" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
              OCEAN AXES
            </div>
            {interps.slice(0, 2).map((interp, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--glow-blue)', fontWeight: 600, marginBottom: 3 }}>
                  {interp.dimension_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {interp.negative_end} ↔ {interp.positive_end}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
                  {interp.variance_explained}% of variance
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ gridArea: 'main', overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'map' && (
          <div style={{ width: '100%', height: '100%' }}>
            <OceanMap
              points={points}
              interpretations={interps}
              blueOceanZones={blueOceanZones}
              userBizName={biz.business_name}
              highlightedDomain={hoveredDomain}
              domains={domains}
              contentLabPoints={contentLabPoints}
              recommendationMode={recLabEnabled}
              pickPointMode={pickPointMode}
              recommendationTarget={recommendationTarget}
              onMapClick={handleMapClick}
            />
          </div>
        )}

        {activeTab === 'eval' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '20px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                Question Evaluation — {evalResults?.total_questions} questions tested in parallel
              </div>
              {evalResults?.results.map((r, i) => (
                <div
                  key={i}
                  className="glass-light"
                  style={{
                    marginBottom: 10,
                    border: r.is_blue_ocean
                      ? '1px solid rgba(0,245,212,0.3)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `${scoreColor(r.visibility_score)}22`,
                        border: `1.5px solid ${scoreColor(r.visibility_score)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: scoreColor(r.visibility_score),
                        flexShrink: 0,
                        fontFamily: 'monospace',
                      }}>
                        {r.visibility_score}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }} className="truncate-2">
                          {r.question}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.key_observation}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {r.is_blue_ocean && (
                        <span style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(0,245,212,0.1)', border: '1px solid rgba(0,245,212,0.3)', borderRadius: 99, color: 'var(--ocean-unclaimed)', fontWeight: 600 }}>
                          UNCLAIMED
                        </span>
                      )}
                      <span className={r.business_mentioned ? 'score-badge-high' : 'score-badge-low'} style={{ fontSize: 9 }}>
                        {r.business_mentioned ? 'MENTIONED' : 'ABSENT'}
                      </span>
                    </div>
                  </button>

                  {expandedQ === i && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AI Answer:</div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, background: 'rgba(0,29,61,0.4)', padding: '10px 12px', borderRadius: 8 }}>
                          {r.answer}
                        </p>
                        {r.why_low_visibility && (
                          <div style={{ padding: '8px 12px', background: 'rgba(239,35,60,0.06)', border: '1px solid rgba(239,35,60,0.15)', borderRadius: 8, fontSize: 12, color: 'var(--score-low)' }}>
                            ⚠ {r.why_low_visibility}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                          <span>Your chunks: {r.user_chunk_count}</span>
                          <span>·</span>
                          <span>Competitor chunks: {r.comp_chunk_count}</span>
                          <span>·</span>
                          <span>Quality: {r.mention_quality}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '20px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Executive summary */}
              <div className="glass" style={{ padding: '20px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>EXECUTIVE SUMMARY</div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                  {results.recs.executive_summary}
                </p>
              </div>

              {/* Priority fixes */}
              {results.recs.priority_fixes.map((fix, i) => (
                <div key={i} className="glass-light" style={{ padding: '16px', border: `1px solid ${impactColor(fix.impact)}30` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fix.title}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 9, padding: '2px 8px', background: `${impactColor(fix.impact)}15`, border: `1px solid ${impactColor(fix.impact)}40`, borderRadius: 99, color: impactColor(fix.impact), fontWeight: 600 }}>
                        {fix.impact.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 99, color: 'var(--glow-blue)', fontWeight: 600 }}>
                        {fix.effort}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.6 }}>{fix.problem}</p>
                  <p style={{ fontSize: 12, color: 'var(--glow-bright)', margin: 0, lineHeight: 1.6 }}>{fix.action}</p>
                </div>
              ))}

              {/* Content to add */}
              {results.recs.content_to_add.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>CONTENT TO ADD</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {results.recs.content_to_add.map((c, i) => (
                      <div key={i} className="glass-light" style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.title}</div>
                          <span style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.25)', borderRadius: 99, color: 'var(--ocean-unclaimed)', fontWeight: 600 }}>{c.type}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>Placement: {c.placement}</p>
                        <pre style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(0,8,20,0.6)', padding: '10px', borderRadius: 6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, margin: 0 }}>
                          {c.suggested_content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics */}
              {results.recs.topics_to_cover.length > 0 && (
                <div className="glass-light" style={{ padding: '16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>TOPICS TO COVER</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {results.recs.topics_to_cover.map((t, i) => (
                      <span key={i} style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 99, color: 'var(--glow-bright)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── RIGHT PANEL ── */}
      {/* ── RIGHT PANEL ── */}
      <aside style={{
        gridArea: 'right',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,8,20,0.6)',
          flexShrink: 0,
        }}>
          {([['reclab', '🧭 Rec Lab'], ['contentlab', '🧪 Content Lab']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              style={{
                flex: 1, padding: '10px 6px', fontSize: 11, fontWeight: 600,
                background: rightTab === tab ? 'rgba(0,180,216,0.08)' : 'transparent',
                border: 'none',
                borderBottom: rightTab === tab ? '2px solid var(--glow-blue)' : '2px solid transparent',
                color: rightTab === tab ? 'var(--glow-blue)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Panel content — only the active tab is visible, fills remaining height */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
          {rightTab === 'reclab' && (
            <RecommendationLab
              enabled={recLabEnabled}
              onToggle={() => {
                setRecLabEnabled(v => !v)
                if (recLabEnabled) { setPickPointMode(false); setRecommendationTarget(null) }
              }}
              blueOceanZones={blueOceanZones}
              interpretations={interps}
              userCentroid={userCentroid}
              pickPointMode={pickPointMode}
              onSetPickMode={(active) => {
                setPickPointMode(active)
                // Pin persists until user clicks "Remove Pin" or disables rec lab
              }}
              onRemovePin={() => setRecommendationTarget(null)}
              recommendationTarget={recommendationTarget}
              onPrefillContentLab={(draft) => {
                setContentLabPrefill(draft)
                setContentLabOpen(true)
                setRightTab('contentlab')   // auto-switch to Content Lab tab
              }}
            />
          )}

          {rightTab === 'contentlab' && (
            <ContentLab
              isOpen={contentLabOpen}
              onToggle={() => setContentLabOpen(v => !v)}
              prefillText={contentLabPrefill}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

function LoadingView({ progress, message }: { progress: number; message: string }) {
  const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${5 + (i * 8.1) % 90}%`,
    size: 6 + (i * 7) % 24,
    duration: 8 + (i * 3) % 12,
    delay: (i * 1.5) % 6,
  }))

  return (
    <div className="ocean-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {BUBBLES.map(b => (
          <div key={b.id} className="bubble" style={{ left: b.left, bottom: 0, width: b.size, height: b.size, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }} />
        ))}
      </div>

      <div className="glass glow-blue" style={{ padding: '40px', maxWidth: 420, textAlign: 'center', zIndex: 1 }}>
        <div className="animate-float" style={{ fontSize: 52, marginBottom: 16 }}>🌊</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Mapping the Ocean
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          {message || 'Analyzing the competitive landscape…'}
        </div>
        <div className="ocean-progress-track" style={{ marginBottom: 12 }}>
          <div className="ocean-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--glow-blue)', fontFamily: 'monospace' }}>
          {progress}%
        </div>
        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-dim)' }}>
          Questions evaluated in parallel — faster than traditional sequential analysis
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(0,180,216,0.1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease-out' }} />
      </div>
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 7) return 'var(--score-high)'
  if (score >= 4) return 'var(--score-mid)'
  return 'var(--score-low)'
}

function impactColor(impact: string): string {
  if (impact === 'high') return 'var(--score-low)'
  if (impact === 'medium') return 'var(--score-mid)'
  return 'var(--score-high)'
}
