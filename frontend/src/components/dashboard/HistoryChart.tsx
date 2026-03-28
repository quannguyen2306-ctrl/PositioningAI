import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SessionRecord } from '../../hooks/useSessionStorage'

export interface HistoryChartProps {
  sessions: SessionRecord[]
}

interface ChartDataPoint {
  date: string
  score: number
  url: string
  timestamp: number
}

const MAX_CHART_SESSIONS = 10
const MAX_URL_LENGTH = 30

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncateUrl(url: string, maxLength: number = MAX_URL_LENGTH): string {
  if (!url || url.length <= maxLength) return url
  return url.slice(0, maxLength - 1) + '…'
}

function transformSessionsToChartData(sessions: SessionRecord[]): ChartDataPoint[] {
  // Keep only the last N sessions to avoid cluttering the chart
  const sliced = sessions.slice(-MAX_CHART_SESSIONS)

  return sliced.map((session) => ({
    date: formatDate(session.timestamp),
    // Handle NaN scores by defaulting to 0
    score: isNaN(session.overallScore) ? 0 : session.overallScore,
    url: truncateUrl(session.businessUrl, MAX_URL_LENGTH),
    timestamp: session.timestamp,
  }))
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: ChartDataPoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  return (
    <div className="bg-card-dark border border-subtle rounded-lg p-3 shadow-lg">
      <p className="text-sm font-mono text-text-primary">
        {data.date}
      </p>
      <p className="text-sm font-mono font-semibold text-accent">
        {data.score.toFixed(1)}/10
      </p>
      <p className="text-xs text-text-muted truncate mt-1">{data.url}</p>
    </div>
  )
}

export function HistoryChart({ sessions }: HistoryChartProps): JSX.Element {
  if (sessions.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-sm text-text-secondary max-w-xs">
          Run more analyses to see your score trend
        </p>
      </div>
    )
  }

  const chartData = transformSessionsToChartData(sessions)

  return (
    <div className="card p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-text-primary">
          Visibility Score Trend
        </h3>
        <p className="text-xs text-text-muted">
          Your GEO performance over time (last 10 analyses)
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
            />
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--data-accent)"
              strokeWidth={2}
              dot={{
                fill: 'var(--data-accent)',
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
              isAnimationActive={true}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
