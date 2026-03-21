import { useState } from 'react'
import type { EvalSummary } from '../../api/types'

interface EvaluationTableProps {
  evalData: EvalSummary
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#238636' // green
  if (score >= 5) return '#d29922' // yellow
  return '#da3633' // red
}

function getScoreBadge(score: number): string {
  if (score >= 8) return 'high (8-10)'
  if (score >= 5) return 'medium (5-7)'
  return 'low (0-4)'
}

export function EvaluationTable({ evalData }: EvaluationTableProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const scoreBreakdown = evalData.score_breakdown

  return (
    <div style={{ padding: '20px', width: '100%' }}>
      {/* Score Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#238636', fontSize: '24px', fontWeight: 'bold' }}>
            {scoreBreakdown['high (8-10)']}
          </div>
          <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>High Visibility</div>
        </div>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#d29922', fontSize: '24px', fontWeight: 'bold' }}>
            {scoreBreakdown['medium (5-7)']}
          </div>
          <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>Medium Visibility</div>
        </div>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#da3633', fontSize: '24px', fontWeight: 'bold' }}>
            {scoreBreakdown['low (0-4)']}
          </div>
          <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>Low Visibility</div>
        </div>
      </div>

      {/* Test Results */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          AI Visibility Test Results ({evalData.total_questions} questions)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {evalData.results.map((result, idx) => (
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#c9d1d9', fontSize: '13px', marginBottom: '4px' }}>
                    {result.question}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                      {result.visibility_score.toFixed(1)}
                    </span>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>
                      {getScoreBadge(result.visibility_score)}
                    </span>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>
                      {result.mention_quality}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#8b949e', marginLeft: '12px' }}>
                  {expandedIdx === idx ? '−' : '+'}
                </span>
              </button>

              {expandedIdx === idx && (
                <div style={{ padding: '16px', borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                      Answer Found:
                    </label>
                    <p style={{ color: '#c9d1d9', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      {result.answer}
                    </p>
                  </div>

                  {result.why_low_visibility && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                        Why Low Visibility:
                      </label>
                      <p style={{ color: '#da3633', fontSize: '13px', marginTop: '4px' }}>
                        {result.why_low_visibility}
                      </p>
                    </div>
                  )}

                  <div>
                    <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                      Key Observation:
                    </label>
                    <p style={{ color: '#c9d1d9', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      {result.key_observation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Competitors */}
      <div>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          Top Competitor Domains
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {evalData.top_competitor_domains.map((domain, idx) => (
            <span
              key={idx}
              style={{
                padding: '6px 12px',
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                color: '#c9d1d9',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              {domain}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
