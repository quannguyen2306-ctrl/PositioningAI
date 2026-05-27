# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

PositioningAI analyzes how a small business appears in AI-generated search results (Generative Engine Optimization / GEO). It fetches the business website, discovers competitors via Serper, embeds all content into ChromaDB, then simulates RAG-based retrieval to score how often the business surfaces in AI answers to realistic customer questions. A reinforcement-learning subsystem lets users iteratively draft content that shifts their semantic position toward a chosen target on the competitive map.

## Running the App

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python app.py          # → http://localhost:8000
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev            # → http://localhost:5173 (proxies /api to :8000)
```

### Tests
```bash
cd backend
python -m pytest tests/ -q   # 12 tests — no API keys needed
```

Test files: `tests/test_rl_reward.py`, `tests/test_embedding_overlay.py`, `tests/test_parallel_fetch.py`, `tests/test_rag_batch_embed.py`, `tests/test_rl_flow.py`.

## Project Structure

```
backend/
  app.py                  — FastAPI entry point; mounts health, analysis, rl routers
  api/routes/
    analysis.py           — GET /analyse/stream, POST /api/content-lab/evaluate,
                            POST /api/recommendation/generate
    rl.py                 — POST /api/rl/start, GET /api/rl/{episode_id}/stream
    health.py             — GET /health
  pipeline/
    orchestrator.py       — AnalysisPipeline: 9-stage pipeline, emits SSE events
    ingestion.py          — fetch_url, chunk_text, extract_business_context
    retrieval.py          — search_competitors (Serper), fetch_competitor_docs (concurrent)
    embeddings.py         — EmbeddingStore (ChromaDB in-memory), EmbeddingOverlay (RL)
    rag_evaluator.py      — generate_test_questions, run_evaluation (batched + parallel)
    pca_visualizer.py     — fit_pca, interpret_dimensions (concurrent), plot_2d, plot_3d
    blue_ocean.py         — classify_archetype (5 types), find_blue_ocean_zones
    recommender.py        — generate_recommendations (GPT-4o)
    handoff.py            — PipelineHandoff dataclass + re_evaluate() (Content Lab chain)
    rl_orchestrator.py    — RLOrchestrator: episode loop generate→evaluate→reward→refine
    rl_env.py             — RLEnvironment: frozen PCA + overlay per step
    rl_agent.py           — RLAgent: GPT-4o draft generator with Reflexion history
    rl_reward.py          — compute_reward, is_converged, is_plateau
    nn_policy.py          — NNPolicy: numpy MLP, REINFORCE updates, 8 strategy actions
  cache/
    session_store.py      — SessionStore singleton (sessions, pipeline data, RL state)
    episode_store.py      — EpisodeStore: past-episode retrieval for few-shot injection
    competitor_cache.py   — URL → competitor list cache for stable PCA across runs
  schemas/
    request.py            — AnalysisRequest, ContentLabRequest, RecommendationRequest
    response.py           — Response models
    rl_schemas.py         — RLStartRequest

frontend/src/
  api/
    client.ts             — streamAnalysis(), startRLEpisode(), streamRLEpisode(),
                            generateRecommendation(), submitContentLab(), urlsToCompDocs()
    types.ts              — All shared TypeScript types (incl. RLStepEvent)
  contexts/AnalysisContext.tsx  — Global state: results, progress, session history
  pages/
    HomePage.tsx          — Form: URL + API keys + advanced settings
    ResultsPage.tsx       — Results layout: OceanMap, ContentLab, RecommendationLab, etc.
  components/
    ocean/                — OceanMap, ContentLab, RecommendationLab, ArchetypeCard, FishLegend
    modals/               — LearnMoreModal
  hooks/useSessionStorage.ts — Slim session summaries in localStorage; full results in memory
  utils/reportExporter.ts    — Export analysis as text report
