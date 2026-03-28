import type {
  AnalysisRequest,
  BusinessProfile,
  EvalSummary,
  PcaInterpretation,
  Recommendations,
  CompDoc,
  MultiEngineResult,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

const STALL_TIMEOUT_MS = 120_000 // 2 minutes without any SSE event → give up

export type { PcaPoint }

export interface SseCallbacks {
  onProgress: (pct: number, step: string) => void
  onProfile: (data: BusinessProfile) => void
  onCompetitors: (urls: string[]) => void
  onQuestions: (questions: string[]) => void
  onEval: (evalData: EvalSummary) => void
  onPca: (points: PcaPoint[], interpretations: PcaInterpretation[]) => void
  onArchetype: (archetype: Archetype) => void
  onBlueOcean: (zones: BlueOceanZone[], opportunities: BlueOceanOpportunity[]) => void
  onSessionId: (sessionId: string) => void
  onRecommendations: (recs: Recommendations) => void
  onMultiEngine: (data: MultiEngineResult) => void
  onComplete: () => void
  onError: (msg: string) => void
}

/** Opens an SSE stream to /analyse/stream and fires callbacks as events arrive.
 *  Returns an abort function to cancel the stream. */
export function streamAnalysis(req: AnalysisRequest, callbacks: SseCallbacks): () => void {
  const controller = new AbortController()

  let stallTimer: ReturnType<typeof setTimeout> | null = null

  const resetStallTimer = () => {
    if (stallTimer !== null) clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      callbacks.onError('Analysis stalled — no response for 2 minutes. Please try again.')
      controller.abort()
    }, STALL_TIMEOUT_MS)
  }

  const clearStallTimer = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer)
      stallTimer = null
    }
  }

  fetch(`${BASE}/analyse/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      url: req.url,
      openai_key: req.openai_key,
      serper_key: req.serper_key,
      n_competitors: req.n_competitors,
      n_questions: req.n_questions,
      custom_questions: (req.custom_questions ?? []).join('||'),
      google_key: req.google_key ?? '',
      anthropic_key: req.anthropic_key ?? '',
      perplexity_key: req.perplexity_key ?? '',
    }),
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        callbacks.onError(`Server error: ${res.status} ${res.statusText}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      resetStallTimer()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const payload = JSON.parse(dataLine.slice(6))
            resetStallTimer()

            switch (payload.event) {
              case 'heartbeat':
                break
              case 'progress':
                callbacks.onProgress(payload.pct, payload.step)
                break
              case 'profile':
                callbacks.onProfile(payload.data as BusinessProfile)
                break
              case 'competitors':
                callbacks.onCompetitors(payload.competitors as string[])
                break
              case 'questions':
                callbacks.onQuestions(payload.questions as string[])
                break
              case 'eval':
                callbacks.onEval(payload.eval as EvalSummary)
                break
              case 'pca':
                callbacks.onPca(
                  payload.points as PcaPoint[],
                  payload.interpretations as PcaInterpretation[]
                )
                break
              case 'archetype':
                callbacks.onArchetype(payload.archetype as Archetype)
                break
              case 'blue_ocean':
                callbacks.onBlueOcean(
                  payload.zones as BlueOceanZone[],
                  payload.opportunities as BlueOceanOpportunity[]
                )
                break
              case 'session_id':
                callbacks.onSessionId(payload.session_id as string)
                break
              case 'recommendations':
                callbacks.onRecommendations(payload.recs as Recommendations)
                break
              case 'multi_engine':
                callbacks.onMultiEngine(payload.data as MultiEngineResult)
                break
              case 'complete':
                callbacks.onComplete()
                break
              case 'error':
                callbacks.onError(payload.message as string)
                break
            }
          } catch {
            // ignore malformed frames
          }
        }
      }

      clearStallTimer()
    })
    .catch((err: Error) => {
      clearStallTimer()
      if (err.name !== 'AbortError') {
        callbacks.onError(String(err))
      }
    })

  return () => {
    clearStallTimer()
    controller.abort()
  }
}

/** Build a minimal CompDoc list from competitor URLs returned by the SSE event. */
export function urlsToCompDocs(urls: string[]): CompDoc[] {
  return urls.map((url) => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '')
      return { url, domain, text: '' }
    } catch {
      return { url, domain: url, text: '' }
    }
  })
}

/** Generate targeted content recommendations toward a chosen map position. */
export async function generateRecommendation(
  sessionId: string,
  targetX: number,
  targetY: number,
  currentX: number,
  currentY: number,
  openaiKey: string
) {
  const res = await fetch(`${BASE}/api/recommendation/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      target_x: targetX,
      target_y: targetY,
      current_x: currentX,
      current_y: currentY,
      openai_key: openaiKey,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Recommendation error: ${res.status}`)
  }
  return res.json()
}

/** Submit new content to the Content Lab endpoint for re-evaluation. */
export async function submitContentLab(
  sessionId: string,
  newContent: string,
  openaiKey: string
) {
  const res = await fetch(`${BASE}/api/content-lab/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      new_content: newContent,
      openai_key: openaiKey,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Content Lab error: ${res.status}`)
  }
  return res.json()
}
