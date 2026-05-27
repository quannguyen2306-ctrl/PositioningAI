"""
rl_env.py
---------
Wraps the existing evaluation pipeline as an RL environment.

Each call to step() applies a content draft by:
  1. Chunking the draft text
  2. Restoring the original user chunks (snapshot), then adding the draft
     chunks alongside them — Option C: centroid = original + draft content
  3. Re-projecting all embeddings onto the frozen PCA
  4. Running RAG evaluation for visibility score
  5. Returning the new user centroid position + visibility score

This means each step independently answers:
  "If I added this draft to my existing website, where would I sit?"
rather than navigating away from the original business position.
"""

from dataclasses import dataclass

import numpy as np
from openai import OpenAI

from pipeline.ingestion import chunk_text
from pipeline.rag_evaluator import run_evaluation
from pipeline.handoff import PipelineHandoff


@dataclass
class EnvStepResult:
    pos: np.ndarray        # user centroid in 2D PCA space  [x, y]
    vis_score: float       # avg RAG visibility score 0-10
    pca_points: list[dict] # all points (user + competitors) for frontend map


class RLEnvironment:
    """
    Stateful environment backed by the frozen PCA + embedding store
    from a completed main pipeline run.

    The PCA and scaler are NEVER refitted — new content is always
    projected into the same coordinate space as the original run,
    making before/after positions directly comparable.
    """

    def __init__(self, handoff: PipelineHandoff, openai_client: OpenAI):
        self.store = handoff.store
        self.pca = handoff.pca
        self.scaler = handoff.scaler
        self.questions = handoff.questions
        self.business_context = handoff.business_context
        self.client = openai_client

        # Save original user chunks once so every RL step starts from the
        # same baseline (original website content + new draft) — Option C.
        self.store.save_user_snapshot()

    def get_current_position(self) -> np.ndarray:
        """Return the current user content centroid in 2D PCA space."""
        embeddings, meta = self.store.get_all_for_pca()
        coords = self._project(embeddings)
        return self._user_centroid(coords, meta)

    def get_current_vis(self) -> float:
        """Run RAG evaluation on current store state without modifying anything."""
        try:
            results = run_evaluation(
                self.questions,
                self.store,
                self.client,
                self.business_context.get("business_name", "Business"),
            )
            return float(results.get("avg_visibility_score", 5.0))
        except Exception:
            return 5.0

    def step(self, draft_text: str) -> EnvStepResult:
        """
        Apply a content draft and return the resulting environment state.

        Operates on a per-step overlay layered over the immutable base store, so
        the original analysis state is never mutated and concurrent episodes
        stay isolated (Option C: original snapshot + draft).
        """
        chunks = chunk_text(draft_text)
        if not chunks:
            chunks = [draft_text[:2000]]

        overlay = self.store.make_overlay(chunks)

        embeddings, meta = overlay.get_all_for_pca()
        coords = self._project(embeddings)
        pos = self._user_centroid(coords, meta)

        eval_results = run_evaluation(
            self.questions,
            overlay,
            self.client,
            self.business_context.get("business_name", "Business"),
        )
        vis_score = float(eval_results.get("avg_visibility_score", 0.0))

        pca_points = [
            {
                "components": coords[i].tolist(),
                "source": meta[i]["source"],
                "domain": meta[i].get("domain", ""),
            }
            for i in range(len(coords))
        ]

        return EnvStepResult(pos=pos, vis_score=vis_score, pca_points=pca_points)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _project(self, embeddings: np.ndarray) -> np.ndarray:
        scaled = self.scaler.transform(embeddings)
        return self.pca.transform(scaled)

    def _user_centroid(self, coords: np.ndarray, meta: list[dict]) -> np.ndarray:
        user_mask = np.array([m["source"] == "user" for m in meta])
        if not any(user_mask):
            return np.zeros(2)
        return coords[user_mask, :2].mean(axis=0)
