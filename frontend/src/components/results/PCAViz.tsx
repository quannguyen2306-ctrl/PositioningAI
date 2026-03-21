import { useState, lazy, Suspense } from 'react'
import type { PcaInterpretation, PcaMeta } from '../../api/types'

const Plot = lazy(() => import('react-plotly.js').then(m => ({ default: m.default })))

interface PCAVizProps {
  coords: number[][]
  pcaMeta: PcaMeta[]
  interps: PcaInterpretation[]
}

export function PCAViz({ coords, pcaMeta, interps }: PCAVizProps) {
  const [is3D, setIs3D] = useState(false)

  if (!coords || coords.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#8b949e' }}>
        No PCA data available
      </div>
    )
  }

  // Separate user point (first) and competitors (rest)
  const userCoord = coords[0]
  const compCoords = coords.slice(1)

  // Prepare trace data
  const traces = []

  // User point
  if (is3D && userCoord.length >= 3) {
    traces.push({
      x: [userCoord[0]],
      y: [userCoord[1]],
      z: [userCoord[2]],
      mode: 'markers',
      type: 'scatter3d',
      name: 'Your Business',
      marker: { size: 12, color: '#1f6feb', symbol: 'circle' },
      text: ['Your Business'],
      hovertemplate: '<b>Your Business</b><extra></extra>',
    })

    // Competitor points
    traces.push({
      x: compCoords.map(c => c[0]),
      y: compCoords.map(c => c[1]),
      z: compCoords.map(c => c[2]),
      mode: 'markers',
      type: 'scatter3d',
      name: 'Competitors',
      marker: { size: 8, color: '#fb8500', symbol: 'circle' },
      text: pcaMeta.slice(1).map(m => m.domain),
      hovertemplate: '<b>%{text}</b><extra></extra>',
    })
  } else {
    traces.push({
      x: [userCoord[0]],
      y: [userCoord[1]],
      mode: 'markers',
      type: 'scatter',
      name: 'Your Business',
      marker: { size: 12, color: '#1f6feb' },
      text: ['Your Business'],
      hovertemplate: '<b>Your Business</b><extra></extra>',
    })

    traces.push({
      x: compCoords.map(c => c[0]),
      y: compCoords.map(c => c[1]),
      mode: 'markers',
      type: 'scatter',
      name: 'Competitors',
      marker: { size: 8, color: '#fb8500' },
      text: pcaMeta.slice(1).map(m => m.domain),
      hovertemplate: '<b>%{text}</b><extra></extra>',
    })
  }

  const layout = is3D
    ? {
        title: 'Positioning Map (3D PCA)',
        scene: {
          xaxis: { title: interps[0]?.dimension_name || 'PC1' },
          yaxis: { title: interps[1]?.dimension_name || 'PC2' },
          zaxis: { title: interps[2]?.dimension_name || 'PC3' },
          bgcolor: '#0f1117',
        },
        paper_bgcolor: '#0f1117',
        plot_bgcolor: '#161b22',
        font: { color: '#c9d1d9' },
        margin: { l: 0, r: 0, t: 40, b: 0 },
      }
    : {
        title: 'Positioning Map (2D PCA)',
        xaxis: { title: interps[0]?.dimension_name || 'PC1' },
        yaxis: { title: interps[1]?.dimension_name || 'PC2' },
        paper_bgcolor: '#0f1117',
        plot_bgcolor: '#161b22',
        font: { color: '#c9d1d9' },
        margin: { l: 50, r: 20, t: 40, b: 50 },
      }

  return (
    <div style={{ padding: '20px', width: '100%' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#c9d1d9', fontSize: '16px', fontWeight: 'bold' }}>
          Market Positioning
        </h3>
        <button
          onClick={() => setIs3D(!is3D)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#238636',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {is3D ? 'Switch to 2D' : 'Switch to 3D'}
        </button>
      </div>

      <Suspense fallback={<div style={{ color: '#8b949e' }}>Loading chart...</div>}>
        <Plot data={traces} layout={layout} style={{ width: '100%', height: '500px' }} />
      </Suspense>

      {/* Dimension Interpretations */}
      {interps.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ color: '#c9d1d9', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
            Dimension Interpretations
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {interps.map((interp, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#c9d1d9', fontSize: '13px', fontWeight: 'bold' }}>
                    {interp.dimension_name}
                  </span>
                  <span style={{ color: '#8b949e', fontSize: '11px' }}>
                    {(interp.variance_explained * 100).toFixed(1)}% variance
                  </span>
                </div>
                <p style={{ color: '#c9d1d9', fontSize: '12px', marginBottom: '8px', lineHeight: '1.4' }}>
                  {interp.explanation}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8b949e' }}>
                  <span>← {interp.negative_end}</span>
                  <span>{interp.positive_end} →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
