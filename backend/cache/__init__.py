"""
cache/__init__.py
-----------------
Caching utilities for session management.
"""

from .session_store import SessionStore, store

__all__ = ["SessionStore", "store"]
