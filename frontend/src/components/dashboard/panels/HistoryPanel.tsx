import { Trash2, RotateCcw, Clock } from 'lucide-react'
import type { SessionRecord } from '../../../hooks/useSessionStorage'

interface HistoryPanelProps {
  sessions: SessionRecord[]
  onRestore: (record: SessionRecord) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-score-high'
  if (score >= 5) return 'text-score-mid'
  return 'text-score-low'
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function truncateUrl(url: string, max = 42): string {
  return url.length > max ? url.slice(0, max - 1) + '…' : url
}

export function HistoryPanel({ sessions, onRestore, onDelete, onClearAll }: HistoryPanelProps) {
  const handleDelete = (id: string) => {
    if (window.confirm('Remove this session from history?')) onDelete(id)
  }

  const handleClearAll = () => {
    if (window.confirm('Delete all saved sessions? This cannot be undone.')) onClearAll()
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock size={40} className="text-text-muted mb-4 opacity-40" />
        <h3 className="font-display font-semibold text-text-primary mb-1">No Saved Sessions</h3>
        <p className="text-text-secondary text-sm max-w-xs">
          Complete an analysis to save it here. Sessions are kept for 7 days.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-text-primary">Session History</h2>
        <button
          onClick={handleClearAll}
          className="text-xs font-body text-text-muted hover:text-score-low transition-colors px-2.5 py-1.5 rounded-md hover:bg-score-low/10"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="card-raised p-4 flex flex-col gap-3">
            <div>
              <p className="text-sm font-mono text-text-secondary break-all leading-snug">
                {truncateUrl(s.businessUrl)}
              </p>
              <p className="text-xs text-text-muted mt-1">{formatTs(s.timestamp)}</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className={`font-mono text-xl font-semibold ${scoreColor(s.overallScore)}`}>
                {s.overallScore.toFixed(1)}
              </span>
              <span className="text-xs text-text-muted">/10 visibility</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onRestore(s)}
                className="flex-1 btn-accent py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={12} />
                Restore
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="px-3 py-1.5 rounded-lg text-text-muted hover:text-score-low hover:bg-score-low/10 transition-colors"
                aria-label="Delete session"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
