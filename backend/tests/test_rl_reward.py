"""
tests/test_rl_reward.py
-----------------------
Unit tests for the reward function and episode store.
No API keys needed — runs instantly.

  cd backend && python tests/test_rl_reward.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from pipeline.rl_reward import compute_reward, compute_proximity, is_converged, is_plateau
from cache.episode_store import EpisodeStore, EpisodeRecord, compute_target_direction
import time


def test_reward_perfect_move():
    """Moving directly toward target should give high positive reward."""
    pos_prev   = np.array([0.0, 0.0])
    pos_target = np.array([1.0, 0.0])
    pos_curr   = np.array([0.5, 0.0])  # moved halfway to target

    result = compute_reward(pos_prev, pos_curr, pos_target, 5.0, 5.0, initial_dist=1.0)

    assert result.cos_sim == 1.0, f"Expected cos_sim=1.0, got {result.cos_sim}"
    assert result.reward > 0, f"Expected positive reward, got {result.reward}"
    assert result.moved_toward_target is True
    print(f"  PASS  perfect move → reward={result.reward:.4f}")


def test_reward_wrong_direction():
    """Moving away from target should give negative reward."""
    pos_prev   = np.array([0.0, 0.0])
    pos_target = np.array([1.0, 0.0])
    pos_curr   = np.array([-0.3, 0.0])  # moved away

    result = compute_reward(pos_prev, pos_curr, pos_target, 5.0, 5.0, initial_dist=1.0)

    assert result.cos_sim < 0, f"Expected negative cos_sim, got {result.cos_sim}"
    assert result.reward < 0, f"Expected negative reward, got {result.reward}"
    assert result.moved_toward_target is False
    print(f"  PASS  wrong direction → reward={result.reward:.4f}")


def test_reward_vis_penalty():
    """Big visibility drop should reduce reward significantly."""
    pos_prev   = np.array([0.0, 0.0])
    pos_target = np.array([1.0, 0.0])
    pos_curr   = np.array([0.5, 0.0])

    good = compute_reward(pos_prev, pos_curr, pos_target, 6.0, 6.0, initial_dist=1.0)
    bad  = compute_reward(pos_prev, pos_curr, pos_target, 6.0, 1.0, initial_dist=1.0)  # vis dropped 5pts

    assert bad.reward < good.reward, "Visibility penalty should reduce reward"
    assert bad.vis_multiplier == 0.4, f"Expected multiplier=0.4, got {bad.vis_multiplier}"
    print(f"  PASS  vis penalty: good={good.reward:.4f}, penalised={bad.reward:.4f}")


def test_convergence():
    close  = np.array([0.95, 0.0])
    far    = np.array([2.0, 0.0])
    target = np.array([1.0, 0.0])

    assert is_converged(close, target, threshold=0.3) is True
    assert is_converged(far, target, threshold=0.3) is False
    print(f"  PASS  convergence check")


def test_plateau_detector():
    """is_plateau honors eps and never cuts short a short/climbing episode."""
    eps = 0.05

    # Empty / too-short history: never a plateau (need > window steps).
    assert is_plateau([], eps) is False
    assert is_plateau([0.5, 0.6, 0.7], eps) is False   # len == window

    # A record on the most recent step is NOT a plateau, even after dips.
    assert is_plateau([0.5, 0.4, 0.3, 0.9], eps) is False

    # A steadily climbing episode is NOT a plateau (the old all-below-max
    # check wrongly fired here).
    assert is_plateau([0.1, 0.3, 0.5, 0.6, 0.61], eps) is False

    # A trailing window that fails to beat the prior best by eps IS a plateau.
    assert is_plateau([0.5, 0.6, 0.61, 0.59, 0.60, 0.58], eps) is True

    # Threshold sensitivity: prior best 0.50, trailing best 0.50 + delta.
    just_below = [0.50, 0.40, 0.40, 0.54]   # delta 0.04 < eps → plateau
    just_above = [0.50, 0.40, 0.40, 0.56]   # delta 0.06 > eps → progress
    assert is_plateau(just_below, eps) is True
    assert is_plateau(just_above, eps) is False

    print("  PASS  plateau detector honors eps + spares climbing episodes")


def test_direction_labels():
    cases = [
        ((1.0,  0.0), "right"),
        ((-1.0, 0.0), "left"),
        ((0.0,  1.0), "up"),
        ((0.0, -1.0), "down"),
        ((1.0,  1.0), "up-right"),
    ]
    for (dx, dy), expected in cases:
        label = compute_target_direction(dx, dy)
        assert label == expected, f"({dx},{dy}) → expected '{expected}', got '{label}'"
    print(f"  PASS  direction labels")


def test_episode_store_retrieval():
    """Stored episodes should be retrievable by industry + archetype + direction."""
    store = EpisodeStore()

    store.save_episode(EpisodeRecord(
        episode_id="ep1",
        industry="SaaS",
        archetype="Contender",
        target_direction="right",
        target_x=1.0, target_y=0.0,
        initial_x=0.0, initial_y=0.0,
        best_reward=0.7,
        steps_taken=4,
        best_draft="We help software teams ship faster with automated testing pipelines.",
        step_history=[],
        created_at=time.time(),
    ))

    store.save_episode(EpisodeRecord(
        episode_id="ep2",
        industry="Bakery",
        archetype="Pioneer",
        target_direction="up",
        target_x=0.0, target_y=1.0,
        initial_x=0.0, initial_y=0.0,
        best_reward=0.6,
        steps_taken=3,
        best_draft="Artisan sourdough baked fresh every morning with heritage grains.",
        step_history=[],
        created_at=time.time(),
    ))

    # Should retrieve ep1 for SaaS / Contender / right
    results = store.find_similar("SaaS", "Contender", "right", top_k=2)
    assert len(results) >= 1
    assert results[0].episode_id == "ep1"
    print(f"  PASS  episode retrieval: found '{results[0].industry}' episode for SaaS query")

    # Should return empty for totally different industry with no stored data
    results_empty = store.find_similar("Funeral Services", "Shadow", "down-left", top_k=2)
    assert len(results_empty) == 0
    print(f"  PASS  no match for unknown industry → returns empty list")

    # Negative reward episodes should NOT be stored
    store.save_episode(EpisodeRecord(
        episode_id="ep_bad",
        industry="SaaS",
        archetype="Contender",
        target_direction="right",
        target_x=1.0, target_y=0.0,
        initial_x=0.0, initial_y=0.0,
        best_reward=-0.1,   # negative — should be rejected
        steps_taken=2,
        best_draft="Bad draft that went the wrong way.",
        step_history=[],
        created_at=time.time(),
    ))
    assert store.count() == 2, f"Bad episode should not be stored, count={store.count()}"
    print(f"  PASS  negative reward episodes are not stored")


if __name__ == "__main__":
    print("Running RL unit tests (no API keys needed)...\n")
    tests = [
        test_reward_perfect_move,
        test_reward_wrong_direction,
        test_reward_vis_penalty,
        test_convergence,
        test_plateau_detector,
        test_direction_labels,
        test_episode_store_retrieval,
    ]
    passed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")

    print(f"\n{passed}/{len(tests)} tests passed.")
