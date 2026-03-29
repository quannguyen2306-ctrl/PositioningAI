"""
rl_reward.py
------------
Pure reward computation for the RL content positioning system.
No LLM dependency — pure numpy math.

Reward formula:
  r = cos_sim(delta, target_dir) * magnitude_bonus * vis_multiplier

Where:
  cos_sim        = directional alignment [-1, 1]
  magnitude_bonus = how far we moved relative to initial distance [0, 1]
  vis_multiplier  = penalty if RAG visibility dropped significantly
"""

from dataclasses import dataclass
import numpy as np


@dataclass
class RLRewardResult:
    reward: float
    cos_sim: float
    magnitude_bonus: float
    vis_multiplier: float
    vis_delta: float
    moved_toward_target: bool


def compute_reward(
    pos_prev: np.ndarray,
    pos_curr: np.ndarray,
    pos_target: np.ndarray,
    vis_prev: float,
    vis_curr: float,
    initial_dist: float,
) -> RLRewardResult:
    """
    Compute the RL reward for one step.

    Higher reward = moved far toward target without tanking RAG visibility.
    Negative reward = moved away from target.
    """
    delta = pos_curr - pos_prev

    # Target direction unit vector (from prev position)
    target_dir = pos_target - pos_prev
    target_dir_unit = target_dir / (np.linalg.norm(target_dir) + 1e-8)

    # Cosine similarity between actual movement and target direction
    delta_norm = np.linalg.norm(delta) + 1e-8
    cos_sim = float(np.dot(delta, target_dir_unit) / delta_norm)
    cos_sim = float(np.clip(cos_sim, -1.0, 1.0))

    # Magnitude bonus: reward scales with how far we moved toward target
    magnitude_bonus = float(np.clip(
        np.linalg.norm(delta) / (initial_dist + 1e-8),
        0.0, 1.0,
    ))

    # Visibility multiplier: penalise content that breaks RAG visibility
    vis_delta = vis_curr - vis_prev
    if vis_delta >= 0:
        vis_multiplier = 1.0 + 0.1 * (vis_delta / 10.0)  # small bonus
    elif vis_delta >= -2.0:
        vis_multiplier = 1.0                               # tolerate minor drop
    elif vis_delta >= -4.0:
        vis_multiplier = 0.7                               # moderate penalty
    else:
        vis_multiplier = 0.4                               # severe — content broke RAG

    reward = cos_sim * magnitude_bonus * vis_multiplier

    return RLRewardResult(
        reward=round(reward, 4),
        cos_sim=round(cos_sim, 4),
        magnitude_bonus=round(magnitude_bonus, 4),
        vis_multiplier=round(vis_multiplier, 3),
        vis_delta=round(vis_delta, 2),
        moved_toward_target=cos_sim > 0,
    )


def compute_proximity(pos_curr: np.ndarray, pos_target: np.ndarray) -> float:
    """Euclidean distance between current and target position."""
    return float(np.linalg.norm(pos_curr - pos_target))


def is_converged(
    pos_curr: np.ndarray,
    pos_target: np.ndarray,
    threshold: float = 0.3,
) -> bool:
    """True when the business is within threshold PCA units of the target."""
    return compute_proximity(pos_curr, pos_target) <= threshold