```

## Pipeline Architecture

The 9-stage pipeline in `backend/pipeline/orchestrator.py` (`AnalysisPipeline`):

| Stage | What it does |
|-------|-------------|
| 1. Fetch URL | Scrapes business URL |
| 2. Extract context | GPT-4o-mini extracts structured business profile |
| 3. Find competitors | Serper API; competitor URL cache for stable PCA; blocklist filters noise |
| 4. Fetch competitors | Concurrent fetch (bounded ThreadPoolExecutor, order preserved); caps at 8000 chars |
| 5. Chunk documents | 300-word overlapping segments (overlap=40) |
| 6. Embed + store | OpenAI `text-embedding-3-small` → ChromaDB (in-memory, per-session) |
| 7. Generate questions | GPT-4o-mini generates test questions; custom questions override |
| 8. RAG evaluation | Embeds all questions in ONE batched call; parallel per-question eval (max 10 workers) |
| 9. PCA + interpret + blue ocean + recs | fit_pca → interpret_dimensions (concurrent LLM calls) → plot_2d/3d → classify_archetype → find_blue_ocean_zones → generate_recommendations |

## RL Subsystem

The reinforcement-learning content-positioning subsystem lives alongside the main pipeline and shares its frozen outputs.

**Purpose**: Given a target position on the PCA map, iteratively generate content drafts that move the user's semantic centroid toward that target while keeping RAG visibility healthy.

**Files**:
- `backend/pipeline/rl_orchestrator.py` — `RLOrchestrator.run_episode(target_pos, event_callback)`: episode loop (generate → evaluate → reward → refine); stops on convergence, plateau, or max_steps. Persists successful episodes for future few-shot retrieval.
- `backend/pipeline/rl_env.py` — `RLEnvironment`: wraps frozen PCA + `EmbeddingStore`; `step(draft_text)` creates an `EmbeddingOverlay` (no base mutation), re-projects through the frozen PCA, runs RAG eval, returns `EnvStepResult(pos, vis_score, pca_points)`. `get_current_position()` and `get_current_vis()` read baseline state.
- `backend/pipeline/rl_agent.py` — `RLAgent`: GPT-4o draft generator with Reflexion history (past drafts + rewards + one-sentence critiques); temperature anneals 0.85 → 0.35 over the episode.
- `backend/pipeline/rl_reward.py` — Pure numpy reward math: `compute_reward(pos_prev, pos_curr, pos_target, vis_prev, vis_curr, initial_dist) → RLRewardResult`; `is_converged(pos, target, threshold)`; `is_plateau(reward_history, eps, window=3)` — returns True when trailing-window best fails to beat prior best by at least `eps`.
- `backend/pipeline/nn_policy.py` — `NNPolicy`: numpy-only MLP (7D state → 8 strategy actions); `select_action(state) → (action, log_prob)`; `update(trajectory) → loss` (REINFORCE); `save/load` weights to `cache/nn_policy.npz`. Optional — `use_nn_agent=False` by default.
- `backend/cache/episode_store.py` — `EpisodeStore` singleton; `save_episode(record)` (only positive-reward); `find_similar(industry, archetype, target_direction, top_k)` for few-shot injection.
- `backend/schemas/rl_schemas.py` — `RLStartRequest(session_id, target_x, target_y, openai_key, max_steps=8, proximity_threshold=0.3, use_nn_agent=False)`.

**RL SSE event sequence** (`GET /api/rl/{episode_id}/stream`):
`rl_start` → `rl_step` (repeated) → `nn_update` (if NN enabled) → `rl_complete` | `rl_error`

**RL SSE event fields**:

| Event | Key fields |
|-------|-----------|
| `rl_start` | `episode_id, initial_pos, target_pos, initial_vis, few_shot_count, max_steps` |
| `rl_step` | `episode_id, step, reward, cos_sim, magnitude, vis_score, vis_delta, pos, pca_points, critique, draft_preview, moved_toward_target` |
| `nn_update` | `episode_id, policy_loss, episodes_trained, strategy_win_rates` |
| `rl_complete` | `episode_id, best_draft, best_reward, total_reward, steps_taken, stop_reason, final_pos` |
| `rl_error` | `episode_id, message` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Readiness check |
| **`GET`** | **`/analyse/stream`** | **Primary SSE: runs 9-stage pipeline, emits events** |
| `POST` | `/api/content-lab/evaluate` | Re-score new content in existing session (no re-scraping) |
| `POST` | `/api/recommendation/generate` | Generate content recs + draft toward a target PCA position |
| `POST` | `/api/rl/start` | Start RL episode; returns `episode_id` immediately |
| `GET` | `/api/rl/{episode_id}/stream` | SSE stream of RL episode step events |

### SSE Event Sequence (`GET /analyse/stream`)

`session_id` (first, before pipeline starts) → `progress` (repeated) → `profile` → `competitors` → `questions` → `eval` → `pca` → `archetype` → `blue_ocean` → `recommendations` → `complete`

Plus `heartbeat` (every 10 s) and `error`.

### SSE Event Payloads

| Event | Key fields |
|-------|-----------|
| `session_id` | `{session_id: string}` — emitted FIRST, before any pipeline stage |
| `progress` | `{pct: int, step: str}` |
| `profile` | `{data: BusinessProfile}` |
| `competitors` | `{competitors: string[]}` |
| `questions` | `{questions: string[]}` |
| `eval` | `{eval: EvalSummary}` — `mention_rate` is 0.0–1.0 here (frontend ×100 to display) |
| `pca` | `{points: PcaPoint[], interpretations: PcaInterpretation[]}` |
| `archetype` | `{archetype: Archetype}` |
| `blue_ocean` | `{zones: BlueOceanZone[], opportunities: BlueOceanOpportunity[]}` |
| `recommendations` | `{recs: Recommendations}` |
| `complete` | `{}` |
| `heartbeat` | `{}` |
| `error` | `{message: str}` |

## Key Architectural Decisions

- **SSE is the primary interface**: `GET /analyse/stream` streams the entire pipeline. The frontend accumulates partial results in an `acc` object as events arrive, assembling the final `AnalysisResult` on `complete`.
- **`session_id` emitted first**: In `analysis.py`, `emit({"event": "session_id", ...})` is the very first call inside `run()`, before `AnalysisPipeline` is constructed. The frontend captures it in `onSessionId` and stores it as `backendSessionId` for Content Lab / RL use.
- **Background execution**: The SSE pipeline runs in a `ThreadPoolExecutor` via `loop.run_in_executor`. The RL episode does the same in `rl.py`.
- **`PipelineHandoff`**: A typed dataclass (`store, pca, scaler, metadata, questions, business_context, interpretations`) returned by `get_pipeline_data_for_content_lab()` and stored in the session store. Shared by the content-lab route, recommendation route, and RL env/orchestrator. `re_evaluate(new_content, client)` owns the full Stage-9 re-scoring chain — chunk → replace user chunks → RAG eval → frozen-PCA project → classify_archetype → find_blue_ocean_zones.
- **`EmbeddingOverlay`** (in `embeddings.py`): RL episodes call `store.make_overlay(draft_chunks)` to get a read-only view (competitor chunks + capped user snapshot + draft ×`_DRAFT_REPEAT`) layered over the immutable base store. The base `EmbeddingStore` is never mutated, isolating concurrent episodes. `EmbeddingStore._user_snapshot` is initialized in `__init__`; `save_user_snapshot()` must be called once before the RL loop starts (done by `RLEnvironment.__init__`).
- **Session store**: `backend/cache/session_store.py` is a thread-safe in-memory dict (UUID4 keys). Holds session status, pipeline result, `PipelineHandoff`, and RL state (event queue + episode_id). The SSE stream is the single source of RL episode state — no polling endpoints.
- **Content Lab**: `POST /api/content-lab/evaluate` delegates entirely to `handoff.re_evaluate()` — no re-scraping or re-embedding of competitors.
- **Performance**: `fetch_competitor_docs` fetches URLs concurrently (bounded `ThreadPoolExecutor`, order preserved); `run_evaluation` embeds all questions in one batched call (`store.embed_queries`) then queries via `query_by_vector`; `interpret_dimensions` issues per-axis LLM calls concurrently.
- **Competitor cache**: `backend/cache/competitor_cache.py` caches the Serper results per business URL so re-runs use the same competitor set, keeping PCA coordinates stable.
- **Models**: `gpt-4o-mini` for extraction/question generation/RAG scoring/axis interpretation; `gpt-4o` for final recommendations and RL draft generation. ~$0.05–$0.10 per analysis run.
- **Visibility scoring**: `mention_quality` is `prominent` / `brief` / `absent`; numeric score 0–10. `mention_rate` stored as 0–100 internally; normalized to 0.0–1.0 in one place (the `eval` SSE event in the orchestrator and `re_evaluate` in `PipelineHandoff`); frontend multiplies by 100 to display.
- **localStorage**: Only a slim session summary (`SessionRecord`: id, timestamp, expiresAt, businessUrl, overallScore) is persisted to localStorage. The full `AnalysisResult` lives in a tab-local in-memory cache (`fullResultCache` Map in `useSessionStorage.ts`). Restoring a session after a page reload requires re-running the analysis.

## Frontend State Flow

1. `HomePage` submits form → calls `startAnalysis(req)` in `AnalysisContext`
2. `AnalysisContext.startAnalysis` calls `streamAnalysis()` from `api/client.ts`
3. SSE callbacks fire as events arrive, updating `acc` (accumulator) and `progress`
4. `onSessionId` stores the backend UUID in `backendSessionId` (used by Content Lab and RL)
5. On `complete`, `acc` is assembled into `AnalysisResult` if `acc.biz && acc.eval && acc.coords && acc.recs`; stored in `results` and saved to session history
6. `ResultsPage` reads from `results` and `progress`

## Key Files — Functions & Signatures

### `backend/pipeline/orchestrator.py`
- `AnalysisPipeline.__init__(business_url, openai_api_key, serper_api_key, n_competitors=5, n_questions=10, custom_questions=None, progress_callback=None, event_callback=None)`
- `AnalysisPipeline.run() → dict` — executes all 9 stages; calls `event_callback({event, ...})` for SSE
- `AnalysisPipeline.get_pipeline_data_for_content_lab() → PipelineHandoff`
- `_emit(event_type, data)` — internal helper wrapping `event_callback`

### `backend/pipeline/handoff.py`
- `PipelineHandoff` — dataclass: `store, pca, scaler, metadata, questions, business_context, interpretations`
- `PipelineHandoff.re_evaluate(new_content: str, client: OpenAI) → dict` — full Stage-9 re-scoring chain; returns `{eval, pca_points, archetype, blue_ocean_zones, blue_ocean_opportunities}`

### `backend/pipeline/ingestion.py`
- `fetch_url(url: str, timeout=15) → str` — requests + BeautifulSoup, strips nav/footer/script/style/header/aside/form/noscript/svg/iframe
- `chunk_text(text: str, chunk_size=300, overlap=40) → list[str]` — overlapping word-count chunks; skips chunks shorter than 80 chars
- `extract_business_context(text: str, client: OpenAI) → dict` — GPT-4o-mini JSON extraction; keys: `business_name, industry, products_services, target_audience, location, unique_value_prop, search_query`

### `backend/pipeline/retrieval.py`
- `search_competitors(query: str, serper_api_key: str, n: int = 10) → list[str]` — Serper Google Search; blocklist filters social/directory/aggregator domains
- `fetch_competitor_docs(urls: list[str], max_per_doc=8000) → list[dict]` — concurrent fetch (bounded pool, 8 workers max); returns `[{url, text, domain}]`; order preserved; failures silently skipped

### `backend/pipeline/embeddings.py`
- `EmbeddingStore.__init__(openai_client, collection_name="geo_diag")` — ephemeral in-memory ChromaDB; `_user_snapshot` initialized to `[]`
- `EmbeddingStore.store(chunks, source, url="", domain="")` — embeds + persists; caps competitor chunks to `MAX_CHUNKS_PER_SOURCE = 40`
- `EmbeddingStore.embed_queries(texts: list[str]) → list[list[float]]` — batch-embed query texts in one round-trip
- `EmbeddingStore.query(query_text: str, k=10) → list[dict]` — cosine similarity search
- `EmbeddingStore.query_by_vector(query_emb, k=10) → list[dict]` — query with precomputed embedding
- `EmbeddingStore.replace_user_chunks(chunks, source="user", url="content-lab", domain="")` — swap user chunks; used by Content Lab
- `EmbeddingStore.save_user_snapshot()` — cap + store current user chunks as identity anchor for RL overlays
- `EmbeddingStore.make_overlay(draft_chunks: list[str]) → EmbeddingOverlay` — read-only view for one RL step
- `EmbeddingStore.get_all_for_pca() → (np.ndarray, list[dict])` — all vectors + metadata
- `EmbeddingOverlay` — exposes `query`, `query_by_vector`, `embed_queries`, `get_all_for_pca`; base store never mutated

### `backend/pipeline/rag_evaluator.py`
- `generate_test_questions(business_context: dict, client: OpenAI, custom_questions: list[str] | None = None) → list[str]`
- `evaluate_single_question(question, query_vector, store, client, business_name, k=8) → dict` — takes precomputed embedding; no embedding round-trip per question
- `run_evaluation(questions, store, client, business_name) → dict` — embeds all questions in one batched call, then parallel eval (max 10 workers); returns `{results, avg_visibility_score, mention_rate, total_questions, top_competitor_domains, score_breakdown, blue_ocean_opportunities}`; `mention_rate` is 0–100 here

### `backend/pipeline/pca_visualizer.py`
- `fit_pca(embeddings: np.ndarray, n_components=3) → (PCA, StandardScaler, np.ndarray)` — standardizes then runs PCA
- `interpret_dimensions(pca, metadata, coords, client, n_samples=5) → list[dict]` — concurrent LLM calls per axis; each dict: `{dimension_name, positive_end, negative_end, explanation, variance_explained}`
- `plot_2d(coords, metadata, interpretations, business_name) → plotly.Figure`
- `plot_3d(coords, metadata, interpretations, business_name) → plotly.Figure`

### `backend/pipeline/blue_ocean.py`
- `classify_archetype(coords: np.ndarray, pca_meta: list[dict], eval_results: list[dict]) → dict` — 5 types: `invisible_center`, `lone_ranger`, `shadow`, `pioneer`, `contender`; adds `closest_competitor` field
- `find_blue_ocean_zones(coords, pca_meta, grid_size=20, top_n=5) → list[dict]` — grid scan 2D PCA space; each zone: `{x, y, radius, label}`

### `backend/pipeline/recommender.py`
- `generate_recommendations(business_context, eval_results, interpretations, competitor_docs, client) → dict` — GPT-4o; returns `{executive_summary, overall_score_meaning, positioning_insight, priority_fixes, content_to_add, topics_to_cover}`

### `backend/pipeline/rl_orchestrator.py`
- `RLOrchestrator.__init__(handoff, openai_client, episode_id, config: RLConfig = None, nn_policy: NNPolicy | None = None)`
- `RLOrchestrator.run_episode(target_pos: np.ndarray, event_callback=None) → RLEpisodeResult` — episode loop; emits `rl_start`, `rl_step`, `nn_update`, `rl_complete` / `rl_error`
- `RLConfig` — `max_steps=8, proximity_threshold=0.3, plateau_eps=0.05`
- `RLEpisodeResult` — `episode_id, final_pos, best_draft, best_reward, total_reward, steps_taken, stop_reason, step_history`

### `backend/pipeline/rl_env.py`
- `RLEnvironment.__init__(handoff: PipelineHandoff, openai_client)` — calls `store.save_user_snapshot()` once
- `RLEnvironment.get_current_position() → np.ndarray` — user centroid in 2D PCA
- `RLEnvironment.get_current_vis() → float` — avg RAG visibility 0–10
- `RLEnvironment.step(draft_text: str) → EnvStepResult` — overlay-based; returns `EnvStepResult(pos, vis_score, pca_points)`

### `backend/pipeline/rl_reward.py`
- `compute_reward(pos_prev, pos_curr, pos_target, vis_prev, vis_curr, initial_dist) → RLRewardResult` — raw projection reward (not normalized by initial_dist); vis_multiplier penalizes large visibility drops
- `is_converged(pos_curr, pos_target, threshold=0.3) → bool`
- `is_plateau(reward_history: list[float], eps: float, window: int = 3) → bool`

### `backend/cache/session_store.py`
- `SessionStore` singleton exported as `store`
- `create_session() → str` (UUID4)
- `update_progress(session_id, percent, message)`
- `set_result(session_id, result)` / `set_error(session_id, error)`
- `set_pipeline_data(session_id, pipeline_data)` / `get_pipeline_data(session_id) → PipelineHandoff | None`
- `get_session(session_id) → dict | None`
- `set_rl_state(session_id, rl_state)` / `get_rl_state(session_id) → dict | None`
- `update_rl_status(session_id, status)`
- `cleanup_expired_sessions(max_age_seconds=3600) → int`

### `backend/api/routes/analysis.py`
- `GET /analyse/stream` — emits `session_id` first, then runs pipeline via `loop.run_in_executor`
- `POST /api/content-lab/evaluate` — delegates to `handoff.re_evaluate(new_content, client)`
- `POST /api/recommendation/generate` — GPT-4o-mini prompt using `handoff.business_context` and `handoff.interpretations`

### `backend/api/routes/rl.py`
- `POST /api/rl/start` — validates session + handoff, creates episode_id, stores event queue in `rl_state`, runs `RLOrchestrator.run_episode` in background thread; returns `{episode_id, session_id, status, stream_url}`
- `GET /api/rl/{episode_id}/stream?session_id=...` — SSE stream draining the episode's event queue

### `frontend/src/api/client.ts`
- `streamAnalysis(req: AnalysisRequest, callbacks: SseCallbacks) → AbortFn` — fetch-based SSE with 2-min stall timer
- `SseCallbacks`: `{onProgress, onProfile, onCompetitors, onQuestions, onEval, onPca, onArchetype, onBlueOcean, onRecommendations, onSessionId, onComplete, onError}`
- `startRLEpisode(sessionId, targetX, targetY, openaiKey, maxSteps=5) → Promise<{episode_id, stream_url}>`
- `streamRLEpisode(episodeId, sessionId, onEvent, onDone, onError) → AbortFn`
- `generateRecommendation(sessionId, targetX, targetY, currentX, currentY, openaiKey) → Promise<RecommendationResult>`
- `submitContentLab(sessionId, newContent, openaiKey) → Promise<ContentLabResult>`
- `urlsToCompDocs(urls: string[]) → CompDoc[]`

### `frontend/src/api/types.ts` — Key Types

```typescript
AnalysisRequest: { url, openai_key, serper_key, n_competitors, n_questions, custom_questions? }

