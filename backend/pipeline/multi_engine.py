"""
multi_engine.py
---------------
Queries multiple AI engines (ChatGPT, Claude, Gemini, Perplexity) with the
same test questions and evaluates how each engine represents a business.

This tests what each AI knows *natively* — no RAG context is injected.
"""

import json
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI


# ---------------------------------------------------------------------------
# Engine query functions
# ---------------------------------------------------------------------------

USER_PROMPT = (
    "Answer the following question naturally and helpfully. "
    "Be specific — if you know relevant businesses, products, or services, "
    "mention them by name.\n\nQuestion: {question}"
)


def query_openai(question: str, api_key: str) -> str:
    """Query ChatGPT (gpt-4o-mini) with a natural question."""
    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": USER_PROMPT.format(question=question)}],
        temperature=0.3,
        max_tokens=1024,
    )
    return resp.choices[0].message.content


def query_claude(question: str, api_key: str) -> str:
    """Query Claude with a natural question. Tries models in order of preference."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    models = [
        "claude-sonnet-4-6-20250514",
        "claude-sonnet-4-5-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-haiku-20240307",
    ]
    last_err = None
    for model in models:
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=1024,
                messages=[{"role": "user", "content": USER_PROMPT.format(question=question)}],
            )
            return resp.content[0].text
        except anthropic.NotFoundError:
            last_err = model
            continue
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError) as e:
            raise Exception(f"Anthropic API key error: {e}")
    raise Exception(
        f"No available Claude model found (tried: {', '.join(models)}). "
        "Your API key may be expired or have no credits."
    )


def query_gemini(question: str, api_key: str) -> str:
    """Query Gemini with a natural question using the google-genai SDK."""
    from google import genai

    client = genai.Client(api_key=api_key)
    models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]
    last_err = None
    for model in models:
        try:
            resp = client.models.generate_content(
                model=model,
                contents=USER_PROMPT.format(question=question),
            )
            return resp.text
        except Exception as e:
            last_err = e
            if "not found" in str(e).lower() or "not available" in str(e).lower():
                continue
            raise
    raise Exception(f"No available Gemini model found: {last_err}")


def query_perplexity(question: str, api_key: str) -> str:
    """Query Perplexity (sonar) via OpenAI-compatible API."""
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.perplexity.ai",
    )
    resp = client.chat.completions.create(
        model="sonar",
        messages=[{"role": "user", "content": USER_PROMPT.format(question=question)}],
        temperature=0.3,
        max_tokens=1024,
    )
    return resp.choices[0].message.content


# ---------------------------------------------------------------------------
# Engine registry
# ---------------------------------------------------------------------------

ENGINE_REGISTRY = {
    "chatgpt": query_openai,
    "claude": query_claude,
    "gemini": query_gemini,
    "perplexity": query_perplexity,
}


# ---------------------------------------------------------------------------
# Response evaluation (reuses scoring logic from rag_evaluator)
# ---------------------------------------------------------------------------

ENGINE_EVAL_PROMPT = """You are evaluating business visibility in an AI-generated answer.

Business being tracked: "{business_name}"
Question asked: "{question}"
AI engine: {engine}

AI-generated answer:
{answer}

Return ONLY a JSON object:
{{
  "business_mentioned": true or false,
  "mention_quality": "prominent" | "brief" | "absent",
  "visibility_score": integer 0-10,
  "competitor_names_mentioned": ["name1", "name2"],
  "key_observation": "one concise sentence summarising how this engine represented the business"
}}

Scoring guide:
  9-10 : Business is the primary or first recommendation
  7-8  : Business is mentioned clearly among others
  5-6  : Business appears briefly or indirectly
  3-4  : Business not mentioned but related content shapes the answer
  0-2  : Business is completely absent"""


def evaluate_engine_response(
    question: str,
    answer: str,
    business_name: str,
    engine: str,
    eval_client: OpenAI,
) -> dict:
    """Score a single engine response for business visibility."""
    resp = eval_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": ENGINE_EVAL_PROMPT.format(
                    business_name=business_name,
                    question=question,
                    engine=engine,
                    answer=answer,
                ),
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    try:
        return json.loads(resp.choices[0].message.content)
    except json.JSONDecodeError:
        return {
            "business_mentioned": False,
            "mention_quality": "absent",
            "visibility_score": 0,
            "competitor_names_mentioned": [],
            "key_observation": "Could not evaluate response.",
        }


# ---------------------------------------------------------------------------
# Single engine full evaluation
# ---------------------------------------------------------------------------

def _evaluate_engine(
    engine_name: str,
    query_fn,
    api_key: str,
    questions: list[str],
    business_name: str,
    eval_client: OpenAI,
) -> dict:
    """Run all questions through a single engine and evaluate each response."""
    results = []
    for question in questions:
        try:
            answer = query_fn(question, api_key)
        except Exception as e:
            answer = f"[Error querying {engine_name}: {e}]"

        eval_data = evaluate_engine_response(
            question, answer, business_name, engine_name, eval_client
        )

        results.append({
            "question": question,
            "answer": answer,
            "visibility_score": eval_data.get("visibility_score", 0),
            "business_mentioned": eval_data.get("business_mentioned", False),
            "mention_quality": eval_data.get("mention_quality", "absent"),
            "key_observation": eval_data.get("key_observation", ""),
        })

    scores = [r["visibility_score"] for r in results]
    avg_score = sum(scores) / len(scores) if scores else 0
    mention_count = sum(1 for r in results if r["business_mentioned"])
    mention_rate = round(mention_count / len(results) * 100, 1) if results else 0

    return {
        "engine": engine_name,
        "available": True,
        "results": results,
        "avg_visibility_score": round(avg_score, 1),
        "mention_rate": mention_rate,
    }


# ---------------------------------------------------------------------------
# Cross-engine comparison summary
# ---------------------------------------------------------------------------

COMPARISON_PROMPT = """You are analyzing how different AI engines represent a business.

