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

    def query(self, query_text: str, k: int = 10) -> list[dict]:
        """
        Return top-k chunks most similar to query_text.
        Each result: {text, source, url, domain, score (0-1)}.
        """
        n_stored = self.collection.count()
        if n_stored == 0:
            return []

        k = min(k, n_stored)
        query_emb = self._embed_batch([query_text])[0]

        results = self.collection.query(
            query_embeddings=[query_emb],
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

    def restore_snapshot_and_add_draft(self, draft_chunks: list[str]) -> None:
        """
        Option-C RL step helper — balanced centroid weighting:
          1. Remove all current user chunks from store.
          2. Re-insert the capped original snapshot without re-embedding.
          3. Embed draft chunks and add them _DRAFT_REPEAT times so their
             weight roughly matches the snapshot size.

        Result: centroid ≈ 50% original identity + 50% new draft signal,
        giving the agent a meaningful gradient to follow each step.
        """
        # --- 1. Remove current user chunks ---
        try:
            self.collection.delete(where={"source": "user"})
        except Exception:
            pass
        self._all_chunks = [c for c in self._all_chunks if c["source"] != "user"]

        # --- 2. Re-insert snapshot (no API call needed) ---
        if self._user_snapshot:
            snap_ids = [str(uuid.uuid4()) for _ in self._user_snapshot]
            snap_embs = [s["embedding"] for s in self._user_snapshot]
            snap_docs = [s["text"] for s in self._user_snapshot]
            snap_metas = [
                {
                    "source": "user",
                    "url": s["url"],
                    "domain": s["domain"],
                    "chunk_idx": i,
                }
                for i, s in enumerate(self._user_snapshot)
            ]
            self.collection.add(
                ids=snap_ids,
                embeddings=snap_embs,
                documents=snap_docs,
                metadatas=snap_metas,
            )
            for item in self._user_snapshot:
                self._all_chunks.append(dict(item))

        # --- 3. Embed draft chunks and repeat _DRAFT_REPEAT times ---
        if draft_chunks:
            draft_embs = self._embed_all(draft_chunks)
            repeated_chunks = draft_chunks * self._DRAFT_REPEAT
            repeated_embs = draft_embs * self._DRAFT_REPEAT
            rep_ids = [str(uuid.uuid4()) for _ in repeated_chunks]
            rep_metas = [
                {"source": "user", "url": "rl-draft", "domain": "", "chunk_idx": i}
                for i in range(len(repeated_chunks))
            ]
            self.collection.add(
                ids=rep_ids,
                embeddings=repeated_embs,
                documents=repeated_chunks,
                metadatas=rep_metas,
            )
            for chunk, emb in zip(repeated_chunks, repeated_embs):
                self._all_chunks.append({
                    "text": chunk, "embedding": emb,
                    "source": "user", "url": "rl-draft", "domain": "",
                })

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
