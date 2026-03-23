"""
schemas/response.py
-------------------
Response models for analysis endpoints.
"""

from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum


class StatusEnum(str, Enum):
    """Analysis status values."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProgressEvent(BaseModel):
    """Progress update during analysis."""

    session_id: str
    percent: int
    message: str
    status: StatusEnum


class AnalysisResult(BaseModel):
    """Complete analysis results."""

    biz: dict
    comp_docs: list
    eval: dict
    coords: list
    pca_meta: list
    interps: list
    recs: dict
    multi_engine: Optional[dict] = None


class AnalysisResponse(BaseModel):
    """Response from analysis endpoints."""

    session_id: str
    status: StatusEnum
    result: Optional[AnalysisResult] = None
    progress: Optional[ProgressEvent] = None
    error: Optional[str] = None
