import { LayoutDashboard, BarChart2, Map, Lightbulb, Settings, Cpu } from 'lucide-react'

export type NavSection = 'overview' | 'evaluation' | 'positioning' | 'recommendations' | 'engines' | 'settings' | 'history'

interface SidebarProps {
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
  testCount: number
  historyCount: number
  hasEngines?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const BASE_NAV_ITEMS = [
  { id: 'overview' as NavSection, label: 'Overview', icon: LayoutDashboard },
  { id: 'evaluation' as NavSection, label: 'AI Visibility Tests', icon: BarChart2, badge: true },
  { id: 'positioning' as NavSection, label: 'Positioning Map', icon: Map },
  { id: 'recommendations' as NavSection, label: 'Recommendations', icon: Lightbulb },
]

const ENGINES_NAV_ITEM = { id: 'engines' as NavSection, label: 'AI Engine Comparison', icon: Cpu }

const BOTTOM_NAV_ITEMS = [
  { id: 'settings' as NavSection, label: 'Settings', icon: Settings },
]

export function Sidebar({ activeSection, onNavigate, testCount, historyCount, hasEngines, mobileOpen, onMobileClose }: SidebarProps) {
  const NAV_ITEMS = hasEngines
    ? [...BASE_NAV_ITEMS, ENGINES_NAV_ITEM, ...BOTTOM_NAV_ITEMS]
    : [...BASE_NAV_ITEMS, ...BOTTOM_NAV_ITEMS]
  const showingHistory = activeSection === 'history'

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-[220px] flex-shrink-0 bg-surface border-r border-subtle flex flex-col
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          md:static md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Main navigation"
      >
      {/* Top Toggle: Current Run / History */}
      <div className="p-4 border-b border-subtle">
        <div className="flex gap-0.5 bg-raised rounded-full p-0.5">
          <button
            onClick={() => { onNavigate('overview'); onMobileClose?.() }}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-display font-semibold transition-colors ${
              !showingHistory ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Current Run
          </button>
          <button
            onClick={() => { onNavigate('history'); onMobileClose?.() }}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-display font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              showingHistory ? 'bg-raised text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            History
            {historyCount > 0 && (
              <span className="bg-white/20 text-white text-2xs rounded-full px-1.5 leading-none py-0.5">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5" aria-label="Main navigation">
        <p className="px-4 mb-1 text-2xs font-display font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Navigation
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => {
              onNavigate(id)
              if (onMobileClose) onMobileClose()
            }}
            className={`nav-item w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeSection === id ? 'nav-item-active' : ''}`}
            aria-current={activeSection === id ? 'page' : undefined}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span className="flex-1 text-left">{label}</span>
            {badge && testCount > 0 && (
              <span className="bg-accent-wash text-accent text-2xs rounded-full px-1.5 py-0.5 leading-none">
                {testCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom: API status indicator */}
      <div className="px-4 py-3 border-t border-subtle">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-data-teal flex-shrink-0" />
          <span className="text-text-secondary text-xs font-body">Keys active</span>
        </div>
      </div>
    </aside>
    </>
  )
}
