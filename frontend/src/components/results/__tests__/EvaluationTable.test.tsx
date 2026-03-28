import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvaluationTable } from '../EvaluationTable'
import type { EvalSummary } from '../../../api/types'

// Mock evaluation result for testing
const createMockEvalResult = (overrides = {}) => ({
  question: 'What is the best software for project management?',
  answer: 'Popular choices include Asana, Monday.com, and Jira.',
  business_mentioned: true,
  visibility_score: 8.5,
  mention_quality: 'prominent' as const,
  key_observation: 'Business is mentioned in the top section of the answer.',
  user_chunk_count: 5,
  comp_chunk_count: 3,
  ...overrides,
})

// Mock evaluation summary for testing
const createMockEvalSummary = (overrides = {}): EvalSummary => ({
  results: [
    createMockEvalResult({
      question: 'Question 1',
      visibility_score: 8.5,
      mention_quality: 'prominent',
      competitor_domains_mentioned: ['competitor1.com', 'competitor2.com'],
    }),
    createMockEvalResult({
      question: 'Question 2',
      visibility_score: 5.0,
      mention_quality: 'brief',
      competitor_domains_mentioned: ['competitor3.com'],
    }),
    createMockEvalResult({
      question: 'Question 3',
      visibility_score: 2.0,
      mention_quality: 'absent',
      // No competitor_domains_mentioned
    }),
  ],
  avg_visibility_score: 5.17,
  mention_rate: 0.67,
  total_questions: 3,
  score_breakdown: {
    'high (8-10)': 1,
    'medium (5-7)': 1,
    'low (0-4)': 1,
  },
  top_competitor_domains: ['competitor1.com', 'competitor2.com', 'competitor3.com'],
})

