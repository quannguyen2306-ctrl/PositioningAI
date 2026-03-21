"""
recommender.py
--------------
Takes the evaluation results + PCA interpretation and produces
structured, actionable recommendations using GPT-4o.

Output schema:
  {
    executive_summary        : str
    overall_score_meaning    : str
    positioning_insight      : str   (from PCA)
    priority_fixes           : [{title, problem, action, impact, effort}]
    content_to_add           : [{type, title, suggested_content, placement}]
    topics_to_cover          : [str]
  }
"""

import json
from openai import OpenAI


RECOMMENDATION_PROMPT = """You are an expert in Generative Engine Optimization (GEO) —
helping small businesses improve how AI assistants (ChatGPT, Perplexity, Claude, Gemini)
represent them when users ask questions.

========== BUSINESS PROFILE ==========
Name: {business_name}
Industry: {industry}
Products/Services: {services}
Target audience: {audience}
Location: {location}
Unique value proposition: {uvp}

========== AI VISIBILITY RESULTS ==========
Average visibility score: {avg_score}/10
Mention rate across {total_q} questions: {mention_rate}%
Score breakdown — high (8-10): {high}, medium (5-7): {medium}, low (0-4): {low}

Questions where the business had LOW visibility (score < 6):
{low_vis_questions}

Most frequently cited competitor domains:
{top_competitors}

========== SEMANTIC POSITIONING (PCA) ==========
{pca_insights}

========== SAMPLE COMPETITOR CONTENT ==========
{comp_sample}

========== YOUR TASK ==========
Generate comprehensive, concrete, actionable recommendations to improve
this business's visibility in AI-generated answers.

Return ONLY a valid JSON object:
{{
  "executive_summary": "2-3 sentence plain-English summary of the core problem and biggest opportunity",

  "overall_score_meaning": "What {avg_score}/10 means practically — are they invisible, partially visible, or competitive?",

  "positioning_insight": "Based on the PCA analysis, explain in 2-3 sentences WHERE this business sits vs competitors in AI's 'mental model' and what that means for their visibility",

  "priority_fixes": [
    {{
      "title": "Short action title",
      "problem": "Specific problem causing low visibility for this fix",
      "action": "Exactly what to do — be specific and concrete",
      "impact": "high | medium | low",
      "effort": "low | medium | high"
    }}
  ],

  "content_to_add": [
    {{
      "type": "faq | paragraph | page | schema_markup",
      "title": "Title for this content piece",
      "suggested_content": "WRITE THE ACTUAL CONTENT HERE — ready to copy-paste. Make it specific to this business, not generic.",
      "placement": "exactly where on their website this goes"
    }}
  ],

  "topics_to_cover": [
    "specific topic or question they should publish content about"
  ]
}}

Rules:
- priority_fixes: 3-5 items, ordered highest impact first
- content_to_add: 2-3 items, each with REAL written content (not placeholder text)
- topics_to_cover: exactly 5 specific topics
- Make everything specific to THIS business — no generic advice
- suggested_content should be ready to publish, not a template"""


def generate_recommendations(
    business_context: dict,
    eval_results: dict,
    interpretations: list[dict],
    competitor_docs: list[dict],
    client: OpenAI,
) -> dict:
    """
    Generate structured GEO recommendations from evaluation + PCA results.
    Uses GPT-4o for higher reasoning quality on the final output.
    """

    # --- Summarise low-visibility questions ---
    low_vis = [
        r for r in eval_results["results"]
        if r["visibility_score"] < 6
    ]
    low_vis_str = "\n".join(
        f'  • "{r["question"]}" — score {r["visibility_score"]}/10'
        + (f' — {r["why_low_visibility"]}' if r.get("why_low_visibility") else "")
        for r in low_vis[:6]
    ) or "  (none — all scores ≥ 6)"

    # --- PCA insights as readable text ---
    pca_str = "\n".join(
        f'  Axis {i+1} "{interp["dimension_name"]}" '
        f'({interp.get("variance_explained", "?")}% variance): '
        f'{interp["explanation"]}  '
        f'[{interp["negative_end"]} ←→ {interp["positive_end"]}]'
        for i, interp in enumerate(interpretations)
    )

    # --- Sample competitor content (top 3, capped) ---
    comp_sample = "\n\n".join(
        f"[{doc['domain']}]\n{doc['text'][:400]}..."
        for doc in competitor_docs[:3]
    )

    # --- Score breakdown ---
    bd = eval_results.get("score_breakdown", {})

    prompt = RECOMMENDATION_PROMPT.format(
        business_name=business_context.get("business_name", ""),
        industry=business_context.get("industry", ""),
        services=", ".join(business_context.get("products_services", [])),
        audience=business_context.get("target_audience", ""),
        location=business_context.get("location", ""),
        uvp=business_context.get("unique_value_prop", ""),
        avg_score=eval_results.get("avg_visibility_score", 0),
        total_q=eval_results.get("total_questions", 0),
        mention_rate=eval_results.get("mention_rate", 0),
        high=bd.get("high (8-10)", 0),
        medium=bd.get("medium (5-7)", 0),
        low=bd.get("low (0-4)", 0),
        low_vis_questions=low_vis_str,
        top_competitors=", ".join(eval_results.get("top_competitor_domains", [])[:5]) or "none identified",
        pca_insights=pca_str,
        comp_sample=comp_sample,
    )

    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except json.JSONDecodeError:
        return {
            "executive_summary": "Could not generate recommendations — please try again.",
            "overall_score_meaning": "",
            "positioning_insight": "",
            "priority_fixes": [],
            "content_to_add": [],
            "topics_to_cover": [],
        }
