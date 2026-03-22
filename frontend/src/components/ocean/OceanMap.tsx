/**
 * OceanMap — D3-powered territory visualization.
 *
 * Each company's content chunks are plotted as fish in their semantic territory.
 * Voronoi cells show territory ownership. Blue ocean zones glow cyan.
 */

import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { PcaInterpretation, BlueOceanZone } from '../../api/types'

export interface OceanPoint {
  x: number
  y: number
  source: 'user' | 'competitor'
  domain: string
  text: string
}

interface OceanMapProps {
  points: OceanPoint[]
  interpretations: PcaInterpretation[]
  blueOceanZones: BlueOceanZone[]
  userBizName: string
  highlightedDomain?: string | null
  contentLabPoints?: OceanPoint[]  // overlay from Content Lab
}

// Fish emojis assigned round-robin per competitor domain
const FISH_EMOJIS = ['🦈', '🐡', '🐠', '🦑', '🐙', '🐬', '🦐', '🦀', '🐢', '🐟', '🦞', '🦭']

// Bioluminescent competitor colors
const COMP_COLORS = [
  'rgba(255,107,107,0.7)',
  'rgba(78,205,196,0.7)',
  'rgba(199,125,255,0.7)',
  'rgba(255,193,7,0.7)',
  'rgba(64,196,255,0.7)',
  'rgba(255,145,77,0.7)',
  'rgba(130,217,177,0.7)',
  'rgba(255,107,179,0.7)',
  'rgba(107,155,255,0.7)',
  'rgba(255,218,130,0.7)',
]

const COMP_FILL_COLORS = [
  'rgba(255,107,107,0.06)',
  'rgba(78,205,196,0.06)',
  'rgba(199,125,255,0.06)',
  'rgba(255,193,7,0.06)',
  'rgba(64,196,255,0.06)',
  'rgba(255,145,77,0.06)',
  'rgba(130,217,177,0.06)',
  'rgba(255,107,179,0.06)',
  'rgba(107,155,255,0.06)',
  'rgba(255,218,130,0.06)',
]

export function getDomainColor(domain: string, domains: string[]): string {
  const idx = domains.indexOf(domain)
  return COMP_COLORS[idx % COMP_COLORS.length]
}

export function getDomainFish(domain: string, domains: string[]): string {
  const idx = domains.indexOf(domain)
  return FISH_EMOJIS[idx % FISH_EMOJIS.length]
}

