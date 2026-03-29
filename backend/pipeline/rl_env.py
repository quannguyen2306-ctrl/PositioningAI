"""
rl_env.py
---------
Wraps the existing evaluation pipeline as an RL environment.

Each call to step() applies a content draft by:
  1. Chunking the draft text
  2. Replacing user chunks in the embedding store
  3. Re-projecting all embeddings onto the frozen PCA
  4. Running RAG evaluation for visibility score
  5. Returning the new user centroid position + visibility score
"""

from dataclasses import dataclass

import numpy as np
from openai import OpenAI

from pipeline.ingestion import chunk_text
from pipeline.rag_evaluator import run_evaluation


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

    def __init__(self, pipeline_data: dict, openai_client: OpenAI):
        self.store = pipeline_data["store"]
        self.pca = pipeline_data["pca"]
        self.scaler = pipeline_data["scaler"]
        self.questions = pipeline_data["questions"]
        self.business_context = pipeline_data["business_context"]
        self.client = openai_client

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
        Modifies the embedding store in-place (replaces user chunks).
        """
        chunks = chunk_text(draft_text)
        if not chunks:
            chunks = [draft_text[:2000]]

        self.store.replace_user_chunks(
            chunks,
            source="user",
            url="rl-agent",
            domain="",
        )

        embeddings, meta = self.store.get_all_for_pca()
        coords = self._project(embeddings)
        pos = self._user_centroid(coords, meta)

        eval_results = run_evaluation(
            self.questions,
            self.store,
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
