import type { CompDoc } from '../../api/types'
import { getDomainColor, getDomainFish } from './OceanMap'

interface Props {
  compDocs: CompDoc[]
  userBizName: string
  topDomains: string[]
  onHover?: (domain: string | null) => void
  hoveredDomain?: string | null
}

export default function FishLegend({
  compDocs,
  userBizName,
  topDomains,
  onHover,
  hoveredDomain,
}: Props) {
  const domains = compDocs.map(d => d.domain).filter(Boolean)
  const uniqueDomains = [...new Set(domains)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* User */}
      <div
        className="glass-light"
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: '1px solid rgba(255,214,10,0.3)',
          background: 'rgba(255,214,10,0.05)',
        }}
      >
        <span style={{ fontSize: 18 }}>🐳</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd60a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userBizName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Your business</div>
        </div>
      </div>

      {/* Competitors */}
      {uniqueDomains.map((domain, i) => {
        const fish = getDomainFish(domain, uniqueDomains)
        const color = getDomainColor(domain, uniqueDomains)
        const isTop = topDomains.includes(domain)
        const isHovered = hoveredDomain === domain

        return (
          <div
            key={domain}
            className="glass-light"
            onMouseEnter={() => onHover?.(domain)}
            onMouseLeave={() => onHover?.(null)}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              border: isHovered ? `1px solid ${color}` : '1px solid transparent',
              background: isHovered ? `${color.replace('0.7', '0.08')}` : 'rgba(0,29,61,0.4)',
              transition: 'all 0.2s',
              borderRadius: 8,
              opacity: hoveredDomain && !isHovered ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 16 }}>{fish}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 11,
                color,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {domain}
              </div>
              {isTop && (
                <div style={{ fontSize: 9, color: 'var(--score-low)', marginTop: 1 }}>
                  top competitor
                </div>
              )}
            </div>
            {i < 3 && (
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
