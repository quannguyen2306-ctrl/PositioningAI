"""
api.py  —  FastAPI backend with Server-Sent Events streaming
Run with:  uvicorn api:app --reload --port 8000
"""

import asyncio
import json
import numpy as np
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
from dotenv import load_dotenv

from pipeline.ingestion import fetch_url, chunk_text, extract_business_context
from pipeline.retrieval import search_competitors, fetch_competitor_docs
from pipeline.embeddings import EmbeddingStore
from pipeline.rag_evaluator import generate_test_questions, run_evaluation
from pipeline.pca_visualizer import fit_pca, interpret_dimensions
from pipeline.recommender import generate_recommendations

load_dotenv()

app = FastAPI(title="Posit — LLM Visibility API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def emit(event: str, **kwargs) -> str:
    """Format a Server-Sent Event data line."""
    payload = json.dumps({"event": event, **kwargs}, default=str)
    return f"data: {payload}\n\n"


@app.get("/analyse/stream")
async def analyse_stream(
    url: str = Query(...),
    n_competitors: int = Query(10),
    n_questions: int = Query(10),
    custom_questions: str = Query(""),         # '||'-separated
    openai_key: str = Query(""),
    serper_key: str = Query(""),
):
    """
    Server-Sent Events endpoint.
    The frontend opens this with EventSource / fetch+ReadableStream.
    Events emitted (in order):
      progress  { pct, step }
      profile   { data: BusinessProfile }
      competitors { competitors: [url, ...] }
      questions   { questions: [str, ...] }
      eval        { eval: EvalResults }
      pca         { points: [...], interpretations: [...] }
      recommendations { recs: Recommendations }
      complete
      error       { message }
    """
    # Allow key override via query (useful for development; in prod use env vars)
    oai_key = openai_key or os.getenv("OPENAI_API_KEY", "")
    srp_key = serper_key or os.getenv("SERPER_API_KEY", "")

    parsed_custom = [q for q in custom_questions.split("||") if q.strip()] \
                    if custom_questions else []

    async def generate():
        try:
            client = OpenAI(api_key=oai_key)

            # ── 1. Fetch + chunk ──
            yield emit("progress", pct=8, step="fetching website…")
            user_text = await asyncio.to_thread(fetch_url, url)
            user_chunks = chunk_text(user_text)

            # ── 2. Business profile ──
            yield emit("progress", pct=16, step="extracting business profile…")
            biz = await asyncio.to_thread(extract_business_context, user_text, client)
            yield emit("profile", data=biz)

            # ── 3. Competitor search ──
            yield emit("progress", pct=25, step=f"searching — \"{biz['search_query']}\"…")
            comp_urls = await asyncio.to_thread(
                search_competitors, biz["search_query"], srp_key, n_competitors
            )
            yield emit("competitors", competitors=comp_urls)

            # ── 4. Scrape competitors ──
            yield emit("progress", pct=34, step=f"scraping {len(comp_urls)} competitor sites…")
            comp_docs = await asyncio.to_thread(fetch_competitor_docs, comp_urls)

            # ── 5. Embed ──
            yield emit("progress", pct=44, step="embedding into vector space…")

            def _do_embeddings():
                store = EmbeddingStore(client)
                store.store(user_chunks, source="user", url=url, domain="YOUR SITE")
                for doc in comp_docs:
                    store.store(chunk_text(doc["text"]), source="competitor",
                                url=doc["url"], domain=doc["domain"])
                return store

            store = await asyncio.to_thread(_do_embeddings)

            # ── 6. Generate questions ──
            yield emit("progress", pct=52, step="generating test questions…")

            def _gen_questions():
                qs = generate_test_questions(
                    biz, client,
                    parsed_custom if parsed_custom else None
                )
                return qs[:n_questions]

            questions = await asyncio.to_thread(_gen_questions)
            yield emit("questions", questions=questions)

            # ── 7. RAG evaluation ──
            yield emit("progress", pct=55, step=f"running rag — {len(questions)} questions…")

            collected_results = []
            for i, question in enumerate(questions):
                from pipeline.rag_evaluator import evaluate_single_question
                result = await asyncio.to_thread(
                    evaluate_single_question, question, store, client, biz["business_name"]
                )
                collected_results.append(result)
                pct = 55 + int((i + 1) / len(questions) * 22)
                yield emit("progress", pct=pct, step=f"evaluated {i+1}/{len(questions)} questions…")

            # Build aggregated results
            scores = [r["visibility_score"] for r in collected_results]
            avg    = sum(scores) / len(scores) if scores else 0
            mentioned = sum(1 for r in collected_results if r["business_mentioned"])

            from collections import Counter
            all_comp_domains: list[str] = []
            for r in collected_results:
                all_comp_domains.extend(r.get("competitor_domains_mentioned", []))
            top_comps = [d for d, _ in Counter(all_comp_domains).most_common(5)]

            eval_results = {
                "results": collected_results,
                "avg_visibility_score": round(avg, 1),
                "mention_rate": round(mentioned / len(collected_results) * 100, 1) if collected_results else 0,
                "total_questions": len(collected_results),
                "top_competitor_domains": top_comps,
                "score_breakdown": {
                    "high (8-10)": sum(1 for s in scores if s >= 8),
                    "medium (5-7)": sum(1 for s in scores if 5 <= s < 8),
                    "low (0-4)": sum(1 for s in scores if s < 5),
                },
            }
            yield emit("eval", eval=eval_results)

            # ── 8. PCA ──
            yield emit("progress", pct=80, step="computing semantic map (pca)…")
            embeddings, pca_meta = store.get_all_for_pca()

            # Use up to 5 components so the user can choose which axes to view
            n_pca = min(5, embeddings.shape[0] - 1, embeddings.shape[1])
            pca_model, scaler, coords = fit_pca(embeddings, n_components=n_pca)
            interpretations = await asyncio.to_thread(
                interpret_dimensions, pca_model, pca_meta, coords, client
            )

            # Serialise all component values so frontend can choose axes
            pca_points = []
            for i, meta in enumerate(pca_meta):
                point = {
                    "components": [float(coords[i, j]) for j in range(coords.shape[1])],
                    "source": meta["source"],
                    "domain": meta.get("domain", ""),
                    "text": meta.get("text", "")[:80],
                }
                pca_points.append(point)

            yield emit("pca", points=pca_points, interpretations=interpretations)

            # ── 9. Recommendations ──
            yield emit("progress", pct=90, step="generating action plan (gpt-4o)…")
            recs = await asyncio.to_thread(
                generate_recommendations, biz, eval_results, interpretations, comp_docs, client
            )
            yield emit("recommendations", recs=recs)

            yield emit("complete", pct=100)

        except Exception as exc:
            yield emit("error", message=str(exc))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",    # disable nginx buffering
        },
    )


@app.get("/health")
def health():
    return {"status": "ok"}
