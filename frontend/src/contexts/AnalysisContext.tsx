import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { streamAnalysis, urlsToCompDocs } from '../api/client'
import type {
  AnalysisRequest,
  AnalysisResult,
  BusinessProfile,
  EvalSummary,
  PcaInterpretation,
  Recommendations,
  ProgressEvent,
  CompDoc,
} from '../api/types'

interface AnalysisContextType {
  sessionId: string | null
  results: AnalysisResult | null
  progress: ProgressEvent | null
  error: string | null
  analysisRequest: AnalysisRequest | null
  startAnalysis: (req: AnalysisRequest) => Promise<string>
  clearSession: () => void
  setProgress: (progress: ProgressEvent) => void
  setResults: (results: AnalysisResult) => void
  setError: (error: string | null) => void
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisRequest, setAnalysisRequest] = useState<AnalysisRequest | null>(null)

  // Holds an abort function so we can cancel a running stream
  const abortRef = useRef<(() => void) | null>(null)

  const handleStartAnalysis = useCallback(async (req: AnalysisRequest): Promise<string> => {
    // Cancel any in-flight stream
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }

    setError(null)
    setProgress({ percent: 0, message: 'Starting…', status: 'processing' })
    setResults(null)
    setAnalysisRequest(req)

    // Use a simple counter as session id (stable across re-renders, unique per run)
    const sid = String(Date.now())
    setSessionId(sid)

    // Accumulated partial results
    const acc: {
      biz?: BusinessProfile
      comp_docs?: CompDoc[]
      eval?: EvalSummary
      coords?: number[][]
      pca_meta?: Array<{ source: string; url: string; domain: string }>
      interps?: PcaInterpretation[]
      recs?: Recommendations
    } = {}

    const abort = streamAnalysis(req, {
      onProgress: (pct, step) =>
        setProgress({ percent: pct, message: step, status: 'processing' }),

      onProfile: (data) => {
        acc.biz = data
      },

      onCompetitors: (urls) => {
        acc.comp_docs = urlsToCompDocs(urls)
      },

      onQuestions: () => {
        // no-op — questions are part of eval results
      },

      onEval: (evalData) => {
        acc.eval = evalData
      },

      onPca: (points, interpretations) => {
        acc.coords = points.map((p) => p.components)
        acc.pca_meta = points.map((p) => ({ source: p.source, url: '', domain: p.domain }))
        acc.interps = interpretations
      },

      onRecommendations: (recs) => {
        acc.recs = recs
      },

      onComplete: () => {
        setProgress({ percent: 100, message: 'Analysis complete!', status: 'completed' })
        if (acc.biz && acc.eval && acc.coords && acc.recs) {
          setResults({
            biz: acc.biz,
            comp_docs: acc.comp_docs ?? [],
            eval: acc.eval,
            coords: acc.coords,
            pca_meta: acc.pca_meta ?? [],
            interps: acc.interps ?? [],
            recs: acc.recs,
          })
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
    setResults(null)
    setProgress(null)
    setError(null)
    setAnalysisRequest(null)
  }, [])

  const value: AnalysisContextType = {
    sessionId,
    results,
    progress,
    error,
    analysisRequest,
    startAnalysis: handleStartAnalysis,
    clearSession: handleClearSession,
    setProgress,
    setResults,
    setError,
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
