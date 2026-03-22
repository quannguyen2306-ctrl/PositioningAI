import { useState } from 'react'
import type { Recommendations, Fix, ContentPiece } from '../../api/types'
import { LearnMoreModal } from '../modals/LearnMoreModal'

type ModalContent =
  | { kind: 'fix'; data: Fix }
  | { kind: 'content'; data: ContentPiece }

interface RecommendationsListProps {
  recs: Recommendations
}

function getPriorityLabel(impact: Fix['impact']): string {
  if (impact === 'high') return 'High Priority'
  if (impact === 'medium') return 'Quick Win'
  return 'Long Term'
}

function getPriorityClass(impact: Fix['impact']): string {
  if (impact === 'high') return 'bg-raised text-text-secondary border border-subtle'
  if (impact === 'medium') return 'bg-raised text-text-secondary border border-subtle'
  return 'bg-raised text-text-secondary border border-subtle'
}

function FixCard({ fix, onLearnMore }: { fix: Fix; onLearnMore: (item: ModalContent) => void }) {
  return (
    <div className="card p-5 flex flex-col gap-3 transition-colors">
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
        <button onClick={() => onLearnMore({ kind: 'fix', data: fix })} className="text-accent text-xs font-display font-semibold hover:underline focus:outline-none">
          Learn more →
        </button>
      </div>
    </div>
  )
}

function ContentCard({ piece, onLearnMore }: { piece: ContentPiece; onLearnMore: (item: ModalContent) => void }) {
  return (
    <div className="card p-5 flex flex-col gap-3 transition-colors">
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
      <button onClick={() => onLearnMore({ kind: 'content', data: piece })} className="text-accent text-xs font-display font-semibold hover:underline focus:outline-none w-fit">
        Learn more →
      </button>
    </div>
  )
}

export function RecommendationsList({ recs }: RecommendationsListProps) {
  const [selectedItem, setSelectedItem] = useState<ModalContent | null>(null)

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
            <FixCard key={idx} fix={fix} onLearnMore={setSelectedItem} />
          ))}
        </div>
      </div>

      {/* Content to Add */}
      {recs.content_to_add.length > 0 && (
        <div>
          <p className="input-label mb-3">Content to Add</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.content_to_add.map((piece, idx) => (
              <ContentCard key={idx} piece={piece} onLearnMore={setSelectedItem} />
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
                className="pill"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedItem && <LearnMoreModal content={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  )
}
