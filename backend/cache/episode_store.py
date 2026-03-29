"""
cache/episode_store.py
----------------------
Persists RL episode trajectories for few-shot retrieval.

When a new business starts an RL episode, we look up past episodes from
similar businesses (matched by industry + archetype + target direction)
and inject the best draft examples into the agent's prompt.

This is Option 1 cross-business learning: no fine-tuning required, gets
better automatically as more businesses use the system.
"""

import math
import time
import threading
import uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class EpisodeRecord:
    episode_id: str
    industry: str
    archetype: str
    target_direction: str        # compass label: right, up-right, up, etc.
    target_x: float
    target_y: float
    initial_x: float
    initial_y: float
    best_reward: float
    steps_taken: int
    best_draft: str
    step_history: list[dict]     # [{step, draft_summary, reward, delta_x, delta_y, critique}]
    created_at: float = field(default_factory=time.time)


class EpisodeStore:
    """
    Thread-safe store for RL episode trajectories.

    Retrieval scoring (find_similar):
      +2.0  exact industry match
      +1.0  industry shares keywords
      +1.0  same archetype
      +1.0  same target direction
      +0.5  adjacent target direction
      × (0.5 + best_reward)  — weight by episode quality
    """

    def __init__(self, max_episodes: int = 500):
        self._episodes: dict[str, EpisodeRecord] = {}
        self._lock = threading.Lock()
        self._max_episodes = max_episodes

    def save_episode(self, record: EpisodeRecord) -> None:
        """Save a completed episode. Only stores episodes with positive reward."""
        if record.best_reward <= 0:
            return
        with self._lock:
            self._episodes[record.episode_id] = record
            # Evict the lowest-reward episode when over capacity
            if len(self._episodes) > self._max_episodes:
                worst = min(self._episodes.values(), key=lambda e: e.best_reward)
                del self._episodes[worst.episode_id]

    def find_similar(
        self,
        industry: str,
        archetype: str,
        target_direction: str,
        top_k: int = 2,
    ) -> list[EpisodeRecord]:
        """
        Return the top_k most similar past episodes for few-shot injection.
        Returns empty list when not enough data exists yet.
        """
        with self._lock:
            scored: list[tuple[float, EpisodeRecord]] = []
            for ep in self._episodes.values():
                score = 0.0
                if ep.industry.lower() == industry.lower():
                    score += 2.0
                elif _industry_similar(ep.industry, industry):
                    score += 1.0
                if ep.archetype == archetype:
                    score += 1.0
                if ep.target_direction == target_direction:
                    score += 1.0
                elif _direction_adjacent(ep.target_direction, target_direction):
                    score += 0.5
                # Weight by quality so bad examples don't pollute few-shot
                score *= (0.5 + ep.best_reward)
                if score > 0:
                    scored.append((score, ep))

            scored.sort(key=lambda x: -x[0])
            return [ep for _, ep in scored[:top_k]]

    def count(self) -> int:
        with self._lock:
            return len(self._episodes)

    def stats(self) -> dict:
        """Summary stats for monitoring."""
        with self._lock:
            if not self._episodes:
                return {"total": 0}
            rewards = [e.best_reward for e in self._episodes.values()]
            industries = list({e.industry for e in self._episodes.values()})
            return {
                "total": len(self._episodes),
                "avg_best_reward": round(sum(rewards) / len(rewards), 3),
                "industries": industries[:10],
            }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _industry_similar(a: str, b: str) -> bool:
    """True if the two industry strings share at least one meaningful word."""
    stop = {"and", "the", "of", "in", "for", "a", "an", "services", "business"}
    a_words = set(a.lower().split()) - stop
    b_words = set(b.lower().split()) - stop
    return bool(a_words & b_words)


def _direction_adjacent(a: str, b: str) -> bool:
    """
    Adjacent compass directions are considered similar.
    e.g. 'right' ≈ 'up-right', 'up-right' ≈ 'up'
    """
    parts_a = set(a.split("-"))
    parts_b = set(b.split("-"))
    return bool(parts_a & parts_b)


def compute_target_direction(dx: float, dy: float) -> str:
    """
    Convert a (dx, dy) movement vector into a compass direction label.
    Used to tag episodes so similar-direction runs can be retrieved.
    """
    if abs(dx) < 0.1 and abs(dy) < 0.1:
        return "center"

    angle = math.degrees(math.atan2(dy, dx))

    thresholds = [
        ((-22.5,  22.5), "right"),
        (( 22.5,  67.5), "up-right"),
        (( 67.5, 112.5), "up"),
        ((112.5, 157.5), "up-left"),
        ((157.5, 180.0), "left"),
        ((-180.0, -157.5), "left"),
        ((-157.5, -112.5), "down-left"),
        ((-112.5,  -67.5), "down"),
        (( -67.5,  -22.5), "down-right"),
    ]
    for (lo, hi), label in thresholds:
        if lo <= angle < hi:
            return label
    return "right"


# Singleton — shared across all requests
episode_store = EpisodeStore()
