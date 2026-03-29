"""
health.py
---------
Simple health check endpoint.
"""

from fastapi import APIRouter
from cache.competitor_cache import clear_cache, get_cached_competitors

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.delete("/api/competitor-cache")
async def clear_competitor_cache(url: str | None = None):
    """
    Clear cached competitor URLs.
    - No params: clears all cached entries
    - ?url=https://... : clears only that business
    Next analysis will re-fetch fresh competitors from Serper.
    """
    clear_cache(url)
    return {"cleared": True, "url": url or "all"}


@router.get("/api/competitor-cache")
async def check_competitor_cache(url: str):
    """Check whether a business URL has cached competitors."""
    cached = get_cached_competitors(url)
    return {
        "url": url,
        "cached": cached is not None,
        "count": len(cached) if cached else 0,
        "urls": cached or [],
    }
