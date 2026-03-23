import { getDomainColor, getDomainFish } from './OceanMap'

interface Props {
  domains: string[]            // canonical ordered list — must match OceanMap's ordering
  userBizName: string
  topDomains: string[]
  onHover?: (domain: string | null) => void
  hoveredDomain?: string | null
}

export default function FishLegend({
  domains,
  userBizName,
  topDomains,
  onHover,
  hoveredDomain,
}: Props) {
  const anyHovered = !!hoveredDomain

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* User */}
      <div
        className="glass-light"
        onMouseEnter={() => onHover?.('__user__')}
        onMouseLeave={() => onHover?.(null)}
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          border: hoveredDomain === '__user__'
            ? '1px solid rgba(255,214,10,0.6)'
            : '1px solid rgba(255,214,10,0.3)',
          background: hoveredDomain === '__user__'
            ? 'rgba(255,214,10,0.1)'
            : 'rgba(255,214,10,0.05)',
          transition: 'all 0.2s',
          borderRadius: 8,
          opacity: anyHovered && hoveredDomain !== '__user__' ? 0.45 : 1,
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

      {/* Competitors — same order as OceanMap */}
      {domains.map((domain, i) => {
        const fish = getDomainFish(domain, domains)
        const color = getDomainColor(domain, domains)
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
              background: isHovered ? color.replace(/[\d.]+\)$/, '0.08)') : 'var(--bg-mid)',
              transition: 'all 0.2s',
              borderRadius: 8,
              opacity: anyHovered && !isHovered ? 0.45 : 1,
            }}
          >
            <span style={{ fontSize: 16 }}>{fish}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {domain}
              </div>
              {isTop && (
                <div style={{ fontSize: 9, color: 'var(--score-low)', marginTop: 1 }}>
                  top competitor
                </div>
              )}
            </div>
            {i < 3 && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
