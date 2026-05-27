"""
schemas/rl_schemas.py
---------------------
Pydantic models for the RL content positioning API.
"""

from pydantic import BaseModel, Field


class RLStartRequest(BaseModel):
    session_id: str
    target_x: float
    target_y: float
    openai_key: str
    max_steps: int = Field(default=8, ge=1, le=100)
    proximity_threshold: float = Field(default=0.3, ge=0.05, le=2.0)
    use_nn_agent: bool = Field(default=False)
