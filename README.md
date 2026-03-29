# LLM Visibility Diagnostic

![PositioningAI](assets/thumbnail.png)

> See exactly how AI assistants represent your business — and get a concrete plan to fix it.

## What it does

1. **Fetches** your business website
2. **Finds competitors** via live Google search (Serper API)
3. **Embeds** everything into a shared vector space (OpenAI + ChromaDB)
4. **Simulates RAG** — exactly how Perplexity / ChatGPT Search retrieves and synthesises answers
5. **Scores** your AI visibility across 10–15 real customer questions
6. **Maps** your semantic position vs competitors in 2D and 3D (PCA with LLM-labelled axes)
7. **Generates** an improvement plan: priority fixes + ready-to-paste content + topic recommendations

---

## Quick start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set API keys

```bash
cp .env.example .env
# Edit .env and add your keys
```

You need:
- **OpenAI API key** — for embeddings (`text-embedding-3-small`) and all LLM calls
- **Serper API key** — for live Google search to find competitors ([free tier at serper.dev](https://serper.dev))

### 3. Run

```bash
streamlit run app.py
```

---

## Architecture

```
User URL
   │
   ▼
pipeline/ingestion.py       ← scrape + chunk + extract business context (GPT-4o-mini)
   │
   ▼
pipeline/retrieval.py       ← Serper search → scrape competitor pages
   │
   ▼
pipeline/embeddings.py      ← embed all chunks → ChromaDB (cosine similarity)
   │
   ▼
pipeline/rag_evaluator.py   ← per-question: retrieve top-k → LLM answer → visibility score
   │
   ▼
pipeline/pca_visualizer.py  ← PCA on all embeddings → 2D/3D Plotly → LLM axis labelling
   │
   ▼
pipeline/recommender.py     ← GPT-4o synthesises everything → structured action plan
   │
   ▼
app.py (Streamlit)          ← UI tying all stages together with progress + 4-tab results
```

---

## Cost per analysis run (approximate)

| Component | Estimated cost |
|---|---|
| Embeddings (350 chunks × 1536-dim) | ~$0.004 |
| GPT-4o-mini calls (questions + evaluation) | ~$0.02 |
| GPT-4o call (recommendations) | ~$0.02 |
| **Total** | **~$0.05 – $0.10** |

---

## Extending the project

- **Add re-analysis after fixes** — let the user paste improved content and re-run to see if the star moves closer to the competitor cluster
- **Add schema markup generator** — auto-generate JSON-LD for the user's business type
- **Multi-language support** — test visibility in French (critical for Canadian francophone communities)
- **Export report as PDF** — use the `pdf` skill to package findings
- **Track over time** — store results in SQLite to show visibility trends week-over-week

---

## File structure

```
llm-visibility/
├── app.py                  # Streamlit UI
├── requirements.txt
├── .env.example
└── pipeline/
    ├── __init__.py
    ├── ingestion.py        # URL fetch, chunking, business context extraction
    ├── retrieval.py        # Serper API + competitor scraping
    ├── embeddings.py       # OpenAI embeddings + ChromaDB
    ├── rag_evaluator.py    # RAG simulation + per-question visibility scoring
    ├── pca_visualizer.py   # PCA fit, semantic axis labelling, 2D + 3D Plotly
    └── recommender.py      # Gap analysis + GPT-4o recommendation generation
```
