"""
app.py
------
Main FastAPI application entry point.
Configures CORS, security headers, rate limiting, routes, and uvicorn startup.
"""

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from limiter import limiter

from config import settings
from schemas.request import AnalysisRequest
from cache.session_store import store
from pipeline.orchestrator import AnalysisPipeline
from api.routes import health, analysis, rl

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="PositioningAI",
    description="Competitive positioning analysis for AI visibility",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — restrict to configured origins; default to localhost for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add standard security headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # HSTS — only effective over HTTPS; harmless over HTTP
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )
        return response


class _RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique X-Request-ID to every request for log tracing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(_SecurityHeadersMiddleware)
app.add_middleware(_RequestIDMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(rl.router)

# Bounded thread pool — prevents unbounded resource consumption
executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="posai")
app.state.executor = executor


@app.on_event("startup")
async def _startup():
    """Schedule periodic session cleanup to prevent unbounded memory growth."""
    async def _cleanup_loop():
        while True:
            await asyncio.sleep(600)  # every 10 minutes
            try:
                store.cleanup_expired_sessions()
            except Exception:
                logger.warning("Session cleanup failed", exc_info=True)

    asyncio.create_task(_cleanup_loop())


@app.on_event("shutdown")
async def _shutdown():
    """Graceful executor shutdown — waits up to 30 s for in-flight tasks."""
    executor.shutdown(wait=True, cancel_futures=False)


def _run_analysis_task(
    session_id: str,
    request: AnalysisRequest,
):
    """
    Background task that runs the full analysis pipeline.
    Updates session store with progress and results.
    """
    try:
        openai_key = request.openai_key or settings.openai_api_key
        serper_key = request.serper_key or settings.serper_api_key

        if not openai_key or not serper_key:
            store.set_error(session_id, "Missing API keys (OpenAI or Serper)")
            return

        def progress_callback(percent: int, message: str):
            store.update_progress(session_id, percent, message)

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

    except Exception:
        logger.error("Background analysis failed for session %s", session_id, exc_info=True)
        store.set_error(session_id, "Analysis failed. Please try again.")


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

    session_id = store.create_session()
    store.update_progress(session_id, 0, "Starting analysis...")
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
