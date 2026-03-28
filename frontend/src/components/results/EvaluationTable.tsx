import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { EvalSummary } from '../../api/types'

interface EvaluationTableProps {
  evalData: EvalSummary
}

type Filter = 'all' | 'high' | 'low' | 'medium'

function getScoreTier(score: number): Filter {
  if (score >= 8) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}

function ScoreBadge({ score }: { score: number }) {
  const tier = getScoreTier(score)
  const cls =
    tier === 'high'
      ? 'score-badge score-badge-high'
      : tier === 'medium'
      ? 'score-badge score-badge-mid'
      : 'score-badge score-badge-low'
  return <span className={cls}>{score.toFixed(1)}</span>
}

function MiniScoreBar({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-score-high' : score >= 5 ? 'bg-score-mid' : 'bg-score-low'
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 h-2.5 rounded-sm ${i < score ? color : 'bg-subtle'}`}
        />
      ))}
    </div>
  )
}

export function EvaluationTable({ evalData }: EvaluationTableProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const breakdown = evalData.score_breakdown
  const highCount = breakdown['high (8-10)']
  const medCount = breakdown['medium (5-7)']
  const lowCount = breakdown['low (0-4)']

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: evalData.total_questions },
    { id: 'high', label: 'High', count: highCount },
    { id: 'medium', label: 'Medium', count: medCount },
    { id: 'low', label: 'Low', count: lowCount },
  ]

  const filtered = evalData.results.filter(r => {
    if (filter === 'all') return true
    return getScoreTier(r.visibility_score) === filter
  })

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-display font-semibold transition-all duration-150 ${
              filter === f.id
                ? 'bg-accent text-white'
                : 'bg-raised border border-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className="ml-1.5 opacity-70">({f.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Accordion list */}
      <div className="space-y-2">
        {filtered.map((result) => {
          const origIdx = evalData.results.indexOf(result)
          const isOpen = expandedIdx === origIdx
          return (
            <div key={origIdx} className="card overflow-hidden">
              <button
                onClick={() => setExpandedIdx(isOpen ? null : origIdx)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-raised/50 transition-colors"
              >
                <ScoreBadge score={result.visibility_score} />
                <span className="flex-1 text-text-primary text-sm leading-snug">{result.question}</span>
                <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                  <MiniScoreBar score={Math.round(result.visibility_score)} />
                </div>
                <ChevronDown
                  size={16}
                  className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-subtle bg-raised/30 space-y-3">
                  <div>
                    <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">AI Answer Found</p>
                    <p className="text-text-primary text-sm leading-relaxed">{result.answer}</p>
                  </div>

                  {result.why_low_visibility && (
                    <div>
                      <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">Why Low Visibility</p>
                      <p className="text-score-low text-sm leading-relaxed">{result.why_low_visibility}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">Key Observation</p>
                    <p className="text-text-primary text-sm leading-relaxed">{result.key_observation}</p>
                  </div>

                  {result.competitor_domains_mentioned && result.competitor_domains_mentioned.length > 0 && (
                    <div>
                      <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">
                        Competitor Domains Mentioned
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.competitor_domains_mentioned.map((domain, idx) => (
                          <span key={idx} className="text-2xs px-2 py-1 bg-raised border border-subtle text-text-secondary rounded">
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <span className="text-2xs text-text-muted capitalize">
                      Mention: <span className="text-text-secondary">{result.mention_quality}</span>
                    </span>
                    <span className="text-2xs text-text-muted">
                      Your chunks: <span className="font-mono text-text-secondary">{result.user_chunk_count}</span>
                    </span>
                    <span className="text-2xs text-text-muted">
                      Comp chunks: <span className="font-mono text-text-secondary">{result.comp_chunk_count}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Top Competitors */}
      <div className="pt-2">
        <p className="input-label mb-3">Top Competitor Domains</p>
        <div className="flex flex-wrap gap-2">
          {evalData.top_competitor_domains.map((domain, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 bg-raised border border-subtle text-text-primary rounded-full text-xs"
            >
              {domain}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
