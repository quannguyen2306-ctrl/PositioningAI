import type { Recommendations, Fix, ContentPiece } from '../../api/types'

interface RecommendationsListProps {
  recs: Recommendations
}

function getPriorityLabel(impact: Fix['impact']): string {
  if (impact === 'high') return 'High Priority'
  if (impact === 'medium') return 'Quick Win'
  return 'Long Term'
}

function getPriorityClass(impact: Fix['impact']): string {
  if (impact === 'high') return 'bg-score-low/15 text-score-low border border-score-low/30'
  if (impact === 'medium') return 'bg-score-mid/15 text-score-mid border border-score-mid/30'
  return 'bg-raised text-text-secondary border border-subtle'
}

function FixCard({ fix }: { fix: Fix }) {
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-border-hover transition-colors">
      <span className={`px-2.5 py-1 rounded-full text-2xs font-display font-semibold uppercase tracking-wider w-fit ${getPriorityClass(fix.impact)}`}>
        {getPriorityLabel(fix.impact)}
      </span>
      <div>
        <p className="font-display font-bold text-base text-text-primary leading-snug">{fix.title}</p>
        <p className="text-text-secondary text-sm mt-1.5 leading-relaxed">{fix.problem}</p>
      </div>
      <div className="mt-auto pt-2 border-t border-subtle">
        <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">Action</p>
        <p className="text-text-secondary text-sm leading-relaxed">{fix.action}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xs text-text-muted">
          Effort: <span className="text-text-secondary capitalize">{fix.effort}</span>
        </span>
        <span className="text-accent text-xs font-display font-semibold cursor-pointer hover:underline">
          Learn more →
        </span>
      </div>
    </div>
  )
}

function ContentCard({ piece }: { piece: ContentPiece }) {
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-border-hover transition-colors">
      <span className="px-2.5 py-1 rounded-full text-2xs font-display font-semibold uppercase tracking-wider w-fit bg-accent/15 text-accent border border-accent/30">
        {piece.type}
      </span>
      <div>
        <p className="font-display font-bold text-base text-text-primary leading-snug">{piece.title}</p>
        <p className="text-text-secondary text-sm mt-1.5">Placement: {piece.placement}</p>
      </div>
      <div className="mt-auto pt-2 border-t border-subtle">
        <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Suggested Content</p>
        <p className="text-text-secondary text-sm leading-relaxed line-clamp-3">{piece.suggested_content}</p>
      </div>
      <span className="text-accent text-xs font-display font-semibold cursor-pointer hover:underline w-fit">
        Learn more →
      </span>
    </div>
  )
}

export function RecommendationsList({ recs }: RecommendationsListProps) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="border-l-[3px] border-accent bg-surface rounded-lg px-5 py-4">
        <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Executive Summary</p>
        <p className="text-text-primary text-sm leading-relaxed">{recs.executive_summary}</p>
      </div>

      {/* Positioning Insight */}
      <div className="card px-5 py-4">
        <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Positioning Insight</p>
        <p className="text-text-secondary text-sm leading-relaxed">{recs.positioning_insight}</p>
      </div>

      {/* Priority Fixes */}
      <div>
        <p className="input-label mb-3">Priority Fixes</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recs.priority_fixes.map((fix, idx) => (
            <FixCard key={idx} fix={fix} />
          ))}
        </div>
      </div>

      {/* Content to Add */}
      {recs.content_to_add.length > 0 && (
        <div>
          <p className="input-label mb-3">Content to Add</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.content_to_add.map((piece, idx) => (
              <ContentCard key={idx} piece={piece} />
            ))}
          </div>
        </div>
      )}

      {/* Topics to Cover */}
      {recs.topics_to_cover.length > 0 && (
        <div>
          <p className="input-label mb-3">Key Topics to Cover</p>
          <div className="flex flex-wrap gap-2">
            {recs.topics_to_cover.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-raised border border-subtle rounded-full text-xs text-text-secondary"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
