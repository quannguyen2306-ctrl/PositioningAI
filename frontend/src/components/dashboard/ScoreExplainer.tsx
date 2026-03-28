interface ScoreExplainerProps {
  avgScore: number
  mentionRate: number
  topCompetitors: string[]
  executiveSummary?: string
}

function getExplanationText(
  avgScore: number,
  mentionRate: number,
  competitors: string[],
): string {
  const topTwo = competitors.slice(0, 2)
  const competitorsList = topTwo.length > 0 ? topTwo.join(' and ') : ''
  const scoreStr = avgScore.toFixed(1)
  const mentionRateStr = Math.round(mentionRate)

  if (avgScore >= 8.0) {
    return topTwo.length > 0
      ? `Your business appears prominently in AI answers, outranking key competitors like ${competitorsList}. With a ${scoreStr}/10 visibility score and ${mentionRateStr}% mention rate, you're well-positioned in AI search results.`
      : `Your business appears prominently in AI answers. With a ${scoreStr}/10 visibility score and ${mentionRateStr}% mention rate, you're well-positioned in AI search results.`
  }

  if (avgScore >= 5.0) {
    return topTwo.length > 0
      ? `Your business is mentioned in AI answers, but competition from ${competitorsList} is significant. At ${scoreStr}/10 with ${mentionRateStr}% coverage, targeted improvements could boost your visibility substantially.`
      : `Your business is mentioned in AI answers. At ${scoreStr}/10 with ${mentionRateStr}% coverage, targeted improvements could boost your visibility substantially.`
  }

  return topTwo.length > 0
    ? `Your business appears in fewer AI answers than competitors. The ${scoreStr}/10 score reveals gaps against ${competitorsList}. Our recommendations focus on closing these visibility gaps efficiently.`
    : `Your business appears in fewer AI answers than competitors. The ${scoreStr}/10 score reveals visibility gaps. Our recommendations focus on closing these gaps efficiently.`
}

export default function ScoreExplainer({
  avgScore,
  mentionRate,
  topCompetitors,
}: ScoreExplainerProps) {
  const explanation = getExplanationText(avgScore, mentionRate, topCompetitors)

  return (
    <div className="border-l-[3px] border-[var(--color-secondary)] bg-surface rounded-lg px-5 py-4 mt-4">
      <p className="text-text-primary text-sm leading-relaxed">{explanation}</p>
    </div>
  )
}
