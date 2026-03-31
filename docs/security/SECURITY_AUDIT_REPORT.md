# Security Audit & Code Review Report — PositioningAI

**Date:** 2026-03-30  
**Reviewed by:** code-reviewer · security-reviewer · python-reviewer (parallel)  
**Scope:** Full-stack — FastAPI backend + React/TypeScript frontend

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 8     |
| HIGH     | 14    |
| MEDIUM   | 18    |
| LOW      | 11    |

**Verdict: BLOCK — 8 CRITICAL issues must be resolved before production deployment.**

The application has good architectural foundations and correct async patterns, but has several exploitable security vulnerabilities related to API key handling, missing SSRF protection, unauthenticated endpoints, and silent error swallowing.

---

## CRITICAL Issues

### C-1: API Keys Passed as GET Query Parameters
**Files:** `backend/api/routes/analysis.py:44-51`, `frontend/src/api/client.ts:38-45`  
**Type:** Secret Leakage  
**Attack:** Keys are logged in server access logs, browser history, proxy logs, and HTTP referer headers. Any observer on the network path or server admin can read live API keys.  
**Fix:** Change `/analyse/stream` from `GET` to `POST`; move all keys to request body.

---

### C-2: API Keys Persisted in Browser localStorage
**File:** `frontend/src/pages/HomePage.tsx:45-46`  
**Type:** Insecure Secret Storage  
**Attack:** Any XSS payload, malicious browser extension, or DevTools access reads all stored keys. Keys persist indefinitely after browser close.  
**Fix:** Remove `localStorage.setItem('openai_key', ...)`. Use `sessionStorage` for a short-lived auth token only, never raw API keys.

---

### C-3: No SSRF Protection on `fetch_url()`
**File:** `backend/pipeline/ingestion.py:28-46`  
**Type:** Server-Side Request Forgery  
**Attack:** User can submit `http://169.254.169.254/latest/meta-data/` (AWS metadata), `http://127.0.0.1:6379/` (Redis), or `http://192.168.1.1/` to probe internal networks and exfiltrate cloud credentials.  
**Fix:** Add `validate_url()` that rejects private IP ranges (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16) before calling `requests.get()`.

---

### C-4: No SSRF Protection on Competitor URL Fetching
**File:** `backend/pipeline/retrieval.py:57-81`  
**Type:** Server-Side Request Forgery  
**Attack:** Blocklist only filters social domains, not private IPs. A compromised Serper result or direct API call can inject internal URLs.  
**Fix:** Call the same `validate_url()` validator inside `fetch_competitor_docs()` for each URL.

---

### C-5: Unauthenticated `/api/sessions` Debug Endpoint
**File:** `backend/app.py:120-137`  
**Type:** Information Disclosure + Session Enumeration  
**Attack:** Anyone can enumerate all active session IDs, then use them with Content Lab, Recommendation, or WebSocket endpoints to hijack other users' analyses and consume their API credits.  
**Fix:** Remove this endpoint entirely for production.

---

### C-6: Missing Pydantic Field Validation for API Keys
**File:** `backend/schemas/request.py:15-16`  
**Type:** Missing Input Validation  
**Attack:** Empty strings pass validation, causing downstream API failures with confusing errors rather than a fast, clear rejection.  
**Fix:** Add `Field(min_length=1)` constraints to all required API key fields.

---

### C-7: Silent Exception Swallowing in `embeddings.py`
**File:** `backend/pipeline/embeddings.py:28-31, 159-162`  
**Type:** Silent Failure  
**Attack:** ChromaDB deletion errors are silently ignored with `except Exception: pass`. State corruption goes undetected, causing hard-to-debug downstream failures.  
**Fix:** Replace bare `pass` with `logger.warning("Failed to delete collection: %s", e, exc_info=True)`.

---

### C-8: Silent Exception in Competitor Fetch
**File:** `backend/pipeline/retrieval.py:77`  
**Type:** Silent Failure  
**Attack:** All competitor fetch errors are silently swallowed with no log output, making it impossible to debug why competitors are missing from analysis results.  
**Fix:** Add `logger.info("Skipped competitor %s: %s", url, e)` before `continue`.

