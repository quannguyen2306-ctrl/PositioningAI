"""
analysis.py
-----------
Analysis endpoints:
  - POST /api/analysis/start      : Initiate a new analysis
  - GET /api/analysis/{session_id}: Fetch analysis status/results
  - GET /analyse/stream           : SSE real-time pipeline stream
  - WebSocket /ws/analysis/{session_id}: Real-time progress updates
"""

import asyncio
import json
import logging
import numpy as np

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from schemas.request import AnalysisRequest
from schemas.response import AnalysisResponse, StatusEnum
from cache.session_store import store
from pipeline.orchestrator import AnalysisPipeline

logger = logging.getLogger(__name__)
router = APIRouter()

_HEARTBEAT_INTERVAL = 10  # seconds
_WS_POLL_INTERVAL = 0.5   # seconds
_WS_MAX_WAIT = 300        # seconds


class _NumpyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super().default(o)


@router.get("/analyse/stream")
async def stream_analysis(
    url: str = Query(...),
    openai_key: str = Query(...),
    serper_key: str = Query(...),
    n_competitors: int = Query(5),
    n_questions: int = Query(10),
    custom_questions: str = Query(""),
):
    """
    SSE endpoint: runs the full analysis pipeline and streams events.
    Events: progress, profile, competitors, questions, eval, pca, recommendations, complete, error, heartbeat.
    """
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def emit(event: dict):
        loop.call_soon_threadsafe(queue.put_nowait, event)

    parsed_questions = [q for q in custom_questions.split("||") if q] if custom_questions else None

    def run():
        try:
            pipeline = AnalysisPipeline(
                business_url=url,
                openai_api_key=openai_key,
                serper_api_key=serper_key,
                n_competitors=n_competitors,
                n_questions=n_questions,
                custom_questions=parsed_questions,
                progress_callback=lambda pct, step: emit({"event": "progress", "pct": pct, "step": step}),
                event_callback=emit,
            )
            pipeline.run()
        except Exception:
            logger.error("SSE pipeline error", exc_info=True)
            emit({"event": "error", "message": "Analysis failed. Please try again."})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

    loop.run_in_executor(None, run)

    async def generate():
        # Heartbeat task: keeps the SSE connection alive during long pipeline stages
        async def _heartbeat():
            while True:
                await asyncio.sleep(_HEARTBEAT_INTERVAL)
                queue.put_nowait({"event": "heartbeat"})

        heartbeat_task = asyncio.create_task(_heartbeat())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    return
                yield f"data: {json.dumps(item, cls=_NumpyEncoder)}\n\n"
        finally:
            heartbeat_task.cancel()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/analysis/start", response_model=AnalysisResponse)
async def start_analysis(request: AnalysisRequest):
    """
    Initiate a new analysis.
    Returns: session_id and queued status.
    """
    session_id = store.create_session()
    loop = asyncio.get_running_loop()

    def run():
        try:
            pipeline = AnalysisPipeline(
                business_url=str(request.url),
                openai_api_key=request.openai_key,
                serper_api_key=request.serper_key,
                n_competitors=request.n_competitors,
                n_questions=request.n_questions,
                custom_questions=request.custom_questions,
                progress_callback=lambda pct, step: store.update_progress(session_id, pct, step),
            )
            result = pipeline.run()
            store.set_result(session_id, result)
        except Exception as e:
            logger.error("Pipeline error for session %s", session_id, exc_info=True)
            store.set_error(session_id, str(e))

    loop.run_in_executor(None, run)

    return AnalysisResponse(
        session_id=session_id,
        status=StatusEnum.QUEUED,
    )


@router.get("/api/analysis/{session_id}", response_model=AnalysisResponse)
async def get_analysis(session_id: str):
    """
    Fetch the current status and results of an analysis.
    Returns: AnalysisResponse with status and optional result/error.
    """
    session = store.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    response = AnalysisResponse(
        session_id=session_id,
        status=session["status"],
    )

    if session.get("result"):
        response.result = session["result"]

    if session.get("error"):
        response.error = session["error"]

    if session.get("progress"):
        response.progress = session["progress"]

    return response


@router.websocket("/ws/analysis/{session_id}")
async def websocket_analysis(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time progress updates.

    Message types sent to client:
      {type: "progress", percent: int, message: str}
      {type: "heartbeat"}
      {type: "result", data: dict}
      {type: "error", message: str}
    """
    await websocket.accept()

    # Lazy session cleanup (non-blocking)
    store.cleanup_expired_sessions()

    session = store.get_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found."})
        await websocket.close(code=4004)
        return

    last_percent = -1
    last_heartbeat_at = 0.0
    elapsed = 0.0

    try:
        while True:
            current = store.get_session(session_id)
            if not current:
                await websocket.send_json({"type": "error", "message": "Session expired."})
                break

            status = current.get("status", "queued")
            progress = current.get("progress", {})
            percent = progress.get("percent", 0)
            message = progress.get("message", "")

            # Send progress only when it changes
            if percent != last_percent:
                await websocket.send_json({
                    "type": "progress",
                    "percent": percent,
                    "message": message,
                })
                last_percent = percent
                last_heartbeat_at = elapsed  # reset heartbeat timer on real progress

            # Send heartbeat if no progress for _HEARTBEAT_INTERVAL seconds
            if elapsed - last_heartbeat_at >= _HEARTBEAT_INTERVAL:
                await websocket.send_json({"type": "heartbeat"})
                last_heartbeat_at = elapsed

            # Terminal states
            if status == StatusEnum.COMPLETED and current.get("result"):
                await websocket.send_json({
                    "type": "result",
                    "data": current["result"],
                })
                break

            if status == StatusEnum.FAILED:
                await websocket.send_json({
                    "type": "error",
                    "message": "Analysis failed. Please try again.",
                })
                break

            await asyncio.sleep(_WS_POLL_INTERVAL)
            elapsed += _WS_POLL_INTERVAL

            if elapsed >= _WS_MAX_WAIT:
                await websocket.send_json({
                    "type": "error",
                    "message": "Analysis timed out. Please try again.",
                })
                break

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.error("WebSocket handler error for session %s", session_id, exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": "An unexpected error occurred.",
            })
        except Exception:
            pass
