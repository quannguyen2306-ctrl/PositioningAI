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
  const [activeTab, setActiveTab] = useState<'business' | 'evaluation' | 'positioning' | 'recommendations'>('business')

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
      // Session ID from URL params but context is empty; might need to reload
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
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px', textAlign: 'center' }}>
            🔍 Analyzing Your Business
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
          padding: '40px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#8b949e' }}>No results available</p>
        </div>
      </div>
    )
  }

  const visibilityScore = results.eval.avg_visibility_score
  const scoreColor = visibilityScore >= 7 ? '#238636' : visibilityScore >= 4 ? '#d29922' : '#da3633'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1117', color: '#c9d1d9' }}>
      {/* Header */}
      <div style={{ padding: '40px 20px', borderBottom: '1px solid #30363d' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
            Analysis Results for {results.biz.business_name}
          </h1>

          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
              }}
            >
              <div style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Visibility Score
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: scoreColor }}>
                {visibilityScore.toFixed(1)}
              </div>
              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>out of 10</div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
              }}
            >
              <div style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Mention Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f6feb' }}>
                {(results.eval.mention_rate * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>of competitors</div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
              }}
            >
              <div style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Competitors
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#79c0ff' }}>
                {results.comp_docs.length}
              </div>
              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>analyzed</div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
              }}
            >
              <div style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Questions
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#79c0ff' }}>
                {results.eval.total_questions}
              </div>
              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>tested</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '20px', borderBottom: '1px solid #30363d', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'business' as const, label: '📋 Business Profile' },
            { id: 'evaluation' as const, label: '🧪 AI Visibility Tests' },
            { id: 'positioning' as const, label: '🗺️ Positioning Map' },
            { id: 'recommendations' as const, label: '🛠️ Recommendations' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: activeTab === tab.id ? '#238636' : '#0d1117',
                color: activeTab === tab.id ? '#fff' : '#c9d1d9',
                border: activeTab === tab.id ? 'none' : '1px solid #30363d',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'business' && <BusinessCard business={results.biz} competitors={results.comp_docs} />}
        {activeTab === 'evaluation' && <EvaluationTable evalData={results.eval} />}
        {activeTab === 'positioning' && (
          <PCAViz coords={results.coords} pcaMeta={results.pca_meta} interps={results.interps} />
        )}
        {activeTab === 'recommendations' && <RecommendationsList recs={results.recs} />}
      </div>
    </div>
  )
}
