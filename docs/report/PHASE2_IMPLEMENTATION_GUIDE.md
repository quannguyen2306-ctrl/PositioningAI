# Phase 2 Security Hardening — Implementation Guide

## Test-Driven Development (TDD) Status

**Current Phase:** RED (all tests written, 36 failing)

**Test File:** `/Users/lucas/Developer/PositioningAI/backend/tests/test_security_phase2.py`

**Next Steps:**
1. Write minimal implementation code (GREEN phase)
2. Refactor and optimize (REFACTOR phase)
3. Achieve 80%+ test coverage

---

## Files to Modify

### 1. `backend/pipeline/ingestion.py`
**What to add:**
- New function: `validate_url(url: str) -> None`
- Call this function in `AnalysisPipeline.__init__()` before fetching the URL

**Tests expecting this:**
- 17 tests in `TestValidateUrlSSRFProtection`

**Pseudocode:**
```python
def validate_url(url: str) -> None:
    """
    Validate that a URL is safe to fetch (SSRF protection).
    
    Raises ValueError if:
    - URL scheme is not http or https
    - Hostname resolves to a private/reserved/loopback IP
    - URL is empty or invalid
    """
    # 1. Parse URL, raise if invalid
    # 2. Check scheme is http/https
    # 3. Extract hostname
    # 4. Resolve hostname to IP
    # 5. Check if IP is in reserved ranges:
    #    - 127.0.0.0/8 (loopback)
    #    - 10.0.0.0/8 (private)
    #    - 172.16.0.0/12 (private)
    #    - 192.168.0.0/16 (private)
    #    - 169.254.0.0/16 (link-local, AWS metadata)
    #    - 0.0.0.0/8, 255.255.255.255/32, etc.
    # 6. Raise ValueError with descriptive message if check fails
```

**Libraries to use:**
- `urllib.parse.urlparse()` for URL parsing
- `socket.inet_aton()` or `ipaddress.IPv4Address()` for IP validation
- `ipaddress` module for range checking (built-in Python 3.3+)

---

### 2. `backend/app.py`
**Changes required:**

#### A. Import and setup (lines 1-20)
- Add imports for rate limiting middleware (e.g., `slowapi`, or custom implementation)
- Add import for security headers middleware

#### B. CORS Configuration (lines 30-36)
**CURRENT:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ❌ REMOVE THIS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**NEW:**
```python
import os

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # ✅ From env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### C. Remove `/api/sessions` Endpoint (lines 120-137)
**DELETE THIS ENTIRE BLOCK:**
```python
@app.get("/api/sessions")
async def list_sessions():
    """Debug endpoint: list all active sessions."""
    return {
        "sessions": [
            {
                "session_id": session_id,
                "status": session.get("status"),
                "percent": session.get("progress", {}).get("percent", 0) if session.get("progress") else 0,
            }
            for session_id, session in store._sessions.items()
        ]
    }
```

#### D. Add Security Headers Middleware
**ADD AFTER CORS MIDDLEWARE (before route includes):**
```python
@app.middleware("http")
async def add_security_headers(request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

#### E. Add Rate Limiting Middleware
**ADD AFTER SECURITY HEADERS MIDDLEWARE:**
```python
# Rate limiting: 10 requests per 60 seconds per IP
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Optional: add exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Max 10 requests per minute."},
    )
```

---

### 3. `backend/api/routes/analysis.py`
**Changes required:**

#### A. Add Rate Limit Decorator to `/analyse/stream` (line 44)
**CURRENT:**
```python
@router.get("/analyse/stream")
async def stream_analysis(
```

**NEW:**
```python
from fastapi import APIRouter
# ... imports

limiter = None  # Will be set from app.state.limiter
def get_limiter():
    from app import limiter as app_limiter
    return app_limiter

@router.get("/analyse/stream")
@limiter.limit("10/minute")  # 10 requests per 60 seconds
async def stream_analysis(
```

**OR (simpler):** Use `slowapi` decorator inline:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/analyse/stream")
@limiter.limit("10/minute")
async def stream_analysis(request: Request, ...)
```

#### B. Add SSRF Validation (inside `stream_analysis`, line ~74)
**ADD AFTER creating pipeline:**
```python
from pipeline.ingestion import validate_url

# Validate URL safety before processing
try:
    validate_url(url)
except ValueError as e:
    emit({"event": "error", "message": f"Invalid URL: {str(e)}"})
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
    )