---

## HIGH Issues

### H-1: No Rate Limiting on Any Endpoint
**File:** `backend/app.py`  
**Type:** Denial of Service  
**Fix:** Add `slowapi` middleware; limit `/analyse/stream` to 10/minute per IP.

### H-2: No Authentication/Authorization on Content Lab & Recommendation Endpoints
**File:** `backend/api/routes/analysis.py:182-275`  
**Type:** Broken Access Control  
**Fix:** Bind sessions to a user/requester token; verify ownership before allowing access.

### H-3: CORS Wildcard with `allow_credentials=True`
**File:** `backend/app.py:30-36`  
**Type:** CORS Misconfiguration  
**Fix:** Replace `allow_origins=["*"]` with the exact frontend origin.

### H-4: Weak Frontend Session ID (`Date.now()`)
**File:** `frontend/src/contexts/AnalysisContext.tsx:78`  
**Type:** Predictable Session ID  
**Fix:** Replace `String(Date.now())` with `crypto.randomUUID()`.

### H-5: Error Messages Leak Internal Details
**File:** `backend/api/routes/analysis.py:142-144`  
**Type:** Information Disclosure  
**Fix:** Return generic messages to client (`"Analysis failed. Please try again."`); log full stack server-side only.

### H-6: No Error Handling in Content Lab `run()` Function
**File:** `backend/api/routes/analysis.py:204-221`  
**Type:** Unhandled Exception  
**Fix:** Wrap the entire `run()` body in try/except; return structured error response.

### H-7: `classify_archetype()` Called with Wrong Argument
**File:** `backend/api/routes/analysis.py:243-249`  
**Type:** Runtime Bug  
**Fix:** Pass full `eval_results` dict, not `eval_results["results"]`.

### H-8: Custom Questions Unvalidated (Length + Prompt Injection)
**File:** `backend/api/routes/analysis.py:64`  
**Type:** Input Validation + Prompt Injection  
**Fix:** Cap total length at 5000 chars; cap each question at 500 chars; filter empty strings.

### H-9: Missing Security Headers
**File:** `backend/app.py`  
**Type:** Missing Security Controls  
**Fix:** Add middleware setting `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Content-Security-Policy`.

### H-10: Thread-Unsafe `asyncio.Queue` in RL State
**File:** `backend/api/routes/rl.py:66`  
**Type:** Concurrency Bug  
**Fix:** Create asyncio queue outside the session store; don't mix threading.Lock with asyncio primitives.

### H-11: Blocking I/O — No Bounded `ThreadPoolExecutor`
**File:** `backend/api/routes/analysis.py`  
**Type:** Resource Exhaustion  
**Fix:** Create a bounded `ThreadPoolExecutor(max_workers=4)` in `app.py`; use `app.state.executor`.

### H-12: Config Defaults to Empty String Instead of `None`
**File:** `backend/config.py:14-15`  
**Type:** Validation Gap  
**Fix:** Change API key fields to `Optional[str] = None`; fail fast at startup if required keys are missing.

### H-13: `n_competitors`/`n_questions` Query Params Lack Constraints
**File:** `backend/api/routes/analysis.py:49-50`  
**Type:** Input Validation  
**Fix:** Add `ge`/`le` constraints directly to `Query()` calls: `Query(5, ge=1, le=50)`.

### H-14: Session TTL Cleanup Never Auto-Runs
**File:** `backend/cache/session_store.py`  
**Type:** Memory Leak  
**Fix:** Schedule `cleanup_expired_sessions()` on a FastAPI startup background task every 10 minutes.

---

## MEDIUM Issues

