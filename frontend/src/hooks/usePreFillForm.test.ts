import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreFillForm, useSetPreFillForm, PreFillProvider } from './usePreFillForm.tsx'
import type { AnalysisRequest } from '../api/types'

const mockRequest: AnalysisRequest = {
  url: 'https://example.com',
  openai_key: 'sk-test-key',
  serper_key: 'serper-key',
  n_competitors: 8,
  n_questions: 10,
  google_key: 'google-key',
  anthropic_key: 'anthropic-key',
  perplexity_key: 'perplexity-key',
  custom_questions: ['question 1', 'question 2'],
}

describe('usePreFillForm', () => {
  it('returns null preFillRequest initially', () => {
    const { result } = renderHook(() => usePreFillForm(), {
      wrapper: PreFillProvider,
    })

    expect(result.current.preFillRequest).toBeNull()
  })

  it('returns clear function', () => {
    const { result } = renderHook(() => usePreFillForm(), {
      wrapper: PreFillProvider,
    })

    expect(typeof result.current.clear).toBe('function')
  })
})

describe('useSetPreFillForm', () => {
  it('setPreFillRequest stores the request', () => {
    // Use a component that calls both hooks to share the same context
    const { result } = renderHook(
      () => ({
        setter: useSetPreFillForm(),
        getter: usePreFillForm(),
      }),
      {
        wrapper: PreFillProvider,
      }
    )

    act(() => {
      result.current.setter(mockRequest)
    })

    expect(result.current.getter.preFillRequest).toEqual(mockRequest)
  })

  it('clear() resets preFillRequest to null', () => {
    const { result } = renderHook(
      () => ({
        setter: useSetPreFillForm(),
        getter: usePreFillForm(),
      }),
      {
        wrapper: PreFillProvider,
      }
    )

    act(() => {
      result.current.setter(mockRequest)
    })

    expect(result.current.getter.preFillRequest).not.toBeNull()

    act(() => {
      result.current.getter.clear()
    })

    expect(result.current.getter.preFillRequest).toBeNull()
  })

  it('multiple set/clear cycles work correctly', () => {
    const { result } = renderHook(
      () => ({
        setter: useSetPreFillForm(),
        getter: usePreFillForm(),
      }),
      {
        wrapper: PreFillProvider,
      }
    )

    // First cycle
    act(() => {
      result.current.setter(mockRequest)
    })
    expect(result.current.getter.preFillRequest).toEqual(mockRequest)

    act(() => {
      result.current.getter.clear()
    })
    expect(result.current.getter.preFillRequest).toBeNull()

    // Second cycle
    const secondRequest: AnalysisRequest = { ...mockRequest, url: 'https://other.com' }
    act(() => {
      result.current.setter(secondRequest)
    })
    expect(result.current.getter.preFillRequest).toEqual(secondRequest)

    act(() => {
      result.current.getter.clear()
    })
    expect(result.current.getter.preFillRequest).toBeNull()
  })

  it('throws error when used outside of PreFillProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => usePreFillForm())
    }).toThrow()

    consoleSpy.mockRestore()
  })
})
