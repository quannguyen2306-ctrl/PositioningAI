"""
nn_policy.py
------------
Numpy-only MLP policy for real RL over content strategy selection.

Architecture:
  Input (7D state) → Dense(32, tanh) → Dense(16, tanh) → Dense(8, softmax)

Training:
  REINFORCE (Monte Carlo policy gradient) — weights updated after each
  complete episode using discounted returns.

The NN does NOT write content — GPT-4o does. The NN decides WHICH of 8
content strategies to give GPT-4o at each step. Over many episodes across
many businesses, the NN learns which strategy works best per situation
(state → action mapping), accumulating genuine cross-episode learning.

State vector (7D, all normalized):
  [current_x, current_y, target_x, target_y, vis/10, dist/init_dist, step/max_steps]

Actions (8 discrete strategies):
  0  technical_depth     — methodology, implementation depth, specific processes
  1  case_studies        — client success stories, concrete proof points
  2  roi_metrics         — business value, ROI, cost savings, revenue impact
  3  thought_leadership  — industry trends, forward-looking expertise
  4  problem_solution    — pain points → solution narrative
  5  comparison          — competitive differentiation
  6  educational         — how-to, tutorials, explainer content
  7  audience_specific   — niche personalization, role-specific language
"""

from __future__ import annotations

from pathlib import Path
from typing import NamedTuple

import numpy as np


# ---------------------------------------------------------------------------
# Strategy definitions
# ---------------------------------------------------------------------------

STRATEGIES: list[dict] = [
    {
        "label": "technical_depth",
        "instruction": (
            "STRATEGY: Technical Depth. Focus on specific methodologies, implementation "
            "details, technical processes, and precise mechanisms. Use domain-specific "
            "terminology. Show HOW things work, not just what they are."
        ),
    },
    {
        "label": "case_studies",
        "instruction": (
            "STRATEGY: Case Studies. Lead with concrete client success stories. Include "
            "specific outcomes, quantified results (percentages, timelines, metrics). "
            "Make it feel like proof, not marketing."
        ),
    },
    {
        "label": "roi_metrics",
        "instruction": (
            "STRATEGY: ROI & Metrics. Emphasize business value, return on investment, "
            "cost reduction, revenue impact, and measurable outcomes. Speak the language "
            "of business impact and financial justification."
        ),
    },
    {
        "label": "thought_leadership",
        "instruction": (
            "STRATEGY: Thought Leadership. Address emerging industry trends, future "
            "challenges, and forward-looking expertise. Position the business as the "
            "authority shaping where the industry is going."
        ),
    },
    {
        "label": "problem_solution",
        "instruction": (
            "STRATEGY: Problem-Solution. Open by deeply articulating the pain points "
            "customers face. Then position the business as the specific, credible answer. "
            "Make the problem feel real before offering the solution."
        ),
    },
    {
        "label": "comparison",
        "instruction": (
            "STRATEGY: Competitive Differentiation. Highlight what makes this approach "
            "distinctly different from alternatives. Address why existing solutions fall "
            "short. Make the unique angle undeniable."
        ),
    },
    {
        "label": "educational",
        "instruction": (
            "STRATEGY: Educational Content. Use a how-to or explainer framing. Teach "
            "the reader something genuinely useful. Step-by-step structure, clear "
            "principles, actionable takeaways."
        ),
    },
    {
        "label": "audience_specific",
        "instruction": (
            "STRATEGY: Audience-Specific. Write for a very specific role or niche. "
            "Use their exact language, reference their specific context, address their "
            "particular constraints and goals. No generic phrasing."
        ),
    },
]

N_ACTIONS = len(STRATEGIES)
N_STATES = 7


# ---------------------------------------------------------------------------
# Trajectory item
# ---------------------------------------------------------------------------

class TrajectoryStep(NamedTuple):
    state: np.ndarray       # 7D state vector
    action: int             # chosen action index
    log_prob: float         # log π(a|s) at time of selection
    reward: float           # reward received after this step


# ---------------------------------------------------------------------------
# NNPolicy
# ---------------------------------------------------------------------------

