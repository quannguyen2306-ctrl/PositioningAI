import type { AnalysisResult } from '../api/types'

function csvEscape(val: string | number): string {
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells: (string | number)[]): string {
  return cells.map(csvEscape).join(',')
}

export function exportCSV(results: AnalysisResult, businessUrl: string): void {
  const { biz, eval: evalData, comp_docs, recs } = results
  const lines: string[] = []

  lines.push(row('PositioningAI Report'))
  lines.push(row(businessUrl))
  lines.push(row(new Date().toISOString()))
  lines.push('')

  lines.push(row('BUSINESS PROFILE'))
  lines.push(row('Name', 'Industry', 'Location', 'Target Audience', 'Unique Value Prop', 'Search Query'))
  lines.push(row(biz.business_name, biz.industry, biz.location, biz.target_audience, biz.unique_value_prop, biz.search_query))
  lines.push('')

  lines.push(row('SCORE SUMMARY'))
  lines.push(row('Metric', 'Value'))
  lines.push(row('Avg Visibility Score', evalData.avg_visibility_score.toFixed(2)))
  lines.push(row('Mention Rate', `${(evalData.mention_rate * 100).toFixed(1)}%`))
  lines.push(row('High (8-10)', evalData.score_breakdown['high (8-10)']))
  lines.push(row('Medium (5-7)', evalData.score_breakdown['medium (5-7)']))
  lines.push(row('Low (0-4)', evalData.score_breakdown['low (0-4)']))
  lines.push(row('Total Questions', evalData.total_questions))
  lines.push('')

  if (biz.products_services.length > 0) {
    lines.push(row('PRODUCTS & SERVICES'))
    biz.products_services.forEach((p) => lines.push(row(p)))
    lines.push('')
  }

  lines.push(row('COMPETITORS'))
  lines.push(row('Domain', 'URL'))
  comp_docs.forEach((c) => lines.push(row(c.domain, c.url)))
  lines.push('')

  lines.push(row('EVALUATION RESULTS'))
  lines.push(row('Question', 'Score', 'Mention Quality', 'Mentioned', 'Key Observation'))
  evalData.results.forEach((r) =>
    lines.push(row(r.question, r.visibility_score, r.mention_quality, r.business_mentioned ? 'Yes' : 'No', r.key_observation))
  )
  lines.push('')

  lines.push(row('RECOMMENDATIONS'))
  lines.push(row('Executive Summary'))
  lines.push(row(recs.executive_summary))
  lines.push('')
  lines.push(row('Positioning Insight'))
  lines.push(row(recs.positioning_insight))
  lines.push('')

  lines.push(row('PRIORITY FIXES'))
  lines.push(row('Title', 'Problem', 'Action', 'Impact', 'Effort'))
  recs.priority_fixes.forEach((f) => lines.push(row(f.title, f.problem, f.action, f.impact, f.effort)))
  lines.push('')

  if (recs.content_to_add.length > 0) {
    lines.push(row('CONTENT TO ADD'))
    lines.push(row('Title', 'Type', 'Placement', 'Suggested Content'))
    recs.content_to_add.forEach((p) => lines.push(row(p.title, p.type, p.placement, p.suggested_content)))
    lines.push('')
  }

  if (recs.topics_to_cover.length > 0) {
    lines.push(row('KEY TOPICS TO COVER'))
    recs.topics_to_cover.forEach((t) => lines.push(row(t)))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `posai-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
