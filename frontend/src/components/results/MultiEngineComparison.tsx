import { useState } from 'react'
import type { MultiEngineResult } from '../../api/types'

interface MultiEngineComparisonProps {
  data: MultiEngineResult
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#238636'
  if (score >= 5) return '#d29922'
  return '#da3633'
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

export function MultiEngineComparison({ data }: MultiEngineComparisonProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const availableEngines = data.engines.filter(e => e.available)

  // Get all questions from the first available engine
  const questions = availableEngines.length > 0 ? availableEngines[0].results.map(r => r.question) : []

  return (
    <div style={{ padding: '20px', width: '100%' }}>
      {/* Engine Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(availableEngines.length, 4)}, 1fr)`, gap: '12px', marginBottom: '24px' }}>
        {availableEngines.map(engine => (
          <div
            key={engine.engine}
            style={{
              padding: '20px',
              backgroundColor: '#0d1117',
              border: `1px solid ${engine.engine === data.best_engine ? '#238636' : engine.engine === data.worst_engine ? '#da3633' : '#30363d'}`,
              borderRadius: '8px',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {engine.engine === data.best_engine && availableEngines.length > 1 && (
              <span style={{
                position: 'absolute', top: '8px', right: '8px',
                fontSize: '10px', padding: '2px 6px',
                backgroundColor: '#238636', color: '#fff',
                borderRadius: '4px', fontWeight: 'bold',
              }}>
                BEST
              </span>
            )}
            {engine.engine === data.worst_engine && availableEngines.length > 1 && data.best_engine !== data.worst_engine && (
              <span style={{
                position: 'absolute', top: '8px', right: '8px',
                fontSize: '10px', padding: '2px 6px',
                backgroundColor: '#da3633', color: '#fff',
                borderRadius: '4px', fontWeight: 'bold',
              }}>
                WORST
              </span>
            )}
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c9d1d9', marginBottom: '12px' }}>
              {ENGINE_LABELS[engine.engine] || engine.engine}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: getScoreColor(engine.avg_visibility_score) }}>
              {engine.avg_visibility_score.toFixed(1)}
            </div>
            <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>/ 10 visibility</div>
            <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 'bold', color: '#1f6feb' }}>
              {engine.mention_rate.toFixed(0)}%
            </div>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>mention rate</div>
          </div>
        ))}
      </div>

      {/* Cross-Engine Average */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '8px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div>
          <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase' }}>Cross-Engine Average</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: getScoreColor(data.cross_engine_avg) }}>
            {data.cross_engine_avg.toFixed(1)}<span style={{ fontSize: '13px', color: '#8b949e' }}> / 10</span>
          </div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #30363d', paddingLeft: '16px' }}>
          <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase' }}>Comparison Analysis</span>
          <p style={{ fontSize: '13px', color: '#c9d1d9', marginTop: '4px', lineHeight: '1.5' }}>
            {data.comparison_summary}
          </p>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <div>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          Per-Question Breakdown ({questions.length} questions)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {questions.map((question, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#0d1117',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ color: '#c9d1d9', fontSize: '13px', marginBottom: '8px' }}>
                  {question}
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {availableEngines.map(engine => {
                    const result = engine.results[idx]
                    if (!result) return null
                    return (
                      <div key={engine.engine} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#8b949e' }}>
                          {ENGINE_LABELS[engine.engine] || engine.engine}:
                        </span>
                        <span
                          style={{
                            padding: '2px 6px',
                            backgroundColor: getScoreColor(result.visibility_score),
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          {result.visibility_score}
                        </span>
                        <span style={{ fontSize: '10px', color: '#8b949e' }}>
                          {result.mention_quality}
                        </span>
                      </div>
                    )
                  })}
                  <span style={{ color: '#8b949e', marginLeft: 'auto' }}>
                    {expandedIdx === idx ? '−' : '+'}
                  </span>
                </div>
              </button>

              {expandedIdx === idx && (
                <div style={{ borderTop: '1px solid #30363d' }}>
                  {availableEngines.map(engine => {
                    const result = engine.results[idx]
                    if (!result) return null
                    return (
                      <div
                        key={engine.engine}
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #21262d',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c9d1d9' }}>
                            {ENGINE_LABELS[engine.engine] || engine.engine}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              backgroundColor: getScoreColor(result.visibility_score),
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            {result.visibility_score}/10
                          </span>
                          <span style={{ fontSize: '11px', color: '#8b949e' }}>
                            {result.business_mentioned ? 'Mentioned' : 'Not mentioned'} ({result.mention_quality})
                          </span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                            Response:
                          </label>
                          <p style={{
                            color: '#c9d1d9', fontSize: '12px', marginTop: '4px',
                            lineHeight: '1.5', maxHeight: '150px', overflow: 'auto',
                            backgroundColor: '#161b22', padding: '10px', borderRadius: '6px',
                          }}>
                            {result.answer}
                          </p>
                        </div>
                        {result.key_observation && (
                          <div>
                            <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                              Observation:
                            </label>
                            <p style={{ color: '#58a6ff', fontSize: '12px', marginTop: '4px' }}>
                              {result.key_observation}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