class NNPolicy:
    """
    3-layer MLP policy network with REINFORCE training.

    Weights are updated in-place after each complete episode.
    Persists to disk so learning accumulates across runs.
    """

    def __init__(
        self,
        n_states: int = N_STATES,
        hidden: list[int] = None,
        n_actions: int = N_ACTIONS,
        lr: float = 0.01,
        gamma: float = 0.95,
        softmax_temp: float = 1.0,
    ):
        hidden = hidden or [32, 16]
        self.lr = lr
        self.gamma = gamma
        self.softmax_temp = softmax_temp
        self.episodes_trained = 0

        # Per-strategy stats for reporting
        self.strategy_wins = np.zeros(n_actions, dtype=np.float64)
        self.strategy_counts = np.zeros(n_actions, dtype=np.float64)

        # Xavier uniform initialisation
        layer_sizes = [n_states] + hidden + [n_actions]
        self.weights: list[np.ndarray] = []
        self.biases: list[np.ndarray] = []

        for i in range(len(layer_sizes) - 1):
            fan_in, fan_out = layer_sizes[i], layer_sizes[i + 1]
            limit = np.sqrt(6.0 / (fan_in + fan_out))
            self.weights.append(
                np.random.uniform(-limit, limit, (fan_in, fan_out)).astype(np.float64)
            )
            self.biases.append(np.zeros(fan_out, dtype=np.float64))

    # ------------------------------------------------------------------
    # Forward pass
    # ------------------------------------------------------------------

    def _forward(self, x: np.ndarray) -> tuple[np.ndarray, list[np.ndarray]]:
        """
        Forward pass. Returns (action_probs, activations).
        activations[i] = pre-activation output of layer i (needed for backprop).
        """
        activations = []
        h = x.astype(np.float64)
        for i, (W, b) in enumerate(zip(self.weights, self.biases)):
            z = h @ W + b
            activations.append(z)
            if i < len(self.weights) - 1:
                h = np.tanh(z)
            else:
                # Softmax output layer with temperature scaling
                z_scaled = z / max(self.softmax_temp, 1e-6)
                z_shifted = z_scaled - z_scaled.max()  # numerical stability
                exp_z = np.exp(z_shifted)
                h = exp_z / exp_z.sum()
        return h, activations

    # ------------------------------------------------------------------
    # Action selection
    # ------------------------------------------------------------------

    def select_action(self, state: np.ndarray) -> tuple[int, float]:
        """
        Sample an action from the policy distribution.
        Returns (action_index, log_prob).
        """
        probs, _ = self._forward(state)
        # Clip for numerical safety
        probs = np.clip(probs, 1e-8, 1.0)
        probs /= probs.sum()

        action = int(np.random.choice(N_ACTIONS, p=probs))
        log_prob = float(np.log(probs[action]))

        self.strategy_counts[action] += 1
        return action, log_prob

    # ------------------------------------------------------------------
    # REINFORCE update
    # ------------------------------------------------------------------

    def update(self, trajectory: list[TrajectoryStep]) -> float:
        """
        Run REINFORCE weight update on a complete episode trajectory.
        Returns the mean policy loss (for logging).
        """
        if not trajectory:
            return 0.0

        rewards = np.array([t.reward for t in trajectory], dtype=np.float64)

        # Discounted returns
        returns = np.zeros_like(rewards)
        G = 0.0
        for t in reversed(range(len(rewards))):
            G = rewards[t] + self.gamma * G
            returns[t] = G

        # Normalize returns for training stability
        if returns.std() > 1e-8:
            returns = (returns - returns.mean()) / (returns.std() + 1e-8)

        total_loss = 0.0

        for t, step in enumerate(trajectory):
            G_t = float(returns[t])
            state = step.state
            action = step.action

            # Track win stats
            if step.reward > 0:
                self.strategy_wins[action] += 1

            # Forward pass to get probs + activations
            probs, activations = self._forward(state)
            probs = np.clip(probs, 1e-8, 1.0)
            probs /= probs.sum()

            log_prob = float(np.log(probs[action]))
            total_loss -= log_prob * G_t  # REINFORCE loss

            # --- Backprop ---
            # Output layer gradient: ∂L/∂z_out = (probs - one_hot) * (-G_t)
            one_hot = np.zeros(N_ACTIONS, dtype=np.float64)
            one_hot[action] = 1.0
            # For softmax: d_loss/d_z = (p - y) * (-G_t / temp)
            dz = (probs - one_hot) * (-G_t) / max(self.softmax_temp, 1e-6)

            # Propagate through layers (reversed)
            n_layers = len(self.weights)
            for i in reversed(range(n_layers)):
                # Compute input to this layer
                if i == 0:
                    h_in = state.astype(np.float64)
                else:
                    h_in = np.tanh(activations[i - 1])

                # Gradient for weights and biases
                dW = np.outer(h_in, dz)
                db = dz.copy()

                # Update weights
                self.weights[i] += self.lr * dW
                self.biases[i] += self.lr * db

                # Propagate gradient to previous layer (tanh derivative)
                if i > 0:
                    dh = dz @ self.weights[i].T
                    dz = dh * (1.0 - np.tanh(activations[i - 1]) ** 2)

        self.episodes_trained += 1
        # Anneal softmax temperature slightly to exploit more over time
        self.softmax_temp = max(0.5, self.softmax_temp * 0.98)

        return float(total_loss / len(trajectory))

    # ------------------------------------------------------------------
    # Strategy helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_strategy_label(action_idx: int) -> str:
        return STRATEGIES[action_idx]["label"]

    @staticmethod
    def get_strategy_instruction(action_idx: int) -> str:
        return STRATEGIES[action_idx]["instruction"]

    def strategy_win_rates(self) -> dict[str, float]:
        """Return per-strategy win rates (positive reward %)."""
        rates = {}
        for i, s in enumerate(STRATEGIES):
            count = self.strategy_counts[i]
            wins = self.strategy_wins[i]
            rates[s["label"]] = round(float(wins / count), 3) if count > 0 else 0.0
        return rates

    def action_probs_for_state(self, state: np.ndarray) -> dict[str, float]:
        """Return current policy probabilities for a given state (for debugging)."""
        probs, _ = self._forward(state)
        probs = np.clip(probs, 1e-8, 1.0)
        probs /= probs.sum()
        return {s["label"]: round(float(probs[i]), 4) for i, s in enumerate(STRATEGIES)}

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        save_dict: dict = {
            "lr": self.lr,
            "gamma": self.gamma,
            "softmax_temp": self.softmax_temp,
            "episodes_trained": self.episodes_trained,
            "strategy_wins": self.strategy_wins,
            "strategy_counts": self.strategy_counts,
        }
        for i, (W, b) in enumerate(zip(self.weights, self.biases)):
            save_dict[f"W{i}"] = W
            save_dict[f"b{i}"] = b
        np.savez(path, **save_dict)

    @classmethod
    def load(cls, path: str | Path) -> "NNPolicy":
        path = Path(path)
        data = np.load(path, allow_pickle=False)

        # Reconstruct layer shapes from saved weights
        i = 0
        weights, biases = [], []
        while f"W{i}" in data:
            weights.append(data[f"W{i}"].astype(np.float64))
            biases.append(data[f"b{i}"].astype(np.float64))
            i += 1

        policy = cls.__new__(cls)
        policy.lr = float(data["lr"])
        policy.gamma = float(data["gamma"])
        policy.softmax_temp = float(data["softmax_temp"])
        policy.episodes_trained = int(data["episodes_trained"])
        policy.strategy_wins = data["strategy_wins"].astype(np.float64)
        policy.strategy_counts = data["strategy_counts"].astype(np.float64)
        policy.weights = weights
        policy.biases = biases
        return policy


# ---------------------------------------------------------------------------
# State builder helper
# ---------------------------------------------------------------------------

def build_state(
    current_pos: np.ndarray,
    target_pos: np.ndarray,
    vis_score: float,
    initial_dist: float,
    step: int,
    max_steps: int,
) -> np.ndarray:
    """
    Build the normalized 7D state vector fed to the NN.
    All values scaled to roughly [-1, 1] or [0, 1] range.
    """
    dist = float(np.linalg.norm(current_pos - target_pos))
    return np.array([
        float(current_pos[0]) / 30.0,           # PCA coords typically in [-30, 30]
        float(current_pos[1]) / 30.0,
        float(target_pos[0]) / 30.0,
        float(target_pos[1]) / 30.0,
        vis_score / 10.0,                        # [0, 1]
        dist / max(initial_dist, 1e-8),          # [0, ~1.5]
        step / max(max_steps, 1),                # [0, 1]
    ], dtype=np.float64)
