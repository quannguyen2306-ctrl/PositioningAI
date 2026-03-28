import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchemaAuditResults } from '../SchemaAuditResults'
import type { SchemaAuditResult } from '../../../api/types'

describe('SchemaAuditResults', () => {
  describe('rendering with valid data', () => {
    it('should render the title', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText('Schema Markup Audit')).toBeInTheDocument()
    })

    it('should render the overall completeness percentage', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/62% complete/)).toBeInTheDocument()
    })

    it('should render "Overall Completeness" label', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText('Overall Completeness')).toBeInTheDocument()
    })

    it('should display green progress bar when completeness >= 80%', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.85,
        recommendations: [],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      const progressBar = container.querySelector('[data-testid="completeness-bar"]')
      expect(progressBar?.className).toContain('score-high')
    })

    it('should display yellow progress bar when 50% <= completeness < 80%', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.65,
        recommendations: [],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      const progressBar = container.querySelector('[data-testid="completeness-bar"]')
      expect(progressBar?.className).toContain('score-mid')
    })

    it('should display red progress bar when completeness < 50%', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.35,
        recommendations: [],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      const progressBar = container.querySelector('[data-testid="completeness-bar"]')
      expect(progressBar?.className).toContain('score-low')
    })
  })

  describe('schema presence rendering', () => {
    it('should render schema type cards', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 8,
            missing_fields: [],
          },
          {
            schema_type: 'BreadcrumbList',
            found: false,
            field_count: 0,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText('LocalBusiness')).toBeInTheDocument()
      expect(screen.getByText('BreadcrumbList')).toBeInTheDocument()
    })

    it('should show checkmark icon for found schemas', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 8,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      const checkmark = container.querySelector('[data-testid="schema-found-LocalBusiness"]')
      expect(checkmark).toBeInTheDocument()
    })

    it('should show X icon for schemas not found', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'BreadcrumbList',
            found: false,
            field_count: 0,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      const notFound = container.querySelector('[data-testid="schema-not-found-BreadcrumbList"]')
      expect(notFound).toBeInTheDocument()
    })

    it('should show field count for found schemas', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 8,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/8 fields/)).toBeInTheDocument()
    })

    it('should show missing fields list when schema is found but has missing fields', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 6,
            missing_fields: ['address', 'telephone'],
          },
        ],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/Missing:/)).toBeInTheDocument()
      expect(screen.getByText(/address/)).toBeInTheDocument()
      expect(screen.getByText(/telephone/)).toBeInTheDocument()
    })

    it('should not show missing fields text if field_count is 0', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'BreadcrumbList',
            found: false,
            field_count: 0,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      const missingText = screen.queryByText(/Missing:/)
      expect(missingText).not.toBeInTheDocument()
    })
  })

  describe('recommendations section', () => {
    it('should render recommendations section when recommendations exist', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.62,
        recommendations: [
          'Add LocalBusiness schema to improve local visibility',
          'Include telephone number in contact information',
        ],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText('Recommendations')).toBeInTheDocument()
    })

    it('should render each recommendation as a list item', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.62,
        recommendations: [
          'Add LocalBusiness schema to improve local visibility',
          'Include telephone number in contact information',
        ],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(
        screen.getByText('Add LocalBusiness schema to improve local visibility')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Include telephone number in contact information')
      ).toBeInTheDocument()
    })

    it('should not render recommendations section when empty', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0.62,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      const recSection = screen.queryByText('Recommendations')
      expect(recSection).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show "No structured data found" when schemas_found is empty', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/No structured data found/)).toBeInTheDocument()
    })

    it('should still render when completeness is 0%', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [],
        overall_completeness: 0,
        recommendations: ['Add schema markup'],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/0% complete/)).toBeInTheDocument()
    })

    it('should still render when completeness is 100%', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 10,
            missing_fields: [],
          },
        ],
        overall_completeness: 1.0,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/100% complete/)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle schema with many missing fields', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 3,
            missing_fields: ['name', 'address', 'telephone', 'email', 'url', 'image'],
          },
        ],
        overall_completeness: 0.3,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(/name/)).toBeInTheDocument()
      expect(screen.getByText(/address/)).toBeInTheDocument()
      expect(screen.getByText(/url/)).toBeInTheDocument()
    })

    it('should handle multiple schemas with mixed found/not-found states', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 8,
            missing_fields: ['telephone'],
          },
          {
            schema_type: 'BreadcrumbList',
            found: false,
            field_count: 0,
            missing_fields: [],
          },
          {
            schema_type: 'FAQPage',
            found: true,
            field_count: 4,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.67,
        recommendations: ['Add breadcrumb navigation'],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText('LocalBusiness')).toBeInTheDocument()
      expect(screen.getByText('BreadcrumbList')).toBeInTheDocument()
      expect(screen.getByText('FAQPage')).toBeInTheDocument()
      expect(screen.getByText(/67% complete/)).toBeInTheDocument()
    })

    it('should handle very long schema type names', () => {
      const longSchemaName = 'VeryLongSchemaTypeNameThatMightCauseLayoutIssues'
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: longSchemaName,
            found: true,
            field_count: 5,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.5,
        recommendations: [],
        raw_schemas: [],
      }
      render(<SchemaAuditResults audit={audit} />)
      expect(screen.getByText(longSchemaName)).toBeInTheDocument()
    })

    it('should handle completeness value exactly at thresholds', () => {
      const { rerender, container: c1 } = render(
        <SchemaAuditResults
          audit={{
            url: 'https://example.com',
            schemas_found: [],
            overall_completeness: 0.8,
            recommendations: [],
            raw_schemas: [],
          }}
        />
      )
      let progressBar = c1.querySelector('[data-testid="completeness-bar"]')
      expect(progressBar?.className).toContain('score-high')

      rerender(
        <SchemaAuditResults
          audit={{
            url: 'https://example.com',
            schemas_found: [],
            overall_completeness: 0.5,
            recommendations: [],
            raw_schemas: [],
          }}
        />
      )
      const { container: c2 } = render(
        <SchemaAuditResults
          audit={{
            url: 'https://example.com',
            schemas_found: [],
            overall_completeness: 0.5,
            recommendations: [],
            raw_schemas: [],
          }}
        />
      )
      progressBar = c2.querySelector('[data-testid="completeness-bar"]')
      expect(progressBar?.className).toContain('score-mid')
    })
  })

  describe('styling and layout', () => {
    it('should have correct CSS classes from EvaluationTable pattern', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 8,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.75,
        recommendations: ['Improve schema coverage'],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      expect(container.querySelector('.card')).toBeInTheDocument()
    })

    it('should render schema cards in a grid layout', () => {
      const audit: SchemaAuditResult = {
        url: 'https://example.com',
        schemas_found: [
          {
            schema_type: 'LocalBusiness',
            found: true,
            field_count: 8,
            missing_fields: [],
          },
          {
            schema_type: 'BreadcrumbList',
            found: false,
            field_count: 0,
            missing_fields: [],
          },
          {
            schema_type: 'FAQPage',
            found: true,
            field_count: 4,
            missing_fields: [],
          },
        ],
        overall_completeness: 0.67,
        recommendations: [],
        raw_schemas: [],
      }
      const { container } = render(<SchemaAuditResults audit={audit} />)
      const schemaCardsContainer = container.querySelector('[data-testid="schema-cards-container"]')
      expect(schemaCardsContainer).toBeInTheDocument()
    })
  })
})