export default function OceanMap({
  points,
  interpretations,
  blueOceanZones,
  userBizName,
  highlightedDomain,
  contentLabPoints,
}: OceanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const domains = useMemo(() => {
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

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || points.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600
    const margin = { top: 40, right: 40, bottom: 50, left: 50 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Ocean background gradient
    const defs = svg.append('defs')

    const bgGrad = defs.append('radialGradient')
      .attr('id', 'ocean-bg-grad')
      .attr('cx', '50%').attr('cy', '40%').attr('r', '70%')

    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#001833').attr('stop-opacity', 1)
    bgGrad.append('stop').attr('offset', '60%').attr('stop-color', '#000d1f').attr('stop-opacity', 1)
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#000508').attr('stop-opacity', 1)

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Gold glow for user
    const goldFilter = defs.append('filter').attr('id', 'gold-glow').attr('x', '-80%').attr('y', '-80%').attr('width', '360%').attr('height', '360%')
    goldFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur')
    const goldMerge = goldFilter.append('feMerge')
    goldMerge.append('feMergeNode').attr('in', 'blur')
    goldMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Cyan unclaimed glow
    const cyanFilter = defs.append('filter').attr('id', 'cyan-glow').attr('x', '-80%').attr('y', '-80%').attr('width', '360%').attr('height', '360%')
    const cyanBlur = cyanFilter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur')
    const cyanFlood = cyanFilter.append('feFlood').attr('flood-color', '#00f5d4').attr('flood-opacity', '0.4').attr('result', 'color')
    cyanFilter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'colored-blur')
    const cyanMerge = cyanFilter.append('feMerge')
    cyanMerge.append('feMergeNode').attr('in', 'colored-blur')
    cyanMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    void cyanBlur; void cyanFlood

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#ocean-bg-grad)')

    // Main group with zoom
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
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

    // Subtle grid
    const gridLines = g.append('g').attr('class', 'grid')

    gridLines.selectAll('.h-line')
      .data(yScale.ticks(6))
      .enter().append('line')
      .attr('class', 'h-line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(0,180,216,0.06)').attr('stroke-width', 1)

    gridLines.selectAll('.v-line')
      .data(xScale.ticks(6))
      .enter().append('line')
      .attr('class', 'v-line')
      .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', 'rgba(0,180,216,0.06)').attr('stroke-width', 1)

    // Voronoi for territory fills
    const voronoiPoints = points.map(p => [xScale(p.x), yScale(p.y)] as [number, number])
    const voronoi = d3.Delaunay.from(voronoiPoints).voronoi([0, 0, innerW, innerH])

    // Group points by domain for territory coloring
    const domainGroups = new Map<string, number[]>()
    points.forEach((p, i) => {
      const key = p.source === 'user' ? '__user__' : p.domain
      if (!domainGroups.has(key)) domainGroups.set(key, [])
      domainGroups.get(key)!.push(i)
    })

    // Draw Voronoi cells
    points.forEach((p, i) => {
      const cell = voronoi.renderCell(i)
      if (!cell) return

      const key = p.source === 'user' ? '__user__' : p.domain
      const domainIdx = domains.indexOf(p.domain)

      let fillColor: string
      if (p.source === 'user') {
        fillColor = 'rgba(255,214,10,0.05)'
      } else {
        fillColor = COMP_FILL_COLORS[domainIdx % COMP_FILL_COLORS.length]
      }

      const dimmed = highlightedDomain && p.source === 'competitor' && p.domain !== highlightedDomain

      g.append('path')
        .attr('d', cell)
        .attr('fill', fillColor)
        .attr('stroke', p.source === 'user' ? 'rgba(255,214,10,0.15)' : 'rgba(0,180,216,0.08)')
        .attr('stroke-width', 0.5)
        .attr('opacity', dimmed ? 0.3 : 1)

      void key; void domainGroups
    })

    // Blue ocean unclaimed zones
    blueOceanZones.forEach((zone, i) => {
      const cx = xScale(zone.x)
      const cy = yScale(zone.y)
      const rx = Math.abs(xScale(zone.x + zone.radius) - xScale(zone.x))

      // Pulsing ring
      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', rx * 1.4)
        .attr('fill', 'rgba(0,245,212,0.04)')
        .attr('stroke', 'rgba(0,245,212,0.3)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4')
        .attr('filter', 'url(#cyan-glow)')

      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', rx * 0.8)
        .attr('fill', 'rgba(0,245,212,0.07)')
        .attr('stroke', 'rgba(0,245,212,0.6)')
        .attr('stroke-width', 1.5)

      g.append('text')
        .attr('x', cx).attr('y', cy - rx * 0.8 - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#00f5d4')
        .attr('font-size', 9)
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.1em')
        .text('UNCLAIMED')

      void i
    })

    // Competitor dots
    const compPoints = points.filter(p => p.source === 'competitor')
    compPoints.forEach(p => {
      const cx = xScale(p.x)
      const cy = yScale(p.y)
      const domainIdx = domains.indexOf(p.domain)
      const color = COMP_COLORS[domainIdx % COMP_COLORS.length]
      const dimmed = highlightedDomain && p.domain !== highlightedDomain

      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', 4)
        .attr('fill', color)
        .attr('opacity', dimmed ? 0.2 : 0.7)
        .attr('filter', 'url(#glow)')
    })

    // User chunks
    const userPoints = points.filter(p => p.source === 'user')
    userPoints.forEach(p => {
      const cx = xScale(p.x)
      const cy = yScale(p.y)

      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', 6)
        .attr('fill', 'rgba(255,214,10,0.8)')
        .attr('filter', 'url(#gold-glow)')
    })

    // Content Lab overlay (blue-shifted user points)
    if (contentLabPoints) {
      const labUserPoints = contentLabPoints.filter(p => p.source === 'user')
      labUserPoints.forEach(p => {
        const cx = xScale(p.x)
        const cy = yScale(p.y)

        // Dashed ring to differentiate from original
        g.append('circle')
          .attr('cx', cx).attr('cy', cy).attr('r', 9)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(0,245,212,0.7)')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3 2')

        g.append('circle')
          .attr('cx', cx).attr('cy', cy).attr('r', 5)
          .attr('fill', 'rgba(0,245,212,0.9)')
          .attr('filter', 'url(#cyan-glow)')
      })
    }

    // Domain centroids with fish emoji
    domains.forEach((domain, di) => {
      const domainPts = points.filter(p => p.domain === domain)
      if (!domainPts.length) return

      const cx = d3.mean(domainPts, p => xScale(p.x))!
      const cy = d3.mean(domainPts, p => yScale(p.y))!
      const fish = FISH_EMOJIS[di % FISH_EMOJIS.length]
      const color = COMP_COLORS[di % COMP_COLORS.length]
      const dimmed = highlightedDomain && domain !== highlightedDomain

      g.append('text')
        .attr('x', cx).attr('y', cy + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 18)
        .attr('opacity', dimmed ? 0.2 : 0.9)
        .text(fish)

      // Domain label
      g.append('text')
        .attr('x', cx).attr('y', cy + 22)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', 9)
        .attr('font-weight', '500')
        .attr('opacity', dimmed ? 0.2 : 0.8)
        .text(domain.length > 16 ? domain.slice(0, 14) + '…' : domain)
    })

    // User centroid — whale emoji
    if (userPoints.length) {
      const ux = d3.mean(userPoints, p => xScale(p.x))!
      const uy = d3.mean(userPoints, p => yScale(p.y))!

      // Golden halo
      g.append('circle')
        .attr('cx', ux).attr('cy', uy).attr('r', 28)
        .attr('fill', 'rgba(255,214,10,0.05)')
        .attr('stroke', 'rgba(255,214,10,0.3)')
        .attr('stroke-width', 1)
        .attr('filter', 'url(#gold-glow)')

      g.append('text')
        .attr('x', ux).attr('y', uy + 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', 22)
        .attr('filter', 'url(#gold-glow)')
        .text('🐳')

      g.append('text')
        .attr('x', ux).attr('y', uy + 28)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffd60a')
        .attr('font-size', 10)
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.05em')
        .text(userBizName.length > 18 ? userBizName.slice(0, 16) + '…' : userBizName)
    }

    // Axis labels from PCA interpretations
    if (interpretations.length > 0) {
      const xi = interpretations[0]
      const yi = interpretations.length > 1 ? interpretations[1] : null

      // X-axis labels
      g.append('text')
        .attr('x', 0).attr('y', innerH + 36)
        .attr('fill', 'rgba(0,180,216,0.5)')
        .attr('font-size', 10)
        .text(`← ${xi.negative_end}`)

      g.append('text')
        .attr('x', innerW).attr('y', innerH + 36)
        .attr('text-anchor', 'end')
        .attr('fill', 'rgba(0,180,216,0.5)')
        .attr('font-size', 10)
        .text(`${xi.positive_end} →`)

      // Y-axis labels
      if (yi) {
        g.append('text')
          .attr('transform', `translate(-38, ${innerH}) rotate(-90)`)
          .attr('fill', 'rgba(0,180,216,0.5)')
          .attr('font-size', 10)
          .text(`← ${yi.negative_end}`)

        g.append('text')
          .attr('transform', `translate(-38, 0) rotate(-90)`)
          .attr('text-anchor', 'end')
          .attr('fill', 'rgba(0,180,216,0.5)')
          .attr('font-size', 10)
          .text(`${yi.positive_end} →`)
      }
    }

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`)
      })

    svg.call(zoom)

  }, [points, interpretations, blueOceanZones, userBizName, highlightedDomain, contentLabPoints, domains])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 12,
        fontSize: 10,
        color: 'rgba(0,180,216,0.4)',
      }}>
        scroll to zoom · drag to pan
      </div>
    </div>
  )
}
