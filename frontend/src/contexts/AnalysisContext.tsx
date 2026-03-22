import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { streamAnalysis, urlsToCompDocs, submitContentLab } from '../api/client'
import type {
  AnalysisRequest,
  AnalysisResult,
  BusinessProfile,
  EvalSummary,
  PcaInterpretation,
  Recommendations,
  ProgressEvent,
  CompDoc,
  Archetype,
  BlueOceanZone,
  BlueOceanOpportunity,
  ContentLabResult,
} from '../api/types'
import useSessionStorage from '../hooks/useSessionStorage'
import type { SessionRecord } from '../hooks/useSessionStorage'

export type { SessionRecord }

interface AnalysisContextType {
  sessionId: string | null
  backendSessionId: string | null  // the backend UUID for Content Lab
  results: AnalysisResult | null
  progress: ProgressEvent | null
  error: string | null
  analysisRequest: AnalysisRequest | null
  sessionHistory: SessionRecord[]
  contentLabResult: ContentLabResult | null
  contentLabLoading: boolean
  contentLabError: string | null
  startAnalysis: (req: AnalysisRequest) => Promise<string>
  clearSession: () => void
  restoreSession: (record: SessionRecord) => void
  deleteSession: (id: string) => void
  clearAllSessions: () => void
  setProgress: (progress: ProgressEvent) => void
  setResults: (results: AnalysisResult) => void
  setError: (error: string | null) => void
  submitToContentLab: (newContent: string) => Promise<void>
  clearContentLab: () => void
  openaiKeyRef: React.RefObject<string>
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisRequest, setAnalysisRequest] = useState<AnalysisRequest | null>(null)
  const [contentLabResult, setContentLabResult] = useState<ContentLabResult | null>(null)
  const [contentLabLoading, setContentLabLoading] = useState(false)
  const [contentLabError, setContentLabError] = useState<string | null>(null)

  const { sessions: sessionHistory, saveSession, deleteSession, clearAll: clearAllSessions } = useSessionStorage()

  const abortRef = useRef<(() => void) | null>(null)
  const openaiKeyRef = useRef<string>('')

  const handleStartAnalysis = useCallback(async (req: AnalysisRequest): Promise<string> => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }

    setError(null)
    setProgress({ percent: 0, message: 'Diving in…', status: 'processing' })
    setResults(null)
    setContentLabResult(null)
    setContentLabError(null)
    setAnalysisRequest(req)
    openaiKeyRef.current = req.openai_key

    const sid = String(Date.now())
    setSessionId(sid)

    const acc: {
      biz?: BusinessProfile
      comp_docs?: CompDoc[]
      eval?: EvalSummary
      coords?: number[][]
      pca_meta?: Array<{ source: string; url: string; domain: string }>
      interps?: PcaInterpretation[]
      recs?: Recommendations
      archetype?: Archetype
      blue_ocean_zones?: BlueOceanZone[]
      blue_ocean_opportunities?: BlueOceanOpportunity[]
    } = {}

    const abort = streamAnalysis(req, {
      onProgress: (pct, step) =>
        setProgress({ percent: pct, message: step, status: 'processing' }),

      onProfile: (data) => { acc.biz = data },

      onCompetitors: (urls) => { acc.comp_docs = urlsToCompDocs(urls) },

      onQuestions: () => { /* questions are part of eval results */ },

      onEval: (evalData) => { acc.eval = evalData },

      onPca: (points, interpretations) => {
        acc.coords = points.map((p) => p.components)
        acc.pca_meta = points.map((p) => ({ source: p.source, url: '', domain: p.domain }))
        acc.interps = interpretations
      },

      onArchetype: (archetype) => { acc.archetype = archetype },

      onBlueOcean: (zones, opportunities) => {
        acc.blue_ocean_zones = zones
        acc.blue_ocean_opportunities = opportunities
      },

      onSessionId: (id) => { setBackendSessionId(id) },

      onRecommendations: (recs) => { acc.recs = recs },

      onComplete: () => {
        setProgress({ percent: 100, message: 'Ocean mapped!', status: 'completed' })
        if (acc.biz && acc.eval && acc.coords && acc.recs) {
          const result: AnalysisResult = {
            biz: acc.biz,
            comp_docs: acc.comp_docs ?? [],
            eval: acc.eval,
            coords: acc.coords,
            pca_meta: acc.pca_meta ?? [],
            interps: acc.interps ?? [],
            recs: acc.recs,
            archetype: acc.archetype,
            blue_ocean_zones: acc.blue_ocean_zones ?? [],
            blue_ocean_opportunities: acc.blue_ocean_opportunities ?? [],
          }
          setResults(result)
          saveSession(sid, req.url, acc.eval.avg_visibility_score, result)
        }
      },

      onError: (msg) => {
        setError(msg)
        setProgress(null)
      },
    })

    abortRef.current = abort
    return sid
  }, [])

  const handleClearSession = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setSessionId(null)
    setBackendSessionId(null)
    setResults(null)
    setProgress(null)
    setError(null)
    setAnalysisRequest(null)
    setContentLabResult(null)
    setContentLabError(null)
  }, [])

  const restoreSession = useCallback((record: SessionRecord) => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setSessionId(record.id)
    setResults(record.results)
    setProgress(null)
    setError(null)
    setAnalysisRequest(null)
    setContentLabResult(null)
    setContentLabError(null)
  }, [])

  const submitToContentLab = useCallback(async (newContent: string) => {
    if (!backendSessionId) {
      setContentLabError('No active session. Please run an analysis first.')
      return
    }
    if (!openaiKeyRef.current) {
      setContentLabError('OpenAI key not available. Please restart the analysis.')
      return
    }

    setContentLabLoading(true)
    setContentLabError(null)

    try {
      const result = await submitContentLab(backendSessionId, newContent, openaiKeyRef.current)
      setContentLabResult(result as ContentLabResult)
    } catch (err) {
      setContentLabError(err instanceof Error ? err.message : String(err))
    } finally {
      setContentLabLoading(false)
    }
  }, [backendSessionId])

  const clearContentLab = useCallback(() => {
    setContentLabResult(null)
    setContentLabError(null)
  }, [])

  const value: AnalysisContextType = {
    sessionId,
    backendSessionId,
    results,
    progress,
    error,
    analysisRequest,
    sessionHistory,
    contentLabResult,
    contentLabLoading,
    contentLabError,
    startAnalysis: handleStartAnalysis,
    clearSession: handleClearSession,
    restoreSession,
    deleteSession,
    clearAllSessions,
    setProgress,
    setResults,
    setError,
    submitToContentLab,
    clearContentLab,
    openaiKeyRef,
  }

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis(): AnalysisContextType {
  const context = useContext(AnalysisContext)
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return context
}
