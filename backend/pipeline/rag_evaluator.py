"""
rag_evaluator.py
----------------
Simulates what Perplexity / ChatGPT Search does when a potential customer
asks a question:

  1. Generate realistic test questions from the business context.
  2. For each question, retrieve top-k chunks from the shared vector space
     (user content + competitor content all mixed together).
  3. Feed retrieved context into an LLM to generate an answer — exactly
     as a live retrieval-augmented product would.
  4. Score whether the user's business was mentioned, how prominently,
     and why it might have been missed.

All questions are evaluated in parallel using ThreadPoolExecutor for speed.
"""

import json
import concurrent.futures
from openai import OpenAI
from .embeddings import EmbeddingStore


# ---------------------------------------------------------------------------
# Question generation
# ---------------------------------------------------------------------------

QUESTION_GEN_PROMPT = """You are testing how well a business appears when
potential customers ask an AI assistant for recommendations.

Business profile:
  Name: {name}
  Industry: {industry}
  Products/Services: {services}
  Target audience: {audience}
  Location: {location}

Generate 10 natural questions that a real potential customer might type
into an AI assistant (Perplexity, ChatGPT, etc.) when looking for
this type of business or solution.

Mix these types:
  - Informational: "what is the best X for Y?"
  - Comparison: "X vs Y — which is better for Z?"
  - Local/specific: "top X in [location]"
  - Problem-driven: "how do I solve [problem they face]?"

Return ONLY a JSON object: {{"questions": ["q1", "q2", ...]}}"""


def generate_test_questions(
    business_context: dict,
    client: OpenAI,
    custom_questions: list[str] | None = None,
) -> list[str]:
    """
    If custom_questions provided, use those.
    Otherwise, use GPT to generate realistic customer queries.
    """
    if custom_questions:
        return custom_questions

    prompt = QUESTION_GEN_PROMPT.format(
        name=business_context.get("business_name", ""),
        industry=business_context.get("industry", ""),
        services=", ".join(business_context.get("products_services", [])),
        audience=business_context.get("target_audience", ""),
        location=business_context.get("location", ""),
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    data = json.loads(resp.choices[0].message.content)

    # Handle both {"questions": [...]} and bare [...]
    if isinstance(data, list):
        return data
    for v in data.values():
        if isinstance(v, list):
            return v
    return []


# ---------------------------------------------------------------------------
# Single-question RAG evaluation
# ---------------------------------------------------------------------------

RAG_SYSTEM = (
    "You are a helpful AI assistant. Answer the user's question using "
    "ONLY the provided context documents. Be specific. If you mention "
    "a business or product, use its actual name from the context."
)

RAG_USER = """Question: {question}

Context documents:
{context}

Answer the question based on the context above."""

EVAL_PROMPT = """You are evaluating business visibility in an AI-generated answer.

Business being tracked: "{business_name}"
Question asked: "{question}"

AI-generated answer:
{answer}

Retrieval stats:
  - User's business chunks retrieved: {user_chunks} / {total_chunks}
  - Competitor chunks retrieved: {comp_chunks} / {total_chunks}
  - Top retrieved chunk source: {top_source}

Return ONLY a JSON object:
{{
  "business_mentioned": true or false,
  "mention_quality": "prominent" | "brief" | "absent",
  "visibility_score": integer 0-10,
  "competitor_domains_mentioned": ["domain1.com", "domain2.com"],
  "why_low_visibility": "one sentence reason if score < 7, else null",
  "key_observation": "one concise sentence summarising this question's result"
}}

Scoring guide:
  9-10 : Business is the primary or first recommendation
  7-8  : Business is mentioned clearly among others
  5-6  : Business appears briefly or indirectly
  3-4  : Business not mentioned but its content shaped the answer
  0-2  : Business is absent; competitors dominate"""


def evaluate_single_question(
    question: str,
    store: EmbeddingStore,
    client: OpenAI,
    business_name: str,
    k: int = 8,
) -> dict:
    """
    Run one RAG cycle for a question and return a visibility report dict.
    """
    retrieved = store.query(question, k=k)

    if not retrieved:
        return {
            "question": question,
            "answer": "No content retrieved.",
            "retrieved_chunks": [],
            "business_mentioned": False,
            "mention_quality": "absent",
            "visibility_score": 0,
            "competitor_domains_mentioned": [],
            "why_low_visibility": "No content in vector store.",
            "key_observation": "No data available for this question.",
            "user_chunk_count": 0,
            "comp_chunk_count": 0,
            "is_blue_ocean": False,
        }

    # Build context string for the RAG prompt
    context_parts = []
    for i, chunk in enumerate(retrieved):
        label = f"[Doc {i+1} | {chunk['source'].upper()} | {chunk['domain'] or chunk['url'][:40]}]"
        context_parts.append(f"{label}\n{chunk['text']}")
    context = "\n\n---\n\n".join(context_parts)

    # --- Step 1: Generate RAG answer ---
    rag_resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": RAG_SYSTEM},
            {"role": "user", "content": RAG_USER.format(question=question, context=context)},
        ],
        temperature=0.3,
    )
    answer = rag_resp.choices[0].message.content

    # --- Step 2: Evaluate visibility ---
    user_chunks = sum(1 for r in retrieved if r["source"] == "user")
    comp_chunks = sum(1 for r in retrieved if r["source"] == "competitor")
    top_source = retrieved[0]["source"] if retrieved else "none"

    eval_resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": EVAL_PROMPT.format(
                    business_name=business_name,
                    question=question,
                    answer=answer,
                    user_chunks=user_chunks,
                    comp_chunks=comp_chunks,
                    total_chunks=len(retrieved),
                    top_source=top_source,
                ),
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    eval_data = json.loads(eval_resp.choices[0].message.content)
    comp_domains = eval_data.get("competitor_domains_mentioned", [])
    business_mentioned = eval_data.get("business_mentioned", False)

    return {
        "question": question,
        "answer": answer,
        "retrieved_chunks": retrieved,
        "business_mentioned": business_mentioned,
        "mention_quality": eval_data.get("mention_quality", "absent"),
        "visibility_score": eval_data.get("visibility_score", 0),
        "competitor_domains_mentioned": comp_domains,
        "why_low_visibility": eval_data.get("why_low_visibility"),
        "key_observation": eval_data.get("key_observation", ""),
        "user_chunk_count": user_chunks,
        "comp_chunk_count": comp_chunks,
        "is_blue_ocean": not business_mentioned and len(comp_domains) == 0,
    }


