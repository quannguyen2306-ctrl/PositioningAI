import { useEffect, useState } from 'react'

interface ScoreRingProps {
  score: number
}

function ScoreRing({ score }: ScoreRingProps) {
  const [animated, setAnimated] = useState(false)
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 10) * circumference
  const color = score >= 7 ? 'var(--data-teal)' : score >= 4 ? 'var(--data-amber)' : 'var(--data-red)'

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative flex items-center justify-center" style={{ width: 86, height: 86 }}>
      <svg width="86" height="86" className="absolute -rotate-90">
        <circle cx="43" cy="43" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
        <circle
          cx="43"
          cy="43"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <span className="font-mono text-xl font-light text-text-primary z-10">{score.toFixed(1)}</span>
    </div>
  )
}

interface HeroMetricsProps {
  avgScore: number
  mentionRate: number
  highCount: number
  competitorCount: number
}

export function HeroMetrics({ avgScore, mentionRate, highCount, competitorCount }: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 border-b border-subtle">
      {/* Overall Score */}
      <div className="card p-5 flex flex-col items-start gap-3 animate-fade-up-1">
        <span className="text-2xs uppercase tracking-widest text-text-muted">Overall Score</span>
        <ScoreRing score={avgScore} />
        <span className="text-2xs text-text-muted">out of 10</span>
      </div>

      {/* Test Coverage */}
      <div className="card p-5 flex flex-col gap-3 animate-fade-up-2">
        <span className="text-2xs uppercase tracking-widest text-text-muted">Test Coverage</span>
        <span className="font-mono text-4xl font-light text-text-primary leading-none">
          {mentionRate.toFixed(0)}%
        </span>
        <div className="h-1 bg-subtle rounded-full overflow-hidden w-full">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700"
            style={{ width: `${mentionRate}%` }}
          />
        </div>
      </div>

      {/* High Visibility */}
      <div className="card p-5 flex flex-col gap-3 animate-fade-up-3">
        <span className="text-2xs uppercase tracking-widest text-text-muted">High Visibility</span>
        <span className="font-mono text-4xl font-light text-text-primary leading-none">{highCount}</span>
        <span className="score-badge score-badge-high w-fit">▲ {highCount} questions</span>
      </div>

      {/* Competitors */}
      <div className="card p-5 flex flex-col gap-3 animate-fade-up-4">
        <span className="text-2xs uppercase tracking-widest text-text-muted">Competitors</span>
        <span className="font-mono text-4xl font-light text-text-primary leading-none">{competitorCount}</span>
        <span className="score-badge bg-raised text-text-secondary">
          {competitorCount} analysed
        </span>
      </div>
    </div>
  )
}