| ID | File | Issue |
|----|------|-------|
| M-1 | `analysis.py:64` | `custom_questions` split produces empty strings when input is `"||||||"` |
| M-2 | `client.ts:79-144` | SSE frame parser nesting >4 levels — extract to helper |
| M-3 | `ResultsPage.tsx:81-88` | `interpretations[0]` without length check — silent undefined |
| M-4 | `ingestion.py:69,110` | Magic numbers 80/3000 should be named constants |
| M-5 | `embeddings.py:173-177` | Magic numbers `_SNAPSHOT_CAP=15`, `_DRAFT_REPEAT=3` undocumented |
| M-6 | `response.py:33-39` | `AnalysisResult` uses bare `dict`/`list` — add typed DTO classes |
| M-7 | `rag_evaluator.py:255` | Failed question evaluation not logged before returning fallback |
| M-8 | `rag_evaluator.py:63-69` | `.format()` calls — prefer f-strings |
| M-9 | `analysis.py:87-89` | `except Exception:` re-raises nothing — consider narrower catch |
| M-10 | `app.py:14` | Unused `from pydantic import HttpUrl` import |
| M-11 | `retrieval.py:75` | Raw string split for domain extraction — use `urlparse().netloc` |
| M-12 | `analysis.py:80` | Untyped lambda used as callback — replace with named function |
| M-13 | `ingestion.py:118` | `json.JSONDecodeError` fallback not logged |
| M-14 | `analysis.py:133,137` | Lines exceed 88 chars — run `black` |
| M-15 | `pca_visualizer.py:159-177` | 3-level nesting in trace loop — extract helper |
| M-16 | `rag_evaluator.py:232-319` | `run_evaluation()` is 87 lines — extract opportunity detection |
| M-17 | `analysis.py:277-386` | `recommendation_generate()` is ~110 lines — extract prompt builder |
| M-18 | project-wide | No request ID tracing — add `X-Request-ID` middleware |

---

## LOW Issues

| ID | File | Issue |
|----|------|-------|
| L-1 | `useWebSocket.ts:29,55,68` | Debug `console.log` in production code |
| L-2 | `orchestrator.py` | `get_pipeline_data_for_content_lab()` missing docstring |
| L-3 | `embeddings.py` | `save_user_snapshot()` / `restore_snapshot_and_add_draft()` undocumented |
| L-4 | `analysis.py` | Inconsistent error message tone/format across endpoints |
| L-5 | `retrieval.py:14-20` | Blocklist hardcoded inline — consider moving to config |
| L-6 | `response.py:27` | `status` enum values inconsistent across SSE/WebSocket/polling paths |
| L-7 | `analysis.py:15` | `numpy` import only used in `_NumpyEncoder` — add inline comment |
| L-8 | `rag_evaluator.py:81-86` | Defensive dual-format JSON parsing — document assumption |
| L-9 | `pca_visualizer.py:128` | `_domain_color_map()` missing docstring |
| L-10 | project-wide | No `__all__` on public modules |
| L-11 | project-wide | No audit logging on sensitive operations (Content Lab, Recs) |

---

## Implementation Plan (Phases 2–5)

### Phase 2 — Security Hardening
- C-1: Move `/analyse/stream` to POST; keys in body
- C-3 / C-4: Add `validate_url()` SSRF validator
- C-5: Delete `/api/sessions` endpoint
- H-1: Add `slowapi` rate limiting
- H-3: Fix CORS wildcard
- H-9: Add security headers middleware
- M-18: Add `X-Request-ID` middleware

### Phase 3 — Input Validation & Error Handling
- C-6: Pydantic `Field(min_length=1)` on API keys
- C-7 / C-8: Add logging to all bare `except` blocks
- H-5: Redact error messages to client
- H-6: Wrap Content Lab `run()` in try/except
- H-7: Fix `classify_archetype()` argument bug
- H-8: Validate custom questions length + content
- H-12: Fix config defaults
- H-13: Add `ge`/`le` to Query params

### Phase 4 — Bug Fixes & Architecture
- C-2: Remove API keys from `localStorage`
- H-4: Replace `Date.now()` with `crypto.randomUUID()`
- H-10: Fix asyncio/threading queue mixing in RL
- H-11: Add bounded `ThreadPoolExecutor`
- H-14: Schedule session TTL cleanup on startup
- M-11: Use `urlparse().netloc` for domain extraction

### Phase 5 — Frontend Security
- C-2: Auth token exchange (`POST /api/auth/request-token`)
- H-4: `crypto.randomUUID()` for session IDs
- H-9: CSP headers
- M-2: Flatten SSE parser nesting
- M-3: Fix `interpretations[0]` null guard
- L-1: Remove debug `console.log`
