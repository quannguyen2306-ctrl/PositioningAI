import React, { createContext, useContext, useState, useCallback } from 'react'
import { startAnalysis as apiStartAnalysis } from '../api/client'
import type { AnalysisRequest, AnalysisResult, ProgressEvent } from '../api/types'

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

  const handleStartAnalysis = useCallback(async (req: AnalysisRequest): Promise<string> => {
    try {
      setError(null)
      setProgress(null)
      setResults(null)
      setAnalysisRequest(req)

      const response = await apiStartAnalysis(req)
      setSessionId(response.session_id)
      return response.session_id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start analysis'
      setError(message)
      throw err
    }
  }, [])

  const handleClearSession = useCallback(() => {
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
