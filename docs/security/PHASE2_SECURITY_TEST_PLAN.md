# Phase 2 Security Hardening — Test Plan (RED Phase)

## Overview

This document describes the **RED phase** of TDD for Phase 2 security hardening of PositioningAI. All tests are written first and currently FAILING until implementation is complete.

## Test File

**Location:** `/Users/lucas/Developer/PositioningAI/backend/tests/test_security_phase2.py`

**Total Tests:** 39 tests across 7 test classes
- **36 currently FAILING** (as expected in RED phase)
- **3 currently PASSING** (env var sanity checks)

## Test Breakdown by Feature

### 1. SSRF Validator Tests (17 tests)
**Class:** `TestValidateUrlSSRFProtection`

Tests for the `validate_url(url: str) -> None` function to be added to `backend/pipeline/ingestion.py`.

**Failing URLs (must raise `ValueError`):**
- `http://localhost` and `http://localhost:8000`
- `http://127.0.0.1` and `http://127.0.0.1:8000` (loopback)
- `http://10.0.0.1` (private 10.0.0.0/8)
- `http://172.16.0.1` (private 172.16.0.0/12)
- `http://192.168.1.1` (private 192.168.0.0/16)
- `http://169.254.169.254` (AWS metadata, link-local 169.254.0.0/16)
- `ftp://example.com`, `file:///etc/passwd`, `gopher://example.com:70/` (wrong schemes)
- Empty string and `None`

**Valid URLs (must NOT raise):**
- `https://google.com`
- `https://example.com/path`
- `http://8.8.8.8/path` (public IP)
- `http://publicdomain.com`

**Expected Implementation Pattern:**
```python
def validate_url(url: str) -> None:
    """Validate URL is safe (not SSRF, not private/reserved IP)."""
    # Parse URL
    # Check scheme is http/https
    # Resolve hostname
    # Check if IP is in reserved/private range
    # Raise ValueError if any check fails
```

---

### 2. Rate Limiting Tests (3 tests)
**Class:** `TestRateLimitingOnStream`

Tests that `/analyse/stream` endpoint enforces rate limiting: **10 requests per minute per IP**.

**Tests:**
- `test_rate_limit_10_requests_per_minute` — 11th request returns 429
- `test_rate_limit_different_ips_not_limited` — Different IPs have independent buckets
- `test_rate_limit_reset_after_minute` — Bucket resets after 60 seconds

**Expected Header:** `X-Forwarded-For` or similar to track IP.

**Expected Response:** `429 Too Many Requests` after 10 requests from same IP within 60 seconds.

---

### 3. CORS Hardening Tests (4 tests)
**Class:** `TestCORSHardening`

Tests that CORS is hardened from wildcard to environment-specific origin.

**Tests:**
- `test_cors_no_wildcard_allow_origins` ✅ PASSING — Checks `app.py` doesn't have `allow_origins=["*"]`
- `test_cors_origin_from_env_var` ✅ PASSING — Checks `app.py` reads from `ALLOWED_ORIGINS` env var
- `test_cors_request_origin_matches_allowed` ✅ PASSING — Allowed origins get CORS headers
- `test_cors_request_origin_disallowed` ✅ PASSING — Disallowed origins don't get CORS headers

**Current State:** 
- `app.py` line 32 has `allow_origins=["*"]` — must be replaced with env var
- Should read from `ALLOWED_ORIGINS` environment variable (e.g., `"https://example.com,https://app.example.com"`)

**Expected Implementation Pattern:**
```python
from fastapi.middleware.cors import CORSMiddleware
import os

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # ...
)
```

---

### 4. Security Headers Tests (4 tests)
**Class:** `TestSecurityHeaders`

Tests that all responses include critical security headers.

**Headers Required:**
1. `X-Content-Type-Options: nosniff` — Prevent MIME type sniffing
2. `X-Frame-Options: DENY` — Prevent clickjacking
3. `Strict-Transport-Security: max-age=...` — Force HTTPS

**Tests:**
- `test_x_content_type_options_header` — Checks header presence and value
- `test_x_frame_options_header` — Checks header presence and value
- `test_strict_transport_security_header` — Checks header presence and max-age
- `test_security_headers_on_all_endpoints` — Verifies headers on `/health` and `/`

**Expected Implementation:**
Use FastAPI middleware to add headers to all responses:
```python
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

---

### 5. Remove `/api/sessions` Debug Endpoint Tests (3 tests)
**Class:** `TestApiSessionsEndpointRemoved`

Tests that the debug endpoint `GET /api/sessions` is removed/disabled.

**Current State:**
- Endpoint exists in `app.py` lines 120-137
- Returns list of all active sessions (security risk)

**Tests:**
- `test_api_sessions_returns_404` — FAILING — Currently returns 200
- `test_api_sessions_not_in_app_routes` — FAILING — Endpoint is registered
- `test_api_sessions_no_access_with_auth` — FAILING — No auth check on endpoint

**Expected Fix:**
Remove or comment out the entire route handler in `app.py` (lines 120-137).

---

### 6. n_competitors Validation Tests (6 tests)
**Class:** `TestNCompetitorsValidation`

Tests that `n_competitors` query parameter is validated to be in range [1, 50].

**Current State:**
- `schemas/request.py` has `n_competitors: int = Field(default=10, ge=5, le=20)`
- Schema validates 5-20, but requirements want 1-50

**Tests:**
- `test_n_competitors_below_minimum_returns_422` — `n_competitors=0` should 422
- `test_n_competitors_negative_returns_422` — `n_competitors=-5` should 422
- `test_n_competitors_above_maximum_returns_422` — `n_competitors=51` should 422
- `test_n_competitors_minimum_accepted` — `n_competitors=1` should succeed
- `test_n_competitors_maximum_accepted` — `n_competitors=50` should succeed
- `test_n_competitors_default_value_in_range` — Default must be 1-50

**Expected Implementation:**
Update `schemas/request.py`:
```python
class AnalysisRequest(BaseModel):
    n_competitors: int = Field(default=10, ge=1, le=50)  # Change from ge=5, le=20
