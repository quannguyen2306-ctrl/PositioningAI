import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAnalysis } from '../contexts/AnalysisContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { ProgressBar } from '../components/ProgressBar'
import { BusinessCard } from '../components/results/BusinessCard'
import { EvaluationTable } from '../components/results/EvaluationTable'
import { PCAViz } from '../components/results/PCAViz'
import { RecommendationsList } from '../components/results/RecommendationsList'

export function ResultsPage() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>()
  const { sessionId, results, progress, error, setProgress, setResults, setError } = useAnalysis()
  const [activeTab, setActiveTab] = useState<'evaluation' | 'business' | 'recommendations'>('evaluation')

  const effectiveSessionId = paramSessionId || sessionId
  const isLoading = !results && progress?.status !== 'completed'

  useWebSocket(
    effectiveSessionId || null,
    (event) => setProgress(event),
    (result) => setResults(result),
    (message) => setError(message)
  )

  useEffect(() => {
    if (paramSessionId && !sessionId) {
      console.log('Session ID from URL:', paramSessionId)
    }
  }, [paramSessionId, sessionId])

  if (!results && isLoading && progress) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f1117',
          color: '#c9d1d9',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '32px', textAlign: 'center' }}>
            Analyzing Your Business
          </h1>
          <ProgressBar percent={progress.percent} message={progress.message} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f1117',
          color: '#c9d1d9',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#da3633',
              border: '1px solid #f85149',
              borderRadius: '8px',
              color: '#fff',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              Analysis Failed
            </h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f1117',
          color: '#c9d1d9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#8b949e' }}>No results available</p>
      </div>
    )
  }

  const visibilityScore = results.eval.avg_visibility_score
  const scoreColor = visibilityScore >= 7 ? '#238636' : visibilityScore >= 4 ? '#d29922' : '#da3633'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1117', color: '#c9d1d9' }}>

      {/* ── Compact top bar ── */}
      <div style={{ borderBottom: '1px solid #21262d', padding: '14px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {/* Business name + meta */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              {results.biz.business_name}
            </h1>
            {results.biz.industry && (
              <span style={{ fontSize: '13px', color: '#8b949e' }}>{results.biz.industry}</span>
            )}
            {results.biz.location && (
              <span style={{ fontSize: '12px', color: '#58a6ff', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', padding: '1px 6px' }}>
                {results.biz.location}
              </span>
            )}
          </div>

          {/* 4 stats inline */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: scoreColor }}>{visibilityScore.toFixed(1)}</span>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>/ 10 visibility</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f6feb' }}>{results.eval.mention_rate.toFixed(0)}%</span>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>mention rate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#79c0ff' }}>{results.comp_docs.length}</span>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>competitors</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#79c0ff' }}>{results.eval.total_questions}</span>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>questions tested</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main: Positioning Map ── */}
      <div style={{ borderBottom: '1px solid #21262d', padding: '20px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#c9d1d9' }}>Positioning Map</span>
            <span style={{ fontSize: '11px', color: '#8b949e' }}>— where your business sits in AI semantic space vs competitors</span>
          </div>
          <PCAViz coords={results.coords} pcaMeta={results.pca_meta} interps={results.interps} />
        </div>
      </div>

      {/* ── Tabs for remaining sections ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #21262d', marginBottom: '20px', paddingTop: '16px' }}>
          {[
            { id: 'evaluation' as const, label: 'AI Visibility Tests' },
            { id: 'business' as const, label: 'Business Profile' },
            { id: 'recommendations' as const, label: 'Recommendations' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#c9d1d9' : '#8b949e',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #238636' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ paddingBottom: '40px' }}>
          {activeTab === 'business' && <BusinessCard business={results.biz} competitors={results.comp_docs} />}
          {activeTab === 'evaluation' && <EvaluationTable evalData={results.eval} />}
          {activeTab === 'recommendations' && <RecommendationsList recs={results.recs} />}
        </div>
      </div>
    </div>
  )
}
