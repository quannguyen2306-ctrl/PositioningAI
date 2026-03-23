# PositioningAI — LLM Visibility Diagnostic

> See exactly how AI assistants represent your business — and get a concrete plan to fix it.

![PositioningAI](assets/thumbnail.png)

---

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

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:8000
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

API keys (OpenAI + Serper) are entered in the UI per request — never stored server-side.

You need:
- **OpenAI API key** — for embeddings (`text-embedding-3-small`) and all LLM calls
- **Serper API key** — for live Google search to find competitors ([free tier at serper.dev](https://serper.dev))

---

## Architecture

```
User URL + API keys (submitted via UI)
   │
   ▼
backend/pipeline/ingestion.py       ← scrape + chunk + extract business context (GPT-4o-mini)
   │
   ▼
backend/pipeline/retrieval.py       ← Serper search → scrape competitor pages
   │
   ▼
backend/pipeline/embeddings.py      ← embed all chunks → ChromaDB (cosine similarity)
   │
   ▼
backend/pipeline/rag_evaluator.py   ← per-question: retrieve top-k → LLM answer → visibility score
   │
   ▼
backend/pipeline/pca_visualizer.py  ← PCA on all embeddings → 2D/3D Plotly → LLM axis labelling
   │
   ▼
backend/pipeline/recommender.py     ← GPT-4o synthesises everything → structured action plan
   │
   ▼
FastAPI (backend/app.py)            ← REST + WebSocket API
React + Vite (frontend/)            ← UI with real-time progress via WebSocket
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Readiness check |
| `POST` | `/api/analysis/start` | Start analysis, returns `session_id` |
| `GET` | `/api/analysis/{session_id}` | Poll status + result |
| `WebSocket` | `/ws/analysis/{session_id}` | Stream real-time progress |

---

## Project structure

```
PositioningAI/
├── backend/
│   ├── app.py                  # FastAPI server entry point
│   ├── requirements.txt
│   ├── cache/
│   │   └── session_store.py    # Thread-safe in-memory session store
│   └── pipeline/
│       ├── orchestrator.py     # Runs all 7 stages in sequence
│       ├── ingestion.py        # URL fetch, chunking, business context extraction
│       ├── retrieval.py        # Serper API + competitor scraping
│       ├── embeddings.py       # OpenAI embeddings + ChromaDB
│       ├── rag_evaluator.py    # RAG simulation + per-question visibility scoring
│       ├── pca_visualizer.py   # PCA fit, semantic axis labelling, 2D + 3D Plotly
│       └── recommender.py      # Gap analysis + GPT-4o recommendation generation
├── frontend/
│   ├── src/                    # React 18 + TypeScript app
│   └── vite.config.ts          # Proxies /api and /ws to :8000
├── pipeline/                   # Legacy Streamlit pipeline (reference only)
└── app.py                      # Legacy Streamlit app (reference only)
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

- **Re-analysis after fixes** — let the user paste improved content and re-run to see if their position shifts
- **Schema markup generator** — auto-generate JSON-LD for the user's business type
- **Multi-language support** — test visibility in French (critical for Canadian francophone audiences)
- **Export report as PDF** — package findings into a shareable document
- **Track over time** — store results in SQLite to show visibility trends week-over-week
