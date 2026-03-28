import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useSessionStorage from './useSessionStorage'
import type { SessionRecord } from './useSessionStorage'
import type { AnalysisRequest, AnalysisResult } from '../api/types'

const mockAnalysisResult: AnalysisResult = {
  biz: {
    business_name: 'Test Business',
    industry: 'Tech',
    location: 'San Francisco',
    target_audience: 'Developers',
    products_services: ['Service 1'],
    unique_value_prop: 'Best service',
    search_query: 'best tech',
  },
  comp_docs: [],
  eval: {
    results: [],
    avg_visibility_score: 7.5,
    mention_rate: 0.8,
    total_questions: 10,
    score_breakdown: { 'high (8-10)': 5, 'medium (5-7)': 3, 'low (0-4)': 2 },
    top_competitor_domains: [],
  },
  coords: [[1, 2]],
  pca_meta: [],
  interps: [],
  recs: {
    executive_summary: 'Summary',
    overall_score_meaning: 'Meaning',
    positioning_insight: 'Insight',
    priority_fixes: [],
    content_to_add: [],
    topics_to_cover: [],
  },
}

const mockAnalysisRequest: AnalysisRequest = {
  url: 'https://example.com',
  openai_key: 'sk-test',
  serper_key: 'serper-test',
  n_competitors: 8,
  n_questions: 10,
}

describe('useSessionStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initializes with empty sessions array', () => {
    const { result } = renderHook(() => useSessionStorage())

    expect(result.current.sessions).toEqual([])
  })

  it('saveSession stores a session record without analysisRequest', () => {
    const { result } = renderHook(() => useSessionStorage())

    const sessionId = 'session-1'
    const businessUrl = 'https://example.com'
    const overallScore = 8.5

    act(() => {
      result.current.saveSession(sessionId, businessUrl, overallScore, mockAnalysisResult)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0]).toMatchObject({
      id: sessionId,
      businessUrl,
      overallScore,
    })
  })

  it('saveSession with analysisRequest stores the request in the record', () => {
    const { result } = renderHook(() => useSessionStorage())

    const sessionId = 'session-2'
    const businessUrl = 'https://example.com'
    const overallScore = 7.5

    act(() => {
      result.current.saveSession(sessionId, businessUrl, overallScore, mockAnalysisResult, mockAnalysisRequest)
    })

    expect(result.current.sessions).toHaveLength(1)
    const savedRecord = result.current.sessions[0]
    expect(savedRecord.analysisRequest).toEqual(mockAnalysisRequest)
  })

  it('saveSession without analysisRequest (undefined) still saves correctly', () => {
    const { result } = renderHook(() => useSessionStorage())

    const sessionId = 'session-3'
    const businessUrl = 'https://example.com'
    const overallScore = 6.0

    act(() => {
      result.current.saveSession(sessionId, businessUrl, overallScore, mockAnalysisResult, undefined)
    })

    expect(result.current.sessions).toHaveLength(1)
    const savedRecord = result.current.sessions[0]
    expect(savedRecord.analysisRequest).toBeUndefined()
  })

  it('loads sessions with analysisRequest from localStorage', () => {
    const sessionId = 'session-4'
    const record: SessionRecord = {
      id: sessionId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      businessUrl: 'https://example.com',
      overallScore: 8.0,
      results: mockAnalysisResult,
      analysisRequest: mockAnalysisRequest,
    }

    localStorage.setItem('posai_session_' + sessionId, JSON.stringify(record))

    const { result } = renderHook(() => useSessionStorage())

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].analysisRequest).toEqual(mockAnalysisRequest)
  })

  it('loads old records without analysisRequest field safely (backward-compatible)', () => {
    const sessionId = 'session-5'
    const oldRecord = {
      id: sessionId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      businessUrl: 'https://old.com',
      overallScore: 7.0,
      results: mockAnalysisResult,
      // Note: no analysisRequest field
    }

    localStorage.setItem('posai_session_' + sessionId, JSON.stringify(oldRecord))

    const { result } = renderHook(() => useSessionStorage())

    expect(result.current.sessions).toHaveLength(1)
    const loaded = result.current.sessions[0]
    expect(loaded.id).toBe(sessionId)
    expect(loaded.businessUrl).toBe('https://old.com')
    expect(loaded.analysisRequest).toBeUndefined()
  })

  it('loadSession returns null for non-existent session', () => {
    const { result } = renderHook(() => useSessionStorage())

    const loaded = result.current.loadSession('nonexistent')
    expect(loaded).toBeNull()
  })

  it('loadSession returns session with analysisRequest', () => {
    const sessionId = 'session-6'
    const record: SessionRecord = {
      id: sessionId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      businessUrl: 'https://example.com',
      overallScore: 8.0,
      results: mockAnalysisResult,
      analysisRequest: mockAnalysisRequest,
    }

    localStorage.setItem('posai_session_' + sessionId, JSON.stringify(record))

    const { result } = renderHook(() => useSessionStorage())

    const loaded = result.current.loadSession(sessionId)
    expect(loaded).not.toBeNull()
    expect(loaded?.analysisRequest).toEqual(mockAnalysisRequest)
  })
})
