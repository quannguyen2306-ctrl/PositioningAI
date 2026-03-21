import { LayoutDashboard, BarChart2, Map, Lightbulb, Settings } from 'lucide-react'

export type NavSection = 'overview' | 'evaluation' | 'positioning' | 'recommendations' | 'settings'

interface SidebarProps {
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
  testCount: number
}

const NAV_ITEMS = [
  { id: 'overview' as NavSection, label: 'Overview', icon: LayoutDashboard },
  { id: 'evaluation' as NavSection, label: 'AI Visibility Tests', icon: BarChart2, badge: true },
  { id: 'positioning' as NavSection, label: 'Positioning Map', icon: Map },
  { id: 'recommendations' as NavSection, label: 'Recommendations', icon: Lightbulb },
  { id: 'settings' as NavSection, label: 'Settings', icon: Settings },
]

export function Sidebar({ activeSection, onNavigate, testCount }: SidebarProps) {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-subtle flex flex-col">
      {/* Top Toggle: Current Run / History */}
      <div className="p-4 border-b border-subtle">
        <div className="flex bg-raised rounded-full p-0.5">
          <button className="flex-1 rounded-full px-3 py-1.5 text-xs font-display font-semibold bg-subtle text-text-primary transition-colors">
            Current Run
          </button>
          <button disabled className="flex-1 rounded-full px-3 py-1.5 text-xs font-display font-semibold text-text-secondary cursor-not-allowed opacity-50">
            History
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`nav-item w-full ${activeSection === id ? 'nav-item-active' : ''}`}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span className="flex-1 text-left">{label}</span>
            {badge && testCount > 0 && (
              <span className="bg-accent text-white text-2xs rounded-full px-1.5 py-0.5 leading-none">
                {testCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom: API status indicator */}
      <div className="p-4 border-t border-subtle">
        <div className="flex items-center gap-2 px-3 py-2 bg-raised rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-score-high flex-shrink-0" />
          <span className="text-text-secondary text-xs font-body">Keys active</span>
        </div>
      </div>
    </aside>
  )
}
