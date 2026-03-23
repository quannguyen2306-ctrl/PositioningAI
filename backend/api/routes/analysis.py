"""
analysis.py
-----------
Analysis endpoints:
  - POST /api/analysis/start      : Initiate a new analysis
  - GET /api/analysis/{session_id}: Fetch analysis status/results
  - GET /analyse/stream           : SSE real-time pipeline stream
  - WebSocket /ws/analysis/{session_id}: Real-time progress updates
  - POST /api/content-lab/evaluate: Re-evaluate new content in existing session
"""

import asyncio
import json
import logging
import numpy as np

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from schemas.request import AnalysisRequest, ContentLabRequest, RecommendationRequest
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
    google_key: str = Query(""),
    anthropic_key: str = Query(""),
    perplexity_key: str = Query(""),
):
    """
    SSE endpoint: runs the full analysis pipeline and streams events.
    Events: progress, profile, competitors, questions, eval, pca,
            archetype, blue_ocean, recommendations, complete, error, heartbeat.
    """
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def emit(event: dict):
        loop.call_soon_threadsafe(queue.put_nowait, event)

    parsed_questions = [q for q in custom_questions.split("||") if q] if custom_questions else None

    # Generate a session ID so Content Lab can reference this run
    session_id = store.create_session()

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
                google_api_key=google_key,
                anthropic_api_key=anthropic_key,
                perplexity_api_key=perplexity_key,
            )
            result = pipeline.run()
            store.set_result(session_id, result)
            # Persist pipeline data for Content Lab reuse
            store.set_pipeline_data(session_id, pipeline.get_pipeline_data_for_content_lab())
            # Emit session_id so frontend can store it for Content Lab calls
            emit({"event": "session_id", "session_id": session_id})
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
                google_api_key=request.google_key or "",
                anthropic_api_key=request.anthropic_key or "",
                perplexity_api_key=request.perplexity_key or "",
            )
            result = pipeline.run()
            store.set_result(session_id, result)
            store.set_pipeline_data(session_id, pipeline.get_pipeline_data_for_content_lab())
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


@router.post("/api/content-lab/evaluate")
async def content_lab_evaluate(request: ContentLabRequest):
    """
    Re-evaluate new content within an existing session's competitive context.

    Takes new text content, replaces user chunks in the existing vector store,
    re-runs the RAG evaluation in parallel, and re-projects using the already
    fitted PCA — no re-scraping or re-embedding of competitors needed.
    """
    session = store.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pipeline_data = store.get_pipeline_data(request.session_id)
    if not pipeline_data:
        raise HTTPException(
            status_code=400,
            detail="Pipeline data not available. Re-run the analysis first.",
        )

    loop = asyncio.get_running_loop()

    def run():
        from openai import OpenAI
        from pipeline.ingestion import chunk_text
        from pipeline.blue_ocean import classify_archetype, find_blue_ocean_zones
        from pipeline.rag_evaluator import run_evaluation

        client = OpenAI(api_key=request.openai_key)
        embedding_store = pipeline_data["store"]
        fitted_pca = pipeline_data["pca"]
        fitted_scaler = pipeline_data["scaler"]
        questions = pipeline_data["questions"]
        business_context = pipeline_data["business_context"]

        # Chunk new content and replace user chunks in store
        chunks = chunk_text(request.new_content)
        if not chunks:
            chunks = [request.new_content[:2000]]  # fallback: treat as single chunk

        embedding_store.replace_user_chunks(
            chunks,
            source="user",
            url="content-lab",
            domain="",
        )

        # Re-run evaluation with parallel execution
        eval_results = run_evaluation(
            questions,
            embedding_store,
            client,
            business_context.get("business_name", "Your Business"),
        )

        # Re-project all embeddings using the existing fitted PCA (no refit)
        all_embeddings, all_meta = embedding_store.get_all_for_pca()
        scaled = fitted_scaler.transform(all_embeddings)
        new_coords = fitted_pca.transform(scaled)

        # Re-classify archetype and blue ocean zones
        archetype = classify_archetype(
            new_coords,
            all_meta,
            eval_results["results"],
            user_domain="",
        )
        blue_ocean_zones = find_blue_ocean_zones(new_coords, all_meta)

        # Build PCA points in same format as main pipeline
        pca_points = [
            {
                "components": new_coords[i].tolist(),
                "source": all_meta[i]["source"],
                "domain": all_meta[i]["domain"],
                "text": all_meta[i]["text"],
            }
            for i in range(len(new_coords))
        ]

        return {
            "eval": {
                **eval_results,
                "mention_rate": round(eval_results["mention_rate"] / 100, 4),
            },
            "pca_points": pca_points,
            "archetype": archetype,
            "blue_ocean_zones": blue_ocean_zones,
            "blue_ocean_opportunities": eval_results.get("blue_ocean_opportunities", []),
        }

    result = await loop.run_in_executor(None, run)
    return result


