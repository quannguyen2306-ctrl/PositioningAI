# Phase 2 Security Hardening — Quick Start

## Status: RED Phase ✅ Complete

**39 tests written. 36 failing (expected). 3 passing (sanity checks).**

---

## Run Tests

```bash
cd /Users/lucas/Developer/PositioningAI/backend
pytest tests/test_security_phase2.py -v
```

Expected output:
```
========================= 36 failed, 3 passed in 4.72s =========================
```

---

## Implementation Priority (GREEN Phase)

### 1. EASIEST (do first)

**n_competitors validation — 5 minutes**
- File: `backend/schemas/request.py` line 17
- Change: `ge=5, le=20` → `ge=1, le=50`
- Tests: `pytest tests/test_security_phase2.py::TestNCompetitorsValidation -v`

**Remove /api/sessions — 2 minutes**
- File: `backend/app.py` lines 120-137
- Action: Delete the entire route handler
- Tests: `pytest tests/test_security_phase2.py::TestApiSessionsEndpointRemoved -v`

### 2. MODERATE (standard effort)

**CORS hardening — 10 minutes**
- File: `backend/app.py` line 32
- Change: `allow_origins=["*"]` → read from env var
- Tests: `pytest tests/test_security_phase2.py::TestCORSHardening -v`

**Security headers — 10 minutes**
- File: `backend/app.py`
- Action: Add middleware for 3 security headers
- Tests: `pytest tests/test_security_phase2.py::TestSecurityHeaders -v`

### 3. COMPLEX (requires libraries)

**SSRF validator — 30 minutes**
- File: `backend/pipeline/ingestion.py`
- Action: New function `validate_url(url: str) -> None`
- Tests: `pytest tests/test_security_phase2.py::TestValidateUrlSSRFProtection -v`
- Libraries: `urllib.parse`, `socket`, `ipaddress` (built-in)

**Rate limiting — 30 minutes**
- Files: `backend/app.py`, `backend/api/routes/analysis.py`
- Action: Add rate limiter middleware
- Install: `pip install slowapi`
- Tests: `pytest tests/test_security_phase2.py::TestRateLimitingOnStream -v`

---

## One-Line Test Summaries

| Feature | Tests | Status |
|---------|-------|--------|
| SSRF Validator | 17 | ❌ Function doesn't exist |
| n_competitors | 6 | ❌ Schema constraint wrong |
| Remove /api/sessions | 3 | ❌ Endpoint still active |
| CORS | 4 | ✅ 3/4 passing (1 needs fix) |
| Security Headers | 4 | ❌ Middleware missing |
| Rate Limiting | 3 | ❌ Middleware missing |
| Integration | 2 | ❌ Depends on others |

---

## What Each Test Expects

### SSRF Validator
```python
from pipeline.ingestion import validate_url

# Should raise ValueError:
validate_url("http://localhost")
validate_url("http://127.0.0.1")
validate_url("http://192.168.1.1")
validate_url("http://169.254.169.254")
validate_url("ftp://example.com")

# Should NOT raise:
validate_url("https://google.com")
validate_url("http://8.8.8.8")
```

### n_competitors Validation
```python
# Should return 422:
GET /analyse/stream?n_competitors=0
GET /analyse/stream?n_competitors=-5
GET /analyse/stream?n_competitors=51

# Should NOT return 422:
GET /analyse/stream?n_competitors=1
GET /analyse/stream?n_competitors=50
```

### CORS Hardening
```python
# app.py should NOT have:
allow_origins=["*"]

# app.py should have:
allow_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
```

### Security Headers
```python
# All responses should include:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=...
```

### Remove /api/sessions
```python
# Should return 404:
GET /api/sessions

# NOT 200 OK with session list
```

### Rate Limiting
```python
# Requests 1-10: success (any 2xx status)
# Request 11: 429 Too Many Requests
# Different IPs: independent buckets
# After 60s: bucket resets
```

---

## Environment Setup

Add to `backend/.env`:

```bash
ALLOWED_ORIGINS=https://localhost:5173,https://example.com

# For local dev:
# ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Testing During Implementation

After each feature:

```bash
# Test that feature
pytest tests/test_security_phase2.py::TestFeatureName -v

# Test all (should increase passing count)
pytest tests/test_security_phase2.py -v

# Show coverage
pytest tests/test_security_phase2.py --cov=pipeline --cov=api --cov-report=term-missing
```

---

## Implementation Checklist

- [ ] **n_competitors** — Update `schemas/request.py`
- [ ] **Remove /api/sessions** — Delete route from `app.py`
- [ ] **CORS** — Replace wildcard with env var in `app.py`
- [ ] **Security Headers** — Add middleware to `app.py`
- [ ] **SSRF Validator** — Add function to `ingestion.py`
- [ ] **Rate Limiting** — Install `slowapi`, add middleware
- [ ] **Integration** — Call `validate_url()` in pipeline
- [ ] **Coverage** — Verify 80%+ test coverage
- [ ] **All Tests Pass** — `pytest tests/test_security_phase2.py` shows all green

---

## Expected Final Output

After all implementations:

```
========================= 39 passed in X.XXs =========================
```

Coverage target:
```
pipeline/ingestion.py     ✅ 80%+
app.py                    ✅ 80%+
api/routes/analysis.py    ✅ 80%+
schemas/request.py        ✅ 80%+
```

---

## Questions?

Refer to:
- **Full test file:** `/Users/lucas/Developer/PositioningAI/backend/tests/test_security_phase2.py`
- **Implementation guide:** `/Users/lucas/Developer/PositioningAI/PHASE2_IMPLEMENTATION_GUIDE.md`
- **Test plan:** `/Users/lucas/Developer/PositioningAI/PHASE2_SECURITY_TEST_PLAN.md`