describe('EvaluationTable - Competitor Domains Badges', () => {
  describe('competitor domains section rendering', () => {
    it('renders competitor domains section when competitor_domains_mentioned is present and non-empty', async () => {
      const evalData = createMockEvalSummary()
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click first card to expand it
      const firstQuestion = screen.getByText('Question 1')
      const firstCard = firstQuestion.closest('.card')
      const expandButton = firstCard?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Check that competitor domains section exists
      await waitFor(() => {
        expect(screen.getByText('Competitor Domains Mentioned')).toBeInTheDocument()
      })
    })

    it('does not render competitor domains section when competitor_domains_mentioned is undefined', async () => {
      const evalData = createMockEvalSummary()
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click third card (which has no competitor_domains_mentioned)
      const cards = screen.getAllByRole('button')
      const expandButton = cards[2]
      if (expandButton) {
        await user.click(expandButton)
      }

      // Check that competitor domains section does NOT exist
      expect(screen.queryByText('Competitor Domains Mentioned')).not.toBeInTheDocument()
    })

    it('does not render competitor domains section when competitor_domains_mentioned is empty array', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Single Result',
            visibility_score: 8.5,
            competitor_domains_mentioned: [],
          }),
        ],
        avg_visibility_score: 8.5,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 1, 'medium (5-7)': 0, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click to expand
      const firstQuestion = screen.getByText('Single Result')
      const firstCard = firstQuestion.closest('.card')
      const expandButton = firstCard?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Check that competitor domains section does NOT exist
      expect(screen.queryByText('Competitor Domains Mentioned')).not.toBeInTheDocument()
    })
  })

  describe('badge rendering', () => {
    it('renders multiple domain badges when multiple domains are present', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Test Question',
            visibility_score: 8.5,
            competitor_domains_mentioned: ['comp1.com', 'comp2.com'],
          }),
        ],
        avg_visibility_score: 8.5,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 1, 'medium (5-7)': 0, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click card to expand it
      const question = screen.getByText('Test Question')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Check that both domains render as badges in the expanded section
      await waitFor(() => {
        expect(screen.getByText('comp1.com')).toBeInTheDocument()
        expect(screen.getByText('comp2.com')).toBeInTheDocument()
      })
    })

    it('renders single badge when only one domain is present', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Single Domain Test',
            visibility_score: 5.0,
            competitor_domains_mentioned: ['single-comp.com'],
          }),
        ],
        avg_visibility_score: 5.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click card to expand it
      const question = screen.getByText('Single Domain Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Check that the domain is rendered
      await waitFor(() => {
        expect(screen.getByText('single-comp.com')).toBeInTheDocument()
      })
    })

    it('applies correct styling to domain badges', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Styling Test',
            visibility_score: 7.0,
            competitor_domains_mentioned: ['styled-comp.com'],
          }),
        ],
        avg_visibility_score: 7.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      const { container } = render(<EvaluationTable evalData={evalData} />)

      // Click card to expand it
      const question = screen.getByText('Styling Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Find the badge element
      await waitFor(() => {
        const badge = screen.getByText('styled-comp.com')

        // Check that badge has expected classes
        expect(badge).toHaveClass('text-2xs')
        expect(badge).toHaveClass('px-2')
        expect(badge).toHaveClass('py-1')
        expect(badge).toHaveClass('bg-raised')
        expect(badge).toHaveClass('border')
        expect(badge).toHaveClass('border-subtle')
      })
    })
  })

  describe('section label styling', () => {
    it('renders section label with correct styling', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Label Test',
            visibility_score: 6.0,
            competitor_domains_mentioned: ['label-comp.com'],
          }),
        ],
        avg_visibility_score: 6.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      const { container } = render(<EvaluationTable evalData={evalData} />)

      // Click card to expand it
      const question = screen.getByText('Label Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Find the label
      await waitFor(() => {
        const label = screen.getByText('Competitor Domains Mentioned')

        // Check styling
        expect(label).toHaveClass('text-2xs')
        expect(label).toHaveClass('uppercase')
        expect(label).toHaveClass('tracking-widest')
        expect(label).toHaveClass('text-text-muted')
      })
    })
  })

  describe('compatibility with existing functionality', () => {
    it('still renders all existing sections in expanded row', async () => {
      const evalData = createMockEvalSummary()
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click first card to expand it
      const firstQuestion = screen.getByText('Question 1')
      const firstCard = firstQuestion.closest('.card')
      const expandButton = firstCard?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Verify existing sections are still present
      await waitFor(() => {
        expect(screen.getByText('AI Answer Found')).toBeInTheDocument()
        expect(screen.getByText('Key Observation')).toBeInTheDocument()
        expect(screen.getByText(/Mention:/)).toBeInTheDocument()
        expect(screen.getByText(/Your chunks:/)).toBeInTheDocument()
        expect(screen.getByText(/Comp chunks:/)).toBeInTheDocument()
      })
    })

    it('maintains filter functionality with competitor domains feature', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'High Score Filter Test',
            visibility_score: 9.0,
            competitor_domains_mentioned: ['unique-high1.com', 'unique-high2.com'],
          }),
          createMockEvalResult({
            question: 'Low Score Filter Test',
            visibility_score: 2.0,
            competitor_domains_mentioned: ['unique-low.com'],
          }),
        ],
        avg_visibility_score: 5.5,
        mention_rate: 1.0,
        total_questions: 2,
        score_breakdown: { 'high (8-10)': 1, 'medium (5-7)': 0, 'low (0-4)': 1 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click on 'High' filter button - find all buttons and get the one with text "High"
      const allButtons = screen.getAllByRole('button')
      const highFilterButton = allButtons.find(btn => btn.textContent?.includes('High'))

      if (highFilterButton) {
        await user.click(highFilterButton)
      }

      // Should only show high scoring result
      await waitFor(() => {
        expect(screen.getByText('High Score Filter Test')).toBeInTheDocument()
      })

      // Expand and verify competitor domains still render
      const question = screen.getByText('High Score Filter Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      await waitFor(() => {
        expect(screen.getByText('unique-high1.com')).toBeInTheDocument()
        expect(screen.getByText('unique-high2.com')).toBeInTheDocument()
      })
    })

    it('does not break when all results have no competitor_domains_mentioned', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'No Domains Q1',
            visibility_score: 7.0,
          }),
          createMockEvalResult({
            question: 'No Domains Q2',
            visibility_score: 6.0,
          }),
        ],
        avg_visibility_score: 6.5,
        mention_rate: 0.5,
        total_questions: 2,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 2, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Should render without errors
      await waitFor(() => {
        expect(screen.getByText('No Domains Q1')).toBeInTheDocument()
        expect(screen.getByText('No Domains Q2')).toBeInTheDocument()
      })

      // Expand first card
      const firstQuestion = screen.getByText('No Domains Q1')
      const firstCard = firstQuestion.closest('.card')
      const expandButton = firstCard?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // No competitor domains section should appear
      expect(screen.queryByText('Competitor Domains Mentioned')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles very long domain names', async () => {
      const longDomain = 'this-is-a-very-long-domain-name-for-testing-purposes.example.com'
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Long Domain Test',
            visibility_score: 5.0,
            competitor_domains_mentioned: [longDomain],
          }),
        ],
        avg_visibility_score: 5.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click to expand
      const question = screen.getByText('Long Domain Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Should render the long domain
      await waitFor(() => {
        expect(screen.getByText(longDomain)).toBeInTheDocument()
      })
    })

    it('handles many domain badges (10+)', async () => {
      const manyDomains = Array.from({ length: 15 }, (_, i) => `comp-edge${i}.com`)
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Many Domains Test',
            visibility_score: 5.0,
            competitor_domains_mentioned: manyDomains,
          }),
        ],
        avg_visibility_score: 5.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click to expand
      const question = screen.getByText('Many Domains Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // All domains should render
      await waitFor(() => {
        manyDomains.forEach(domain => {
          expect(screen.getByText(domain)).toBeInTheDocument()
        })
      })
    })

    it('preserves domain order when rendering badges', async () => {
      const domains = ['zebra-ord.com', 'apple-ord.com', 'monkey-ord.com']
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Order Test',
            visibility_score: 5.0,
            competitor_domains_mentioned: domains,
          }),
        ],
        avg_visibility_score: 5.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      const { container } = render(<EvaluationTable evalData={evalData} />)

      // Click to expand
      const question = screen.getByText('Order Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // Find all badges in the section
      await waitFor(() => {
        const section = screen.getByText('Competitor Domains Mentioned').closest('div')?.parentElement
        const badges = section?.querySelectorAll('[class*="bg-raised"]') || []

        // Filter to domain badges only (ones with px-2)
        const domainBadges = Array.from(badges).filter(b =>
          b.className.includes('px-2') && domains.some(d => b.textContent?.includes(d))
        )

        // Verify order is preserved
        expect(domainBadges[0]?.textContent).toContain('zebra-ord.com')
        expect(domainBadges[1]?.textContent).toContain('apple-ord.com')
        expect(domainBadges[2]?.textContent).toContain('monkey-ord.com')
      })
    })

    it('handles special characters in domain names', async () => {
      const specialDomains = ['test-dom.com', 'test_dom.com', 'test.dom.co.uk']
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Special Chars Test',
            visibility_score: 5.0,
            competitor_domains_mentioned: specialDomains,
          }),
        ],
        avg_visibility_score: 5.0,
        mention_rate: 1.0,
        total_questions: 1,
        score_breakdown: { 'high (8-10)': 0, 'medium (5-7)': 1, 'low (0-4)': 0 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Click to expand
      const question = screen.getByText('Special Chars Test')
      const card = question.closest('.card')
      const expandButton = card?.querySelector('button')

      if (expandButton) {
        await user.click(expandButton)
      }

      // All special domains should render
      await waitFor(() => {
        specialDomains.forEach(domain => {
          expect(screen.getByText(domain)).toBeInTheDocument()
        })
      })
    })
  })

  describe('integration with filter state', () => {
    it('shows correct competitor domains when filtering to different score tiers', async () => {
      const evalData: EvalSummary = {
        results: [
          createMockEvalResult({
            question: 'Tier High',
            visibility_score: 9.0,
            competitor_domains_mentioned: ['unique-tier-high.com'],
          }),
          createMockEvalResult({
            question: 'Tier Medium',
            visibility_score: 5.5,
            competitor_domains_mentioned: ['unique-tier-med.com'],
          }),
          createMockEvalResult({
            question: 'Tier Low',
            visibility_score: 2.0,
            // No domains
          }),
        ],
        avg_visibility_score: 5.5,
        mention_rate: 0.67,
        total_questions: 3,
        score_breakdown: { 'high (8-10)': 1, 'medium (5-7)': 1, 'low (0-4)': 1 },
        top_competitor_domains: [],
      }
      const user = userEvent.setup()
      render(<EvaluationTable evalData={evalData} />)

      // Filter to 'Low' - find the button with text Low
      const allButtons = screen.getAllByRole('button')
      const lowFilterButton = allButtons.find(btn => btn.textContent?.includes('Low'))

      if (lowFilterButton) {
        await user.click(lowFilterButton)
      }

      // Low Score should be visible
      await waitFor(() => {
        expect(screen.getByText('Tier Low')).toBeInTheDocument()
      })

      // Expand it
      const lowQuestion = screen.getByText('Tier Low')
      const lowCard = lowQuestion.closest('.card')
      const lowExpandButton = lowCard?.querySelector('button')

      if (lowExpandButton) {
        await user.click(lowExpandButton)
      }

      // No competitor domains
      expect(screen.queryByText('Competitor Domains Mentioned')).not.toBeInTheDocument()

      // Now filter to 'Medium'
      const allButtons2 = screen.getAllByRole('button')
      const mediumFilterButton = allButtons2.find(btn => btn.textContent?.includes('Medium'))

      if (mediumFilterButton) {
        await user.click(mediumFilterButton)
      }

      // Medium Score should be visible
      await waitFor(() => {
        expect(screen.getByText('Tier Medium')).toBeInTheDocument()
      })

      // Expand it
      const medQuestion = screen.getByText('Tier Medium')
      const medCard = medQuestion.closest('.card')
      const medExpandButton = medCard?.querySelector('button')

      if (medExpandButton) {
        await user.click(medExpandButton)
      }

      // Should show competitor domains section
      await waitFor(() => {
        expect(screen.getByText('Competitor Domains Mentioned')).toBeInTheDocument()
        expect(screen.getByText('unique-tier-med.com')).toBeInTheDocument()
      })
    })
  })
})
