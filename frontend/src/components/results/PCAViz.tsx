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
      <div className="card p-8 text-center text-text-muted">
        No positioning data available
      </div>
    )
  }

  const userCoord = coords[0]
  const compCoords = coords.slice(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traces: any[] = []

  if (is3D && userCoord.length >= 3) {
    traces.push({
      x: [userCoord[0]],
      y: [userCoord[1]],
      z: [userCoord[2]],
      mode: 'markers',
      type: 'scatter3d',
      name: 'Your Business',
      marker: { size: 12, color: '#7c5cfc', symbol: 'diamond' },
      text: ['Your Business'],
      hovertemplate: '<b>Your Business</b><extra></extra>',
    })
    traces.push({
      x: compCoords.map(c => c[0]),
      y: compCoords.map(c => c[1]),
      z: compCoords.map(c => c[2]),
      mode: 'markers',
      type: 'scatter3d',
      name: 'Competitors',
      marker: { size: 7, color: '#f59e0b', symbol: 'circle' },
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
      marker: { size: 13, color: '#7c5cfc', symbol: 'diamond' },
      text: ['Your Business'],
      hovertemplate: '<b>Your Business</b><extra></extra>',
    })
    traces.push({
      x: compCoords.map(c => c[0]),
      y: compCoords.map(c => c[1]),
      mode: 'markers',
      type: 'scatter',
      name: 'Competitors',
      marker: { size: 8, color: '#f59e0b' },
      text: pcaMeta.slice(1).map(m => m.domain),
      hovertemplate: '<b>%{text}</b><extra></extra>',
    })
  }

  const sharedLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#0d0d10',
    font: { color: '#6e6e80', family: 'DM Mono', size: 11 },
    showlegend: false,
    margin: is3D ? { l: 0, r: 0, t: 20, b: 0 } : { l: 50, r: 20, t: 20, b: 50 },
  }

  const layout = is3D
    ? {
        ...sharedLayout,
        scene: {
          xaxis: { title: interps[0]?.dimension_name || 'PC1', color: '#6e6e80', gridcolor: '#2a2a32' },
          yaxis: { title: interps[1]?.dimension_name || 'PC2', color: '#6e6e80', gridcolor: '#2a2a32' },
          zaxis: { title: interps[2]?.dimension_name || 'PC3', color: '#6e6e80', gridcolor: '#2a2a32' },
          bgcolor: '#0d0d10',
        },
      }
    : {
        ...sharedLayout,
        xaxis: {
          title: { text: interps[0]?.dimension_name || 'PC1', font: { size: 11 } },
          color: '#6e6e80',
          gridcolor: '#2a2a32',
          zerolinecolor: '#2a2a32',
        },
        yaxis: {
          title: { text: interps[1]?.dimension_name || 'PC2', font: { size: 11 } },
          color: '#6e6e80',
          gridcolor: '#2a2a32',
          zerolinecolor: '#2a2a32',
        },
      }

  const domainColors: Record<string, string> = {}
  pcaMeta.slice(1).forEach((m, i) => {
    const hue = (i * 47) % 360
    domainColors[m.domain] = `hsl(${hue}, 60%, 60%)`
  })

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-text-primary">AI Semantic Space</h2>
          <p className="text-text-secondary text-sm mt-0.5">How your content is positioned relative to competitors</p>
        </div>

        {/* 2D / 3D pill tray */}
        <div className="flex p-1 bg-raised rounded-full border border-subtle gap-1">
          {(['2D', '3D'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setIs3D(mode === '3D')}
              className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-all duration-150 ${
                (mode === '3D') === is3D
                  ? 'bg-subtle text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Chart container */}
        <div
          className="flex-1 rounded-2xl overflow-hidden border border-subtle p-2"
          style={{ background: '#0d0d10' }}
        >
          <Suspense
            fallback={
              <div className="h-[460px] flex items-center justify-center text-text-muted text-sm">
                Loading chart...
              </div>
            }
          >
            <Plot
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={traces as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              layout={layout as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '460px' }}
            />
          </Suspense>
        </div>

        {/* Legend panel */}
        <div className="w-44 flex-shrink-0 space-y-1.5">
          <p className="text-2xs uppercase tracking-widest text-text-muted mb-2">Legend</p>
          {/* Your business entry */}
          <div className="flex items-center gap-2 py-1">
            <span className="text-accent text-sm leading-none">♦</span>
            <span className="text-text-primary text-xs font-display font-semibold truncate">Your Business</span>
          </div>
          {/* Competitor entries */}
          {pcaMeta.slice(1).map((m, i) => {
            const hue = (i * 47) % 360
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: `hsl(${hue}, 60%, 60%)` }}
                />
                <span className="text-text-secondary text-xs truncate">{m.domain}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dimension interpretations */}
      {interps.length > 0 && (
        <div>
          <p className="input-label mb-3">Dimension Interpretations</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {interps.map((interp, idx) => (
              <div key={idx} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-sm text-text-primary">{interp.dimension_name}</span>
                  <span className="font-mono text-2xs text-text-muted">
                    {(interp.variance_explained * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed">{interp.explanation}</p>
                <div className="flex justify-between text-2xs text-text-muted pt-1 border-t border-subtle">
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
