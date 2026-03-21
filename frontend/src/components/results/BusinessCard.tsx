import type { BusinessProfile, CompDoc } from '../../api/types'

interface BusinessCardProps {
  business: BusinessProfile
  competitors: CompDoc[]
}

export function BusinessCard({ business, competitors }: BusinessCardProps) {
  return (
    <div className="w-full p-5">
      {/* Business Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
          {business.business_name}
        </h2>
        <p className="text-text-muted text-sm">
          {business.industry} • {business.location}
        </p>
      </div>

      {/* Target Audience & Search Query */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="input-label">
            Target Audience
          </label>
          <p className="text-text-primary text-sm mt-1">{business.target_audience}</p>
        </div>

        <div>
          <label className="input-label">
            Search Query
          </label>
          <p className="text-text-primary text-sm mt-1 break-words">
            "{business.search_query}"
          </p>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="mb-6">
        <label className="input-label">
          Value Proposition
        </label>
        <p className="text-text-primary text-sm mt-2 leading-relaxed">
          {business.unique_value_prop}
        </p>
      </div>

      {/* Products & Services */}
      <div className="mb-6">
        <label className="input-label">
          Products & Services
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {business.products_services.map((product, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-accent text-white rounded-full text-xs font-semibold"
            >
              {product}
            </span>
          ))}
        </div>
      </div>

      {/* Competitors Analyzed */}
      <div>
        <label className="input-label">
          Competitors Analyzed
        </label>
        <div className="flex flex-col gap-2 mt-2">
          {competitors.map((comp, idx) => (
            <a
              key={idx}
              href={comp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent px-2 py-2 bg-base border border-subtle rounded text-xs no-underline block overflow-hidden text-ellipsis whitespace-nowrap hover:bg-raised transition-colors"
            >
              {comp.domain}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
