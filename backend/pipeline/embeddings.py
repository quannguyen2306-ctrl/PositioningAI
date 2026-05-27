"""
embeddings.py
-------------
Wraps OpenAI text-embedding-3-small and ChromaDB to provide:
  - store()        : embed + persist chunks with source metadata
  - query()        : similarity search returning ranked chunks
  - get_all_for_pca() : returns raw embedding matrix + metadata for PCA
"""

import uuid
import numpy as np
import chromadb
from openai import OpenAI

EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 100        # OpenAI embedding batch limit (safe ceiling)
MAX_CHUNKS_PER_SOURCE = 40  # cap per competitor to keep PCA balanced


class EmbeddingStore:
    def __init__(self, openai_client: OpenAI, collection_name: str = "geo_diag"):
        self.client = openai_client

        # Ephemeral in-memory ChromaDB (no disk I/O needed for demo)
        self.chroma = chromadb.Client()

        # Always start fresh — drop previous run if present
        try:
            self.chroma.delete_collection(collection_name)
        except Exception:
            pass

        self.collection = self.chroma.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # use cosine similarity
        )

        # Parallel list to ChromaDB for PCA (holds numpy vectors)
        self._all_chunks: list[dict] = []

        # Capped snapshot of the original user chunks, used as the immutable
        # identity anchor for RL draft overlays. Initialized here so the
        # overlay contract is structural, not an implicit "call save first".
        self._user_snapshot: list[dict] = []

    # ------------------------------------------------------------------
    # Embedding helpers
    # ------------------------------------------------------------------

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts (up to BATCH_SIZE)."""
        response = self.client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in response.data]

    def _embed_all(self, texts: list[str]) -> list[list[float]]:
        """Embed an arbitrarily long list by batching."""
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i : i + BATCH_SIZE]
            all_embeddings.extend(self._embed_batch(batch))
        return all_embeddings

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def store(
        self,
        chunks: list[str],
        source: str,        # "user" or "competitor"
        url: str = "",
        domain: str = "",
    ) -> None:
        """
        Embed chunks and store them in ChromaDB + internal list.
        Caps competitor chunks to keep the vector space balanced.
        """
        if not chunks:
            return

        # Cap per-source to avoid one competitor dominating PCA
        if source == "competitor":
            chunks = chunks[:MAX_CHUNKS_PER_SOURCE]

        embeddings = self._embed_all(chunks)

        # Build unique IDs — ChromaDB requires globally unique IDs
        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [
            {"source": source, "url": url, "domain": domain, "chunk_idx": i}
            for i in range(len(chunks))
        ]

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        # Store for PCA
        for chunk, emb, meta in zip(chunks, embeddings, metadatas):
            self._all_chunks.append(
                {
                    "text": chunk,
                    "embedding": emb,
                    "source": source,
                    "url": url,
                    "domain": domain,
                }
            )

    def embed_queries(self, texts: list[str]) -> list[list[float]]:
        """
        Embed many query texts in a single batched round-trip (one OpenAI call
        for up to BATCH_SIZE texts), so the evaluator can precompute all query
        vectors instead of embedding one question at a time.
        """
        return self._embed_all(texts)

    def query(self, query_text: str, k: int = 10) -> list[dict]:
        """
        Return top-k chunks most similar to query_text.
        Each result: {text, source, url, domain, score (0-1)}.
        """
        return self.query_by_vector(self._embed_batch([query_text])[0], k)

    def query_by_vector(self, query_emb, k: int = 10) -> list[dict]:
        """Top-k chunks for a precomputed query embedding (no embed call)."""
        n_stored = self.collection.count()
        if n_stored == 0:
            return []

        k = min(k, n_stored)
        results = self.collection.query(
            query_embeddings=[np.asarray(query_emb, dtype=float).tolist()],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )

        output: list[dict] = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append(
                {
                    "text": doc,
                    "source": meta["source"],
                    "url": meta["url"],
                    "domain": meta.get("domain", ""),
                    "score": round(1.0 - dist, 4),  # cosine distance → similarity
                }
            )

        return output

    def replace_user_chunks(
        self,
        chunks: list[str],
        source: str = "user",
        url: str = "content-lab",
        domain: str = "",
    ) -> None:
        """
        Remove all existing user chunks and replace with new ones.
        Used by the Content Lab to test new content without re-running the full pipeline.
        """
        # Delete user docs from ChromaDB
        try:
            self.collection.delete(where={"source": "user"})
        except Exception:
            pass

        # Remove from internal list
        self._all_chunks = [c for c in self._all_chunks if c["source"] != "user"]

        # Add new user chunks
        if chunks:
            self.store(chunks, source=source, url=url, domain=domain)

    # How many original chunks to keep in the snapshot (evenly sampled).
    # Keeps the original footprint present without letting it swamp the draft.
    _SNAPSHOT_CAP = 15

    # How many times to repeat draft chunks in the store.
    # Draft chunks × _DRAFT_REPEAT ≈ snapshot size → roughly equal weighting.
    _DRAFT_REPEAT = 3

    def save_user_snapshot(self) -> None:
        """
        Snapshot the current user chunks (embeddings included) so they can be
        restored cheaply — no re-embedding needed — on every RL step.

        Caps to _SNAPSHOT_CAP evenly-sampled chunks so the original content
        doesn't swamp the draft signal when both sit in the centroid.
        Call once after the main pipeline finishes, before the RL loop starts.
        """
        all_user = [dict(c) for c in self._all_chunks if c["source"] == "user"]
        if len(all_user) <= self._SNAPSHOT_CAP:
            self._user_snapshot = all_user
        else:
            # Even sampling: pick _SNAPSHOT_CAP indices spread across the full list
            step = len(all_user) / self._SNAPSHOT_CAP
            indices = [int(i * step) for i in range(self._SNAPSHOT_CAP)]
            self._user_snapshot = [all_user[i] for i in indices]

    def make_overlay(self, draft_chunks: list[str]) -> "EmbeddingOverlay":
        """
        Build a read-only query view for one RL step: competitor chunks from
        this (immutable) base + the capped user snapshot + the draft layered on
        top, without mutating the base store. Each episode holds its own
        overlay, so concurrent episodes — or an analysis run after an episode —
        cannot corrupt each other's state.

        Option-C weighting is preserved: the draft is embedded once and repeated
        _DRAFT_REPEAT times so the user centroid is ≈ 50% original identity +
        50% new draft signal.
        """
        return EmbeddingOverlay(self, draft_chunks)

    def get_all_for_pca(self) -> tuple[np.ndarray, list[dict]]:
        """
        Returns:
          embeddings  : (N, D) float32 array
          metadata    : list of N dicts {source, url, domain, text}
        """
        embeddings = np.array(
            [d["embedding"] for d in self._all_chunks], dtype=np.float32
        )
        metadata = [
            {
                "source": d["source"],
                "url": d["url"],
                "domain": d["domain"],
                "text": d["text"],
            }
            for d in self._all_chunks
        ]
        return embeddings, metadata


class EmbeddingOverlay:
    """
    Immutable-base + draft-overlay view used by a single RL step.

    Composes its chunk set once, in memory, from:
      - the base store's competitor chunks (shared, never mutated),
      - the base store's capped user snapshot (Option-C identity anchor),
      - the draft chunks, embedded once and repeated _DRAFT_REPEAT times.

    Exposes the same ``query`` / ``get_all_for_pca`` surface the evaluator and
    PCA projection consume, so it is a drop-in for ``EmbeddingStore`` at a step
    boundary. Querying is an in-memory cosine search over the composed set —
    the base ChromaDB collection is read for its vectors only, never written.
    """

    def __init__(self, base: "EmbeddingStore", draft_chunks: list[str]):
        self._base = base

        # Competitor chunks + capped snapshot are referenced read-only; copy the
        # dicts so downstream code can't mutate the base's lists through us.
        chunks: list[dict] = [
            dict(c) for c in base._all_chunks if c["source"] == "competitor"
        ]
        chunks += [dict(s) for s in base._user_snapshot]

        # Draft: embed once, repeat for balanced centroid weighting.
        if draft_chunks:
            draft_embs = base._embed_all(draft_chunks)
            repeated = draft_chunks * base._DRAFT_REPEAT
            repeated_embs = draft_embs * base._DRAFT_REPEAT
            for text, emb in zip(repeated, repeated_embs):
                chunks.append({
                    "text": text, "embedding": emb,
                    "source": "user", "url": "rl-draft", "domain": "",
                })

        self._chunks = chunks
        self._matrix = (
            np.array([c["embedding"] for c in chunks], dtype=np.float32)
            if chunks else np.empty((0, 0), dtype=np.float32)
        )

    def embed_queries(self, texts: list[str]) -> list[list[float]]:
        """Batch-embed query texts via the base store (single round-trip)."""
        return self._base._embed_all(texts)

    def query(self, query_text: str, k: int = 10) -> list[dict]:
        """Top-k chunks by cosine similarity to query_text (in-memory)."""
        return self.query_by_vector(self._base._embed_batch([query_text])[0], k)

    def query_by_vector(self, query_emb, k: int = 10) -> list[dict]:
        """Top-k chunks for a precomputed query embedding (in-memory cosine)."""
        if not self._chunks:
            return []

        q = np.asarray(query_emb, dtype=np.float32)
        q_norm = q / (np.linalg.norm(q) + 1e-8)
        m_norm = self._matrix / (
            np.linalg.norm(self._matrix, axis=1, keepdims=True) + 1e-8
        )
        sims = m_norm @ q_norm

        k = min(k, len(self._chunks))
        top = np.argsort(-sims)[:k]
        return [
            {
                "text": self._chunks[i]["text"],
                "source": self._chunks[i]["source"],
                "url": self._chunks[i].get("url", ""),
                "domain": self._chunks[i].get("domain", ""),
                "score": round(float(sims[i]), 4),
            }
            for i in top
        ]

    def get_all_for_pca(self) -> tuple[np.ndarray, list[dict]]:
        """All composed vectors + metadata, for projection through the frozen PCA."""
        embeddings = np.array(
            [c["embedding"] for c in self._chunks], dtype=np.float32
        )
        metadata = [
            {
                "source": c["source"],
                "url": c.get("url", ""),
                "domain": c.get("domain", ""),
                "text": c["text"],
            }
            for c in self._chunks
        ]
        return embeddings, metadata
