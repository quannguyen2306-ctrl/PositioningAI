import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScoreExplainer from '../ScoreExplainer'

describe('ScoreExplainer', () => {
  describe('high score range (8.0-10.0)', () => {
    it('renders prominent positioning text for high score', () => {
      render(
        <ScoreExplainer
          avgScore={9.0}
          mentionRate={85}
          topCompetitors={['competitor1.com', 'competitor2.com']}
        />
      )

      expect(screen.getByText(/Your business appears prominently in AI answers/i)).toBeInTheDocument()
      expect(screen.getByText(/outranking key competitors/i)).toBeInTheDocument()
      expect(screen.getByText(/competitor1.com.*competitor2.com/)).toBeInTheDocument()
      expect(screen.getByText(/9\.0\/10/)).toBeInTheDocument()
      expect(screen.getByText(/85%/)).toBeInTheDocument()
    })

    it('renders high score at threshold 8.0', () => {
      render(
        <ScoreExplainer
          avgScore={8.0}
          mentionRate={80}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/Your business appears prominently in AI answers/i)).toBeInTheDocument()
      expect(screen.getByText(/8\.0\/10/)).toBeInTheDocument()
    })

    it('renders high score at ceiling 10.0', () => {
      render(
        <ScoreExplainer
          avgScore={10.0}
          mentionRate={100}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/Your business appears prominently in AI answers/i)).toBeInTheDocument()
      expect(screen.getByText(/10\.0\/10/)).toBeInTheDocument()
      expect(screen.getByText(/100%/)).toBeInTheDocument()
    })
  })

  describe('mid score range (5.0-7.9)', () => {
    it('renders balanced positioning text for mid score', () => {
      render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={['competitor1.com', 'competitor2.com']}
        />
      )

      expect(screen.getByText(/Your business is mentioned in AI answers/i)).toBeInTheDocument()
      expect(screen.getByText(/competition from.*is significant/i)).toBeInTheDocument()
      expect(screen.getByText(/competitor1.com.*competitor2.com/)).toBeInTheDocument()
      expect(screen.getByText(/6\.5\/10/)).toBeInTheDocument()
      expect(screen.getByText(/targeted improvements could boost your visibility/i)).toBeInTheDocument()
    })

    it('renders mid score at threshold 5.0', () => {
      render(
        <ScoreExplainer
          avgScore={5.0}
          mentionRate={45}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/Your business is mentioned in AI answers/i)).toBeInTheDocument()
      expect(screen.getByText(/5\.0\/10/)).toBeInTheDocument()
    })

    it('renders mid score at upper boundary 7.9', () => {
      render(
        <ScoreExplainer
          avgScore={7.9}
          mentionRate={75}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/Your business is mentioned in AI answers/i)).toBeInTheDocument()
      expect(screen.getByText(/7\.9\/10/)).toBeInTheDocument()
    })
  })

  describe('low score range (0.0-4.9)', () => {
    it('renders improvement-focused text for low score', () => {
      render(
        <ScoreExplainer
          avgScore={3.0}
          mentionRate={25}
          topCompetitors={['competitor1.com', 'competitor2.com']}
        />
      )

      expect(screen.getByText(/Your business appears in fewer AI answers than competitors/i)).toBeInTheDocument()
      expect(screen.getByText(/3\.0\/10/)).toBeInTheDocument()
      expect(screen.getByText(/competitor1.com.*competitor2.com/)).toBeInTheDocument()
      expect(screen.getByText(/Our recommendations focus on closing these visibility gaps/i)).toBeInTheDocument()
    })

    it('renders low score at threshold 0.0', () => {
      render(
        <ScoreExplainer
          avgScore={0.0}
          mentionRate={0}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/Your business appears in fewer AI answers than competitors/i)).toBeInTheDocument()
      expect(screen.getByText(/0\.0\/10/)).toBeInTheDocument()
    })

    it('renders low score at upper boundary 4.9', () => {
      render(
        <ScoreExplainer
          avgScore={4.9}
          mentionRate={30}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/Your business appears in fewer AI answers than competitors/i)).toBeInTheDocument()
      expect(screen.getByText(/4\.9\/10/)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles empty topCompetitors array gracefully', () => {
      const { container } = render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={[]}
        />
      )

      expect(container).toBeInTheDocument()
      // Should render without domain references when empty
      expect(screen.queryByText(/like/)).not.toBeInTheDocument()
      expect(screen.getByText(/Your business is mentioned in AI answers/i)).toBeInTheDocument()
    })

    it('handles single competitor in topCompetitors', () => {
      render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={['single-competitor.com']}
        />
      )

      expect(screen.getByText(/single-competitor.com/)).toBeInTheDocument()
    })

    it('handles more than 2 competitors - uses top 2', () => {
      render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={['first.com', 'second.com', 'third.com']}
        />
      )

      expect(screen.getByText(/first.com.*second.com/)).toBeInTheDocument()
      expect(screen.queryByText(/third.com/)).not.toBeInTheDocument()
    })

    it('does not render executiveSummary when not provided', () => {
      render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={['example.com']}
        />
      )

      // Optional prop should not cause issues
      expect(screen.getByText(/Your business is mentioned in AI answers/i)).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('displays score with one decimal place', () => {
      render(
        <ScoreExplainer
          avgScore={6.534}
          mentionRate={50}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/6\.5\/10/)).toBeInTheDocument()
    })

    it('displays mention rate as whole percentage', () => {
      render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50.678}
          topCompetitors={['example.com']}
        />
      )

      expect(screen.getByText(/51%/)).toBeInTheDocument()
    })

    it('has correct styling with design tokens', () => {
      const { container } = render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={['example.com']}
        />
      )

      const outerDiv = container.querySelector('.border-l-\\[3px\\]')
      expect(outerDiv).toBeInTheDocument()
    })
  })

  describe('text content validation', () => {
    it('includes full template phrase for high score', () => {
      render(
        <ScoreExplainer
          avgScore={9.0}
          mentionRate={85}
          topCompetitors={['comp1.com', 'comp2.com']}
        />
      )

      const text = screen.getByText(/Your business appears prominently/i).textContent || ''
      expect(text).toContain('9.0/10 visibility score and 85% mention rate')
      expect(text).toContain('well-positioned in AI search results')
    })

    it('includes mention of "targeted improvements" for mid score', () => {
      render(
        <ScoreExplainer
          avgScore={6.5}
          mentionRate={50}
          topCompetitors={['comp1.com', 'comp2.com']}
        />
      )

      expect(screen.getByText(/targeted improvements could boost your visibility substantially/i)).toBeInTheDocument()
    })

    it('includes "efficiency" language for low score', () => {
      render(
        <ScoreExplainer
          avgScore={3.0}
          mentionRate={25}
          topCompetitors={['comp1.com', 'comp2.com']}
        />
      )

      expect(screen.getByText(/efficiently/i)).toBeInTheDocument()
    })
  })
})
