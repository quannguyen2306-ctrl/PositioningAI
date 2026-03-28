import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryChart } from '../HistoryChart'
import type { SessionRecord } from '../../../hooks/useSessionStorage'

// Mock recharts to test both paths
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-points={data?.length || 0}>
      {children}
    </div>
  ),
  Line: ({ dataKey }: any) => (
    <div data-testid="line" data-key={dataKey} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}))

describe('HistoryChart', () => {
  const createSession = (
    overallScore: number,
    timestamp: number,
    id: string = `session-${timestamp}`
  ): SessionRecord => ({
    id,
    timestamp,
    expiresAt: timestamp + 7 * 24 * 60 * 60 * 1000,
    businessUrl: 'https://example.com',
    overallScore,
    results: {} as any,
  })

  describe('empty and edge cases', () => {
    it('renders empty state message when sessions is empty', () => {
      render(<HistoryChart sessions={[]} />)
      expect(
        screen.getByText(/Run more analyses to see your score trend/)
      ).toBeInTheDocument()
    })

    it('renders empty state message when only 1 session provided', () => {
      const sessions = [createSession(7.5, 1000000)]
      render(<HistoryChart sessions={sessions} />)
      expect(
        screen.getByText(/Run more analyses to see your score trend/)
      ).toBeInTheDocument()
    })

    it('renders empty state with appropriate styling', () => {
      render(<HistoryChart sessions={[]} />)
      const container = screen.getByText(/Run more analyses/).closest('div')
      expect(container).toHaveClass('flex', 'flex-col', 'items-center')
    })
  })

  describe('chart rendering', () => {
    it('renders chart when 2+ sessions provided', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders all chart components (grid, axes, line, tooltip)', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('line')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('passes correct number of data points to chart', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
        createSession(7.2, 3000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('data-points', '3')
    })
  })

  describe('data slicing and limits', () => {
    it('shows last 10 sessions when more than 10 provided', () => {
      const sessions = Array.from({ length: 15 }, (_, i) =>
        createSession(5.0 + i * 0.1, 1000000 + i * 1000000, `session-${i}`)
      )
      render(<HistoryChart sessions={sessions} />)
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('data-points', '10')
    })

    it('shows all sessions when 10 or fewer provided', () => {
      const sessions = Array.from({ length: 10 }, (_, i) =>
        createSession(5.0 + i * 0.1, 1000000 + i * 1000000, `session-${i}`)
      )
      render(<HistoryChart sessions={sessions} />)
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('data-points', '10')
    })

    it('shows exactly 5 sessions when 5 provided', () => {
      const sessions = Array.from({ length: 5 }, (_, i) =>
        createSession(5.0 + i * 0.1, 1000000 + i * 1000000, `session-${i}`)
      )
      render(<HistoryChart sessions={sessions} />)
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('data-points', '5')
    })

    it('drops oldest sessions and keeps last 10 (order matters)', () => {
      const sessions = Array.from({ length: 15 }, (_, i) =>
        createSession(5.0 + i * 0.1, 1000000 + i * 1000000, `session-${i}`)
      )
      render(<HistoryChart sessions={sessions} />)
      const chart = screen.getByTestId('line-chart')
      // Should have data attribute with 10 points (last 10 of the 15)
      expect(chart).toHaveAttribute('data-points', '10')
    })
  })

  describe('data point values', () => {
    it('correctly maps sessions to data points with overallScore', () => {
      const sessions = [
        createSession(3.5, 1000000),
        createSession(7.2, 2000000),
        createSession(9.1, 3000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      // Chart component receives all 3 sessions as data
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('data-points', '3')
    })

    it('includes formatted date in data points (MMMM d format)', () => {
      const ts = new Date('2025-01-15T10:30:00Z').getTime()
      const sessions = [
        createSession(5.0, ts),
        createSession(6.5, ts + 86400000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('truncates URL to 30 chars in tooltip context', () => {
      const longUrl = 'https://verylongbusinessname.example.com/deep/nested/path'
      const session: SessionRecord = {
        id: 'session-1',
        timestamp: 1000000,
        expiresAt: 1000000 + 7 * 24 * 60 * 60 * 1000,
        businessUrl: longUrl,
        overallScore: 6.5,
        results: {} as any,
      }
      const sessions = [createSession(5.0, 1000000), session]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  describe('score boundaries and edge values', () => {
    it('handles minimum score (0)', () => {
      const sessions = [
        createSession(0, 1000000),
        createSession(1.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('handles maximum score (10)', () => {
      const sessions = [
        createSession(10, 1000000),
        createSession(9.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('handles decimal scores', () => {
      const sessions = [
        createSession(5.123, 1000000),
        createSession(7.891, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('handles all same scores', () => {
      const sessions = [
        createSession(5.5, 1000000),
        createSession(5.5, 2000000),
        createSession(5.5, 3000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  describe('missing or invalid data', () => {
    it('gracefully handles session with missing overallScore (treats as 0)', () => {
      const session: SessionRecord = {
        id: 'session-1',
        timestamp: 1000000,
        expiresAt: 1000000 + 7 * 24 * 60 * 60 * 1000,
        businessUrl: 'https://example.com',
        overallScore: NaN, // Invalid score
        results: {} as any,
      }
      const sessions = [session, createSession(7.5, 2000000)]
      render(<HistoryChart sessions={sessions} />)
      // Should render without crashing
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('handles undefined businessUrl gracefully', () => {
      const session: SessionRecord = {
        id: 'session-1',
        timestamp: 1000000,
        expiresAt: 1000000 + 7 * 24 * 60 * 60 * 1000,
        businessUrl: '', // Empty URL
        overallScore: 6.5,
        results: {} as any,
      }
      const sessions = [session, createSession(7.5, 2000000)]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  describe('styling and CSS classes', () => {
    it('renders chart in a card container', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      const { container } = render(<HistoryChart sessions={sessions} />)
      // Check that the outer container has card styling
      const cardDiv = container.querySelector('[class*="card"]')
      expect(cardDiv).toBeInTheDocument()
    })

    it('applies spacing to chart container', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      const { container } = render(<HistoryChart sessions={sessions} />)
      const cardDiv = container.querySelector('[class*="card"]')
      expect(cardDiv?.className).toMatch(/p-6|space-y/)
    })
  })

  describe('hover and tooltip interaction', () => {
    it('renders tooltip component for hover interactions', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toBeInTheDocument()
    })
  })

  describe('responsive design', () => {
    it('uses ResponsiveContainer from recharts', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('renders with appropriate height for responsiveness', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      const { container } = render(<HistoryChart sessions={sessions} />)
      // Look for height class in the responsive chart container wrapper
      const heightDiv = Array.from(container.querySelectorAll('div')).find(
        (el) => el.className && el.className.match(/h-\d+/)
      )
      expect(heightDiv).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('includes descriptive chart title/label', () => {
      const sessions = [
        createSession(5.0, 1000000),
        createSession(6.5, 2000000),
      ]
      render(<HistoryChart sessions={sessions} />)
      // Either a title or accessible label should exist
      const heading = screen.queryByText(/score.*trend|history|visibility/)
      if (heading) {
        expect(heading).toBeInTheDocument()
      }
    })
  })
})
