"""
app.py
------
Main FastAPI application entry point.
Configures CORS, routes, background task execution, and uvicorn startup.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas.request import AnalysisRequest
from cache.session_store import store
from pipeline.orchestrator import AnalysisPipeline
from api.routes import health, analysis, stream

logger = logging.getLogger(__name__)

# Thread pool for background analysis execution
executor = ThreadPoolExecutor(max_workers=4)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Handles startup and shutdown events.
    """
    # Startup: Schedule periodic cleanup of expired sessions
    async def _cleanup_loop():
        while True:
            await asyncio.sleep(300)  # Run every 5 minutes
            removed = store.cleanup_expired_sessions(max_age_seconds=3600)
            if removed > 0:
                logger.info(f"Cleaned up {removed} expired session(s)")

    asyncio.create_task(_cleanup_loop())
    yield
    # Shutdown: (no cleanup needed)


# Create FastAPI app
app = FastAPI(
    title="PositioningAI",
    description="Competitive positioning analysis for AI visibility",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(stream.router)


def _run_analysis_task(
    session_id: str,
    request: AnalysisRequest,
):
    """
    Background task that runs the full analysis pipeline.
    Updates session store with progress and results.
    """
    try:
        # Resolve API keys
        openai_key = request.openai_key or settings.openai_api_key
        serper_key = request.serper_key or settings.serper_api_key
        google_key = (request.google_key or "") or settings.google_api_key
        anthropic_key = (request.anthropic_key or "") or settings.anthropic_api_key
        perplexity_key = (request.perplexity_key or "") or settings.perplexity_api_key

        if not openai_key or not serper_key:
            store.set_error(session_id, "Missing API keys (OpenAI or Serper)")
            return

        # Define progress callback
        def progress_callback(percent: int, message: str):
            store.update_progress(session_id, percent, message)

        # Run pipeline
        pipeline = AnalysisPipeline(
            business_url=str(request.url),
            openai_api_key=openai_key,
            serper_api_key=serper_key,
            n_competitors=request.n_competitors,
            n_questions=request.n_questions,
            custom_questions=request.custom_questions,
            progress_callback=progress_callback,
            google_api_key=google_key,
            anthropic_api_key=anthropic_key,
            perplexity_api_key=perplexity_key,
        )

        results = pipeline.run()
        store.set_result(session_id, results)

    except Exception as e:
        store.set_error(session_id, f"Analysis failed: {type(e).__name__}")


@app.post("/api/analysis/start-background")
async def start_analysis_background(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start an analysis in the background using ThreadPoolExecutor.
    Returns session_id immediately.
    """
    from schemas.response import AnalysisResponse, StatusEnum

    # Create session
    session_id = store.create_session()
    store.update_progress(session_id, 0, "Starting analysis...")

    # Schedule background task
    background_tasks.add_task(_run_analysis_task, session_id, request)

    return AnalysisResponse(
        session_id=session_id,
        status=StatusEnum.PROCESSING,
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "PositioningAI",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
