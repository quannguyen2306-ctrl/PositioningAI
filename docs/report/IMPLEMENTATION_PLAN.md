# PositioningAI — Implementation Plan

> **Context:** Local demo only — no production deployment, no auth hardening, no billing.
> **Execution:** Phase 1 subagents run in parallel; Phase 2 subagents run sequentially; final code-reviewer validates all.

---

## Dropped Items (out of scope for demo)

| Item | Reason |
|------|--------|
| Auth / API key vault | Demo passes keys per-request; no server-side persistence needed |
| Rate limiting / abuse protection | No public traffic |
| ChromaDB cloud migration | `/tmp` persistence sufficient for demo |
| WebSocket polling flow cleanup | Only SSE is used; keep dead code for reference |
| Docker / CI pipeline | Local only |

---

## Codebase Map (key files)

| File | Role |
|------|------|
| `backend/app.py` | FastAPI app, CORS, session cleanup, ThreadPoolExecutor(max_workers=4) |
| `backend/pipeline/orchestrator.py` | `AnalysisPipeline.run()` — 10 sequential stages, `_emit()` fires SSE events |
| `backend/pipeline/ingestion.py` | `fetch_url()`, `extract_business_context()`, `chunk_text()` |
| `backend/pipeline/retrieval.py` | `search_competitors()` (Serper), `fetch_competitor_docs()` (sequential loop — bottleneck) |
| `backend/pipeline/embeddings.py` | `EmbeddingStore` — ephemeral `chromadb.Client()` at line 21 |
| `backend/pipeline/rag_evaluator.py` | `generate_test_questions()`, `run_evaluation()` (already parallel) |
| `backend/pipeline/multi_engine.py` | Optional direct LLM queries (ChatGPT/Claude/Gemini/Perplexity) |
| `backend/pipeline/pca_visualizer.py` | sklearn PCA, returns x/y coordinates per competitor |
| `backend/pipeline/blue_ocean.py` | Archetype classification |
| `backend/pipeline/recommender.py` | GEO content recommendations |
| `backend/schemas/request.py` | `AnalysisRequest`, `ContentLabRequest`, `RecommendationRequest` |
| `backend/api/routes/analysis.py` | **Primary endpoints** — POST `/analyse/stream` (line 44), Content Lab (line 181), Recs (line 276) |
| `backend/api/routes/stream.py` | Legacy GET endpoint — dead code, never called by frontend |
| `backend/cache/session_store.py` | Thread-safe in-memory dict keyed by UUID4 `session_id` |
| `frontend/src/api/client.ts` | `streamAnalysis()` SSE fetch (line 35), `submitContentLab()`, `generateRecommendation()` |
| `frontend/src/contexts/AnalysisContext.tsx` | `acc` accumulator (line 78), `onComplete` assembles result (line 122) |
| `frontend/src/pages/HomePage.tsx` | Form — url, keys, advanced settings |
| `frontend/src/pages/ResultsPage.tsx` | Tabbed panels — Overview, Blue Ocean, Multi-engine, Settings |
| `frontend/src/utils/reportExporter.ts` | `exportCSV()` exists (line 15); no PDF yet |

---

## Phase 1 — Performance (4 parallel subagents)

### A1 — Persistent ChromaDB
**Subagent:** general-purpose
**File:** `backend/pipeline/embeddings.py:21`
**Change:** `chromadb.Client()` → `chromadb.PersistentClient(path="/tmp/posai_chroma")`
**Why:** Ephemeral client loses all embeddings on restart; persistent mode survives process restarts during demo.
**Risk:** None — local `/tmp` path, no migration needed.

```python
# Before (line 21)
self.chroma = chromadb.Client()

# After
self.chroma = chromadb.PersistentClient(path="/tmp/posai_chroma")
```

---

### A2 — Parallel Competitor Fetching
**Subagent:** general-purpose
**File:** `backend/pipeline/retrieval.py:60-84`
**Change:** Replace sequential `for` loop with `ThreadPoolExecutor(max_workers=5)` + 8-second per-URL timeout.
**Why:** `fetch_competitor_docs()` fetches 5–20 URLs one by one; parallelizing this reduces Stage 4 from ~30s to ~8s.
**Constraint:** Respect existing `BLOCKLIST` filter; maintain same return type `list[dict]`.

