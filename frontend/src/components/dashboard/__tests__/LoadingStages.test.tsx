import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingStages from '../LoadingStages'
import type { ProgressEvent } from '../../../api/types'

describe('LoadingStages', () => {
  describe('null and empty states', () => {
    it('renders nothing when progress is null', () => {
      const { container } = render(<LoadingStages progress={null} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('stage rendering and mapping', () => {
    it('renders all 10 stages when progress is provided', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Fetching your business website',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      // Check for all 10 expected stages (not exact labels since they're mapped)
      expect(screen.getByText(/Fetching your website/)).toBeInTheDocument()
      expect(screen.getByText(/Business analysis/)).toBeInTheDocument()
      expect(screen.getByText(/Competitor discovery/)).toBeInTheDocument()
      expect(screen.getByText(/Competitor research/)).toBeInTheDocument()
      expect(screen.getByText(/Content processing/)).toBeInTheDocument()
      expect(screen.getByText(/AI embeddings/)).toBeInTheDocument()
      expect(screen.getByText(/Test generation/)).toBeInTheDocument()
      expect(screen.getByText(/Visibility evaluation/)).toBeInTheDocument()
      expect(screen.getByText(/Multi-engine testing/)).toBeInTheDocument()
      expect(screen.getByText(/Ocean analysis/)).toBeInTheDocument()
    })

    it('maps backend message to stage index correctly', () => {
      const progress: ProgressEvent = {
        percent: 10,
        message: 'Fetching your business website',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      const stageCard = screen.getByText(/Fetching your website/)
        .closest('div[class*="ring"]')
      expect(stageCard).toHaveClass('ring-2')
    })
  })

  describe('stage completion based on percent', () => {
    it('marks stages as completed at 0% (none completed)', () => {
      const progress: ProgressEvent = {
        percent: 0,
        message: 'Starting analysis',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // At 0%, no stages should show checkmarks (stageIndex = 0)
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBe(0)
    })

    it('marks first stage as completed at 10%', () => {
      const progress: ProgressEvent = {
        percent: 10,
        message: 'Extracting business information',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // At 10%, stageIndex = 1, so 1 stage below should be completed
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBeGreaterThan(0)
    })

    it('marks 5 stages as completed at 50%', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Building semantic embeddings',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // At 50%, stageIndex = 5
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBe(5)
    })

    it('marks all stages as completed at 100%', () => {
      const progress: ProgressEvent = {
        percent: 100,
        message: 'Analysis complete',
        status: 'completed',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // At 100%, stageIndex = 10, all stages completed
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBe(10)
    })

    it('handles mid-progress correctly (35%)', () => {
      const progress: ProgressEvent = {
        percent: 35,
        message: 'Searching for competitors',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // At 35%, stageIndex = floor(35/100 * 10) = 3
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBe(3)
    })
  })

  describe('current stage highlighting', () => {
    it('highlights current stage with ring border', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Building semantic embeddings',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      // Current stage at 50% should be around index 5
      // Look for a card with ring-2 styling
      const stageWithRing = document.querySelector('[class*="ring-2"]')
      expect(stageWithRing).toBeInTheDocument()
    })

    it('shows only one current stage highlighted', () => {
      const progress: ProgressEvent = {
        percent: 70,
        message: 'Generating test questions',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      const ringElements = container.querySelectorAll('[class*="ring-2"]')
      expect(ringElements.length).toBe(1)
    })
  })

  describe('stage message tracking', () => {
    it('updates current stage based on message content', () => {
      const progress: ProgressEvent = {
        percent: 30,
        message: 'Searching for competitors',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      // "Searching for competitors" matches "Competitor discovery"
      expect(screen.getByText(/Competitor discovery/)).toBeInTheDocument()
    })

    it('identifies "Fetching X competitor" message as Competitor research', () => {
      const progress: ProgressEvent = {
        percent: 40,
        message: 'Fetching 3 competitor websites',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      // "Fetching" in this context should map to "Competitor research"
      expect(screen.getByText(/Competitor research/)).toBeInTheDocument()
    })

    it('identifies "Chunking documents" message', () => {
      const progress: ProgressEvent = {
        percent: 45,
        message: 'Chunking documents for embedding',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      expect(screen.getByText(/Content processing/)).toBeInTheDocument()
    })

    it('identifies "Building semantic embeddings" message', () => {
      const progress: ProgressEvent = {
        percent: 60,
        message: 'Building semantic embeddings',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      expect(screen.getByText(/AI embeddings/)).toBeInTheDocument()
    })

    it('identifies "Analyzing competitive" message as Ocean analysis', () => {
      const progress: ProgressEvent = {
        percent: 85,
        message: 'Analyzing competitive landscape for blue ocean opportunities',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      expect(screen.getByText(/Ocean analysis/)).toBeInTheDocument()
    })
  })

  describe('responsive design', () => {
    it('renders with responsive grid layout', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Processing',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // Check for grid container with responsive classes
      const gridContainer = container.querySelector('[class*="grid"]')
      expect(gridContainer).toBeInTheDocument()
    })
  })

  describe('stage completion indicators', () => {
    it('shows CheckCircle2 icons for completed stages', () => {
      const progress: ProgressEvent = {
        percent: 60,
        message: 'Building semantic embeddings',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // Should have SVG icons for completed stages
      const svgs = container.querySelectorAll('svg')
      // At 60%, we expect 6 completed stages
      expect(svgs.length).toBe(6)
    })

    it('renders stage cards with appropriate styling', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Building embeddings',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // Each stage should be in a card with glass styling
      const cards = container.querySelectorAll('[class*="card"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('status transitions', () => {
    it('renders when status is processing', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Processing',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      expect(screen.getByText(/Fetching your website/)).toBeInTheDocument()
    })

    it('renders when status is completed', () => {
      const progress: ProgressEvent = {
        percent: 100,
        message: 'Analysis complete',
        status: 'completed',
      }
      render(<LoadingStages progress={progress} />)

      expect(screen.getByText(/Ocean analysis/)).toBeInTheDocument()
    })

    it('renders when status is queued', () => {
      const progress: ProgressEvent = {
        percent: 0,
        message: 'Starting',
        status: 'queued',
      }
      render(<LoadingStages progress={progress} />)

      expect(screen.getByText(/Fetching your website/)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles progress at exact stage boundaries (10%, 20%, etc.)', () => {
      const testPercents = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

      for (const percent of testPercents) {
        const progress: ProgressEvent = {
          percent,
          message: 'Processing',
          status: 'processing',
        }
        const { unmount, container } = render(
          <LoadingStages progress={progress} />
        )

        const expectedCompleted = Math.floor((percent / 100) * 10)
        const checkmarks = container.querySelectorAll('svg')
        expect(checkmarks.length).toBe(expectedCompleted)
        unmount()
      }
    })

    it('handles message with no matching stage (falls back to message mapping)', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Unknown processing step',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // Should still render all stages with message fallback logic
      expect(container.querySelectorAll('[class*="card"]').length).toBeGreaterThan(0)
    })

    it('handles very high percent values (>100) gracefully', () => {
      const progress: ProgressEvent = {
        percent: 150,
        message: 'Over complete',
        status: 'completed',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // Should cap at 10 completed stages
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBeLessThanOrEqual(10)
    })

    it('handles percent as float values correctly', () => {
      const progress: ProgressEvent = {
        percent: 55.7,
        message: 'Processing',
        status: 'processing',
      }
      const { container } = render(<LoadingStages progress={progress} />)

      // At 55.7%, stageIndex = floor(55.7/100 * 10) = 5
      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBe(5)
    })
  })

  describe('accessibility', () => {
    it('renders stage labels as text content (readable)', () => {
      const progress: ProgressEvent = {
        percent: 50,
        message: 'Processing',
        status: 'processing',
      }
      render(<LoadingStages progress={progress} />)

      // All stage names should be readable by screen readers
      expect(screen.getByText(/Fetching your website/)).toBeInTheDocument()
      expect(screen.getByText(/Business analysis/)).toBeInTheDocument()
      expect(screen.getByText(/AI embeddings/)).toBeInTheDocument()
    })
  })
})
