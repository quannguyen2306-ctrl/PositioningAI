import { useState, useEffect, useCallback } from 'react'
import type { AnalysisResult, AnalysisRequest } from '../api/types'

const SESSION_KEY_PREFIX = 'posai_session_'
const MAX_SESSIONS = 10
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface SessionRecord {
  id: string
  timestamp: number
  expiresAt: number
  businessUrl: string
  overallScore: number
  results: AnalysisResult
  analysisRequest?: AnalysisRequest
}

export interface UseSessionStorageReturn {
  sessions: SessionRecord[]
  saveSession: (id: string, businessUrl: string, overallScore: number, results: AnalysisResult, analysisRequest?: AnalysisRequest) => void
  loadSession: (id: string) => SessionRecord | null
  deleteSession: (id: string) => void
  clearAll: () => void
}

function loadAllFromStorage(): SessionRecord[] {
  const result: SessionRecord[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(SESSION_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key)
          if (data) result.push(JSON.parse(data) as SessionRecord)
        } catch {
          // skip malformed entries
        }
      }
    }
  } catch {
    // localStorage unavailable
  }
  return result
}

export default function useSessionStorage(): UseSessionStorageReturn {
  const [sessions, setSessions] = useState<SessionRecord[]>([])

  useEffect(() => {
    const all = loadAllFromStorage()
    const now = Date.now()
    const valid = all
      .filter((s) => s.expiresAt > now)
      .sort((a, b) => b.timestamp - a.timestamp)

    // Prune expired from storage
    all.forEach((s) => {
      if (s.expiresAt <= now) {
        try { localStorage.removeItem(SESSION_KEY_PREFIX + s.id) } catch { /* ignore */ }
      }
    })

    setSessions(valid)
  }, [])

  const saveSession = useCallback(
    (id: string, businessUrl: string, overallScore: number, results: AnalysisResult, analysisRequest?: AnalysisRequest) => {
      try {
        const now = Date.now()
        const record: SessionRecord = {
          id,
          timestamp: now,
          expiresAt: now + TTL_MS,
          businessUrl,
          overallScore,
          results,
          analysisRequest,
        }
        localStorage.setItem(SESSION_KEY_PREFIX + id, JSON.stringify(record))

        setSessions((prev) => {
          const updated = [record, ...prev.filter((s) => s.id !== id)]
          if (updated.length > MAX_SESSIONS) {
            const evicted = updated[updated.length - 1]
            try { localStorage.removeItem(SESSION_KEY_PREFIX + evicted.id) } catch { /* ignore */ }
            return updated.slice(0, MAX_SESSIONS)
          }
          return updated
        })
      } catch {
        // quota exceeded or unavailable — silently ignore
      }
    },
    []
  )

  const loadSession = useCallback((id: string): SessionRecord | null => {
    try {
      const data = localStorage.getItem(SESSION_KEY_PREFIX + id)
      if (!data) return null
      const record = JSON.parse(data) as SessionRecord
      if (record.expiresAt <= Date.now()) {
        try { localStorage.removeItem(SESSION_KEY_PREFIX + id) } catch { /* ignore */ }
        return null
      }
      return record
    } catch {
      return null
    }
  }, [])

  const deleteSession = useCallback((id: string) => {
    try { localStorage.removeItem(SESSION_KEY_PREFIX + id) } catch { /* ignore */ }
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setSessions((prev) => {
      prev.forEach((s) => {
        try { localStorage.removeItem(SESSION_KEY_PREFIX + s.id) } catch { /* ignore */ }
      })
      return []
    })
  }, [])

  return { sessions, saveSession, loadSession, deleteSession, clearAll }
}
