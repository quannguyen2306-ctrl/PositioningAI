"""
rl_agent.py
-----------
LLM-based content generation agent.

At each step the agent receives:
  - The PCA axis labels (what the map dimensions mean)
  - Business context (name, industry, UVP)
  - Current position vs target position
  - Few-shot examples from past similar episodes (Option 1 cross-business learning)
  - Reflexion history: past drafts + rewards + critiques from THIS episode

Temperature anneals from 0.85 → 0.35 over the episode to encourage
exploration early and refinement late.
"""

from dataclasses import dataclass

import numpy as np
from openai import OpenAI


@dataclass
class RLStepRecord:
    step: int
    draft_text: str
    draft_summary: str   # first 120 chars — used in history block
    reward: float
    pos_before: list[float]
    pos_after: list[float]
    vis_before: float
    vis_after: float
    critique: str
    temperature: float


class RLAgent:
    """
    GPT-4o agent that generates content drafts to move a business's
    semantic position toward a target on the PCA map.
    """

    INITIAL_TEMP = 0.85
    TEMP_DECAY = 0.07
    TEMP_FLOOR = 0.35

    def __init__(
        self,
        openai_client: OpenAI,
        business_context: dict,
        interpretations: list[dict],
        target_pos: np.ndarray,
        initial_pos: np.ndarray,
        few_shot_episodes: list = None,
    ):
        self.client = openai_client
        self.business_context = business_context
        self.interpretations = interpretations
        self.target_pos = target_pos
        self.initial_pos = initial_pos
        self.few_shot_episodes = few_shot_episodes or []

    def generate(
        self,
        current_pos: np.ndarray,
        history: list[RLStepRecord],
        step: int,
        max_steps: int,
        best_draft: str = "",
        best_reward: float = -999.0,
        strategy_hint: str = "",
    ) -> str:
        temperature = self.compute_temperature(step)
        system_prompt = self._build_system_prompt(history)
        user_message = self._build_user_message(
            current_pos, step, max_steps, best_draft, best_reward, strategy_hint
        )

        resp = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=1200,
        )
        return resp.choices[0].message.content.strip()

    def generate_critique(
        self,
        draft: str,
        delta: np.ndarray,
        reward: float,
    ) -> str:
        """
        Cheap GPT-4o-mini call that turns a reward + delta into a
        one-sentence human-readable critique for the Reflexion history.
        """
        x_interp = self.interpretations[0] if self.interpretations else {}
        y_interp = self.interpretations[1] if len(self.interpretations) > 1 else {}

        dx_label, dy_label = "", ""
        if x_interp and len(delta) > 0:
            end = x_interp.get("positive_end") if delta[0] > 0 else x_interp.get("negative_end")
            dx_label = f'X axis moved toward "{end}" ({delta[0]:+.2f})'
        if y_interp and len(delta) > 1:
            end = y_interp.get("positive_end") if delta[1] > 0 else y_interp.get("negative_end")
            dy_label = f'Y axis moved toward "{end}" ({delta[1]:+.2f})'

        direction = "toward the target" if reward > 0 else "away from the target"

        prompt = (
            f"One-sentence critique of a content draft's semantic movement.\n\n"
            f"Movement: {dx_label}. {dy_label}.\n"
            f"Reward: {reward:.3f} — moved {direction}.\n"
            f"Draft preview: {draft[:200]}...\n\n"
            f"In one sentence, explain what caused this movement and what "
            f"the agent should do differently next time if the reward was low."
        )

        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=80,
        )
        return resp.choices[0].message.content.strip()

    def compute_temperature(self, step: int) -> float:
        temp = self.INITIAL_TEMP - ((step - 1) * self.TEMP_DECAY)
        return round(max(self.TEMP_FLOOR, temp), 2)

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    def _build_system_prompt(self, history: list[RLStepRecord]) -> str:
        x_interp = self.interpretations[0] if self.interpretations else {}
        y_interp = self.interpretations[1] if len(self.interpretations) > 1 else {}

        x_axis = (
            f'  X-axis: "{x_interp.get("negative_end")}" ←→ "{x_interp.get("positive_end")}"'
            f' ({x_interp.get("variance_explained", "?")}% of AI content variation)'
            if x_interp else ""
        )
        y_axis = (
            f'  Y-axis: "{y_interp.get("negative_end")}" ←→ "{y_interp.get("positive_end")}"'
            f' ({y_interp.get("variance_explained", "?")}% of AI content variation)'
            if y_interp else ""
        )

        ctx = self.business_context
        few_shot_block = self._build_few_shot_block()
        history_block = self._build_history_block(history)

        return f"""You are a GEO (Generative Engine Optimization) content strategist.
Your task: write content drafts that move a business's semantic position on an AI \
visibility map toward a target position, while maintaining or improving the business's \
visibility in AI-generated search answers.

ABOUT THE MAP
The map is a 2D projection of AI semantic embedding space:
{x_axis}
{y_axis}
Points closer together are semantically similar in how AI systems retrieve and cite them.

BUSINESS CONTEXT
Name: {ctx.get("business_name", "")}
Industry: {ctx.get("industry", "")}
Products/Services: {", ".join(ctx.get("products_services", []))}
Target audience: {ctx.get("target_audience", "")}
Value proposition: {ctx.get("unique_value_prop", "")}

EPISODE GOAL
Starting position: {self._describe(self.initial_pos)}
Target position:   {self._describe(self.target_pos)}

{few_shot_block}{history_block}RULES
1. Write exactly 500-700 words of prose. No headers, no bullet points.
2. Content must be genuine and useful for this business — not generic filler.
3. Avoid keyword stuffing. Semantic shift comes from genuine emphasis on certain topics/tones.
4. Study the history below: if past drafts moved the wrong direction, understand why and correct."""

    def _build_user_message(
        self,
        current_pos: np.ndarray,
        step: int,
        max_steps: int,
        best_draft: str = "",
        best_reward: float = -999.0,
        strategy_hint: str = "",
    ) -> str:
        dist = float(np.linalg.norm(current_pos - self.target_pos))
        steps_left = max_steps - step

        hint = ""
        if steps_left <= 2:
            hint = "\nOnly a few steps remain — be bold and direct in your semantic shift."
        elif step == 1 and self.few_shot_episodes:
            hint = "\nRefer to the successful examples above to inform your approach."

        # Momentum block: show the best draft as a reference, not a direction to amplify.
        # The agent should learn WHAT worked (themes, framing) not amplify blindly.
        momentum_block = ""
        if best_draft and best_reward > 0.05:
            momentum_block = (
                f"\nBEST DRAFT SO FAR (reward: {best_reward:.3f}) — study what made this "
                f"effective, then write a DIFFERENT draft that targets the same destination "
                f"from a fresh angle. Do not copy or simply amplify this:\n"
                f"{best_draft[:600]}\n"
            )

        strategy_block = f"\n{strategy_hint}\n" if strategy_hint else ""

        return (
            f"Write a content draft for "
            f"{self.business_context.get('business_name', 'this business')} "
            f"that moves the semantic position toward the target.\n\n"
            f"Current position: {self._describe(current_pos)}\n"
            f"Target position:  {self._describe(self.target_pos)}\n"
            f"Remaining distance: {dist:.2f} units\n"
            f"Steps remaining: {steps_left}"
            f"{hint}"
            f"{strategy_block}"
            f"{momentum_block}\n"
            f"Return ONLY the content draft (500-700 words of prose). "
            f"No JSON, no explanation, no headers."
        )

    def _build_few_shot_block(self) -> str:
        if not self.few_shot_episodes:
            return ""
        lines = ["EXAMPLES FROM SIMILAR PAST EPISODES (learn what worked for similar businesses)\n"]
        for i, ep in enumerate(self.few_shot_episodes[:2]):
            lines.append(
                f"--- Example {i + 1} "
                f"(reward: {ep.best_reward:.2f}, industry: {ep.industry}, "
                f"direction: {ep.target_direction}) ---"
            )
            lines.append(f"{ep.best_draft[:350]}...\n")
        return "\n".join(lines) + "\n"

    def _build_history_block(self, history: list[RLStepRecord]) -> str:
        if not history:
            return ""
        recent = history[-5:]  # sliding window to keep prompt size bounded
        lines = ["PAST ATTEMPTS THIS EPISODE (most recent last)\n"]
        for r in recent:
            direction = "toward target ✓" if r.reward > 0 else "away from target ✗"
            lines.append(
                f"--- Step {r.step} "
                f"(reward: {r.reward:.3f}, moved {direction}) ---"
            )
            lines.append(f"Draft preview: {r.draft_summary}...")
            lines.append(f"Feedback: {r.critique}\n")
        return "\n".join(lines) + "\n"

    def _describe(self, pos: np.ndarray) -> str:
        """Convert a PCA position into a human-readable string."""
        x_interp = self.interpretations[0] if self.interpretations else {}
        y_interp = self.interpretations[1] if len(self.interpretations) > 1 else {}

        parts = [f"({pos[0]:.2f}, {pos[1]:.2f})"]
        if x_interp:
            end = x_interp.get("positive_end") if pos[0] >= 0 else x_interp.get("negative_end")
            parts.append(f'X→"{end}"')
        if y_interp and len(pos) > 1:
            end = y_interp.get("positive_end") if pos[1] >= 0 else y_interp.get("negative_end")
            parts.append(f'Y→"{end}"')

        return " ".join(parts)
