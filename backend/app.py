"""
app.py
------
Main FastAPI application entry point.
Configures CORS, routes, background task execution, and uvicorn startup.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import HttpUrl

from config import settings
from schemas.request import AnalysisRequest
from cache.session_store import store
from pipeline.orchestrator import AnalysisPipeline
from api.routes import health, analysis

# Create FastAPI app
app = FastAPI(
    title="PositioningAI",
    description="Competitive positioning analysis for AI visibility",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(analysis.router)

# Thread pool for background analysis execution
executor = ThreadPoolExecutor(max_workers=4)


def _run_analysis_task(
    session_id: str,
    request: AnalysisRequest,
):
    """
    Background task that runs the full analysis pipeline.
    Updates session store with progress and results.
    """
    try:
        # Resolve OpenAI and Serper API keys
        openai_key = request.openai_key or settings.openai_api_key
        serper_key = request.serper_key or settings.serper_api_key

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
        )

        results = pipeline.run()
        store.set_result(session_id, results)

    except Exception as e:
        store.set_error(session_id, str(e))


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


@app.get("/api/sessions")
async def list_sessions():
    """
    Debug endpoint: list all active sessions.
    (Remove in production)
    """
    # This is a simple debug endpoint; in production, you'd want
    # to restrict access or remove it entirely.
    return {
        "sessions": [
            {
                "session_id": session_id,
                "status": session.get("status"),
                "percent": session.get("progress", {}).get("percent", 0) if session.get("progress") else 0,
            }
            for session_id, session in store._sessions.items()
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
