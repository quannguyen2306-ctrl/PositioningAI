import type { BlueOceanOpportunity } from '../../api/types'

interface Props {
  opportunities: BlueOceanOpportunity[]
}

export default function BlueOceanPanel({ opportunities }: Props) {
  if (!opportunities.length) {
    return (
      <div className="glass-light" style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🌊</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          No unclaimed territories detected yet.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 16 }}>🌊</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ocean-unclaimed)' }}>
            Blue Ocean Territories
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Questions no competitor dominates — claim these first
          </div>
        </div>
      </div>

      {opportunities.map((opp, i) => (
        <div
          key={i}
          className={`glass-light ${opp.opportunity_strength === 'high' ? 'animate-unclaimed' : ''}`}
          style={{
            padding: '12px 14px',
            border: opp.opportunity_strength === 'high'
              ? '1px solid rgba(0,245,212,0.35)'
              : '1px solid rgba(0,180,216,0.2)',
            background: opp.opportunity_strength === 'high'
              ? 'rgba(0,245,212,0.04)'
              : 'rgba(0,53,102,0.4)',
            borderRadius: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <p style={{
              fontSize: 12,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.5,
              flex: 1,
            }}>
              {opp.question}
            </p>
            <span
              className={opp.opportunity_strength === 'high' ? 'score-badge-high' : 'score-badge-mid'}
              style={{ flexShrink: 0, fontSize: 9 }}
            >
              {opp.opportunity_strength === 'high' ? 'UNCLAIMED' : 'WEAK'}
            </span>
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 60,
              height: 3,
              borderRadius: 99,
              background: 'rgba(0,180,216,0.15)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(opp.visibility_score / 10) * 100}%`,
                background: 'var(--score-low)',
                borderRadius: 99,
              }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Current score: {opp.visibility_score}/10
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
