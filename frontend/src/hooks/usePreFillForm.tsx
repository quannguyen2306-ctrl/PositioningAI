import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AnalysisRequest } from '../api/types'

interface PreFillContextType {
  preFillRequest: AnalysisRequest | null
  setPreFillRequest: (request: AnalysisRequest | null) => void
}

const PreFillContext = createContext<PreFillContextType | undefined>(undefined)

export function PreFillProvider({ children }: { children: ReactNode }) {
  const [preFillRequest, setPreFillRequest] = useState<AnalysisRequest | null>(null)

  const value: PreFillContextType = {
    preFillRequest,
    setPreFillRequest,
  }

  return (
    <PreFillContext.Provider value={value}>
      {children}
    </PreFillContext.Provider>
  )
}

export function usePreFillForm() {
  const context = useContext(PreFillContext)
  if (context === undefined) {
    throw new Error('usePreFillForm must be used within a PreFillProvider')
  }

  return {
    preFillRequest: context.preFillRequest,
    clear: () => context.setPreFillRequest(null),
  }
}

export function useSetPreFillForm() {
  const context = useContext(PreFillContext)
  if (context === undefined) {
    throw new Error('useSetPreFillForm must be used within a PreFillProvider')
  }

  return context.setPreFillRequest
}
