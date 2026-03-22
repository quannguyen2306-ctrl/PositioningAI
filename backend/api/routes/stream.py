"""
stream.py
---------
SSE streaming endpoint for real-time analysis results.
GET /analyse/stream  — runs the full pipeline and streams events as SSE frames.
"""

import asyncio
import json
import queue
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from config import settings
from pipeline.orchestrator import AnalysisPipeline

router = APIRouter()


class _NumpyEncoder(json.JSONEncoder):
    """Handle NumPy types that the default encoder cannot serialize."""

    def default(self, o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super().default(o)
_executor = ThreadPoolExecutor(max_workers=4)


@router.get("/analyse/stream")
async def stream_analysis(
    url: str,
    n_competitors: int = 5,
    n_questions: int = 10,
    openai_key: str = "",
    serper_key: str = "",
    google_key: str = "",
    anthropic_key: str = "",
    perplexity_key: str = "",
    custom_questions: str = "",
):
    """Stream analysis results as Server-Sent Events."""

    # Resolve API keys (fall back to server-side settings)
    resolved_openai = openai_key or settings.openai_api_key
    resolved_serper = serper_key or settings.serper_api_key
    resolved_google = google_key or settings.google_api_key
    resolved_anthropic = anthropic_key or settings.anthropic_api_key
    resolved_perplexity = perplexity_key or settings.perplexity_api_key

    # Parse pipe-separated custom questions
    parsed_questions = (
        [q.strip() for q in custom_questions.split("||") if q.strip()]
        if custom_questions
        else None
    )

    # Thread-safe queue to bridge sync pipeline → async SSE generator
    q: queue.Queue = queue.Queue()

    def progress_cb(pct: int, msg: str):
        q.put({"event": "progress", "pct": pct, "step": msg})

    def event_cb(event_dict: dict):
        q.put(event_dict)

    def run_pipeline():
        try:
            pipeline = AnalysisPipeline(
                business_url=url,
                openai_api_key=resolved_openai,
                serper_api_key=resolved_serper,
                n_competitors=n_competitors,
                n_questions=n_questions,
                custom_questions=parsed_questions,
                progress_callback=progress_cb,
                event_callback=event_cb,
                google_api_key=resolved_google,
                anthropic_api_key=resolved_anthropic,
                perplexity_api_key=resolved_perplexity,
            )
            pipeline.run()
        except Exception as e:
            q.put({"event": "error", "message": str(e)})
        finally:
            q.put(None)  # sentinel — signals end of stream

    # Launch pipeline in a background thread
    _executor.submit(run_pipeline)

    async def event_generator():
        while True:
            # Poll the queue without blocking the event loop
            while q.empty():
                await asyncio.sleep(0.1)
            item = q.get()
            if item is None:
                break
            yield f"data: {json.dumps(item, cls=_NumpyEncoder)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
