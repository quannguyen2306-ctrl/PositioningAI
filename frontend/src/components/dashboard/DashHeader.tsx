import { Eye, ChevronDown, Settings, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../../contexts/AnalysisContext'

interface DashHeaderProps {
  onSettingsClick: () => void
}

export function DashHeader({ onSettingsClick }: DashHeaderProps) {
  const navigate = useNavigate()
  const { results, clearSession } = useAnalysis()

  const handleNewAnalysis = () => {
    clearSession()
    navigate('/')
  }

  return (
    <header className="h-14 bg-surface border-b border-subtle flex items-center justify-between px-5 flex-shrink-0 z-40">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <Eye size={20} className="text-accent" strokeWidth={1.5} />
        <span className="font-display font-bold text-md text-text-primary hidden sm:block">
          LLM Visibility
        </span>
      </div>

      {/* Center: Business name pill */}
      {results && (
        <button
          onClick={handleNewAnalysis}
          className="flex items-center gap-2 bg-raised border border-subtle rounded-full px-3.5 py-1.5 text-sm text-text-primary hover:border-border-hover transition-colors"
        >
          <span className="truncate max-w-[160px] sm:max-w-[240px]">
            {results.biz.business_name}
          </span>
          <ChevronDown size={13} className="text-text-secondary flex-shrink-0" />
        </button>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSettingsClick}
          className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-md hover:bg-raised"
          aria-label="Settings"
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleNewAnalysis}
          className="flex items-center gap-1.5 btn-pill bg-accent text-white text-sm hover:bg-[#6b4ef0] hover:-translate-y-px hover:shadow-accent-glow"
        >
          <Plus size={14} strokeWidth={2} />
          <span className="hidden sm:block">New Analysis</span>
        </button>
      </div>
    </header>
  )
}