BusinessProfile: { business_name, industry, location, target_audience, products_services, unique_value_prop, search_query }

EvalResult: { question, answer, business_mentioned, visibility_score, mention_quality, why_low_visibility?, key_observation, user_chunk_count, comp_chunk_count, is_blue_ocean? }
EvalSummary: { results, avg_visibility_score, mention_rate, total_questions, score_breakdown, top_competitor_domains, blue_ocean_opportunities? }

PcaPoint: { components: number[], source, domain, text }
PcaInterpretation: { dimension_name, explanation, negative_end, positive_end, variance_explained }

Recommendations: { executive_summary, overall_score_meaning, positioning_insight, priority_fixes, content_to_add, topics_to_cover }
Fix: { title, problem, action, impact, effort }
ContentPiece: { title, type, placement, suggested_content }

CompDoc: { url, domain, text }
Archetype: { name, tagline, description, strategy, icon, closest_competitor? }
BlueOceanZone: { x, y, radius, label }
BlueOceanOpportunity: { question, visibility_score, opportunity_strength }

ContentLabResult: { eval: EvalSummary, pca_points, archetype, blue_ocean_zones, blue_ocean_opportunities }
AnalysisResult: { biz, comp_docs, eval, coords, pca_meta, interps, recs, archetype?, blue_ocean_zones?, blue_ocean_opportunities? }
ProgressEvent: { percent, message, status: 'queued' | 'processing' | 'completed' | 'failed' }