# ---------------------------------------------------------------------------
# Full evaluation run (parallel)
# ---------------------------------------------------------------------------

def run_evaluation(
    questions: list[str],
    store: EmbeddingStore,
    client: OpenAI,
    business_name: str,
    progress_callback=None,
) -> dict:
    """
    Run all questions through the RAG evaluator in parallel using ThreadPoolExecutor.
    Returns aggregated results + per-question breakdowns.
    """
    results_map: dict[str, dict] = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(questions), 10)) as executor:
        future_to_q = {
            executor.submit(evaluate_single_question, q, store, client, business_name): q
            for q in questions
        }
        completed = 0
        for future in concurrent.futures.as_completed(future_to_q):
            q = future_to_q[future]
            try:
                results_map[q] = future.result()
            except Exception as exc:
                results_map[q] = {
                    "question": q,
                    "answer": f"Evaluation failed: {exc}",
                    "retrieved_chunks": [],
                    "business_mentioned": False,
                    "mention_quality": "absent",
                    "visibility_score": 0,
                    "competitor_domains_mentioned": [],
                    "why_low_visibility": "Evaluation error.",
                    "key_observation": "Could not evaluate this question.",
                    "user_chunk_count": 0,
                    "comp_chunk_count": 0,
                    "is_blue_ocean": False,
                }
            completed += 1
            if progress_callback:
                progress_callback(completed, len(questions))

    # Preserve original question order
    results = [results_map[q] for q in questions if q in results_map]

    scores = [r["visibility_score"] for r in results]
    avg_score = sum(scores) / len(scores) if scores else 0
    mention_count = sum(1 for r in results if r["business_mentioned"])

    # Top competitor domains
    from collections import Counter
    all_competitors: list[str] = []
    for r in results:
        all_competitors.extend(r.get("competitor_domains_mentioned", []))
    top_competitors = [d for d, _ in Counter(all_competitors).most_common(5)]

    # Blue ocean opportunities: questions no business dominates
    blue_ocean_opportunities = []
    for r in results:
        comp_domains = r.get("competitor_domains_mentioned", [])
        user_mentioned = r.get("business_mentioned", False)
        score = r.get("visibility_score", 0)
        if not user_mentioned and len(comp_domains) == 0:
            blue_ocean_opportunities.append({
                "question": r["question"],
                "visibility_score": score,
                "opportunity_strength": "high",
            })
        elif not user_mentioned and len(comp_domains) <= 1 and score < 4:
            blue_ocean_opportunities.append({
                "question": r["question"],
                "visibility_score": score,
                "opportunity_strength": "medium",
            })

    return {
        "results": results,
        "avg_visibility_score": round(avg_score, 1),
        "mention_rate": round(mention_count / len(results) * 100, 1) if results else 0,
        "total_questions": len(results),
        "top_competitor_domains": top_competitors,
        "score_breakdown": {
            "high (8-10)": sum(1 for s in scores if s >= 8),
            "medium (5-7)": sum(1 for s in scores if 5 <= s < 8),
            "low (0-4)": sum(1 for s in scores if s < 5),
        },
        "blue_ocean_opportunities": blue_ocean_opportunities,
    }
