import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Fix, ContentPiece } from '../../api/types'

type ModalContent =
  | { kind: 'fix'; data: Fix }
  | { kind: 'content'; data: ContentPiece }

interface LearnMoreModalProps {
  content: ModalContent
  onClose: () => void
}

function impactBadgeClass(impact: Fix['impact']): string {
  if (impact === 'high') return 'bg-score-low/15 text-score-low border border-score-low/30'
  if (impact === 'medium') return 'bg-score-mid/15 text-score-mid border border-score-mid/30'
  return 'bg-raised text-text-secondary border border-subtle'
}

export function LearnMoreModal({ content, onClose }: LearnMoreModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={content.kind === 'fix' ? content.data.title : content.data.title}
    >
      <div className="relative w-full max-w-lg card p-0 overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-subtle">
          <div className="flex-1 pr-4">
            {content.kind === 'fix' ? (
              <div className="space-y-2">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-display font-semibold uppercase tracking-wider ${impactBadgeClass(content.data.impact)}`}
                >
                  {content.data.impact === 'high'
                    ? 'High Priority'
                    : content.data.impact === 'medium'
                    ? 'Quick Win'
                    : 'Long Term'}
                </span>
                <h2 className="font-display font-bold text-lg text-text-primary leading-snug">
                  {content.data.title}
                </h2>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-2xs font-display font-semibold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                  {content.data.type}
                </span>
                <h2 className="font-display font-bold text-lg text-text-primary leading-snug">
                  {content.data.title}
                </h2>
              </div>
            )}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-raised rounded-md transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {content.kind === 'fix' ? (
            <>
              <div>
                <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Problem</p>
                <p className="text-text-primary text-sm leading-relaxed">{content.data.problem}</p>
              </div>

              <div className="border-l-[3px] border-accent bg-surface rounded-r-lg px-4 py-3">
                <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Recommended Action</p>
                <p className="text-text-primary text-sm leading-relaxed">{content.data.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card-raised p-3">
                  <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">Impact</p>
                  <p className="text-text-primary text-sm font-semibold capitalize">{content.data.impact}</p>
                </div>
                <div className="card-raised p-3">
                  <p className="text-2xs uppercase tracking-widest text-text-muted mb-1">Effort</p>
                  <p className="text-text-primary text-sm font-semibold capitalize">{content.data.effort}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Placement</p>
                <p className="text-text-primary text-sm leading-relaxed">{content.data.placement}</p>
              </div>

              <div>
                <p className="text-2xs uppercase tracking-widest text-text-muted mb-1.5">Suggested Content</p>
                <p className="text-text-primary text-sm leading-relaxed">{content.data.suggested_content}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-subtle">
          <button
            onClick={onClose}
            className="w-full btn-accent py-2.5 text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
