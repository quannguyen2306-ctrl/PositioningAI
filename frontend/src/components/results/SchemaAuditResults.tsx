import { CheckCircle2, XCircle } from 'lucide-react'
import type { SchemaAuditResult } from '../../api/types'

interface SchemaAuditResultsProps {
  audit: SchemaAuditResult
}

function getCompletenessColor(completeness: number): string {
  if (completeness >= 0.8) return 'score-high'
  if (completeness >= 0.5) return 'score-mid'
  return 'score-low'
}

export function SchemaAuditResults({ audit }: SchemaAuditResultsProps) {
  const completenessPercent = Math.round(audit.overall_completeness * 100)
  const completenessColor = getCompletenessColor(audit.overall_completeness)
  const hasSchemas = audit.schemas_found.length > 0
  const hasRecommendations = audit.recommendations.length > 0

  return (
    <div className="space-y-5">
      {/* Header and completeness bar */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Schema Markup Audit</h3>
          <p className="text-2xs text-text-muted">Structured data coverage analysis</p>
        </div>

        {/* Completeness bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-text-secondary">Overall Completeness</span>
            <span className={`text-sm font-bold ${completenessColor}`}>
              {completenessPercent}% complete
            </span>
          </div>
          <div className="h-2 bg-raised rounded-full overflow-hidden">
            <div
              data-testid="completeness-bar"
              className={`h-full transition-all duration-700 ${completenessColor}`}
              style={{ width: `${completenessPercent}%`, backgroundColor: `var(--${completenessColor})` }}
            />
          </div>
        </div>
      </div>

      {/* Schema cards */}
      {hasSchemas ? (
        <div>
          <div data-testid="schema-cards-container" className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {audit.schemas_found.map((schema) => (
              <div
                key={schema.schema_type}
                className="card p-4 flex flex-col gap-2"
                style={{
                  borderColor: schema.found ? 'rgba(0, 217, 163, 0.2)' : 'rgba(239, 35, 60, 0.2)',
                  borderWidth: '1px',
                }}
              >
                {/* Schema type name and icon */}
                <div className="flex items-start gap-2">
                  {schema.found ? (
                    <CheckCircle2
                      size={16}
                      className="text-score-high flex-shrink-0 mt-0.5"
                      data-testid={`schema-found-${schema.schema_type}`}
                    />
                  ) : (
                    <XCircle
                      size={16}
                      className="text-score-low flex-shrink-0 mt-0.5"
                      data-testid={`schema-not-found-${schema.schema_type}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {schema.schema_type}
                    </p>
                  </div>
                </div>

                {/* Field count (only if found) */}
                {schema.found && schema.field_count > 0 && (
                  <p className="text-2xs text-text-muted">
                    {schema.field_count} fields
                  </p>
                )}

                {/* Missing fields (only if found but has missing fields) */}
                {schema.found && schema.missing_fields.length > 0 && (
                  <p className="text-2xs text-score-low">
                    Missing: {schema.missing_fields.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center">
          <p className="text-sm text-text-muted">No structured data found</p>
          <p className="text-2xs text-text-dim mt-1">Add schema markup to improve AI visibility</p>
        </div>
      )}

      {/* Recommendations section */}
      {hasRecommendations && (
        <div className="space-y-2">
          <p className="input-label">Recommendations</p>
          <div className="card p-4 space-y-2">
            {audit.recommendations.map((rec, idx) => (
              <div key={idx} className="flex gap-2 text-sm">
                <span className="text-text-secondary flex-shrink-0">•</span>
                <span className="text-text-primary">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
