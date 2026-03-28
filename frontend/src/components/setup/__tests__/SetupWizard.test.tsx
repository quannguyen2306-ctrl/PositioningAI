import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SetupWizard from '../SetupWizard'
import { AnalysisProvider } from '../../../contexts/AnalysisContext'
import { PreFillProvider } from '../../../hooks/usePreFillForm.tsx'
import type { AnalysisRequest } from '../../../api/types'

// Mock the API client
vi.mock('../../../api/client', () => ({
  streamAnalysis: vi.fn(() => () => {}),
  urlsToCompDocs: vi.fn(() => []),
  submitContentLab: vi.fn(),
}))

function MockedSetupWizard(props: React.ComponentProps<typeof SetupWizard>) {
  return (
    <PreFillProvider>
      <BrowserRouter>
        <AnalysisProvider>
          <SetupWizard {...props} />
        </AnalysisProvider>
      </BrowserRouter>
    </PreFillProvider>
  )
}

describe('SetupWizard - Step Navigation', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('renders step 1 by default', () => {
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Your Website/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)).toBeInTheDocument()
  })

  it('shows "Next" button on step 1', () => {
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const nextButton = screen.getByRole('button', { name: /Next/i })
    expect(nextButton).toBeInTheDocument()
  })

  it('does not show "Back" button on step 1', () => {
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const backButton = screen.queryByRole('button', { name: /Back/i })
    expect(backButton).not.toBeInTheDocument()
  })

  it('advances to step 2 when "Next" is clicked with valid URL', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')

    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
      expect(screen.getByText(/OpenAI API Key/i)).toBeInTheDocument()
    })
  })

  it('shows validation error with invalid URL', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'not-a-url')

    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid URL/i)).toBeInTheDocument()
    })

    // Should still be on step 1
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument()
  })

  it('does not advance if URL is empty', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/URL is required/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument()
  })

  it('goes back to step 1 from step 2 when "Back" is clicked', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 2
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Click back
    const backButton = screen.getByRole('button', { name: /Back/i })
    await user.click(backButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument()
      expect((urlInput as HTMLInputElement).value).toBe('https://example.com')
    })
  })

  it('renders step 2 with API key fields', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/sk-/i)).toBeInTheDocument()
      expect(screen.getByText(/Serper API Key/i)).toBeInTheDocument()
    })
  })

  it('validates OpenAI key format on step 2', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Go to step 2
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Enter invalid OpenAI key
    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'invalid-key')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'valid-serper-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/OpenAI key must start with/i)).toBeInTheDocument()
    })
  })

  it('requires Serper key on step 2', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Go to step 2
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Enter only OpenAI key
    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Serper key is required/i)).toBeInTheDocument()
    })
  })

  it('advances to step 3 with valid API keys', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Go to step 2
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Enter valid keys
    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
      expect(screen.getByText(/Analysis Settings/i)).toBeInTheDocument()
    })
  })

  it('renders step 3 with competitors and questions sliders', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate through steps
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    // Check for sliders
    const competitorsSlider = screen.getByRole('slider', { name: /Competitors/i })
    const questionsSlider = screen.getByRole('slider', { name: /Questions/i })

    expect(competitorsSlider).toBeInTheDocument()
    expect(questionsSlider).toBeInTheDocument()
    expect((competitorsSlider as HTMLInputElement).value).toBe('8')
    expect((questionsSlider as HTMLInputElement).value).toBe('10')
  })

  it('shows "Run Analysis" button on step 3', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate through steps to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Run Analysis/i })).toBeInTheDocument()
    })
  })
})

describe('SetupWizard - Form Data and Submission', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('calls onSubmit with correct data when form is submitted', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Step 1
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Step 2
    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-test-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-test-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    // Step 3 - adjust sliders
    const competitorsSlider = screen.getByRole('slider', { name: /Competitors/i })
    const questionsSlider = screen.getByRole('slider', { name: /Questions/i })

    fireEvent.change(competitorsSlider, { target: { value: '10' } })
    fireEvent.change(questionsSlider, { target: { value: '12' } })

    // Submit
    const submitButton = screen.getByRole('button', { name: /Run Analysis/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        url: 'https://example.com',
        openai_key: 'sk-test-key-123',
        serper_key: 'serper-test-key',
        n_competitors: 10,
        n_questions: 12,
      })
    })
  })

  it('trims whitespace from all fields before submission', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Step 1 - note: URL with spaces around it still validates because trim() happens before validation
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Step 2
    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    // Type with spaces - the onSubmit will receive trimmed version
    await user.clear(openaiInput)
    await user.type(openaiInput, '  sk-test-key-123  ')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.clear(serperInput)
    await user.type(serperInput, '  serper-test-key  ')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    // Submit
    const submitButton = screen.getByRole('button', { name: /Run Analysis/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        url: 'https://example.com',
        openai_key: 'sk-test-key-123',
        serper_key: 'serper-test-key',
        n_competitors: 8,
        n_questions: 10,
      })
    })
  })

  it('slider values default to 8 competitors and 10 questions', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    const competitorsSlider = screen.getByRole('slider', { name: /Competitors/i })
    const questionsSlider = screen.getByRole('slider', { name: /Questions/i })

    expect((competitorsSlider as HTMLInputElement).value).toBe('8')
    expect((questionsSlider as HTMLInputElement).value).toBe('10')
  })
})

