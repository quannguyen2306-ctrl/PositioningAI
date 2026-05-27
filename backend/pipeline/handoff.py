"""
handoff.py
----------
Typed handoff between a completed analysis run and the operations that reuse it
(Content Lab re-scoring, recommendation generation, RL episodes).

`PipelineHandoff` carries the frozen state of one analysis: the embedding store,
the fitted PCA + scaler, the PCA metadata, the test questions, the business
context, and the axis interpretations. Replacing the old untyped dict means a
renamed field fails loudly at attribute-access time instead of silently
returning None.

`re_evaluate` owns the full Stage-9 re-scoring chain (the deep method behind the
thin Content Lab route): chunk new content → swap user chunks → RAG eval →
project through the frozen PCA → classify archetype → find blue-ocean zones →
build PCA points, with the single mention_rate normalization applied once here.
"""

from dataclasses import dataclass
from typing import Any

from openai import OpenAI

from .ingestion import chunk_text
from .rag_evaluator import run_evaluation
from .blue_ocean import classify_archetype, find_blue_ocean_zones


@dataclass
class PipelineHandoff:
    store: Any                       # EmbeddingStore from the completed run
    pca: Any                         # fitted PCA (never refit downstream)
    scaler: Any                      # fitted StandardScaler
    metadata: list[dict]             # pca_metadata aligned with the fitted coords
    questions: list[str]             # test questions to re-score against
    business_context: dict
    interpretations: list[dict]      # per-axis PCA interpretations

    def re_evaluate(self, new_content: str, client: OpenAI) -> dict:
        """
        Re-score new user content against the frozen competitive map.

        Mirrors the main run's Stage 9 so the Content Lab result is identical in
        shape and units to a fresh analysis. Returns the response dict the
        Content Lab route sends to the client unchanged.
        """
        chunks = chunk_text(new_content)
        if not chunks:
            chunks = [new_content[:2000]]  # fallback: treat as a single chunk

        self.store.replace_user_chunks(
            chunks,
            source="user",
            url="content-lab",
            domain="",
        )

        eval_results = run_evaluation(
            self.questions,
            self.store,
            client,
            self.business_context.get("business_name", "Your Business"),
        )

        # Re-project all embeddings through the already-fitted PCA (no refit).
        all_embeddings, all_meta = self.store.get_all_for_pca()
        scaled = self.scaler.transform(all_embeddings)
        new_coords = self.pca.transform(scaled)

        archetype = classify_archetype(new_coords, all_meta, eval_results["results"])
        blue_ocean_zones = find_blue_ocean_zones(new_coords, all_meta)

        pca_points = [
            {
                "components": new_coords[i].tolist(),
                "source": all_meta[i]["source"],
                "domain": all_meta[i]["domain"],
                "text": all_meta[i]["text"],
            }
            for i in range(len(new_coords))
        ]

        return {
            "eval": {
                **eval_results,
                # Single normalization point — 0–100 percent → 0.0–1.0 fraction,
                # matching the main run's SSE `eval` event (frontend ×100).
                "mention_rate": round(eval_results["mention_rate"] / 100, 4),
            },
            "pca_points": pca_points,
            "archetype": archetype,
            "blue_ocean_zones": blue_ocean_zones,
            "blue_ocean_opportunities": eval_results.get("blue_ocean_opportunities", []),
        }
