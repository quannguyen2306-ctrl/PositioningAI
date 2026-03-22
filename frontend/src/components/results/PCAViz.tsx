import { useState } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { PcaInterpretation, PcaMeta } from '../../api/types'

interface PCAVizProps {
  coords: number[][]
  pcaMeta: PcaMeta[]
  interps: PcaInterpretation[]
}

interface ScatterPoint {
  x: number
  y: number
  label: string
}

function StarShape({ cx = 0, cy = 0 }: { cx?: number; cy?: number }) {
  const n = 5
  const outer = 9
  const inner = 4
  const points = Array.from({ length: n * 2 }, (_, i) => {
    const angle = (i * Math.PI) / n - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
  return <polygon points={points} fill="var(--accent-purple)" stroke="var(--accent-purple)" strokeWidth={1} filter="drop-shadow(0 0 6px rgba(139, 111, 255, 0.55))" />
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ScatterPoint }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-raised border border-subtle rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-text-primary font-semibold">{d.label}</p>
      <p className="text-text-muted mt-0.5">
        x: {d.x.toFixed(3)} · y: {d.y.toFixed(3)}
      </p>
    </div>
  )
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

  const compMeta = pcaMeta.filter((m) => m.source !== 'user')
  const compData: ScatterPoint[] = coords
    .filter((_, i) => pcaMeta[i]?.source !== 'user')
    .map((c, i) => ({
      x: c[xAxis],
      y: c[yAxis],
      label: compMeta[i]?.domain ?? `Competitor ${i + 1}`,
    }))

  const userData: ScatterPoint[] = coords
    .filter((_, i) => pcaMeta[i]?.source === 'user')
    .map((c) => ({ x: c[xAxis], y: c[yAxis], label: 'Your Business' }))

  const axisOptions = Array.from({ length: nComponents }, (_, i) => ({
    value: i,
    label: interps[i]?.dimension_name ? `PC${i + 1}: ${interps[i].dimension_name}` : `PC${i + 1}`,
  }))

  const xInterp = interps[xAxis]
  const yInterp = interps[yAxis]

  const xLabel = xInterp
    ? `${xInterp.negative_end} ← PC${xAxis + 1} → ${xInterp.positive_end}`
    : `PC${xAxis + 1}`
  const yLabel = yInterp
    ? `${yInterp.negative_end} ← PC${yAxis + 1} → ${yInterp.positive_end}`
    : `PC${yAxis + 1}`

  const selectedInterps = [xInterp, yInterp].filter(Boolean) as PcaInterpretation[]

  return (
    <div className="w-full space-y-4">
      {/* Axis selectors */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-2xs uppercase tracking-widest text-text-muted">X Axis</span>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(Number(e.target.value))}
            className="px-2 py-1 bg-raised border border-subtle rounded-md text-text-primary text-xs cursor-pointer focus:outline-none focus:border-accent"
            aria-label="Select X axis component"
          >
            {axisOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs uppercase tracking-widest text-text-muted">Y Axis</span>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(Number(e.target.value))}
            className="px-2 py-1 bg-raised border border-subtle rounded-md text-text-primary text-xs cursor-pointer focus:outline-none focus:border-accent"
            aria-label="Select Y axis component"
          >
            {axisOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-text-muted text-xs">{nComponents} components available</span>
      </div>

      {/* Chart */}
      <div className="card p-4">
        <ResponsiveContainer width="100%" height={520}>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 56, left: 56 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-elevated)" />
            <XAxis
              dataKey="x"
              type="number"
              name="x"
              stroke="var(--surface-elevated)"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -12, fill: 'var(--text-muted)', fontSize: 10 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name="y"
              stroke="var(--surface-elevated)"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--text-muted)', fontSize: 10 }}
            />
            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-subtle)' }} />
            <Legend
              wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 8 }}
            />
            <Scatter
              name="Competitors"
              data={compData}
              fill="var(--data-amber)"
              fillOpacity={0.7}
            />
            <Scatter
              name="Your Business"
              data={userData}
              fill="var(--accent)"
              shape={<StarShape />}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretations */}
      {selectedInterps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedInterps.map((interp, idx) => (
            <div key={idx} className="card-raised p-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-text-primary text-sm font-semibold">
                  {idx === 0 ? 'X' : 'Y'}: {interp.dimension_name}
                </span>
                <span className="text-text-muted text-xs font-mono">
                  {interp.variance_explained}% var
                </span>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed mb-3">
                {interp.explanation}
              </p>
              <div className="flex justify-between text-xs text-accent">
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