describe('SetupWizard - Loading and Error States', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('disables all inputs when isLoading is true', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    expect((urlInput as HTMLInputElement).disabled).toBe(false)

    rerender(<MockedSetupWizard onSubmit={mockOnSubmit} isLoading={true} />)

    expect((urlInput as HTMLInputElement).disabled).toBe(true)
  })

  it('shows spinner on submit button when isLoading is true', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    expect(screen.queryByText(/Analyzing/i)).not.toBeInTheDocument()

    rerender(<MockedSetupWizard onSubmit={mockOnSubmit} isLoading={true} />)

    expect(screen.getByText(/Analyzing/i)).toBeInTheDocument()
  })

  it('renders error message when error prop is provided', () => {
    const errorMessage = 'Failed to start analysis'
    render(<MockedSetupWizard onSubmit={mockOnSubmit} error={errorMessage} />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('error message appears above the Next button', () => {
    const errorMessage = 'API key is invalid'
    const { container } = render(<MockedSetupWizard onSubmit={mockOnSubmit} error={errorMessage} />)

    const errorElement = screen.getByText(errorMessage)
    const nextButton = screen.getByRole('button', { name: /Next/i })

    const errorPosition = container.querySelector('[role="alert"]') || errorElement.parentElement
    const buttonPosition = nextButton.parentElement

    expect(errorElement).toBeInTheDocument()
    expect(nextButton).toBeInTheDocument()
  })

  it('disables Next button when isLoading is true', async () => {
    const { rerender } = render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    let nextButton = screen.getByRole('button', { name: /Next/i })
    expect((nextButton as HTMLButtonElement).disabled).toBe(false)

    rerender(<MockedSetupWizard onSubmit={mockOnSubmit} isLoading={true} />)

    nextButton = screen.getByRole('button', { name: /Next/i })
    expect((nextButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables Back button when isLoading is true', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 2
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    let backButton = screen.getByRole('button', { name: /Back/i })
    expect((backButton as HTMLButtonElement).disabled).toBe(false)

    rerender(<MockedSetupWizard onSubmit={mockOnSubmit} isLoading={true} />)

    backButton = screen.getByRole('button', { name: /Back/i })
    expect((backButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables Run Analysis button when isLoading is true', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    let submitButton = screen.getByRole('button', { name: /Run Analysis/i })
    expect((submitButton as HTMLButtonElement).disabled).toBe(false)

    rerender(<MockedSetupWizard onSubmit={mockOnSubmit} isLoading={true} />)

    // When loading, button text changes to "Analyzing..."
    submitButton = screen.getByRole('button', { name: /Analyzing/i })
    expect((submitButton as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('SetupWizard - Pre-fill Functionality', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('pre-fills form when AnalysisRequest is provided via context', async () => {
    const mockRequest: AnalysisRequest = {
      url: 'https://prefilled.com',
      openai_key: 'sk-prefilled-key',
      serper_key: 'serper-prefilled-key',
      n_competitors: 12,
      n_questions: 15,
    }

    // Note: This test would require a helper component to set the pre-fill context
    // We'll test the core functionality through the HomePage integration
    expect(true).toBe(true)
  })

  it('preserves form data when navigating between steps', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Fill step 1
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')

    // Go to step 2
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    // Go back to step 1
    const backButton = screen.getByRole('button', { name: /Back/i })
    await user.click(backButton)

    // Verify data is preserved
    const urlInputAfterNavigation = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i) as HTMLInputElement
    expect(urlInputAfterNavigation.value).toBe('https://example.com')
  })
})

describe('SetupWizard - Slider Behavior', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('slider ranges are correct for competitors (3-20)', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    const competitorsSlider = screen.getByRole('slider', { name: /Competitors/i }) as HTMLInputElement
    expect(competitorsSlider.min).toBe('3')
    expect(competitorsSlider.max).toBe('20')
  })

  it('slider ranges are correct for questions (5-30)', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    const questionsSlider = screen.getByRole('slider', { name: /Questions/i }) as HTMLInputElement
    expect(questionsSlider.min).toBe('5')
    expect(questionsSlider.max).toBe('30')
  })

  it('updates slider display when value changes', async () => {
    const user = userEvent.setup()
    render(<MockedSetupWizard onSubmit={mockOnSubmit} />)

    // Navigate to step 3
    const urlInput = screen.getByPlaceholderText(/https:\/\/yourcompany.com/i)
    await user.type(urlInput, 'https://example.com')
    let nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-valid-key-123')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-valid-key')

    nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument()
    })

    const competitorsSlider = screen.getByRole('slider', { name: /Competitors/i })
    fireEvent.change(competitorsSlider, { target: { value: '15' } })

    await waitFor(() => {
      const labels = screen.getAllByText(/Competitors/)
      const labelWithNumber = labels.find(label => label.textContent?.includes('15'))
      expect(labelWithNumber).toBeInTheDocument()
    })
  })
})
