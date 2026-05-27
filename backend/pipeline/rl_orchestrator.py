"""
rl_orchestrator.py
------------------
Episode loop: generate → evaluate → reward → refine → repeat.

Stopping conditions (whichever triggers first):
  1. Proximity  — user centroid within proximity_threshold of target
  2. Plateau    — best reward over the trailing window fails to beat the prior
                  best by at least plateau_eps (see rl_reward.is_plateau)
  3. Max steps  — hard cost ceiling
"""

import time
from dataclasses import dataclass, field

import numpy as np
from openai import OpenAI

from pipeline.rl_reward import compute_reward, is_converged, is_plateau
from pipeline.rl_env import RLEnvironment
from pipeline.rl_agent import RLAgent, RLStepRecord
from pipeline.nn_policy import NNPolicy, TrajectoryStep, build_state
from cache.episode_store import (
    episode_store,
    EpisodeRecord,
    compute_target_direction,
)


@dataclass
class RLConfig:
    max_steps: int = 8
    proximity_threshold: float = 0.3
    plateau_eps: float = 0.05


@dataclass
class RLEpisodeResult:
    episode_id: str
    final_pos: list[float]
    best_draft: str
    best_reward: float
    total_reward: float
    steps_taken: int
    stop_reason: str   # "converged" | "plateau" | "max_steps" | "error"
    step_history: list[dict]


