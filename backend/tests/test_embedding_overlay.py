"""
tests/test_embedding_overlay.py
-------------------------------
Unit test for the RL draft-overlay embedding view. Mocks the embedding client
so it runs without API keys (in-memory ChromaDB only).

  cd backend && python tests/test_embedding_overlay.py
"""

import sys
import os
import hashlib
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from pipeline.embeddings import EmbeddingStore


def _seed(text: str) -> int:
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


class _FakeEmbeddings:
    """Deterministic per-text vectors — same text always embeds identically."""
    def create(self, model, input):
        data = []
        for text in input:
            rng = np.random.default_rng(_seed(text))
            data.append(SimpleNamespace(embedding=rng.standard_normal(16).tolist()))
        return SimpleNamespace(data=data)


class _FakeClient:
    def __init__(self):
        self.embeddings = _FakeEmbeddings()


def test_overlay_isolation():
    """Draft is visible to the overlay; the base store is unchanged after use."""
    store = EmbeddingStore(_FakeClient(), collection_name="overlay_test")
    store.store(
        ["competitor alpha content", "competitor beta content"],
        source="competitor", url="c1", domain="comp.com",
    )
    store.store(["our original homepage copy"], source="user", url="biz", domain="")
    store.save_user_snapshot()

    base_chunks_before = len(store._all_chunks)
    base_count_before = store.collection.count()

    draft = ["a unique draft sentence about pricing transparency"]
    overlay = store.make_overlay(draft)

    # Draft surfaces in the overlay's query results and PCA set.
    results = overlay.query(draft[0], k=5)
    assert any(r["text"] == draft[0] for r in results), "draft should surface in overlay query"

    _, meta = overlay.get_all_for_pca()
    assert any(m["url"] == "rl-draft" for m in meta), "draft chunks should be in overlay PCA set"
    assert any(m["source"] == "competitor" for m in meta), "competitors should remain in overlay"

    # Base store is UNCHANGED after overlay use (isolation invariant).
    assert len(store._all_chunks) == base_chunks_before, "base _all_chunks mutated"
    assert store.collection.count() == base_count_before, "base ChromaDB collection mutated"
    base_results = store.query(draft[0], k=10)
    assert all(r["url"] != "rl-draft" for r in base_results), "base store must not contain the draft"

    print("  PASS  overlay isolation: draft visible in overlay, base store unchanged")


def test_overlay_draft_repeat_weighting():
    """The draft is repeated _DRAFT_REPEAT times in the overlay (Option-C)."""
    store = EmbeddingStore(_FakeClient(), collection_name="overlay_weight_test")
    store.store(["competitor content one"], source="competitor", url="c1", domain="c.com")
    store.store(["original user copy"], source="user", url="biz", domain="")
    store.save_user_snapshot()

    overlay = store.make_overlay(["draft line"])
    _, meta = overlay.get_all_for_pca()
    draft_count = sum(1 for m in meta if m["url"] == "rl-draft")
    assert draft_count == store._DRAFT_REPEAT, f"expected {store._DRAFT_REPEAT} draft copies, got {draft_count}"

    print(f"  PASS  draft repeated {draft_count}× for balanced centroid weighting")


if __name__ == "__main__":
    print("Running embedding-overlay tests (no API keys needed)...\n")
    for t in (test_overlay_isolation, test_overlay_draft_repeat_weighting):
        try:
            t()
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")