@router.post("/api/recommendation/generate")
async def recommendation_generate(request: RecommendationRequest):
    """
    Generate targeted content recommendations to move toward a chosen map position.

    Uses the session's PCA axis interpretations and business context to call OpenAI
    and produce 4-5 concrete content recommendations plus a 250-word content draft
    that the user can paste into the Content Lab to verify the positional shift.
    """
    session = store.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pipeline_data = store.get_pipeline_data(request.session_id)
    if not pipeline_data:
        raise HTTPException(status_code=400, detail="Session pipeline data not available. Run a full analysis first.")

    loop = asyncio.get_running_loop()

    def run():
        import json as _json
        from openai import OpenAI

        client = OpenAI(api_key=request.openai_key)
        business_context = pipeline_data.get("business_context", {})
        interpretations = pipeline_data.get("interpretations", [])

        biz_name = business_context.get("business_name", "Your Business")
        industry = business_context.get("industry", "")
        value_prop = business_context.get("unique_value_prop", "")

        dx = request.target_x - request.current_x
        dy = request.target_y - request.current_y

        def axis_direction(value: float, interp: dict) -> str:
            if abs(value) < 0.05:
                return f"neutral on \"{interp.get('dimension_name', 'this axis')}\""
            end = interp.get("positive_end") if value > 0 else interp.get("negative_end")
            return f"toward \"{end}\""

        x_interp = interpretations[0] if interpretations else {}
        y_interp = interpretations[1] if len(interpretations) > 1 else {}

        current_desc = (
            f"{axis_direction(request.current_x, x_interp)}"
            + (f", {axis_direction(request.current_y, y_interp)}" if y_interp else "")
        )
        target_desc = (
            f"{axis_direction(request.target_x, x_interp)}"
            + (f", {axis_direction(request.target_y, y_interp)}" if y_interp else "")
        )
        move_desc = (
            f"{axis_direction(dx, x_interp)}"
            + (f" and {axis_direction(dy, y_interp)}" if y_interp else "")
        )

        axis_context = ""
        if x_interp:
            axis_context += (
                f"\n- Axis 1 (horizontal): \"{x_interp.get('negative_end')}\" ↔ \"{x_interp.get('positive_end')}\""
                f" ({x_interp.get('variance_explained', '?')}% of variance)"
            )
        if y_interp:
            axis_context += (
                f"\n- Axis 2 (vertical): \"{y_interp.get('negative_end')}\" ↔ \"{y_interp.get('positive_end')}\""
                f" ({y_interp.get('variance_explained', '?')}% of variance)"
            )

        prompt = f"""You are an expert GEO (Generative Engine Optimization) content strategist.

Business: {biz_name}
Industry: {industry}
Value proposition: {value_prop}

Semantic map context (PCA axes describe the AI-retrievable content space):{axis_context}

Current positioning: {current_desc}
Target positioning: {target_desc}
Direction of required content shift: {move_desc}

The business wants to claim a new territory on their AI visibility map by publishing content that shifts their semantic footprint toward the target position.

Generate:
1. Exactly 5 specific, actionable content recommendations (topics, angles, content types) that would shift the semantic position from current toward target.
2. A 250-word content draft (homepage copy / about page style) that embodies the target positioning and could be pasted directly into a content evaluation tool.

Respond ONLY with valid JSON (no markdown, no code fences):
{{"recommendations": ["...", "...", "...", "...", "..."], "content_draft": "..."}}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        try:
            data = _json.loads(raw)
        except Exception:
            data = {"recommendations": [], "content_draft": raw}

        return {
            "recommendations": data.get("recommendations", []),
            "content_draft": data.get("content_draft", ""),
        }

    result = await loop.run_in_executor(None, run)
    return result


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
