import type { AnalysisRequest, AnalysisResponse } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function startAnalysis(
  req: AnalysisRequest
): Promise<{ session_id: string; status: string }> {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    throw new Error(`Failed to start analysis: ${response.statusText}`)
  }

  return response.json()
}

export async function getAnalysisStatus(sessionId: string): Promise<AnalysisResponse> {
  const response = await fetch(`${API_URL}/api/status/${sessionId}`)

  if (!response.ok) {
    throw new Error(`Failed to get analysis status: ${response.statusText}`)
  }

  return response.json()
}