class RLOrchestrator:
    def __init__(
        self,
        pipeline_data: dict,
        openai_client: OpenAI,
        episode_id: str,
        config: RLConfig = None,
        nn_policy: NNPolicy | None = None,
    ):
        self.pipeline_data = pipeline_data
        self.client = openai_client
        self.episode_id = episode_id
        self.config = config or RLConfig()
        self.nn_policy = nn_policy

    def run_episode(
        self,
        target_pos: np.ndarray,
        event_callback=None,
    ) -> RLEpisodeResult:
        env = RLEnvironment(self.pipeline_data, self.client)
        business_context = self.pipeline_data["business_context"]
        interpretations = self.pipeline_data.get("interpretations", [])

        # Baseline state before any RL steps
        initial_pos = env.get_current_position()
        initial_vis = env.get_current_vis()
        initial_dist = float(np.linalg.norm(target_pos - initial_pos))

        # Find few-shot examples from similar past episodes
        archetype_name = (self.pipeline_data.get("archetype") or {}).get("name", "")
        direction = compute_target_direction(
            float(target_pos[0] - initial_pos[0]),
            float(target_pos[1] - initial_pos[1]),
        )
        few_shot = episode_store.find_similar(
            industry=business_context.get("industry", ""),
            archetype=archetype_name,
            target_direction=direction,
            top_k=2,
        )

        agent = RLAgent(
            openai_client=self.client,
            business_context=business_context,
            interpretations=interpretations,
            target_pos=target_pos,
            initial_pos=initial_pos,
            few_shot_episodes=few_shot,
        )

        history: list[RLStepRecord] = []
        best_draft = ""
        best_reward = -999.0
        current_pos = initial_pos.copy()
        current_vis = initial_vis
        reward_history: list[float] = []
        stop_reason = "max_steps"
        nn_trajectory: list[TrajectoryStep] = []

        if event_callback:
            event_callback({
                "event": "rl_start",
                "episode_id": self.episode_id,
                "initial_pos": initial_pos.tolist(),
                "target_pos": target_pos.tolist(),
                "initial_vis": initial_vis,
                "few_shot_count": len(few_shot),
                "max_steps": self.config.max_steps,
            })

        for step in range(1, self.config.max_steps + 1):
            # Check convergence before spending an LLM call
            if is_converged(current_pos, target_pos, self.config.proximity_threshold):
                stop_reason = "converged"
                break

            try:
                # NN policy selects strategy (if enabled)
                nn_action, nn_log_prob, strategy_hint = None, 0.0, ""
                if self.nn_policy is not None:
                    state_vec = build_state(
                        current_pos, target_pos, current_vis,
                        initial_dist, step, self.config.max_steps,
                    )
                    nn_action, nn_log_prob = self.nn_policy.select_action(state_vec)
                    strategy_hint = self.nn_policy.get_strategy_instruction(nn_action)

                # Generate content draft (pass best so far for momentum)
                draft = agent.generate(
                    current_pos, history, step, self.config.max_steps,
                    best_draft=best_draft, best_reward=best_reward,
                    strategy_hint=strategy_hint,
                )

                # Evaluate in environment (re-embed + frozen PCA + RAG)
                step_result = env.step(draft)
                new_pos = step_result.pos
                new_vis = step_result.vis_score

                # Compute reward
                reward_result = compute_reward(
                    pos_prev=current_pos,
                    pos_curr=new_pos,
                    pos_target=target_pos,
                    vis_prev=current_vis,
                    vis_curr=new_vis,
                    initial_dist=initial_dist,
                )

                # One-sentence critique for Reflexion history
                delta = new_pos - current_pos
                critique = agent.generate_critique(draft, delta, reward_result.reward)

                record = RLStepRecord(
                    step=step,
                    draft_text=draft,
                    draft_summary=draft[:120],
                    reward=reward_result.reward,
                    pos_before=current_pos.tolist(),
                    pos_after=new_pos.tolist(),
                    vis_before=round(current_vis, 2),
                    vis_after=round(new_vis, 2),
                    critique=critique,
                    temperature=agent.compute_temperature(step),
                )
                history.append(record)
                reward_history.append(reward_result.reward)

                # Record NN trajectory step
                if self.nn_policy is not None and nn_action is not None:
                    nn_trajectory.append(TrajectoryStep(
                        state=state_vec,
                        action=nn_action,
                        log_prob=nn_log_prob,
                        reward=reward_result.reward,
                    ))

                if reward_result.reward > best_reward:
                    best_reward = reward_result.reward
                    best_draft = draft

                _step_delta_norm = float(np.linalg.norm(new_pos - current_pos))
                current_pos = new_pos
                current_vis = new_vis

                if event_callback:
                    _magnitude = float(np.clip(
                        _step_delta_norm / (initial_dist + 1e-8),
                        0.0, 1.0,
                    ))
                    event_callback({
                        "event": "rl_step",
                        "episode_id": self.episode_id,
                        "step": step,
                        "reward": reward_result.reward,
                        "cos_sim": reward_result.cos_sim,
                        "magnitude": _magnitude,
                        "vis_score": round(new_vis, 2),
                        "vis_delta": reward_result.vis_delta,
                        "pos": new_pos.tolist(),
                        "pca_points": step_result.pca_points,
                        "critique": critique,
                        "draft_preview": draft[:200],
                        "moved_toward_target": reward_result.moved_toward_target,
                    })

                # Plateau check — stop only when the trailing window has failed
                # to beat the prior best by at least the configured plateau_eps.
                if is_plateau(reward_history, self.config.plateau_eps):
                    stop_reason = "plateau"
                    break

            except Exception as exc:
                if event_callback:
                    event_callback({
                        "event": "rl_step_error",
                        "episode_id": self.episode_id,
                        "step": step,
                        "message": str(exc),
                    })
                stop_reason = "error"
                break

        total_reward = sum(r.reward for r in history)

        # Update NN policy weights via REINFORCE (real gradient update)
        if self.nn_policy is not None and nn_trajectory:
            loss = self.nn_policy.update(nn_trajectory)
            if event_callback:
                event_callback({
                    "event": "nn_update",
                    "episode_id": self.episode_id,
                    "policy_loss": round(loss, 6),
                    "episodes_trained": self.nn_policy.episodes_trained,
                    "strategy_win_rates": self.nn_policy.strategy_win_rates(),
                })

        # Persist episode for future few-shot retrieval
        self._persist_episode(
            business_context=business_context,
            archetype=archetype_name,
            direction=direction,
            initial_pos=initial_pos,
            target_pos=target_pos,
            best_draft=best_draft,
            best_reward=best_reward,
            history=history,
        )

        result = RLEpisodeResult(
            episode_id=self.episode_id,
            final_pos=current_pos.tolist(),
            best_draft=best_draft,
            best_reward=round(best_reward if best_reward > -999 else 0.0, 4),
            total_reward=round(total_reward, 4),
            steps_taken=len(history),
            stop_reason=stop_reason,
            step_history=[
                {
                    "step": r.step,
                    "reward": r.reward,
                    "pos_before": r.pos_before,
                    "pos_after": r.pos_after,
                    "vis_before": r.vis_before,
                    "vis_after": r.vis_after,
                    "critique": r.critique,
                    "draft_preview": r.draft_summary,
                    "moved_toward_target": r.reward > 0,
                }
                for r in history
            ],
        )

        if event_callback:
            event_callback({
                "event": "rl_complete",
                "episode_id": self.episode_id,
                "best_draft": best_draft,
                "best_reward": result.best_reward,
                "total_reward": result.total_reward,
                "steps_taken": result.steps_taken,
                "stop_reason": stop_reason,
                "final_pos": current_pos.tolist(),
            })

        return result

    def _persist_episode(
        self,
        business_context: dict,
        archetype: str,
        direction: str,
        initial_pos: np.ndarray,
        target_pos: np.ndarray,
        best_draft: str,
        best_reward: float,
        history: list[RLStepRecord],
    ) -> None:
        if not best_draft or best_reward <= 0:
            return
        record = EpisodeRecord(
            episode_id=self.episode_id,
            industry=business_context.get("industry", ""),
            archetype=archetype,
            target_direction=direction,
            target_x=float(target_pos[0]),
            target_y=float(target_pos[1]),
            initial_x=float(initial_pos[0]),
            initial_y=float(initial_pos[1]),
            best_reward=best_reward,
            steps_taken=len(history),
            best_draft=best_draft,
            step_history=[
                {
                    "step": r.step,
                    "draft_summary": r.draft_summary,
                    "reward": r.reward,
                    "delta_x": r.pos_after[0] - r.pos_before[0],
                    "delta_y": r.pos_after[1] - r.pos_before[1],
                    "critique": r.critique,
                }
                for r in history
            ],
            created_at=time.time(),
        )
        episode_store.save_episode(record)
