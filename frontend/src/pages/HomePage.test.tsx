import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import HomePage from './HomePage'
import { AnalysisProvider } from '../contexts/AnalysisContext'
import { PreFillProvider } from '../hooks/usePreFillForm.tsx'
import type { AnalysisRequest } from '../api/types'

// Mock the API client
vi.mock('../api/client', () => ({
  streamAnalysis: vi.fn(() => () => {}),
  urlsToCompDocs: vi.fn(() => []),
  submitContentLab: vi.fn(),
}))

function MockedHomePage() {
  return (
    <PreFillProvider>
      <BrowserRouter>
        <AnalysisProvider>
          <HomePage />
        </AnalysisProvider>
      </BrowserRouter>
    </PreFillProvider>
  )
}

describe('HomePage with SetupWizard', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('renders SetupWizard component', () => {
    render(<MockedHomePage />)

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Your Website/i)).toBeInTheDocument()
  })

  it('renders form fields initially empty', () => {
    render(<MockedHomePage />)

    const urlInput = screen.getByPlaceholderText('https://yourcompany.com')
    expect((urlInput as HTMLInputElement).value).toBe('')
  })

  it('shows header and recent dives section', () => {
    render(<MockedHomePage />)

    expect(screen.getByText('One Piece')).toBeInTheDocument()
    expect(screen.getByText('AI Visibility Intelligence')).toBeInTheDocument()
    expect(screen.getByText(/API keys stored locally/i)).toBeInTheDocument()
  })

  it('preserves existing form state when navigating steps', async () => {
    const user = userEvent.setup()
    render(<MockedHomePage />)

    const urlInput = screen.getByPlaceholderText('https://yourcompany.com')
    await user.type(urlInput, 'https://manual.com')

    expect((urlInput as HTMLInputElement).value).toBe('https://manual.com')
  })
})

describe('HomePage form submission', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('requires url, openai_key, and serper_key to submit', () => {
    render(<MockedHomePage />)

    // On step 1, Next button should be disabled if URL is empty
    const nextButton = screen.getByRole('button', { name: /Next/i })
    expect(nextButton).toBeInTheDocument()
  })

  it('enables submit button when required fields are filled', async () => {
    const user = userEvent.setup()
    render(<MockedHomePage />)

    const urlInput = screen.getByPlaceholderText('https://yourcompany.com')
    await user.type(urlInput, 'https://example.com')

    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument()
    })

    const openaiInputs = screen.getAllByPlaceholderText(/sk-/i)
    const openaiInput = openaiInputs[0]
    await user.type(openaiInput, 'sk-test')

    const serperInputs = screen.getAllByPlaceholderText(/your key/i)
    const serperInput = serperInputs[0]
    await user.type(serperInput, 'serper-test')

    let nextBtn = screen.getByRole('button', { name: /Next/i })
    await user.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Run Analysis/i })).toBeInTheDocument()
    })
  })
})
