"""
cache/nn_model_store.py
-----------------------
Load/save helpers for the NNPolicy weights.
Weights persist across backend restarts so the NN accumulates learning
over many episodes and businesses.
"""

from pathlib import Path
from pipeline.nn_policy import NNPolicy

_DEFAULT_PATH = Path(__file__).parent / "nn_policy.npz"


def load_nn_policy(path: Path = _DEFAULT_PATH) -> NNPolicy:
    """Load existing weights or create a fresh policy if none saved yet."""
    if path.exists():
        try:
            policy = NNPolicy.load(path)
            print(
                f"[nn_policy] Loaded weights from {path} "
                f"(episodes trained: {policy.episodes_trained})"
            )
            return policy
        except Exception as e:
            print(f"[nn_policy] Failed to load weights ({e}) — starting fresh.")
    else:
        print("[nn_policy] No saved weights found — starting fresh.")
    return NNPolicy()


def save_nn_policy(policy: NNPolicy, path: Path = _DEFAULT_PATH) -> None:
    """Persist policy weights to disk."""
    policy.save(path)
    print(
        f"[nn_policy] Saved weights to {path} "
        f"(episodes trained: {policy.episodes_trained})"
    )
