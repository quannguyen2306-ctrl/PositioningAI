"""
cache/competitor_cache.py
-------------------------
Persists competitor URLs per business URL to disk (JSON).

Why this matters:
  PCA is fit on all chunks (user + competitors) together. If the competitor
  set changes between runs, the entire coordinate space shifts — making
  positions incomparable across runs and breaking the RL agent's target pins.

  By reusing the same competitor URLs on re-analysis, the embedding space
  stays stable and the map is consistent.

TTL: 7 days — stale enough to catch page updates, fresh enough to stay relevant.
Force refresh: pass force=True to bypass cache.
"""

import json
import time
import threading
from pathlib import Path

_CACHE_FILE = Path(__file__).parent / "competitor_cache.json"
_TTL_SECONDS = 7 * 24 * 3600   # 7 days
_lock = threading.Lock()


def _normalize_url(url: str) -> str:
    """Canonical key: lowercase, no trailing slash, no www."""
    url = url.lower().strip().rstrip("/")
    url = url.replace("://www.", "://")
    return url


def _load() -> dict:
    if not _CACHE_FILE.exists():
        return {}
    try:
        return json.loads(_CACHE_FILE.read_text())
    except Exception:
        return {}


def _save(data: dict) -> None:
    try:
        _CACHE_FILE.write_text(json.dumps(data, indent=2))
    except Exception:
        pass


def get_cached_competitors(business_url: str) -> list[str] | None:
    """
    Return cached competitor URLs for business_url, or None if not cached / expired.
    """
    key = _normalize_url(business_url)
    with _lock:
        data = _load()
        entry = data.get(key)
        if not entry:
            return None
        if time.time() - entry["cached_at"] > _TTL_SECONDS:
            # Expired — remove and return None so caller fetches fresh
            del data[key]
            _save(data)
            return None
        return entry["urls"]


def save_competitors(business_url: str, urls: list[str]) -> None:
    """Persist competitor URLs for business_url."""
    key = _normalize_url(business_url)
    with _lock:
        data = _load()
        data[key] = {"urls": urls, "cached_at": time.time()}
        _save(data)


def clear_cache(business_url: str | None = None) -> None:
    """Clear cache for one URL, or all if None."""
    with _lock:
        if business_url is None:
            _save({})
        else:
            data = _load()
            data.pop(_normalize_url(business_url), None)
            _save(data)