```python
# Before (line 60-84) — sequential
docs = []
for url in competitor_urls:
    try:
        content = fetch_url(url)
        ...
        docs.append(...)
    except Exception:
        continue

# After
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

def _fetch_one(url):
    content = fetch_url(url)
    chunks = chunk_text(content)
    return {"url": url, "chunks": chunks}

docs = []
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(_fetch_one, url): url for url in competitor_urls}
    for future in as_completed(futures, timeout=8):
        try:
            docs.append(future.result())
        except Exception:
            continue
```

---

### A3 — Combine LLM Calls (context extraction + question generation)
**Subagent:** general-purpose
**Files:** `backend/pipeline/ingestion.py`, `backend/pipeline/orchestrator.py`
**Change:** Merge `extract_business_context()` (Stage 2) and `generate_test_questions()` (Stage 7) into a single gpt-4o-mini call that returns both `business_context` and `test_questions` together.
**Why:** Two separate LLM calls for closely related data — save ~1–2s and ~$0.002 per run.
**Constraint:** Must run BEFORE A4 — A4 builds on the modified `orchestrator.py`.
**Warning:** `onComplete` in `AnalysisContext.tsx` requires `acc.recs` — do not change SSE event names.

---

### A4 — Parallelize Stages 9 + 10
**Subagent:** general-purpose
**File:** `backend/pipeline/orchestrator.py`
**Change:** Run Stage 9 (multi-engine) and Stage 10 (PCA + blue ocean + recommendations) in parallel using `ThreadPoolExecutor(max_workers=2)`.
**Why:** Both stages are independent after Stage 8 (RAG eval). Combined runtime ~10–15s → ~8s.
**Constraint:** Must run AFTER A3 (A3 modifies `orchestrator.py` first). Both stages must finish before `_emit('complete', ...)`.
**Thread safety:** Each stage uses its own data; no shared mutable state between them.

```python
# After RAG eval (Stage 8), run 9 and 10 concurrently
with ThreadPoolExecutor(max_workers=2) as ex:
    f_multi = ex.submit(self._run_multi_engine, ...)
    f_pca   = ex.submit(self._run_pca_and_recs, ...)
    multi_result = f_multi.result()
    pca_result   = f_pca.result()
```

---

## Phase 2 — Features (3 sequential subagents)

### B1 — Comparative Analysis Mode
**Subagent:** general-purpose
**New files:**
- `backend/schemas/request.py` — add `CompareRequest` (two URLs + same key fields)
- `backend/api/routes/analysis.py` — add `POST /analyse/compare/stream`
- `frontend/src/components/ComparisonPanel.tsx` — side-by-side score tables
- `frontend/src/pages/HomePage.tsx` — "Compare two businesses" toggle (shows second URL field)
- `frontend/src/contexts/AnalysisContext.tsx` — add `compareResults` state

**How it works:**
1. Run `AnalysisPipeline` twice (once per URL) in parallel via `ThreadPoolExecutor`
2. SSE stream emits `compare_progress`, `compare_result_a`, `compare_result_b`, `compare_complete`
3. Frontend `ComparisonPanel` renders two `OverviewTab`-style columns side by side
4. Highlight winner per metric (green/red chip)

**Constraints:**
- Share single ChromaDB path; use different collection names per session (`posai_{session_id}_a`, `posai_{session_id}_b`)
- No new schema changes to existing `AnalysisRequest` — add `CompareRequest` separately

---

### B2 — Content Lab 2.0 (phrase insights)
**Subagent:** general-purpose
**Files:**
- `backend/api/routes/analysis.py:181` — extend `/api/content-lab/evaluate` response
- `frontend/src/components/ContentLab.tsx` — add phrase highlight overlay

**Change:** After re-running RAG eval on new content, extract the top 5 phrases that most improved visibility score delta. Return as `phrase_insights: [{phrase, delta, question_ids}]` in the response JSON.

