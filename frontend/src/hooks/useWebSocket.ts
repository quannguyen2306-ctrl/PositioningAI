import { useEffect, useRef } from 'react'
import type { ProgressEvent, AnalysisResult, WsEvent } from '../api/types'

export function useWebSocket(
  sessionId: string | null,
  onProgress: (e: ProgressEvent) => void,
  onComplete: (result: AnalysisResult) => void,
  onError: (msg: string) => void
): void {
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const intentionalCloseRef = useRef(false)
  const maxRetries = 7

  useEffect(() => {
    if (!sessionId) return

    intentionalCloseRef.current = false
    retriesRef.current = 0

    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

    const connectWebSocket = () => {
      try {
        const url = `${wsUrl}/ws/analysis/${sessionId}`
        const ws = new WebSocket(url)

        ws.onopen = () => {
          console.log('WebSocket connected')
          retriesRef.current = 0
        }

        ws.onmessage = (event) => {
          try {
            const wsEvent: WsEvent = JSON.parse(event.data)

            if (wsEvent.type === 'heartbeat') {
              // Keepalive — reset retry counter, ignore otherwise
              retriesRef.current = 0
              return
            }

            if (wsEvent.type === 'progress') {
              onProgress({
                percent: wsEvent.percent,
                message: wsEvent.message,
                status: 'processing',
              })
            } else if (wsEvent.type === 'result') {
              onComplete(wsEvent.data)
            } else if (wsEvent.type === 'error') {
              onError(wsEvent.message)
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        ws.onerror = (event) => {
          console.error('WebSocket error:', event)
          // onclose will fire after onerror and handle retry logic
        }

        ws.onclose = () => {
          if (intentionalCloseRef.current) return

          const attempt = retriesRef.current + 1
          console.log(`WebSocket closed — retry ${attempt}/${maxRetries}`)

          if (retriesRef.current < maxRetries) {
            retriesRef.current += 1
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped) ± 200ms jitter
            const base = Math.min(1000 * Math.pow(2, retriesRef.current - 1), 16000)
            const jitter = Math.random() * 400 - 200
            setTimeout(connectWebSocket, base + jitter)
          } else {
            onError('Connection lost. Please refresh and try again.')
          }
        }

        wsRef.current = ws
      } catch (err) {
        console.error('Failed to create WebSocket:', err)
        onError('Failed to connect to server')
      }
    }

    connectWebSocket()

    return () => {
      intentionalCloseRef.current = true
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [sessionId, onProgress, onComplete, onError])
}
