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
  const maxRetries = 3

  useEffect(() => {
    if (!sessionId) return

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
          onError('WebSocket connection error')
        }

        ws.onclose = () => {
          console.log('WebSocket closed')
          // Attempt to reconnect
          if (retriesRef.current < maxRetries) {
            retriesRef.current += 1
            setTimeout(() => {
              connectWebSocket()
            }, 1000 * retriesRef.current)
          } else {
            onError('WebSocket connection lost after multiple retries')
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
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [sessionId, onProgress, onComplete, onError])
}
