"""
app.py
------
Streamlit UI for the LLM Visibility Diagnostic tool.

Run with:  streamlit run app.py
"""

import os
import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

from pipeline.ingestion import fetch_url, chunk_text, extract_business_context
from pipeline.retrieval import search_competitors, fetch_competitor_docs
from pipeline.embeddings import EmbeddingStore
from pipeline.rag_evaluator import generate_test_questions, run_evaluation
from pipeline.pca_visualizer import fit_pca, interpret_dimensions, plot_2d, plot_3d
from pipeline.recommender import generate_recommendations

load_dotenv()

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="LLM Visibility Diagnostic",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Custom CSS — minimal, dark-friendly
# ---------------------------------------------------------------------------

st.markdown(
    """
    <style>
    .metric-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 1.1rem 1.4rem;
        text-align: center;
    }
    .metric-label { font-size: 0.8rem; color: #999; margin-bottom: 4px; }
    .metric-value { font-size: 2rem; font-weight: 600; }
    .score-high { color: #4ade80; }
    .score-mid  { color: #facc15; }
    .score-low  { color: #f87171; }
    .fix-badge-high { background:#f87171; color:#fff; border-radius:4px; padding:2px 8px; font-size:0.72rem; }
    .fix-badge-medium { background:#facc15; color:#111; border-radius:4px; padding:2px 8px; font-size:0.72rem; }
    .fix-badge-low { background:#4ade80; color:#111; border-radius:4px; padding:2px 8px; font-size:0.72rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Sidebar — API keys + settings
# ---------------------------------------------------------------------------

with st.sidebar:
    st.image(
        "https://img.icons8.com/fluency/96/artificial-intelligence.png",
        width=60,
    )
    st.markdown("## LLM Visibility Diagnostic")
    st.caption("See how AI sees your business — and what to fix.")
    st.divider()

    st.markdown("### API Keys")
    openai_key = st.text_input(
        "OpenAI API Key",
        type="password",
        value=os.getenv("OPENAI_API_KEY", ""),
        help="Used for embeddings (text-embedding-3-small) and all LLM calls.",
    )
    serper_key = st.text_input(
        "Serper API Key",
        type="password",
        value=os.getenv("SERPER_API_KEY", ""),
        help="Used to find competitor websites. Free tier at serper.dev.",
    )
    st.caption("[Get a free Serper key →](https://serper.dev)")

    st.divider()
    st.markdown("### Settings")
    n_competitors = st.slider("Competitors to analyse", 5, 20, 10)
    n_questions = st.slider("Test questions", 5, 15, 10)

    st.divider()
    st.markdown(
        "**How it works**\n\n"
        "1. Fetches your website\n"
        "2. Finds similar businesses via live search\n"
        "3. Embeds everything into a shared vector space\n"
        "4. Runs RAG — simulating Perplexity/ChatGPT Search\n"
        "5. Scores your AI visibility per question\n"
        "6. PCA maps your position vs competitors\n"
        "7. GPT-4o writes your improvement plan"
    )

# ---------------------------------------------------------------------------
# Main header
# ---------------------------------------------------------------------------

st.title("🔍 LLM Visibility Diagnostic")
st.markdown(
    "**Understand exactly how AI assistants see your business "
    "— and get a concrete plan to improve it.**"
)
st.divider()

# ---------------------------------------------------------------------------
# Input form
# ---------------------------------------------------------------------------

col_url, col_btn = st.columns([4, 1])

with col_url:
    user_url = st.text_input(
        "Your business website URL",
        placeholder="https://yourcompany.com",
        label_visibility="collapsed",
    )

with col_btn:
    run_clicked = st.button(
        "Analyse →",
        type="primary",
        use_container_width=True,
        disabled=not (user_url and openai_key and serper_key),
    )

custom_q_raw = st.text_area(
    "Custom questions to test (optional — one per line)",
    placeholder=(
        "What is the best [product category] for [audience]?\n"
        "How does [business type] help with [problem]?\n"
        "Top [business type] in [city]?"
    ),
    height=90,
)

if not (openai_key and serper_key):
    st.info("Add your API keys in the sidebar to get started.", icon="🔑")

# ---------------------------------------------------------------------------
# Analysis pipeline
# ---------------------------------------------------------------------------

if run_clicked and user_url and openai_key and serper_key:
    client = OpenAI(api_key=openai_key)

    custom_questions = (
        [q.strip() for q in custom_q_raw.strip().splitlines() if q.strip()]
        if custom_q_raw.strip()
        else None
    )

    # ---- Progress UI ----
    progress_bar = st.progress(0, text="Starting…")
    status_box = st.empty()

    def update(pct: int, msg: str):
        progress_bar.progress(pct, text=msg)
        status_box.caption(f"⏳ {msg}")

    try:
        # 1. Fetch user website
        update(8, "Fetching your website…")
        user_text = fetch_url(user_url)
        user_chunks = chunk_text(user_text)

        # 2. Business context
        update(16, "Extracting business profile…")
        biz = extract_business_context(user_text, client)

        # 3. Search for competitors
        update(25, f"Searching for similar businesses: \"{biz['search_query']}\"…")
        comp_urls = search_competitors(biz["search_query"], serper_key, n=n_competitors)

        # 4. Fetch competitor pages
        update(34, f"Scraping {len(comp_urls)} competitor websites…")
        comp_docs = fetch_competitor_docs(comp_urls)

        # 5. Embed everything
        update(44, "Embedding all content into vector space…")
        store = EmbeddingStore(client)
        store.store(user_chunks, source="user", url=user_url, domain="YOUR SITE")
        for doc in comp_docs:
            comp_chunks = chunk_text(doc["text"])
            store.store(
                comp_chunks,
                source="competitor",
                url=doc["url"],
                domain=doc["domain"],
            )

        # 6. Generate test questions
        update(52, "Generating test questions…")
        questions = generate_test_questions(biz, client, custom_questions)
        questions = questions[:n_questions]

        # 7. RAG evaluation
        update(55, f"Running RAG evaluation across {len(questions)} questions…")
        def q_progress(i, total):
            pct = 55 + int((i / total) * 22)
            update(pct, f"Evaluating question {i}/{total}…")

        eval_results = run_evaluation(
            questions, store, client, biz["business_name"],
            progress_callback=q_progress,
        )

        # 8. PCA
        update(80, "Computing semantic positioning (PCA)…")
        embeddings, pca_meta = store.get_all_for_pca()
        pca_model, scaler, coords = fit_pca(embeddings, n_components=3)
        interpretations = interpret_dimensions(pca_model, pca_meta, coords, client)

        # 9. Recommendations
        update(90, "Generating your improvement plan (GPT-4o)…")
        recs = generate_recommendations(biz, eval_results, interpretations, comp_docs, client)

        progress_bar.progress(100, text="Done!")
        status_box.empty()

        # ---- Persist to session state ----
        st.session_state["results"] = {
            "biz": biz,
            "comp_docs": comp_docs,
            "eval": eval_results,
            "coords": coords,
            "pca_meta": pca_meta,
            "interps": interpretations,
            "recs": recs,
        }

    except Exception as exc:
        progress_bar.empty()
        status_box.empty()
        st.error(f"Analysis failed: {exc}")
        st.exception(exc)

# ---------------------------------------------------------------------------
# Results display
# ---------------------------------------------------------------------------

if "results" in st.session_state:
    R = st.session_state["results"]
    biz = R["biz"]
    ev = R["eval"]
    recs = R["recs"]
    interps = R["interps"]

    st.divider()

    # ---- Top metrics ----
    avg = ev["avg_visibility_score"]
    score_class = "score-high" if avg >= 7 else ("score-mid" if avg >= 4 else "score-low")

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(
            f'<div class="metric-card"><div class="metric-label">Visibility Score</div>'
            f'<div class="metric-value {score_class}">{avg}<span style="font-size:1rem">/10</span></div></div>',
            unsafe_allow_html=True,
        )
    with m2:
        st.markdown(
            f'<div class="metric-card"><div class="metric-label">Mention Rate</div>'
            f'<div class="metric-value">{ev["mention_rate"]}<span style="font-size:1rem">%</span></div></div>',
            unsafe_allow_html=True,
        )
    with m3:
        st.markdown(
            f'<div class="metric-card"><div class="metric-label">Competitors Analysed</div>'
            f'<div class="metric-value">{len(R["comp_docs"])}</div></div>',
            unsafe_allow_html=True,
        )
    with m4:
        st.markdown(
            f'<div class="metric-card"><div class="metric-label">Questions Tested</div>'
            f'<div class="metric-value">{ev["total_questions"]}</div></div>',
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # ---- Tabs ----
    tab_profile, tab_vis, tab_map, tab_recs = st.tabs([
        "📋 Business Profile",
        "🧪 AI Visibility Tests",
        "🗺️ Positioning Map",
        "🛠️ Recommendations",
    ])

    # ============================================================
    # TAB 1 — Business Profile
    # ============================================================
    with tab_profile:
        st.subheader(biz.get("business_name", "Your Business"))

        c1, c2 = st.columns(2)
        with c1:
            st.markdown(f"**Industry:** {biz.get('industry', '—')}")
            st.markdown(f"**Location:** {biz.get('location', '—')}")
            st.markdown(f"**Target audience:** {biz.get('target_audience', '—')}")
        with c2:
            svcs = ", ".join(biz.get("products_services", []))
            st.markdown(f"**Products / Services:** {svcs or '—'}")
            st.markdown(f"**Value proposition:** {biz.get('unique_value_prop', '—')}")
            st.markdown(f"**Search query used:** `{biz.get('search_query', '—')}`")

        st.divider()
        st.markdown(f"**{len(R['comp_docs'])} competitors scraped:**")
        for doc in R["comp_docs"]:
            st.caption(f"• {doc['url']}")

    # ============================================================
    # TAB 2 — AI Visibility Tests
    # ============================================================
    with tab_vis:
        # Score distribution
        bd = ev.get("score_breakdown", {})
        col_h, col_m, col_l = st.columns(3)
        col_h.metric("High visibility (8-10)", bd.get("high (8-10)", 0), help="Questions where your business was prominently cited")
        col_m.metric("Medium (5-7)", bd.get("medium (5-7)", 0))
        col_l.metric("Low (0-4)", bd.get("low (0-4)", 0), help="Questions where your business was absent or barely mentioned")

        st.markdown(f"**{recs.get('overall_score_meaning', '')}**")

        if ev.get("top_competitor_domains"):
            st.markdown(
                "**Most cited competitors:** "
                + "  ·  ".join(ev["top_competitor_domains"])
            )

        st.divider()

        for result in ev["results"]:
            icon = "✅" if result["business_mentioned"] else "❌"
            q_label = f"{icon} {result['question']}  —  Score: {result['visibility_score']}/10"
            with st.expander(q_label):
                st.markdown(f"**AI-generated answer:**\n\n{result['answer']}")
                st.divider()

                c_left, c_right = st.columns(2)
                with c_left:
                    st.caption(f"Mention quality: **{result['mention_quality']}**")
                    st.caption(
                        f"Chunks retrieved — yours: {result['user_chunk_count']}  "
                        f"/ competitors: {result['comp_chunk_count']}"
                    )
                with c_right:
                    if result.get("why_low_visibility"):
                        st.warning(f"Why low: {result['why_low_visibility']}")
                    st.caption(f"💡 {result['key_observation']}")

    # ============================================================
    # TAB 3 — Positioning Map
    # ============================================================
    with tab_map:
        st.markdown("### Where your business sits in AI's semantic space")
        st.markdown(recs.get("positioning_insight", ""))

        st.divider()
        st.markdown("**What each axis represents:**")

        cols = st.columns(len(interps))
        for i, (col, interp) in enumerate(zip(cols, interps)):
            with col:
                st.markdown(
                    f"**Axis {i+1}: {interp['dimension_name']}**  \n"
                    f"*{interp.get('variance_explained', '?')}% of variance*  \n"
                    f"{interp['explanation']}  \n"
                    f"← *{interp['negative_end']}* &nbsp;&nbsp; *{interp['positive_end']}* →"
                )

        st.divider()

        view_2d, view_3d = st.tabs(["2D View", "3D View (drag to rotate)"])

        with view_2d:
            fig2 = plot_2d(R["coords"], R["pca_meta"], interps, biz["business_name"])
            st.plotly_chart(fig2, use_container_width=True)

        with view_3d:
            fig3 = plot_3d(R["coords"], R["pca_meta"], interps, biz["business_name"])
            st.plotly_chart(fig3, use_container_width=True)

    # ============================================================
    # TAB 4 — Recommendations
    # ============================================================
    with tab_recs:
        if recs.get("executive_summary"):
            st.info(recs["executive_summary"], icon="📌")

        st.divider()

        # Priority fixes
        st.markdown("### Priority fixes")
        for fix in recs.get("priority_fixes", []):
            impact = fix.get("impact", "medium")
            badge_class = f"fix-badge-{impact}"
            header = (
                f'<span class="{badge_class}">{impact.upper()} IMPACT</span>  '
                f'**{fix["title"]}**'
            )
            with st.expander(fix["title"]):
                st.markdown(
                    f'<span class="{badge_class}">{impact.upper()} IMPACT</span> '
                    f'&nbsp; effort: *{fix.get("effort", "?")}*',
                    unsafe_allow_html=True,
                )
                st.markdown(f"**Problem:** {fix['problem']}")
                st.markdown(f"**Action:** {fix['action']}")

        st.divider()

        # Ready-to-use content
        st.markdown("### Ready-to-use content")
        st.caption("Copy-paste these directly onto your website.")

        for piece in recs.get("content_to_add", []):
            with st.expander(f"📝 {piece['title']} — *{piece['type']}*"):
                st.markdown(f"**Where to place this:** {piece['placement']}")
                st.divider()
                st.code(piece["suggested_content"], language=None)

        st.divider()

        # Topics to cover
        st.markdown("### Topics to create content about")
        for i, topic in enumerate(recs.get("topics_to_cover", []), 1):
            st.markdown(f"{i}. {topic}")
