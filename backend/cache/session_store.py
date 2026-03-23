"""
cache/session_store.py
----------------------
Thread-safe in-memory session storage.
"""

import uuid
import time
import threading
from typing import Optional, Dict, Any


class SessionStore:
    """Thread-safe in-memory session store."""

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_session(self) -> str:
        """Create a new session and return its ID."""
        session_id = str(uuid.uuid4())
        with self._lock:
            self._sessions[session_id] = {
                "status": "queued",
                "progress": {"percent": 0, "message": ""},
                "result": None,
                "error": None,
                "created_at": time.time(),
            }
        return session_id

    def update_progress(self, session_id: str, percent: int, message: str) -> None:
        """Update progress for a session."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["progress"] = {
                    "percent": percent,
                    "message": message,
                }
                self._sessions[session_id]["status"] = "processing"

    def set_result(self, session_id: str, result: dict) -> None:
        """Set the result for a completed session."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["result"] = result
                self._sessions[session_id]["status"] = "completed"
                self._sessions[session_id]["progress"]["percent"] = 100
                self._sessions[session_id]["progress"]["message"] = "Analysis complete"

    def set_error(self, session_id: str, error: str) -> None:
        """Set an error for a failed session."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["error"] = error
                self._sessions[session_id]["status"] = "failed"

    def set_pipeline_data(self, session_id: str, pipeline_data: dict) -> None:
        """Store pipeline runtime objects for Content Lab reuse (store, pca, etc.)."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id]["pipeline_data"] = pipeline_data

    def get_pipeline_data(self, session_id: str) -> Optional[dict]:
        """Retrieve pipeline runtime objects for Content Lab."""
        with self._lock:
            session = self._sessions.get(session_id)
            return session.get("pipeline_data") if session else None

    def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data by ID."""
        with self._lock:
            return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> None:
        """Explicitly remove a session."""
        with self._lock:
            self._sessions.pop(session_id, None)

    def cleanup_expired_sessions(self, max_age_seconds: int = 3600) -> int:
        """Remove sessions older than max_age_seconds. Returns count removed."""
        now = time.time()
        with self._lock:
            expired = [
                sid for sid, s in self._sessions.items()
                if now - s.get("created_at", now) > max_age_seconds
            ]
            for sid in expired:
                del self._sessions[sid]
        return len(expired)


# Export singleton instance
store = SessionStore()
