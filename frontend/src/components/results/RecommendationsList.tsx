import { useState } from 'react'
import type { Recommendations } from '../../api/types'

interface RecommendationsListProps {
  recs: Recommendations
}

function getImpactColor(impact: 'high' | 'medium' | 'low'): string {
  switch (impact) {
    case 'high':
      return '#da3633'
    case 'medium':
      return '#d29922'
    case 'low':
      return '#238636'
  }
}

export function RecommendationsList({ recs }: RecommendationsListProps) {
  const [expandedFix, setExpandedFix] = useState<number | null>(null)
  const [expandedContent, setExpandedContent] = useState<number | null>(null)

  return (
    <div style={{ padding: '20px', width: '100%' }}>
      {/* Executive Summary */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#1f6feb',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #388bfd',
        }}
      >
        <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
          Executive Summary
        </h3>
        <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.6' }}>
          {recs.executive_summary}
        </p>
      </div>

      {/* Overall Score Meaning */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        <h4 style={{ color: '#c9d1d9', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
          What Your Score Means
        </h4>
        <p style={{ color: '#c9d1d9', fontSize: '13px', lineHeight: '1.6' }}>
          {recs.overall_score_meaning}
        </p>
      </div>

      {/* Positioning Insight */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        <h4 style={{ color: '#c9d1d9', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
          Positioning Insight
        </h4>
        <p style={{ color: '#c9d1d9', fontSize: '13px', lineHeight: '1.6' }}>
          {recs.positioning_insight}
        </p>
      </div>

      {/* Priority Fixes */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          🔧 Priority Fixes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recs.priority_fixes.map((fix, idx) => (
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
                onClick={() => setExpandedFix(expandedFix === idx ? null : idx)}
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
                  <div style={{ color: '#c9d1d9', fontSize: '13px', fontWeight: 'bold' }}>
                    {fix.title}
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: getImpactColor(fix.impact),
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
                    >
                      {fix.impact} impact
                    </span>
                  </div>
                </div>
                <span style={{ color: '#8b949e', marginLeft: '12px' }}>
                  {expandedFix === idx ? '−' : '+'}
                </span>
              </button>

              {expandedFix === idx && (
                <div style={{ padding: '16px', borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                      Problem:
                    </label>
                    <p style={{ color: '#c9d1d9', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      {fix.problem}
                    </p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                      Action:
                    </label>
                    <p style={{ color: '#c9d1d9', fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      {fix.action}
                    </p>
                  </div>
                  <div>
                    <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                      Effort:
                    </label>
                    <p style={{ color: '#c9d1d9', fontSize: '13px', marginTop: '4px' }}>
                      {fix.effort}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content to Add */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          📝 Content to Add
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recs.content_to_add.map((piece, idx) => (
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
                onClick={() => setExpandedContent(expandedContent === idx ? null : idx)}
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
                  <div style={{ color: '#c9d1d9', fontSize: '13px', fontWeight: 'bold' }}>
                    {piece.title}
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#8b949e', fontSize: '11px' }}>Type: {piece.type}</span>
                    <span style={{ color: '#8b949e', fontSize: '11px' }}>Place: {piece.placement}</span>
                  </div>
                </div>
                <span style={{ color: '#8b949e', marginLeft: '12px' }}>
                  {expandedContent === idx ? '−' : '+'}
                </span>
              </button>

              {expandedContent === idx && (
                <div style={{ padding: '16px', borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                  <label style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase' }}>
                    Suggested Content:
                  </label>
                  <pre
                    style={{
                      backgroundColor: '#0f1117',
                      border: '1px solid #30363d',
                      padding: '12px',
                      borderRadius: '6px',
                      color: '#79c0ff',
                      fontSize: '12px',
                      overflow: 'auto',
                      marginTop: '8px',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      lineHeight: '1.4',
                    }}
                  >
                    {piece.suggested_content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Topics to Cover */}
      <div>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
          📚 Key Topics to Cover
        </h3>
        <ol style={{ color: '#c9d1d9', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
          {recs.topics_to_cover.map((topic, idx) => (
            <li key={idx} style={{ marginBottom: '4px' }}>
              {topic}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
