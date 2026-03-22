import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useAnalysis } from '../contexts/AnalysisContext'
import type { SessionRecord } from '../contexts/AnalysisContext'
import { DashHeader } from '../components/dashboard/DashHeader'
import { Sidebar } from '../components/dashboard/Sidebar'
import { HeroMetrics } from '../components/dashboard/HeroMetrics'
import { OverviewPanel } from '../components/dashboard/panels/OverviewPanel'
import { SettingsPanel } from '../components/dashboard/panels/SettingsPanel'
import { HistoryPanel } from '../components/dashboard/panels/HistoryPanel'
import { EvaluationTable } from '../components/results/EvaluationTable'
import { PCAViz } from '../components/results/PCAViz'
import { RecommendationsList } from '../components/results/RecommendationsList'
import type { NavSection } from '../components/dashboard/Sidebar'

export function ResultsPage() {
  const { results, progress, error, sessionHistory, restoreSession, deleteSession, clearAllSessions, analysisRequest } = useAnalysis()
  const [activeSection, setActiveSection] = useState<NavSection>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleRestoreSession = (record: SessionRecord) => {
    restoreSession(record)
    setActiveSection('overview')
  }

  const isLoading = !results && progress?.status !== 'completed'

  // Loading state — analysis in progress
  if (!results && isLoading) {
    return (
      <div className="min-h-screen bg-base text-text-primary flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="card p-8 relative overflow-hidden">
            {/* Sweep bar at bottom of card */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-subtle overflow-hidden rounded-b-2xl">
              <div className="h-full w-1/3 bg-accent rounded-full animate-sweep" />
            </div>

            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-accent rounded-full blur-2xl opacity-20 animate-pulse" />
                <Eye size={36} className="text-accent relative z-10" strokeWidth={1.5} />
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-text-primary mb-1">
                  Analysing Your Business
                </h2>
                <p className="text-text-secondary text-sm">
                  {progress?.message || 'Connecting to analysis pipeline...'}
                </p>
              </div>

              {progress && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Progress</span>
                    <span className="font-mono">{progress.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-base text-text-primary flex items-center justify-center px-5">
        <div className="w-full max-w-lg">
          <div className="bg-score-low/10 border border-score-low rounded-2xl px-6 py-5">
            <h2 className="font-display font-bold text-lg text-score-low mb-2">Analysis Failed</h2>
            <p className="text-text-secondary text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // No results (shouldn't happen normally)
  if (!results) {
    return (
      <div className="min-h-screen bg-base text-text-primary flex items-center justify-center">
        <p className="text-text-muted">No results available</p>
      </div>
    )
  }

  const visibilityScore = results.eval.avg_visibility_score
  const mentionRate = results.eval.mention_rate
  const highCount = results.eval.score_breakdown['high (8-10)']
  const competitorCount = results.comp_docs.length

  return (
    <div className="flex flex-col h-screen bg-base animate-fade-up">
      <DashHeader
        onSettingsClick={() => setActiveSection('settings')}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onNavigate={(s) => {
            setActiveSection(s)
            setSidebarOpen(false)
          }}
          testCount={results.eval.total_questions}
          historyCount={sessionHistory.length}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto">
          <HeroMetrics
            avgScore={visibilityScore}
            mentionRate={mentionRate}
            highCount={highCount}
            competitorCount={competitorCount}
          />

          {/* Content panel — key triggers re-mount + fade-in on section switch */}
          <div key={activeSection} className="p-5 section-panel">
            {activeSection === 'overview' && (
              <OverviewPanel
                results={results}
                businessUrl={analysisRequest?.url ?? ''}
                onGoToRecommendations={() => setActiveSection('recommendations')}
              />
            )}
            {activeSection === 'evaluation' && (
              <EvaluationTable evalData={results.eval} />
            )}
            {activeSection === 'positioning' && (
              <PCAViz
                coords={results.coords}
                pcaMeta={results.pca_meta}
                interps={results.interps}
              />
            )}
            {activeSection === 'recommendations' && (
              <RecommendationsList recs={results.recs} />
            )}
            {activeSection === 'settings' && <SettingsPanel />}
            {activeSection === 'history' && (
              <HistoryPanel
                sessions={sessionHistory}
                onRestore={handleRestoreSession}
                onDelete={deleteSession}
                onClearAll={clearAllSessions}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
