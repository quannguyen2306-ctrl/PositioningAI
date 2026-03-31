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
    openai_key: str = Field(min_length=1)
    serper_key: str = Field(min_length=1)
    n_competitors: int = Field(default=10, ge=5, le=20)
    n_questions: int = Field(default=10, ge=5, le=15)
    custom_questions: Optional[list[str]] = Field(default=None, max_length=5)


class ContentLabRequest(BaseModel):
    """Request to re-evaluate new content in an existing session."""

    session_id: str = Field(min_length=1)
    new_content: str = Field(min_length=1, max_length=50_000)
    openai_key: str = Field(min_length=1)


class RecommendationRequest(BaseModel):
    """Request to generate targeted content recommendations toward a map position."""

    session_id: str = Field(min_length=1)
    target_x: float
    target_y: float
    current_x: float   # user's current centroid X (PCA data coords)
    current_y: float   # user's current centroid Y (PCA data coords)
    openai_key: str = Field(min_length=1)