**Implementation:**
```python
# In content-lab evaluate handler, after re-eval:
old_score = session_data["last_eval_score"]
new_score = result["mention_rate"]
phrase_insights = extract_top_phrases(new_content, score_delta=new_score - old_score)
return {...existing fields..., "phrase_insights": phrase_insights}
```

**Frontend:** Wrap matched phrases in `<mark>` tags with tooltip showing delta score.

---

### B3 — PDF Export + Share Link
**Subagent:** general-purpose
**Files:**
- `frontend/src/utils/reportExporter.ts` — add `exportPDF()` using jsPDF + html2canvas
- `backend/cache/session_store.py` — add `create_share_token(session_id)` → short UUID
- `backend/api/routes/analysis.py` — add `POST /api/share` (creates token) + `GET /api/share/{token}` (returns result JSON)
- `frontend/src/components/ExportPanel.tsx` — new panel with PDF button + "Copy share link" button
- `frontend/src/App.tsx` — add `/share/:token` route that fetches + renders read-only `ResultsPage`

**PDF approach:** Frontend-only via jsPDF + html2canvas (no backend dependency, no new Python packages).

```typescript
// frontend/src/utils/reportExporter.ts
export async function exportPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId)
  const canvas = await html2canvas(element)
  const pdf = new jsPDF({ orientation: 'landscape' })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210)
  pdf.save(filename)
}
```

**Share token:** 8-char alphanumeric token stored in `session_store.py` alongside session data. Expires with session (no TTL change needed for demo).

---

## Subagent Implementation Map

| Subagent | Phase | Files Modified | Runs |
|----------|-------|----------------|------|
| A1 | 1 (parallel) | `embeddings.py` | Parallel with A2, A3, A4 |
| A2 | 1 (parallel) | `retrieval.py` | Parallel with A1, A3, A4 |
| A3 | 1 (parallel) | `ingestion.py`, `orchestrator.py` | Parallel, but A4 must wait for A3 |
| A4 | 1 (sequential after A3) | `orchestrator.py` | After A3 completes |
| B1 | 2 (sequential) | `request.py`, `analysis.py`, new frontend files | After Phase 1 |
| B2 | 2 (sequential) | `analysis.py`, `ContentLab.tsx` | After B1 |
| B3 | 2 (sequential) | `reportExporter.ts`, `session_store.py`, `analysis.py`, new frontend files | After B2 |
| code-reviewer | Final | All modified files | After all phases |

> **Note on A3/A4 sequencing:** A3 and A4 both touch `orchestrator.py`. A3 runs first (combines LLM calls), A4 runs after A3 (parallelizes stages 9+10 on top of A3's changes). Within Phase 1, A1 and A2 run fully in parallel with A3. A4 waits only for A3.

---

## Code Review Plan (final subagent)

**Subagent:** code-reviewer
**Checklist:**
- [ ] SSE event names unchanged — no regressions in `onComplete` accumulator checks
- [ ] Thread safety in `orchestrator.py` — no shared mutable state between parallel stages
- [ ] TypeScript types for new SSE events (`compare_*`, `phrase_insights`)
- [ ] Share token generation uses `secrets.token_urlsafe(8)` not `random`
- [ ] No `console.log` in production frontend code
- [ ] `exportPDF()` handles DOM element not found gracefully
- [ ] `CompareRequest` Pydantic schema has proper field validators
- [ ] ChromaDB persistent path uses `os.path.join(tempfile.gettempdir(), "posai_chroma")` for cross-platform compatibility

---

## Open Questions (confirm before starting)

1. **A3/A4 sequencing** — confirmed: A3 runs first, A4 builds on orchestrator.py changes. A1/A2 run fully in parallel.

2. **PDF approach** — frontend-only via jsPDF+html2canvas (no Python changes). Alternative: `reportlab` on backend (heavier, requires new dependency).

3. **Phase 2 order** — B1→B2→B3 sequential. B2 and B3 touch different files but kept sequential for simplicity. Confirm if B2+B3 can run in parallel to save time.
