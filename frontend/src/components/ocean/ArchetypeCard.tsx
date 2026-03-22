import type { Archetype } from '../../api/types'

interface Props {
  archetype: Archetype
}

const archetypeColors: Record<string, { border: string; glow: string; bg: string }> = {
  'Invisible Center': {
    border: 'rgba(239,35,60,0.4)',
    glow: 'rgba(239,35,60,0.2)',
    bg: 'rgba(239,35,60,0.05)',
  },
  'Lone Ranger': {
    border: 'rgba(255,179,71,0.4)',
    glow: 'rgba(255,179,71,0.2)',
    bg: 'rgba(255,179,71,0.05)',
  },
  'The Shadow': {
    border: 'rgba(199,125,255,0.4)',
    glow: 'rgba(199,125,255,0.2)',
    bg: 'rgba(199,125,255,0.05)',
  },
  Pioneer: {
    border: 'rgba(0,245,212,0.4)',
    glow: 'rgba(0,245,212,0.2)',
    bg: 'rgba(0,245,212,0.05)',
  },
  Contender: {
    border: 'rgba(0,180,216,0.4)',
    glow: 'rgba(0,180,216,0.2)',
    bg: 'rgba(0,180,216,0.05)',
  },
}

export default function ArchetypeCard({ archetype }: Props) {
  const colors = archetypeColors[archetype.name] ?? archetypeColors['Contender']

  return (
    <div
      className="glass animate-fade-up"
      style={{
        border: `1px solid ${colors.border}`,
        boxShadow: `var(--shadow-2), 0 0 30px ${colors.glow}`,
        background: `${colors.bg}`,
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 26 }} className="animate-float-slow">{archetype.icon}</span>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>
            YOUR ARCHETYPE
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {archetype.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {archetype.tagline}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
        {archetype.description}
      </p>

      <div style={{
        background: 'oklch(0.52 0.07 230 / 0.06)',
        border: '1px solid rgba(0,180,216,0.15)',
        borderRadius: 8,
        padding: '10px 12px',
      }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>
          STRATEGY
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-secondary)', lineHeight: 1.6, margin: 0 }}>
          {archetype.strategy}
        </p>
      </div>

      {archetype.closest_competitor && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          Closest rival: <span style={{ color: 'var(--text-secondary)' }}>{archetype.closest_competitor}</span>
        </div>
      )}
    </div>
  )
}
