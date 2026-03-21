import { useState, lazy, Suspense } from 'react'
import type { PcaInterpretation, PcaMeta } from '../../api/types'

const Plot = lazy(() => import('react-plotly.js').then(m => ({ default: m.default })))

interface PCAVizProps {
  coords: number[][]
  pcaMeta: PcaMeta[]
  interps: PcaInterpretation[]
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '6px',
  color: '#c9d1d9',
  fontSize: '12px',
  cursor: 'pointer',
}

const labelStyle: React.CSSProperties = {
  color: '#8b949e',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  marginRight: '6px',
}

export function PCAViz({ coords, pcaMeta, interps }: PCAVizProps) {
  const nComponents = coords[0]?.length ?? 0
  const [xAxis, setXAxis] = useState(0)
  const [yAxis, setYAxis] = useState(1)

  if (!coords || coords.length === 0) {
    return (
      <div className="card p-8 text-center text-text-muted">
        No positioning data available
      </div>
    )
  }

  // Separate by source field (not index) to fix overlap issue
  const userCoords = coords.filter((_, i) => pcaMeta[i]?.source === 'user')
  const compCoords = coords.filter((_, i) => pcaMeta[i]?.source !== 'user')
  const compMeta = pcaMeta.filter(m => m.source !== 'user')

  const axisOptions = Array.from({ length: nComponents }, (_, i) => ({
    value: i,
    label: interps[i]?.dimension_name ? `PC${i + 1}: ${interps[i].dimension_name}` : `PC${i + 1}`,
  }))

  const xInterp = interps[xAxis]
  const yInterp = interps[yAxis]

  const traces: object[] = [
    {
      x: compCoords.map(c => c[xAxis]),
      y: compCoords.map(c => c[yAxis]),
      mode: 'markers',
      type: 'scatter',
      name: 'Competitors',
      marker: { size: 8, color: '#fb8500', opacity: 0.65 },
      text: compMeta.map(m => m.domain),
      hovertemplate: '<b>%{text}</b><extra></extra>',
    },
    {
      x: userCoords.map(c => c[xAxis]),
      y: userCoords.map(c => c[yAxis]),
      mode: 'markers',
      type: 'scatter',
      name: 'Your Business',
      marker: { size: 11, color: '#FFD700', symbol: 'star', line: { width: 1, color: '#8B6914' } },
      hovertemplate: '<b>Your Business</b><extra></extra>',
    },
  ]

  const xTitle = xInterp
    ? `${xInterp.negative_end} ← PC${xAxis + 1} → ${xInterp.positive_end}`
    : `PC${xAxis + 1}`
  const yTitle = yInterp
    ? `${yInterp.negative_end} ← PC${yAxis + 1} → ${yInterp.positive_end}`
    : `PC${yAxis + 1}`

  const layout = {
    xaxis: { title: xTitle, gridcolor: '#21262d', zerolinecolor: '#444', color: '#8b949e' },
    yaxis: { title: yTitle, gridcolor: '#21262d', zerolinecolor: '#444', color: '#8b949e' },
    paper_bgcolor: '#0f1117',
    plot_bgcolor: '#0d1117',
    font: { color: '#c9d1d9' },
    margin: { l: 70, r: 20, t: 16, b: 70 },
    legend: { x: 1.01, y: 1, font: { size: 11 } },
    hovermode: 'closest',
  }

  const selectedInterps = [xInterp, yInterp].filter(Boolean) as PcaInterpretation[]

  return (
    <div style={{ width: '100%' }}>
      {/* Axis selectors */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={labelStyle}>X Axis</span>
          <select
            value={xAxis}
            onChange={e => setXAxis(Number(e.target.value))}
            style={selectStyle}
          >
            {axisOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={labelStyle}>Y Axis</span>
          <select
            value={yAxis}
            onChange={e => setYAxis(Number(e.target.value))}
            style={selectStyle}
          >
            {axisOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>
          {nComponents} components available
        </span>
      </div>

      <Suspense fallback={<div style={{ color: '#8b949e' }}>Loading chart...</div>}>
        <Plot
          data={traces as never}
          layout={layout as never}
          style={{ width: '100%', height: '620px' }}
          config={{ responsive: true }}
        />
      </Suspense>

      {/* Interpretations for selected axes */}
      {selectedInterps.length > 0 && (
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {selectedInterps.map((interp, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#c9d1d9', fontSize: '12px', fontWeight: 'bold' }}>
                  {idx === 0 ? 'X' : 'Y'}: {interp.dimension_name}
                </span>
                <span style={{ color: '#8b949e', fontSize: '11px' }}>
                  {interp.variance_explained}% var
                </span>
              </div>
              <p style={{ color: '#8b949e', fontSize: '11px', margin: '0 0 6px', lineHeight: '1.4' }}>
                {interp.explanation}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#58a6ff' }}>
                <span>← {interp.negative_end}</span>
                <span>{interp.positive_end} →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
