import type { BusinessProfile, CompDoc } from '../../api/types'

interface BusinessCardProps {
  business: BusinessProfile
  competitors: CompDoc[]
}

export function BusinessCard({ business, competitors }: BusinessCardProps) {
  return (
    <div style={{ padding: '20px', width: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#c9d1d9',
            marginBottom: '8px',
          }}
        >
          {business.business_name}
        </h2>
        <p style={{ color: '#8b949e', fontSize: '14px' }}>
          {business.industry} • {business.location}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div>
          <label style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
            Target Audience
          </label>
          <p style={{ color: '#c9d1d9', marginTop: '4px' }}>{business.target_audience}</p>
        </div>

        <div>
          <label style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
            Search Query
          </label>
          <p style={{ color: '#c9d1d9', marginTop: '4px', wordBreak: 'break-word' }}>
            "{business.search_query}"
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
          Value Proposition
        </label>
        <p style={{ color: '#c9d1d9', marginTop: '8px', lineHeight: '1.6' }}>
          {business.unique_value_prop}
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
          Products & Services
        </label>
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {business.products_services.map((product, idx) => (
            <span
              key={idx}
              style={{
                padding: '4px 12px',
                backgroundColor: '#1f6feb',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            >
              {product}
            </span>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
          Competitors Analyzed
        </label>
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {competitors.map((comp, idx) => (
            <a
              key={idx}
              href={comp.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#58a6ff',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '8px',
                backgroundColor: '#0d1117',
                borderRadius: '6px',
                border: '1px solid #30363d',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {comp.domain}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
