"""
analysis.py
-----------
Analysis endpoints:
  - POST /api/analysis/start      : Initiate a new analysis
  - GET /api/analysis/{session_id}: Fetch analysis status/results
  - WebSocket /ws/analysis/{session_id}: Real-time progress updates
"""

import asyncio

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from schemas.request import AnalysisRequest
from schemas.response import AnalysisResponse, StatusEnum
from cache.session_store import store
from pipeline.orchestrator import AnalysisPipeline

router = APIRouter()


@router.post("/api/analysis/start", response_model=AnalysisResponse)
async def start_analysis(request: AnalysisRequest):
    """
    Initiate a new analysis.
    Returns: session_id and queued status.
    """
    # Create session
    session_id = store.create_session()

    # Store request for later (e.g., in a real app, queue this for background processing)
    # For now, we'll mark as queued and let WebSocket/polling fetch handle it
    store.update_progress(session_id, 0, "Analysis queued. Starting...")

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
    Waits for analysis to complete and streams progress events.
    """
    await websocket.accept()

    session = store.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    try:
        # Stream progress updates until completion or error
        while True:
            current = store.get_session(session_id)
            if not current:
                break

            status = current.get("status", StatusEnum.PROCESSING)

            # Send progress event
            if current.get("progress"):
                await websocket.send_json(current["progress"].dict())

            # If complete or error, close
            if status in (StatusEnum.COMPLETED, StatusEnum.FAILED):
                if status == StatusEnum.COMPLETED and current.get("result"):
                    await websocket.send_json({
                        "status": "completed",
                        "result": current["result"],
                    })
                elif status == StatusEnum.FAILED and current.get("error"):
                    await websocket.send_json({
                        "status": "failed",
                        "error": current["error"],
                    })
                break

            # Sleep briefly to avoid busy-waiting
            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))


# Note: In a production app, you'd need a background task runner
# (e.g., Celery, RQ, or asyncio.create_task) to actually execute
# the AnalysisPipeline. For now, this is the skeleton.