```

---

### 4. `backend/schemas/request.py`
**Change n_competitors validation (line 17):**

**CURRENT:**
```python
n_competitors: int = Field(default=10, ge=5, le=20)
```

**NEW:**
```python
n_competitors: int = Field(default=10, ge=1, le=50)
```

---

### 5. `backend/.env` (Create if not exists)
**Add configuration variables:**
```bash
# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=https://localhost:5173,https://app.example.com

# Or for development:
ALLOWED_ORIGINS=*
```

---

## Implementation Order (GREEN Phase)

Follow this order to implement features while keeping tests passing:

### Phase 2A: SSRF Validator (easiest, most isolated)
1. Add `validate_url()` function to `ingestion.py`
2. Call it in `AnalysisPipeline.__init__()`
3. Run tests: `pytest tests/test_security_phase2.py::TestValidateUrlSSRFProtection -v`
4. Expected: 17 tests PASS

### Phase 2B: n_competitors Validation (easiest, single file)
1. Update `schemas/request.py` `ge=1, le=50`
2. Run tests: `pytest tests/test_security_phase2.py::TestNCompetitorsValidation -v`
3. Expected: 6 tests PASS

### Phase 2C: Remove Debug Endpoint (fastest)
1. Delete `/api/sessions` route from `app.py`
2. Run tests: `pytest tests/test_security_phase2.py::TestApiSessionsEndpointRemoved -v`
3. Expected: 3 tests PASS

### Phase 2D: CORS Hardening (straightforward)
1. Update `app.py` CORS middleware with env var
2. Run tests: `pytest tests/test_security_phase2.py::TestCORSHardening -v`
3. Expected: 4 tests PASS

### Phase 2E: Security Headers (straightforward)
1. Add middleware to `app.py` for security headers
2. Run tests: `pytest tests/test_security_phase2.py::TestSecurityHeaders -v`
3. Expected: 4 tests PASS

### Phase 2F: Rate Limiting (most complex)
1. Install `slowapi`: `pip install slowapi`
2. Add rate limiter to `app.py`
3. Add `@limiter.limit("10/minute")` decorator to `/analyse/stream` in `analysis.py`
4. Run tests: `pytest tests/test_security_phase2.py::TestRateLimitingOnStream -v`
5. Expected: 3 tests PASS

---

## Environment Variables Needed

Add to `backend/.env`:

```bash
# CORS
ALLOWED_ORIGINS=https://localhost:5173,https://example.com

# Optional: Rate limiting key store (if using Redis for distributed rate limiting)
# REDIS_URL=redis://localhost:6379

# Optional: Security headers
HSTS_MAX_AGE=31536000
```

---

## Quick Test Commands

```bash
# Run all security tests
cd /Users/lucas/Developer/PositioningAI/backend
pytest tests/test_security_phase2.py -v

# Run specific feature tests
pytest tests/test_security_phase2.py::TestValidateUrlSSRFProtection -v
pytest tests/test_security_phase2.py::TestNCompetitorsValidation -v
pytest tests/test_security_phase2.py::TestApiSessionsEndpointRemoved -v
pytest tests/test_security_phase2.py::TestCORSHardening -v
pytest tests/test_security_phase2.py::TestSecurityHeaders -v
pytest tests/test_security_phase2.py::TestRateLimitingOnStream -v

# Run with coverage
pytest tests/test_security_phase2.py --cov=pipeline --cov=api --cov-report=term-missing
```

---

## Rollback Points

If a feature breaks other tests, roll back to that file:

1. **SSRF breaks orchestrator tests** — Check if `validate_url()` is being called correctly, or if test mocks need updating
2. **CORS breaks other endpoints** — Ensure `ALLOWED_ORIGINS` env var is set; add test origin in tests
3. **Rate limiting breaks SSE** — Might need to exclude `/health` from rate limit decorator
4. **Security headers break responses** — Ensure headers don't interfere with content-type negotiation

---

## Coverage Target

After all implementations, verify:

```bash
pytest tests/test_security_phase2.py --cov=backend --cov-report=term-missing
```

**Target:** 80%+ coverage of:
- `pipeline/ingestion.py` (SSRF validator)
- `app.py` (CORS, security headers, rate limiting)
- `api/routes/analysis.py` (rate limiter decorator, SSRF call)
- `schemas/request.py` (field validation)
