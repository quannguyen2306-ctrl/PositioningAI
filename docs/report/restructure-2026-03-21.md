# PositioningAI Restructure Report
**Date:** 2026-03-21
**Scope:** Migrated from Streamlit monolith → FastAPI backend + React frontend

---

## Summary

The project was split from a single `app.py` Streamlit application into a two-tier architecture:

- `backend/` — FastAPI server hosting the 7-stage analysis pipeline
- `frontend/` — React 18 + TypeScript web app consuming the API

The original `pipeline/` modules were moved verbatim into `backend/pipeline/` with no logic changes.

---

## Changes Made

### New Directory Structure

```
PositioningAI/
├── backend/                      # FastAPI server (new)
│   ├── app.py                    # FastAPI entry point + CORS + uvicorn
│   ├── requirements.txt          # Backend deps (FastAPI, uvicorn, no streamlit)
│   ├── config.py                 # Pydantic settings (API keys, env vars)
│   ├── pipeline/
│   │   ├── ingestion.py          # MOVED from pipeline/ingestion.py (unchanged)
│   │   ├── retrieval.py          # MOVED from pipeline/retrieval.py (unchanged)
│   │   ├── embeddings.py         # MOVED from pipeline/embeddings.py (unchanged)
│   │   ├── rag_evaluator.py      # MOVED from pipeline/rag_evaluator.py (unchanged)
│   │   ├── pca_visualizer.py     # MOVED from pipeline/pca_visualizer.py (unchanged)
│   │   ├── recommender.py        # MOVED from pipeline/recommender.py (unchanged)
│   │   └── orchestrator.py       # NEW: wraps 9-step pipeline from app.py
│   ├── schemas/
│   │   ├── request.py            # Pydantic: AnalysisRequest
│   │   └── response.py           # Pydantic: AnalysisResult, AnalysisResponse, ProgressEvent
│   ├── api/routes/
│   │   ├── health.py             # GET /health
│   │   └── analysis.py           # POST /api/analysis/start, GET /api/analysis/{id}, WS
│   └── cache/
│       └── session_store.py      # Thread-safe in-memory session + progress store
│
├── frontend/                     # React app (new)
│   ├── package.json              # React 18, React Router, Plotly, TypeScript, Vite
│   ├── vite.config.ts            # Dev proxy: /api + /ws → localhost:8000
│   ├── index.html                # Dark-themed entry (#0f1117)
│   └── src/
│       ├── App.tsx               # Router: / → HomePage, /results/:id → ResultsPage
│       ├── main.tsx              # React 18 createRoot
│       ├── api/
│       │   ├── types.ts          # TypeScript interfaces matching FastAPI schemas
│       │   └── client.ts         # Typed fetch wrapper (startAnalysis, getStatus)
│       ├── contexts/
│       │   └── AnalysisContext.tsx  # Global state: session, progress, results, error
│       ├── hooks/
│       │   └── useWebSocket.ts   # WS hook with 3-retry auto-reconnect
│       ├── pages/
│       │   ├── HomePage.tsx      # URL + API key form, sliders, custom questions
│       │   └── ResultsPage.tsx   # 4-tab results view with top metric cards
│       └── components/
│           ├── ProgressBar.tsx
│           └── results/
│               ├── BusinessCard.tsx       # Business profile display
│               ├── EvaluationTable.tsx    # RAG evaluation results with score badges
│               ├── PCAViz.tsx             # Plotly 2D/3D scatter (react-plotly.js)
│               └── RecommendationsList.tsx # Priority fixes, content, topics
│
├── docs/report/                  # This report
├── CLAUDE.md                     # Updated with new architecture
└── pipeline/                     # Original (kept in place, not deleted)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Readiness check |
| `POST` | `/api/analysis/start` | Start analysis, returns `session_id` |
| `GET` | `/api/analysis/{session_id}` | Poll status / fetch result |
| `WebSocket` | `/ws/analysis/{session_id}` | Stream real-time progress events |

### Request format (`POST /api/analysis/start`)
```json
{
  "url": "https://example.com",
  "openai_key": "sk-...",
  "serper_key": "...",
  "n_competitors": 10,
  "n_questions": 10,
  "custom_questions": []
}
```

### WebSocket event types
- `{"type": "progress", "percent": 44, "message": "Embedding all content..."}`
- `{"type": "result", "data": {...}}` — full AnalysisResult on completion
- `{"type": "error", "message": "..."}` — on pipeline failure

---

## How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# → runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → runs on http://localhost:5173, proxies /api and /ws to :8000
```

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| ThreadPoolExecutor for background tasks | Analysis runs 30–60s; must not block the HTTP server |
| WebSocket for progress streaming | Enables real-time progress bar in React without polling overhead |
| In-memory session store | No persistence requirement; keeps infra simple |
| API keys passed per-request (headers) | Keys are user-owned; never stored server-side |
| Vite proxy for dev | Avoids CORS issues during local development |
| numpy coords → `.tolist()` in response | JSON serialization of PCA coordinates |

---

## Files Not Changed

- `pipeline/*.py` — all original pipeline modules kept at root (can be deleted once backend is validated)
- `app.py` (root) — original Streamlit app kept intact
- `requirements.txt` (root) — original requirements kept intact
- `README.md`, `CLAUDE.md` — documentation unchanged

---

## Next Steps

1. **Validate backend**: `cd backend && pip install -r requirements.txt && python app.py`
2. **Test API**: `curl -X POST http://localhost:8000/api/analysis/start -H "Content-Type: application/json" -d '{"url":"https://example.com","openai_key":"sk-...","serper_key":"..."}'`
3. **Validate frontend**: `cd frontend && npm install && npm run dev`
4. **Clean up root** (once backend validated): remove `pipeline/`, `app.py`, `requirements.txt` from project root
5. **Production**: configure `VITE_API_URL` in `frontend/.env.production`; add Dockerfile for backend
