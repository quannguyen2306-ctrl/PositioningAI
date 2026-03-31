"""
limiter.py
----------
Shared slowapi rate limiter instance.
Imported by app.py (to register with the app) and route files (for decorators).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