Business: "{business_name}"

Results by engine:
{engine_summaries}

Write a concise 2-3 sentence comparison summary highlighting:
- Which engines represent this business best/worst
- Any notable patterns (e.g., one engine consistently mentions competitors instead)
- What this means for the business's AI visibility strategy

Return ONLY a JSON object:
{{
  "comparison_summary": "your 2-3 sentence summary"
}}"""


def _generate_comparison_summary(
    engine_results: list[dict],
    business_name: str,
    eval_client: OpenAI,
) -> str:
    """Generate a GPT-4o summary comparing visibility across engines."""
    summaries = "\n".join(
        f"  {e['engine']}: avg score {e['avg_visibility_score']}/10, "
        f"mention rate {e['mention_rate']}%"
        for e in engine_results
    )

    resp = eval_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": COMPARISON_PROMPT.format(
                    business_name=business_name,
                    engine_summaries=summaries,
                ),
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    try:
        data = json.loads(resp.choices[0].message.content)
        return data.get("comparison_summary", "")
    except json.JSONDecodeError:
        return "Could not generate comparison summary."


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------

def run_multi_engine_evaluation(
    questions: list[str],
    business_name: str,
    api_keys: dict,
    openai_client: OpenAI,
    progress_callback=None,
) -> dict:
    """
    Query all available AI engines with the test questions, evaluate responses,
    and produce a cross-engine comparison.

    api_keys: {"openai": "...", "anthropic": "...", "google": "...", "perplexity": "..."}
    """
    # Determine which engines are available
    key_to_engine = {
        "openai": "chatgpt",
        "anthropic": "claude",
        "google": "gemini",
        "perplexity": "perplexity",
    }

    available_engines = {}
    for key_name, engine_name in key_to_engine.items():
        api_key = api_keys.get(key_name, "")
        if api_key:
            available_engines[engine_name] = api_key

    if not available_engines:
        return None

    if progress_callback:
        engine_names = ", ".join(available_engines.keys())
        progress_callback(-1, f"Testing across AI engines: {engine_names}...")

    # Query engines in parallel
    engine_results = []
    with ThreadPoolExecutor(max_workers=len(available_engines)) as pool:
        futures = {}
        for engine_name, api_key in available_engines.items():
            query_fn = ENGINE_REGISTRY[engine_name]
            future = pool.submit(
                _evaluate_engine,
                engine_name,
                query_fn,
                api_key,
                questions,
                business_name,
                openai_client,
            )
            futures[future] = engine_name

        for future in as_completed(futures):
            engine_name = futures[future]
            try:
                result = future.result()
                engine_results.append(result)
            except Exception as e:
                engine_results.append({
                    "engine": engine_name,
                    "available": False,
                    "results": [],
                    "avg_visibility_score": 0,
                    "mention_rate": 0,
                    "error": str(e),
                })

    # Sort by engine name for consistent ordering
    engine_results.sort(key=lambda e: e["engine"])

    # Find best/worst
    scored = [e for e in engine_results if e.get("available", False)]
    best_engine = max(scored, key=lambda e: e["avg_visibility_score"])["engine"] if scored else ""
    worst_engine = min(scored, key=lambda e: e["avg_visibility_score"])["engine"] if scored else ""
    cross_avg = round(
        sum(e["avg_visibility_score"] for e in scored) / len(scored), 1
    ) if scored else 0

    # Generate comparison summary
    comparison_summary = _generate_comparison_summary(
        scored, business_name, openai_client
    ) if len(scored) >= 2 else "Only one engine was tested — add more API keys to enable cross-engine comparison."

    return {
        "engines": engine_results,
        "comparison_summary": comparison_summary,
        "best_engine": best_engine,
        "worst_engine": worst_engine,
        "cross_engine_avg": cross_avg,
    }
