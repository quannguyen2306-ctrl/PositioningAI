"""
schemas/request.py
------------------
Request models for analysis endpoints.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional


class AnalysisRequest(BaseModel):
    """Request to start a new positioning analysis."""

    url: HttpUrl
    openai_key: str
    serper_key: str
    n_competitors: int = Field(default=10, ge=5, le=20)
    n_questions: int = Field(default=10, ge=5, le=15)
    custom_questions: Optional[list[str]] = None
