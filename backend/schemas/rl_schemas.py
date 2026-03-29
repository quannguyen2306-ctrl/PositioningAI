"""
schemas/rl_schemas.py
---------------------
Pydantic models for the RL content positioning API.
"""

from typing import Optional
from pydantic import BaseModel, Field


class RLStartRequest(BaseModel):
    session_id: str
    target_x: float
    target_y: float
    openai_key: str
    max_steps: int = Field(default=8, ge=1, le=15)
    proximity_threshold: float = Field(default=0.3, ge=0.05, le=2.0)


class RLStepDetail(BaseModel):
    step: int
    reward: float
    pos_before: list[float]
    pos_after: list[float]
    vis_before: float
    vis_after: float
    critique: str
    draft_preview: str
    moved_toward_target: bool


class RLStatusResponse(BaseModel):
    episode_id: str
    session_id: str
    status: str                        # running | completed | failed | cancelled
    step: int
    max_steps: int
    current_pos: list[float]
    target_pos: list[float]
    best_draft: str
    best_reward: float
    steps_detail: list[RLStepDetail]
    stop_reason: Optional[str] = None
    few_shot_count: int = 0            # how many past episodes were used
