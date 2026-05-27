"""
app.py
------
Main FastAPI application entry point.
Configures CORS, routes, and uvicorn startup.
"""

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cache.session_store import store
from api.routes import health, analysis, rl

logger = logging.getLogger(__name__)

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
app.include_router(rl.router)


@app.on_event("startup")
async def _start_session_sweep():
    """Periodically clean up expired sessions (replaces the WebSocket lazy sweep)."""
    async def _sweep_loop():
        while True:
            await asyncio.sleep(3600)
            try:
                store.cleanup_expired_sessions()
            except Exception:
                logger.exception("Session sweep failed")

    asyncio.create_task(_sweep_loop())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
