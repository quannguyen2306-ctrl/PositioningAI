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

export interface PcaPoint {
  components: number[]
  source: string
  domain: string
  text: string
}

export interface SseCallbacks {
  onProgress: (pct: number, step: string) => void
  onProfile: (data: BusinessProfile) => void
  onCompetitors: (urls: string[]) => void
  onQuestions: (questions: string[]) => void
  onEval: (evalData: EvalSummary) => void
  onPca: (points: PcaPoint[], interpretations: PcaInterpretation[]) => void
  onRecommendations: (recs: Recommendations) => void
  onMultiEngine: (data: MultiEngineResult) => void
  onComplete: () => void
  onError: (msg: string) => void
}

/** Opens an SSE stream to /analyse/stream and fires callbacks as events arrive.
 *  Returns an abort function to cancel the stream. */
export function streamAnalysis(req: AnalysisRequest, callbacks: SseCallbacks): () => void {
  const params = new URLSearchParams({
    url: req.url,
    openai_key: req.openai_key,
    serper_key: req.serper_key,
    n_competitors: String(req.n_competitors),
    n_questions: String(req.n_questions),
    custom_questions: (req.custom_questions ?? []).join('||'),
    google_key: req.google_key ?? '',
    anthropic_key: req.anthropic_key ?? '',
    perplexity_key: req.perplexity_key ?? '',
  })

  const controller = new AbortController()

  // Stall detection: fire onError if no event arrives within STALL_TIMEOUT_MS
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

  fetch(`${BASE}/analyse/stream?${params}`, { signal: controller.signal })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        callbacks.onError(`Server error: ${res.status} ${res.statusText}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Start stall timer once the stream is open
      resetStallTimer()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by double newline
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const payload = JSON.parse(dataLine.slice(6))

            // Reset stall timer on every event, including heartbeat
            resetStallTimer()

            switch (payload.event) {
              case 'heartbeat':
                // Keepalive — no UI action needed
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
    const domain = new URL(url).hostname.replace(/^www\./, '')
    return { url, domain, text: '' }
  })
}