RLStepEvent: { event: 'rl_start'|'rl_step'|'rl_complete'|'rl_error'|'rl_step_error', episode_id, step?, reward?, pos?, pca_points?, critique?, draft_preview?, ... }
RecommendationResult: { recommendations: string[], content_draft: string }
```

## Known Gotchas

### `mention_rate` units
- Python pipeline stores `mention_rate` as 0–100 (percent).
- Normalized to 0.0–1.0 in exactly one place per path: the `eval` SSE event in `orchestrator.py`, and `handoff.re_evaluate()` for Content Lab. Frontend multiplies by 100 to display.

### `onComplete` validation in `AnalysisContext`
- `setResults()` only fires if `acc.biz && acc.eval && acc.coords && acc.recs` are all truthy. If any SSE callback is missing or an event arrives malformed, the UI stays on the loading view indefinitely.

### RL overlay immutability
- `EmbeddingStore.make_overlay()` never writes to the base ChromaDB collection. Each `RLEnvironment.step()` creates a fresh overlay. Concurrent episodes are isolated. The base store is safe to query after RL runs.

### Session expiry and RL state
- `cleanup_expired_sessions` uses `max_age_seconds` (default 3600 s), not hours. RL state (event queue) lives only in the session dict — it is not persisted anywhere; once the session expires or the process restarts, the queue is gone.