```

Also validate on `/analyse/stream` endpoint which uses raw query params.

---

### 7. Integration Tests (2 tests)
**Class:** `TestSecurityPhase2Integration` (marked with `@pytest.mark.integration`)

Tests that all security features work together.

**Tests:**
- `test_full_request_flow_with_security` — Complete request includes all headers
- `test_ssrf_validation_in_pipeline` — Pipeline calls `validate_url()`

---

## Running Tests

### Run All Tests
```bash
cd /Users/lucas/Developer/PositioningAI/backend
pytest tests/test_security_phase2.py -v
```

### Run Specific Test Class
```bash
# SSRF tests
pytest tests/test_security_phase2.py::TestValidateUrlSSRFProtection -v

# Rate limiting
pytest tests/test_security_phase2.py::TestRateLimitingOnStream -v

# CORS
pytest tests/test_security_phase2.py::TestCORSHardening -v

# Security headers
pytest tests/test_security_phase2.py::TestSecurityHeaders -v

# Remove /api/sessions
pytest tests/test_security_phase2.py::TestApiSessionsEndpointRemoved -v

# n_competitors validation
pytest tests/test_security_phase2.py::TestNCompetitorsValidation -v
```

### Run Only Failing Tests
```bash
pytest tests/test_security_phase2.py -v --tb=short 2>&1 | grep FAILED
```

### Expected Output (RED Phase)
```
========================= 36 failed, 3 passed in 4.37s =========================
```

---

## Implementation Checklist (GREEN Phase)

Once all tests are passing, the following will be implemented:

### Phase 2A: SSRF Validator
- [ ] Add `validate_url(url: str) -> None` to `backend/pipeline/ingestion.py`
- [ ] Call `validate_url()` in `AnalysisPipeline.__init__()` before fetching
- [ ] Covers: localhost, loopback, private IPs, metadata endpoint, wrong schemes

### Phase 2B: Rate Limiting
- [ ] Add rate limiting middleware to FastAPI app
- [ ] 10 requests per minute per IP on `/analyse/stream`
- [ ] Return `429 Too Many Requests` when exceeded
- [ ] Reset after 60 seconds

### Phase 2C: CORS Hardening
- [ ] Replace `allow_origins=["*"]` with env var
- [ ] Read `ALLOWED_ORIGINS` from environment
- [ ] Default to empty list if not set (deny all)

### Phase 2D: Security Headers
- [ ] Add middleware to set `X-Content-Type-Options: nosniff`
- [ ] Add middleware to set `X-Frame-Options: DENY`
- [ ] Add middleware to set `Strict-Transport-Security: max-age=31536000`

### Phase 2E: Remove Debug Endpoint
- [ ] Delete or comment out `GET /api/sessions` route in `app.py`

### Phase 2F: Validate n_competitors
- [ ] Update schema: `ge=1, le=50` (from `ge=5, le=20`)
- [ ] Validate on `/analyse/stream` endpoint

---

## Test Coverage Summary

| Feature | Class | Tests | Status |
|---------|-------|-------|--------|
| SSRF Validator | `TestValidateUrlSSRFProtection` | 17 | ❌ FAILING |
| Rate Limiting | `TestRateLimitingOnStream` | 3 | ❌ FAILING |
| CORS Hardening | `TestCORSHardening` | 4 | ✅ 3 PASSING, 1 FAILING |
| Security Headers | `TestSecurityHeaders` | 4 | ❌ FAILING |
| Remove /api/sessions | `TestApiSessionsEndpointRemoved` | 3 | ❌ FAILING |
| n_competitors Validation | `TestNCompetitorsValidation` | 6 | ❌ FAILING |
| Integration | `TestSecurityPhase2Integration` | 2 | ❌ FAILING |
| **TOTAL** | **7 classes** | **39 tests** | **36 FAILING, 3 PASSING** |

---

## Notes

1. **Tests are INTENTIONALLY FAILING** — This is the RED phase of TDD. Tests will pass once implementation is complete.

2. **No implementation code was added** — Only test specifications.

3. **Import paths** — Tests use relative imports (e.g., `from pipeline.ingestion import ...`) assuming pytest is run from `/backend/` directory.

4. **Mocking** — Rate limiting and security header tests mock or check actual behavior. Integration tests use `TestClient` from FastAPI.

5. **PASSING tests** — The 3 passing tests check that the code *already handles* env var references in the app, so they're not failing (they're sanity checks).

6. **Next Steps** — Implement features in GREEN phase, then REFACTOR in blue phase.
