import { ArrowRight } from 'lucide-react'
import type { AnalysisResult } from '../../../api/types'
import { exportCSV } from '../../../utils/reportExporter'

interface OverviewPanelProps {
  results: AnalysisResult
  businessUrl: string
  onGoToRecommendations: () => void
}

export function OverviewPanel({ results, businessUrl, onGoToRecommendations }: OverviewPanelProps) {
  const { biz, eval: evalData, comp_docs, recs } = results
  const breakdown = evalData.score_breakdown
  const totalQ = evalData.total_questions
  const topFixes = recs.priority_fixes.slice(0, 2)

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Left column — 62% */}
      <div className="flex-[1.6] space-y-5">
        {/* Business Profile header */}
        <div>
          <h2 className="font-display text-xl font-bold text-text-primary">{biz.business_name}</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {biz.industry}
            {biz.location ? ` · ${biz.location}` : ''}
          </p>
        </div>

        {/* Score summary callout */}
        <div className="border-l-[3px] border-accent bg-surface rounded-lg px-5 py-4">
          <p className="text-text-primary text-sm leading-relaxed">{recs.overall_score_meaning}</p>
        </div>

        {/* High / Medium / Low row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-raised p-4 text-center">
            <div className="font-mono text-2xl font-medium text-text-primary">{breakdown['high (8-10)']}</div>
            <div className="text-2xs uppercase tracking-widest text-text-muted mt-1.5">High</div>
            <div className="h-0.5 bg-subtle rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full bg-score-high rounded-full"
                style={{ width: `${(breakdown['high (8-10)'] / totalQ) * 100}%` }}
              />
            </div>
          </div>
          <div className="card-raised p-4 text-center">
            <div className="font-mono text-2xl font-medium text-text-primary">{breakdown['medium (5-7)']}</div>
            <div className="text-2xs uppercase tracking-widest text-text-muted mt-1.5">Medium</div>
            <div className="h-0.5 bg-subtle rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full bg-score-mid rounded-full"
                style={{ width: `${(breakdown['medium (5-7)'] / totalQ) * 100}%` }}
              />
            </div>
          </div>
          <div className="card-raised p-4 text-center">
            <div className="font-mono text-2xl font-medium text-text-primary">{breakdown['low (0-4)']}</div>
            <div className="text-2xs uppercase tracking-widest text-text-muted mt-1.5">Low</div>
            <div className="h-0.5 bg-subtle rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full bg-score-low rounded-full"
                style={{ width: `${(breakdown['low (0-4)'] / totalQ) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Products & Services */}
        {biz.products_services.length > 0 && (
          <div>
            <p className="input-label">Products & Services</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {biz.products_services.map((p) => (
                <span key={p} className="pill">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Competitor chips */}
        <div>
          <p className="input-label">Competitors Analysed</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {comp_docs.map((c) => (
              <a
                key={c.domain}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pill"
              >
                {c.domain}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Right column — 38% */}
      <div className="flex-[1] min-w-0">
        <div
          className="rounded-2xl p-6 h-full"
          style={{ background: 'linear-gradient(135deg, var(--surface-card), var(--surface-sidebar))', borderColor: 'var(--accent-border)', borderWidth: '1px' }}
        >
          <p className="font-display font-bold text-lg text-text-primary mb-4">Top Recommendations</p>
          <div className="space-y-3 mb-6">
            {topFixes.map((fix, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 flex-shrink-0">✦</span>
                <div>
                  <p className="text-text-primary text-sm font-semibold">{fix.title}</p>
                  <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">{fix.problem}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <button
              onClick={onGoToRecommendations}
              className="w-full btn-accent py-2.5 flex items-center justify-center gap-2 text-sm"
            >
              View All Recommendations
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => exportCSV(results, businessUrl)}
              className="w-full py-2.5 rounded-md text-sm font-display font-semibold text-accent transition-colors hover:bg-accent/10"
              style={{ border: '1px solid var(--accent-border)' }}
            >
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
