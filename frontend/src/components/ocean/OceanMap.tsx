/**
 * OceanMap — D3-powered territory visualization.
 *
 * Hover architecture:
 *  - Main D3 effect: renders everything at full opacity, attaches data-domain attrs,
 *    mouseenter/mouseleave/click events on Voronoi cells. Does NOT depend on hover state
 *    → no full re-render on hover.
 *  - Hover dimming effect: reads `internalHovered ?? highlightedDomain`, directly updates
 *    SVG element opacities via D3 selectors (fast, no DOM rebuild).
 * Click: shows a floating DomainPanel with semantic territory info and strategy.
 */

import { useRef, useEffect, useMemo, useState } from 'react'
import * as d3 from 'd3'
import type { PcaInterpretation, BlueOceanZone } from '../../api/types'

export interface OceanPoint {
  x: number
  y: number
  source: 'user' | 'competitor'
  domain: string
  text: string
}

interface ClickedInfo {
  domain: string
  isUser: boolean
  isUnclaimed: boolean
  zoneIndex?: number     // only set for unclaimed zones, for consistent labelling
  fish: string
  color: string
  centroidX: number
  centroidY: number
}

interface OceanMapProps {
  points: OceanPoint[]
  interpretations: PcaInterpretation[]
  blueOceanZones: BlueOceanZone[]
  userBizName: string
  highlightedDomain?: string | null
  domains?: string[]           // canonical ordered list from parent — fixes icon mismatch
  contentLabPoints?: OceanPoint[]
  recommendationMode?: boolean // dims competitors, highlights unclaimed zones
  pickPointMode?: boolean      // clicking the map fires onMapClick with data coords
  recommendationTarget?: { x: number; y: number } | null  // shows a target marker
  onMapClick?: (dataX: number, dataY: number) => void
}

const FISH_EMOJIS = ['🦈', '🐡', '🐠', '🦑', '🐙', '🐬', '🦐', '🦀', '🐢', '🐟', '🦞', '🦭']

const COMP_COLORS = [
  'rgba(255,107,107,0.85)', 'rgba(78,205,196,0.85)', 'rgba(199,125,255,0.85)',
  'rgba(255,193,7,0.85)',   'rgba(64,196,255,0.85)',  'rgba(255,145,77,0.85)',
  'rgba(130,217,177,0.85)', 'rgba(255,107,179,0.85)', 'rgba(107,155,255,0.85)',
  'rgba(255,218,130,0.85)',
]
const COMP_FILL_COLORS = [
  'rgba(255,107,107,0.18)', 'rgba(78,205,196,0.18)', 'rgba(199,125,255,0.18)',
  'rgba(255,193,7,0.18)',   'rgba(64,196,255,0.18)',  'rgba(255,145,77,0.18)',
  'rgba(130,217,177,0.18)', 'rgba(255,107,179,0.18)', 'rgba(107,155,255,0.18)',
  'rgba(255,218,130,0.18)',
]

export function getDomainColor(domain: string, domains: string[]): string {
  const idx = domains.indexOf(domain)
  if (idx === -1) return COMP_COLORS[0]
  return COMP_COLORS[idx % COMP_COLORS.length]
}

export function getDomainFish(domain: string, domains: string[]): string {
  const idx = domains.indexOf(domain)
  if (idx === -1) return FISH_EMOJIS[0]
  return FISH_EMOJIS[idx % FISH_EMOJIS.length]
}

// ─── Domain click panel ────────────────────────────────────────────────────────

function axisDescription(value: number, interp: PcaInterpretation): string {
  const strong = Math.abs(value) > 0.3
  if (!strong) return `neutral on "${interp.dimension_name}"`
  const end = value > 0 ? interp.positive_end : interp.negative_end
  return `toward "${end}"`
}

