"""
rl_reward.py
------------
Pure reward computation for the RL content positioning system.
No LLM dependency — pure numpy math.

Reward formula:
  r = projection * vis_multiplier

Where:
  projection  = dot(delta, target_dir_unit)
              = dist_prev - dist_curr  (PCA units closer to target)
              Positive = moved toward target, negative = moved away.
              Range: roughly ±0.1 to ±2.0 in practice.
  vis_multiplier = penalty if RAG visibility dropped significantly

Previously normalized by initial_dist which shrunk rewards to ~0.001–0.05
and starved the agent of gradient signal. Raw projection gives 10-50x
stronger reward values with no loss of direction information.
"""

from dataclasses import dataclass
import numpy as np


@dataclass
class RLRewardResult:
    reward: float
    cos_sim: float
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

    # Signed projection of movement onto target direction.
    # Equivalent to (dist_prev - dist_curr): positive = closer, negative = further.
    # Kept un-normalized so the agent gets a strong, meaningful gradient signal.
    projection = float(np.dot(delta, target_dir_unit))

    # cos_sim for logging / moved_toward_target flag (still useful metadata)
    delta_norm = np.linalg.norm(delta) + 1e-8
    cos_sim = float(np.clip(projection / delta_norm, -1.0, 1.0))

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

    reward = projection * vis_multiplier

    return RLRewardResult(
        reward=round(reward, 4),
        cos_sim=round(cos_sim, 4),
        vis_multiplier=round(vis_multiplier, 3),
        vis_delta=round(vis_delta, 2),
        moved_toward_target=projection > 0,
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


def is_plateau(reward_history: list[float], eps: float, window: int = 3) -> bool:
    """
    True when the episode has stopped making progress: the best reward over the
    trailing `window` steps fails to exceed the best reward before that window
    by at least `eps`.

    This honors the configured `eps` threshold (unlike a bare "all of the last N
    steps are below the all-time max" test, which fires even on an episode that
    is still climbing — a record on the most recent step resets the comparison,
    and a small-but-real improvement is not treated as a plateau).

    Returns False until there is at least one step preceding the trailing window
    (i.e. len(reward_history) > window), so a short or still-improving history is
    never cut short.
    """
    if window < 1 or len(reward_history) <= window:
        return False
    prior = reward_history[:-window]
    trailing = reward_history[-window:]
    return (max(trailing) - max(prior)) < eps
