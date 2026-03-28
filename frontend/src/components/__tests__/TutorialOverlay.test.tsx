import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TutorialOverlay from '../TutorialOverlay'

const STORAGE_KEY = 'posai_tutorial_dismissed'

describe('TutorialOverlay', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('visibility', () => {
    it('should not render when localStorage flag is already set', () => {
      localStorage.setItem(STORAGE_KEY, 'true')
      const { container } = render(<TutorialOverlay />)
      expect(container.firstChild).toBeNull()
    })

    it('should render first step content on mount when not dismissed', () => {
      render(<TutorialOverlay />)
      expect(screen.getByText('Your GEO Health Score')).toBeInTheDocument()
      expect(screen.getByText(/This score shows how often AI search engines surface your business/)).toBeInTheDocument()
    })

    it('should not be null in document when first visiting', () => {
      const { container } = render(<TutorialOverlay />)
      expect(container.firstChild).not.toBeNull()
    })
  })

  describe('step navigation', () => {
    it('should advance to step 2 when Next button is clicked', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(screen.getByText('See Why You\'re Losing')).toBeInTheDocument()
      expect(screen.getByText(/Click any question in the Evaluation panel/)).toBeInTheDocument()
    })

    it('should go back to step 1 from step 2 when Previous button is clicked', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      // Go back to step 1
      const prevButton = screen.getByRole('button', { name: /previous/i })
      await user.click(prevButton)

      expect(screen.getByText('Your GEO Health Score')).toBeInTheDocument()
    })

    it('should show step 3 after clicking next twice', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      expect(screen.getByText('Your Action Plan')).toBeInTheDocument()
      expect(screen.getByText(/The Recommendations panel lists specific content changes/)).toBeInTheDocument()
    })

    it('should not have Previous button on step 1', () => {
      render(<TutorialOverlay />)
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    })

    it('should not have Next button on step 3', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
    })
  })

  describe('dismissal', () => {
    it('should dismiss from any step with Skip tour link', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<TutorialOverlay onDismiss={onDismiss} />)

      const skipLink = screen.getByText('Skip tour')
      await user.click(skipLink)

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
      expect(onDismiss).toHaveBeenCalled()
    })

    it('should dismiss from step 1 with Skip tour', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      const skipLink = screen.getByText('Skip tour')
      await user.click(skipLink)

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })

    it('should dismiss from step 2 with Skip tour', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      const skipLink = screen.getByText('Skip tour')
      await user.click(skipLink)

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })

    it('should dismiss from step 3 with "Got it, I\'m done" button', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      const doneButton = screen.getByRole('button', { name: /Got it/i })
      await user.click(doneButton)

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })

    it('should call onDismiss callback when dismissed', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<TutorialOverlay onDismiss={onDismiss} />)

      const skipLink = screen.getByText('Skip tour')
      await user.click(skipLink)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should call onDismiss callback when Done button clicked', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<TutorialOverlay onDismiss={onDismiss} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      const doneButton = screen.getByRole('button', { name: /Got it/i })
      await user.click(doneButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('step indicator', () => {
    it('should show step indicator on step 1', () => {
      render(<TutorialOverlay />)
      const indicators = screen.getAllByRole('generic', { hidden: true })
      // Checking for visual indicator dots
      expect(screen.getByText(/step 1/i, { selector: 'div' })).toBeInTheDocument()
    })

    it('should show correct active step in indicator', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      expect(screen.getByText(/step 1 of 3/i, { selector: 'div' })).toBeInTheDocument()

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(screen.getByText(/step 2 of 3/i, { selector: 'div' })).toBeInTheDocument()

      await user.click(nextButton)

      expect(screen.getByText(/step 3 of 3/i, { selector: 'div' })).toBeInTheDocument()
    })
  })

  describe('persistence', () => {
    it('should not re-show after dismissal on re-mount', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<TutorialOverlay />)

      const skipLink = screen.getByText('Skip tour')
      await user.click(skipLink)

      rerender(<TutorialOverlay />)

      expect(screen.queryByText('Your GEO Health Score')).not.toBeInTheDocument()
    })
  })

  describe('optional callback', () => {
    it('should work without onDismiss callback', async () => {
      const user = userEvent.setup()
      const { container } = render(<TutorialOverlay />)

      expect(container.firstChild).not.toBeNull()

      const skipLink = screen.getByText('Skip tour')
      await user.click(skipLink)

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })
  })

  describe('content accuracy', () => {
    it('should display all three step titles', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<TutorialOverlay />)

      expect(screen.getByText('Your GEO Health Score')).toBeInTheDocument()

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(screen.getByText('See Why You\'re Losing')).toBeInTheDocument()

      await user.click(nextButton)

      expect(screen.getByText('Your Action Plan')).toBeInTheDocument()
    })

    it('should display all step descriptions', async () => {
      const user = userEvent.setup()
      render(<TutorialOverlay />)

      expect(screen.getByText(/This score shows how often AI search engines surface your business/)).toBeInTheDocument()

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(screen.getByText(/Click any question in the Evaluation panel/)).toBeInTheDocument()

      await user.click(nextButton)

      expect(screen.getByText(/The Recommendations panel lists specific content changes/)).toBeInTheDocument()
    })
  })
})
