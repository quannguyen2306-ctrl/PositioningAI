"""
tests/test_rag_batch_embed.py
-----------------------------
Unit test asserting run_evaluation embeds all questions in ONE batched call
(not one per question). Mocks the OpenAI client so it runs without API keys.

  cd backend && python tests/test_rag_batch_embed.py
"""

import sys
import os
import json
import hashlib
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from pipeline.embeddings import EmbeddingStore
from pipeline.rag_evaluator import run_evaluation


def _seed(text: str) -> int:
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


class _CountingEmbeddings:
    def __init__(self):
        self.calls = 0
        self.inputs: list[list[str]] = []

    def create(self, model, input):
        self.calls += 1
        self.inputs.append(list(input))
        data = [
            SimpleNamespace(embedding=np.random.default_rng(_seed(t)).standard_normal(16).tolist())
            for t in input
        ]
        return SimpleNamespace(data=data)


class _FakeChat:
    def __init__(self):
        self.completions = self

    def create(self, model, messages, **kwargs):
        if kwargs.get("response_format"):  # visibility eval → JSON
            content = json.dumps({
                "business_mentioned": True,
                "mention_quality": "brief",
                "visibility_score": 6,
                "competitor_domains_mentioned": [],
                "why_low_visibility": "",
                "key_observation": "ok",
            })
        else:                              # RAG answer → free text
            content = "a fake RAG answer"
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


class _FakeClient:
    def __init__(self):
        self.embeddings = _CountingEmbeddings()
        self.chat = _FakeChat()


def test_run_evaluation_batches_question_embeddings():
    client = _FakeClient()
    store = EmbeddingStore(client, collection_name="batch_embed_test")
    store.store(["competitor a", "competitor b"], source="competitor", url="c", domain="c.com")
    store.store(["user homepage copy"], source="user", url="biz", domain="")

    questions = ["q1 about pricing", "q2 about support", "q3 about features"]

    # Reset the counter after setup so we only measure the eval run.
    client.embeddings.calls = 0
    client.embeddings.inputs = []

    results = run_evaluation(questions, store, client, "Biz")

    # Exactly ONE batched embed call for all N questions (not N calls).
    assert client.embeddings.calls == 1, f"expected 1 embed call, got {client.embeddings.calls}"
    # That call carried every question, in order — each question's vector comes
    # from the single batch.
    assert client.embeddings.inputs[0] == questions, "batched call did not carry all questions in order"
    assert len(results["results"]) == len(questions), "not every question was evaluated"

    print(f"  PASS  {len(questions)} questions embedded in 1 batched call")


if __name__ == "__main__":
    print("Running batched-embedding test (no API keys needed)...\n")
    try:
        test_run_evaluation_batches_question_embeddings()
    except Exception as e:
        print(f"  FAIL  {e}")