function DomainPanel({
  info,
  userBizName,
  interpretations,
  onClose,
}: {
  info: ClickedInfo
  userBizName: string
  interpretations: PcaInterpretation[]
  onClose: () => void
}) {
  const xi = interpretations[0]
  const yi = interpretations[1]

  const xDesc = xi ? axisDescription(info.centroidX, xi) : null
  const yDesc = yi ? axisDescription(info.centroidY, yi) : null

  let heading = ''
  let bodyLines: string[] = []
  let strategy = ''

  if (info.isUnclaimed) {
    heading = 'BLUE OCEAN OPPORTUNITY'
    bodyLines = [
      xi ? `X-axis: ${xDesc} (${xi.dimension_name})` : '',
      yi ? `Y-axis: ${yDesc} (${yi.dimension_name})` : '',
    ].filter(Boolean)
    strategy = `No business currently claims this semantic space. Publish content bridging ${xi?.positive_end ?? 'this area'} and ${xi?.negative_end ?? ''} to establish first-mover authority before competitors discover it.`
  } else if (info.isUser) {
    heading = 'YOUR CURRENT TERRITORY'
    bodyLines = [
      xi ? `X-axis: ${xDesc}` : '',
      yi ? `Y-axis: ${yDesc}` : '',
    ].filter(Boolean)
    strategy = `This is your claimed semantic space. Use the Content Lab (right panel) to test new content and see how your whale moves toward new territory.`
  } else {
    heading = 'COMPETITOR TERRITORY'
    bodyLines = [
      xi ? `X-axis: ${xDesc}` : '',
      yi ? `Y-axis: ${yDesc}` : '',
    ].filter(Boolean)
    strategy = `To compete here, create content focused on ${xDesc ? `"${xDesc.replace('toward ', '')}"` : 'this topic area'}${yDesc ? ` and "${yDesc.replace('toward ', '')}"` : ''}. Build case studies, guides, and landing pages targeting these themes to pull AI retrieval attention away from this competitor.`
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 36,
      left: 16,
      width: 260,
      background: 'rgba(0,8,20,0.95)',
      border: `1px solid ${info.isUnclaimed ? 'rgba(0,245,212,0.4)' : info.isUser ? 'rgba(255,214,10,0.4)' : info.color.replace('0.85', '0.35')}`,
      borderRadius: 10,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: 20,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: '1px solid rgba(0,180,216,0.1)',
        background: info.isUnclaimed
          ? 'rgba(0,245,212,0.05)'
          : info.isUser
            ? 'rgba(255,214,10,0.05)'
            : 'rgba(0,29,61,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{info.fish}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: info.isUser ? '#ffd60a' : info.isUnclaimed ? '#00f5d4' : info.color }}>
              {info.isUser
                ? userBizName
                : info.isUnclaimed
                  ? `Unclaimed Zone ${(info.zoneIndex ?? 0) + 1}`
                  : info.domain}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 1 }}>
              {info.isUnclaimed ? 'UNCLAIMED ZONE' : info.isUser ? 'YOUR TERRITORY' : 'COMPETITOR'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{heading}</div>
        {bodyLines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {bodyLines.map((line, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '3px 8px', background: 'rgba(0,53,102,0.4)', borderRadius: 4 }}>
                {line}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 5 }}>
          {info.isUnclaimed ? 'HOW TO CLAIM IT' : info.isUser ? 'NEXT STEPS' : 'HOW TO COMPETE HERE'}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {strategy}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OceanMap({
  points,
  interpretations,
  blueOceanZones,
  userBizName,
  highlightedDomain,
  domains: domainsProp,
  contentLabPoints,
  recommendationMode = false,
  pickPointMode = false,
  recommendationTarget,
  onMapClick,
}: OceanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [internalHovered, setInternalHovered] = useState<string | null>(null)
  const [clickedInfo, setClickedInfo] = useState<ClickedInfo | null>(null)

  // Refs for coordinate inversion (pick-point mode)
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const marginRef = useRef({ top: 40, right: 40, bottom: 55, left: 55 })
  const zoomTransformRef = useRef(d3.zoomIdentity)
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick

  // ResizeObserver — redraws when Content Lab opens/closes
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setContainerSize(prev => {
        if (Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2) return prev
        return { width: Math.floor(width), height: Math.floor(height) }
      })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Canonical domain order (insertion order from PCA points)
  const localDomains = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const p of points) {
      if (p.source === 'competitor' && p.domain && !seen.has(p.domain)) {
        seen.add(p.domain)
        list.push(p.domain)
      }
    }
    return list
  }, [points])

  const domains = domainsProp ?? localDomains

  // ── Main D3 render effect ─────────────────────────────────────────────────
  // Does NOT depend on internalHovered / highlightedDomain → no re-render on hover.
  // All elements get data-domain attributes; hover effect updates their opacity.
  useEffect(() => {
    if (!svgRef.current || points.length === 0) return
    if (containerSize.width < 10 || containerSize.height < 10) return

    // Clear stale click panel when data changes
    setClickedInfo(null)

    const width = containerSize.width
    const height = containerSize.height
    const margin = { top: 40, right: 40, bottom: 55, left: 55 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // ── Defs ──────────────────────────────────────────────────────────────────
    const defs = svg.append('defs')

    const bgGrad = defs.append('radialGradient')
      .attr('id', 'ocean-bg-grad').attr('cx', '50%').attr('cy', '40%').attr('r', '70%')
    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#003a6e').attr('stop-opacity', 1)
    bgGrad.append('stop').attr('offset', '50%').attr('stop-color', '#001f45').attr('stop-opacity', 1)
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#000e22').attr('stop-opacity', 1)

    const glowF = defs.append('filter').attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glowF.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    const gm = glowF.append('feMerge')
    gm.append('feMergeNode').attr('in', 'blur')
    gm.append('feMergeNode').attr('in', 'SourceGraphic')

    const goldF = defs.append('filter').attr('id', 'gold-glow')
      .attr('x', '-80%').attr('y', '-80%').attr('width', '360%').attr('height', '360%')
    goldF.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur')
    const ggm = goldF.append('feMerge')
    ggm.append('feMergeNode').attr('in', 'blur')
    ggm.append('feMergeNode').attr('in', 'SourceGraphic')

    const cyanF = defs.append('filter').attr('id', 'cyan-glow')
      .attr('x', '-80%').attr('y', '-80%').attr('width', '360%').attr('height', '360%')
    const cb = cyanF.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur')
    const cf = cyanF.append('feFlood').attr('flood-color', '#00f5d4').attr('flood-opacity', '0.4').attr('result', 'color')
    cyanF.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'colored-blur')
    const cgm = cyanF.append('feMerge')
    cgm.append('feMergeNode').attr('in', 'colored-blur')
    cgm.append('feMergeNode').attr('in', 'SourceGraphic')
    void cb; void cf

    // Arrow marker
    defs.append('marker').attr('id', 'move-arrow')
      .attr('viewBox', '0 -5 10 10').attr('refX', 8).attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#00f5d4')

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#ocean-bg-grad)')

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // ── Scales ────────────────────────────────────────────────────────────────
    const allX = points.map(p => p.x)
    const allY = points.map(p => p.y)
    const xPad = (d3.max(allX)! - d3.min(allX)!) * 0.15 || 1
    const yPad = (d3.max(allY)! - d3.min(allY)!) * 0.15 || 1

    const xScale = d3.scaleLinear()
      .domain([d3.min(allX)! - xPad, d3.max(allX)! + xPad])
      .range([0, innerW])
    const yScale = d3.scaleLinear()
      .domain([d3.min(allY)! - yPad, d3.max(allY)! + yPad])
      .range([innerH, 0])

    // Store for coordinate inversion in pick-point mode
    xScaleRef.current = xScale
    yScaleRef.current = yScale

    // ── Grid ──────────────────────────────────────────────────────────────────
    const gridG = g.append('g')
    gridG.selectAll('.hl').data(yScale.ticks(6)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(0,180,216,0.15)').attr('stroke-width', 0.5)
    gridG.selectAll('.vl').data(xScale.ticks(6)).enter().append('line')
      .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', 'rgba(0,180,216,0.15)').attr('stroke-width', 0.5)

    // ── Voronoi territories ───────────────────────────────────────────────────
    const voronoiPts = points.map(p => [xScale(p.x), yScale(p.y)] as [number, number])
    const delaunay = d3.Delaunay.from(voronoiPts)
    const voronoi = delaunay.voronoi([0, 0, innerW, innerH])

    points.forEach((p, i) => {
      const cell = voronoi.renderCell(i)
      if (!cell) return
      const domainKey = p.source === 'user' ? '__user__' : p.domain
      const domainIdx = domains.indexOf(p.domain)
      const fill = p.source === 'user'
        ? 'rgba(255,214,10,0.12)'
        : COMP_FILL_COLORS[domainIdx % COMP_FILL_COLORS.length]
      const stroke = p.source === 'user' ? 'rgba(255,214,10,0.35)' : 'rgba(0,180,216,0.2)'

      const path = g.append('path').attr('d', cell)
        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 0.8)
        .attr('data-domain', domainKey)
        .style('cursor', 'pointer')

      path.on('mouseenter', () => setInternalHovered(domainKey))
      path.on('mouseleave', () => setInternalHovered(null))
      path.on('click', () => {
        const domPts = points.filter(pt => pt.source === p.source && pt.domain === p.domain)
        const cx = d3.mean(domPts, pt => pt.x)!
        const cy = d3.mean(domPts, pt => pt.y)!
        const fish = p.source === 'user' ? '🐳' : FISH_EMOJIS[domainIdx % FISH_EMOJIS.length]
        const color = p.source === 'user' ? '#ffd60a' : COMP_COLORS[domainIdx % COMP_COLORS.length]
        setClickedInfo(prev => {
          const isSame = prev?.domain === p.domain && prev?.isUser === (p.source === 'user')
          if (isSame) return null
          return { domain: p.domain, isUser: p.source === 'user', isUnclaimed: false, fish, color, centroidX: cx, centroidY: cy }
        })
      })
    })

    // ── Blue ocean zones ──────────────────────────────────────────────────────
    blueOceanZones.forEach((zone, zoneIdx) => {
      const cx = xScale(zone.x)
      const cy = yScale(zone.y)
      const rx = Math.abs(xScale(zone.x + zone.radius) - xScale(zone.x))

      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', rx * 1.4)
        .attr('fill', 'rgba(0,245,212,0.04)')
        .attr('stroke', 'rgba(0,245,212,0.3)').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4').attr('filter', 'url(#cyan-glow)')

      const inner = g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', rx * 0.8)
        .attr('fill', 'rgba(0,245,212,0.07)')
        .attr('stroke', 'rgba(0,245,212,0.6)').attr('stroke-width', 1.5)
        .style('cursor', 'pointer')

      g.append('text').attr('x', cx).attr('y', cy - rx * 0.8 - 8)
        .attr('text-anchor', 'middle').attr('fill', '#00f5d4')
        .attr('font-size', 9).attr('font-weight', '600').attr('letter-spacing', '0.1em')
        .text(`UNCLAIMED ${zoneIdx + 1}`)

      inner.on('click', () => {
        setClickedInfo(prev => {
          if (prev?.isUnclaimed && prev.centroidX === zone.x && prev.centroidY === zone.y) return null
          return { domain: 'Unclaimed Territory', isUser: false, isUnclaimed: true, zoneIndex: zoneIdx, fish: '🌊', color: '#00f5d4', centroidX: zone.x, centroidY: zone.y }
        })
      })
    })

    // ── Competitor dots ───────────────────────────────────────────────────────
    points.filter(p => p.source === 'competitor').forEach(p => {
      const domainIdx = domains.indexOf(p.domain)
      const color = COMP_COLORS[domainIdx % COMP_COLORS.length]
      g.append('circle')
        .attr('cx', xScale(p.x)).attr('cy', yScale(p.y)).attr('r', 5)
        .attr('fill', color).attr('filter', 'url(#glow)')
        .attr('data-domain', p.domain)
        .style('pointer-events', 'none')  // voronoi path handles events
    })

    // ── User content chunk dots ───────────────────────────────────────────────
    const userPoints = points.filter(p => p.source === 'user')
    userPoints.forEach(p => {
      g.append('circle')
        .attr('cx', xScale(p.x)).attr('cy', yScale(p.y)).attr('r', 6)
        .attr('fill', 'rgba(255,214,10,0.8)').attr('filter', 'url(#gold-glow)')
        .attr('data-domain', '__user__')
        .style('pointer-events', 'none')
    })

    // ── Domain centroid fish + label ──────────────────────────────────────────
    domains.forEach((domain, di) => {
      const domainPts = points.filter(p => p.domain === domain)
      if (!domainPts.length) return
      const cx = d3.mean(domainPts, p => xScale(p.x))!
      const cy = d3.mean(domainPts, p => yScale(p.y))!
      const fish = FISH_EMOJIS[di % FISH_EMOJIS.length]
      const color = COMP_COLORS[di % COMP_COLORS.length]

      g.append('text').attr('x', cx).attr('y', cy + 4)
        .attr('text-anchor', 'middle').attr('font-size', 18)
        .attr('data-domain', domain).style('pointer-events', 'none')
        .text(fish)

      g.append('text').attr('x', cx).attr('y', cy + 24)
        .attr('text-anchor', 'middle').attr('fill', color)
        .attr('font-size', 10).attr('font-weight', '600')
        .attr('data-domain', domain).style('pointer-events', 'none')
        .text(domain.length > 16 ? domain.slice(0, 14) + '…' : domain)
    })

    // ── User centroid whale + Content Lab animation ───────────────────────────
    if (userPoints.length) {
      const origUxData = d3.mean(userPoints, p => p.x)!
      const origUyData = d3.mean(userPoints, p => p.y)!
      const ux = xScale(origUxData)
      const uy = yScale(origUyData)

      const labUserPoints = contentLabPoints?.filter(p => p.source === 'user') ?? []
      const hasMovement = labUserPoints.length > 0

      if (hasMovement) {
        g.append('circle').attr('cx', ux).attr('cy', uy).attr('r', 28)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255,214,10,0.2)').attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 3').attr('data-domain', '__user__')
      }

      g.append('circle').attr('cx', ux).attr('cy', uy).attr('r', 28)
        .attr('fill', 'rgba(255,214,10,0.05)')
        .attr('stroke', 'rgba(255,214,10,0.3)').attr('stroke-width', 1)
        .attr('filter', 'url(#gold-glow)').attr('data-domain', '__user__')

      if (hasMovement) {
        const newUxData = d3.mean(labUserPoints, p => p.x)!
        const newUyData = d3.mean(labUserPoints, p => p.y)!
        const lux = xScale(newUxData)
        const luy = yScale(newUyData)

        g.append('line')
          .attr('x1', ux).attr('y1', uy).attr('x2', lux).attr('y2', luy)
          .attr('stroke', '#00f5d4').attr('stroke-width', 2)
          .attr('stroke-dasharray', '6 4').attr('opacity', 0.85)
          .attr('marker-end', 'url(#move-arrow)').attr('data-domain', '__user__')

        g.append('circle').attr('cx', lux).attr('cy', luy).attr('r', 32)
          .attr('fill', 'rgba(0,245,212,0.05)')
          .attr('stroke', 'rgba(0,245,212,0.5)').attr('stroke-width', 1.5)
          .attr('filter', 'url(#cyan-glow)').attr('data-domain', '__user__')

        labUserPoints.forEach(p => {
          g.append('circle')
            .attr('cx', xScale(p.x)).attr('cy', yScale(p.y)).attr('r', 5)
            .attr('fill', 'rgba(0,245,212,0.9)').attr('filter', 'url(#cyan-glow)')
            .attr('data-domain', '__user__').style('pointer-events', 'none')
        })

        const whale = g.append('text')
          .attr('x', ux).attr('y', uy + 6)
          .attr('text-anchor', 'middle').attr('font-size', 22)
          .attr('filter', 'url(#gold-glow)').attr('data-domain', '__user__')
          .style('pointer-events', 'none').text('🐳')

        whale.transition().duration(1400).ease(d3.easeCubicInOut)
          .attr('x', lux).attr('y', luy + 6)

        const nameLabel = g.append('text')
          .attr('x', ux).attr('y', uy + 28)
          .attr('text-anchor', 'middle').attr('fill', '#ffd60a')
          .attr('font-size', 10).attr('font-weight', '700')
          .attr('data-domain', '__user__').style('pointer-events', 'none')
          .text(userBizName.length > 18 ? userBizName.slice(0, 16) + '…' : userBizName)

        nameLabel.transition().duration(1400).ease(d3.easeCubicInOut)
          .attr('x', lux).attr('y', luy + 28)

        // Per-axis delta pills
        const deltaX = newUxData - origUxData
        const deltaY = newUyData - origUyData
        const midX = (ux + lux) / 2
        const midY = (uy + luy) / 2

        if (interpretations.length > 0 && Math.abs(deltaX) > 0.01) {
          const xi = interpretations[0]
          const xDir = deltaX > 0 ? xi.positive_end : xi.negative_end
          const xSign = deltaX > 0 ? '+' : ''
          const xLabel = `${xSign}${deltaX.toFixed(2)} toward ${xDir}`
          const pillX = midX, pillY = midY - 14
          g.append('rect')
            .attr('x', pillX - 80).attr('y', pillY - 12).attr('width', 160).attr('height', 20)
            .attr('rx', 10).attr('fill', 'rgba(0,8,20,0.85)')
            .attr('stroke', 'rgba(0,245,212,0.5)').attr('stroke-width', 1)
            .attr('data-domain', '__user__')
          g.append('text').attr('x', pillX).attr('y', pillY + 2)
            .attr('text-anchor', 'middle').attr('fill', '#00f5d4')
            .attr('font-size', 10).attr('font-weight', '600')
            .attr('data-domain', '__user__').style('pointer-events', 'none')
            .text(xLabel)
        }

        if (interpretations.length > 1 && Math.abs(deltaY) > 0.01) {
          const yi = interpretations[1]
          const yDir = deltaY < 0 ? yi.positive_end : yi.negative_end
          const ySign = deltaY < 0 ? '+' : ''
          const yLabel = `${ySign}${Math.abs(deltaY).toFixed(2)} toward ${yDir}`
          const pillX = midX, pillY = midY + 14
          g.append('rect')
            .attr('x', pillX - 80).attr('y', pillY - 12).attr('width', 160).attr('height', 20)
            .attr('rx', 10).attr('fill', 'rgba(0,8,20,0.85)')
            .attr('stroke', 'rgba(0,180,216,0.5)').attr('stroke-width', 1)
            .attr('data-domain', '__user__')
          g.append('text').attr('x', pillX).attr('y', pillY + 2)
            .attr('text-anchor', 'middle').attr('fill', '#90e0ef')
            .attr('font-size', 10).attr('font-weight', '600')
            .attr('data-domain', '__user__').style('pointer-events', 'none')
            .text(yLabel)
        }

      } else {
        g.append('text')
          .attr('x', ux).attr('y', uy + 6)
          .attr('text-anchor', 'middle').attr('font-size', 22)
          .attr('filter', 'url(#gold-glow)').attr('data-domain', '__user__')
          .style('pointer-events', 'none').text('🐳')

        g.append('text')
          .attr('x', ux).attr('y', uy + 28)
          .attr('text-anchor', 'middle').attr('fill', '#ffd60a')
          .attr('font-size', 10).attr('font-weight', '700')
          .attr('letter-spacing', '0.05em').attr('data-domain', '__user__')
          .style('pointer-events', 'none')
          .text(userBizName.length > 18 ? userBizName.slice(0, 16) + '…' : userBizName)
      }
    }

    // ── Axis labels ───────────────────────────────────────────────────────────
    if (interpretations.length > 0) {
      const xi = interpretations[0]
      const yi = interpretations.length > 1 ? interpretations[1] : null

      g.append('text').attr('x', 0).attr('y', innerH + 38)
        .attr('fill', 'rgba(72,202,228,0.9)').attr('font-size', 11).attr('font-weight', '600')
        .text(`← ${xi.negative_end}`)
      g.append('text').attr('x', innerW).attr('y', innerH + 38)
        .attr('text-anchor', 'end')
        .attr('fill', 'rgba(72,202,228,0.9)').attr('font-size', 11).attr('font-weight', '600')
        .text(`${xi.positive_end} →`)

      if (yi) {
        g.append('text')
          .attr('transform', `translate(-40, ${innerH}) rotate(-90)`)
          .attr('fill', 'rgba(72,202,228,0.9)').attr('font-size', 11).attr('font-weight', '600')
          .text(`← ${yi.negative_end}`)
        g.append('text')
          .attr('transform', `translate(-40, 0) rotate(-90)`)
          .attr('text-anchor', 'end')
          .attr('fill', 'rgba(72,202,228,0.9)').attr('font-size', 11).attr('font-weight', '600')
          .text(`${yi.positive_end} →`)
      }
    }

    // ── Zoom ──────────────────────────────────────────────────────────────────
    // Recommendation target marker
    if (recommendationTarget) {
      const tx = xScale(recommendationTarget.x)
      const ty = yScale(recommendationTarget.y)
      g.append('circle').attr('cx', tx).attr('cy', ty).attr('r', 18)
        .attr('fill', 'rgba(255,100,220,0.12)')
        .attr('stroke', 'rgba(255,100,220,0.7)').attr('stroke-width', 2)
        .attr('stroke-dasharray', '4 3').attr('filter', 'url(#glow)')
      g.append('text').attr('x', tx).attr('y', ty + 5)
        .attr('text-anchor', 'middle').attr('font-size', 18)
        .style('pointer-events', 'none').text('🎯')
      g.append('text').attr('x', tx).attr('y', ty + 26)
        .attr('text-anchor', 'middle').attr('fill', 'rgba(255,100,220,0.9)')
        .attr('font-size', 9).attr('font-weight', '700').attr('letter-spacing', '0.08em')
        .style('pointer-events', 'none').text('TARGET')
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 5])
      .on('zoom', event => {
        zoomTransformRef.current = event.transform
        g.attr('transform',
          `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`)
      })
    svg.call(zoom)

  }, [points, interpretations, blueOceanZones, userBizName, contentLabPoints, domains, containerSize, recommendationTarget])

  // ── Pick-point click effect ───────────────────────────────────────────────
  // Attaches/detaches SVG click → converts to data coordinates via inverted scales.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !pickPointMode) return

    const handle = (event: MouseEvent) => {
      if (!xScaleRef.current || !yScaleRef.current) return
      const rect = svg.getBoundingClientRect()
      const rawX = event.clientX - rect.left
      const rawY = event.clientY - rect.top
      const t = zoomTransformRef.current
      const margin = marginRef.current
      // Invert zoom transform then scale
      const [ix, iy] = t.invert([rawX - margin.left, rawY - margin.top])
      const dataX = xScaleRef.current.invert(ix)
      const dataY = yScaleRef.current.invert(iy)
      onMapClickRef.current?.(dataX, dataY)
    }

    svg.addEventListener('click', handle)
    return () => svg.removeEventListener('click', handle)
  }, [pickPointMode])

  // ── Hover + recommendation dimming effect ────────────────────────────────
  // Fast opacity update — no SVG rebuild.
  useEffect(() => {
    if (!svgRef.current) return
    const effective = internalHovered ?? highlightedDomain ?? null
    const all = d3.select(svgRef.current).selectAll<SVGElement, unknown>('[data-domain]')

    // Recommendation mode: dim all competitors so unclaimed zones stand out
    if (recommendationMode && !effective) {
      all.attr('opacity', function () {
        const d = d3.select(this).attr('data-domain')
        return d === '__user__' ? null : 0.15
      })
      return
    }

    if (!effective) {
      all.attr('opacity', null)
    } else if (effective === '__user__') {
      all.attr('opacity', function () {
        return d3.select(this).attr('data-domain') === '__user__' ? null : 0.08
      })
    } else {
      all.attr('opacity', function () {
        const d = d3.select(this).attr('data-domain')
        return d === effective || d === '__user__' ? null : 0.08
      })
    }
  }, [internalHovered, highlightedDomain, recommendationMode])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: pickPointMode ? 'crosshair' : 'default' }}
      />

      {clickedInfo && (
        <DomainPanel
          info={clickedInfo}
          userBizName={userBizName}
          interpretations={interpretations}
          onClose={() => setClickedInfo(null)}
        />
      )}

      <div style={{
        position: 'absolute', bottom: 8, right: 12,
        fontSize: 10, color: 'rgba(0,180,216,0.4)',
        pointerEvents: 'none',
      }}>
        scroll to zoom · drag to pan · click region for details
      </div>
    </div>
  )
}
