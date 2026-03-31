# Phase 2 Security Hardening — TDD RED Phase Complete ✅

## Overview

This directory contains comprehensive Test-Driven Development (TDD) tests for Phase 2 security hardening of PositioningAI. All tests are written FIRST (RED phase), before any implementation code exists.

## What is Phase 2?

Phase 2 hardens PositioningAI against 7 critical security vulnerabilities:

1. **SSRF (Server-Side Request Forgery)** — Blocks requests to private/reserved IPs
2. **Rate Limiting** — Limits to 10 requests/minute per IP
3. **CORS** — Removes wildcard origin, uses environment-specific whitelist
4. **Security Headers** — Adds `X-Content-Type-Options`, `X-Frame-Options`, HSTS
5. **Debug Endpoint Removal** — Deletes `/api/sessions` (leaks session info)
6. **Input Validation** — Enforces `n_competitors` in range [1, 50]
7. **Integration** — All features work together

## TDD Status: RED Phase ✅

| Metric | Value |
|--------|-------|
| Total Tests | 39 |
| Tests Failing | 36 ❌ |
| Tests Passing | 3 ✅ (sanity checks) |
| Test Classes | 7 |
| Lines of Test Code | 600+ |

**This is CORRECT.** In TDD, tests should fail first. We'll implement features in the GREEN phase.

---

## Test Structure

```
backend/tests/test_security_phase2.py
├── TestValidateUrlSSRFProtection (17 tests)
│   └── Tests for validate_url() function
├── TestRateLimitingOnStream (3 tests)
│   └── Tests for 10 req/min rate limiting
├── TestCORSHardening (4 tests)
│   ├── 3 tests already passing ✅
│   └── 1 test failing ❌ (needs implementation)
├── TestSecurityHeaders (4 tests)
│   └── Tests for X-Content-Type-Options, X-Frame-Options, HSTS
├── TestApiSessionsEndpointRemoved (3 tests)
│   └── Tests that /api/sessions returns 404
├── TestNCompetitorsValidation (6 tests)
│   └── Tests that n_competitors is in [1, 50]
└── TestSecurityPhase2Integration (2 tests)
    └── Integration tests for all features together
```

---

## How to Run Tests

### Run All Security Tests
```bash
cd /Users/lucas/Developer/PositioningAI/backend
pytest tests/test_security_phase2.py -v
```

### Run Specific Test Class
```bash
pytest tests/test_security_phase2.py::TestValidateUrlSSRFProtection -v
pytest tests/test_security_phase2.py::TestRateLimitingOnStream -v
pytest tests/test_security_phase2.py::TestCORSHardening -v
# ... etc
```

### Run Single Test
```bash
pytest tests/test_security_phase2.py::TestValidateUrlSSRFProtection::test_validate_url_rejects_localhost -v
```

### View Failure Summary
```bash
pytest tests/test_security_phase2.py -v --tb=no | grep FAILED
```

---

## Expected Test Output

```
========================= 36 failed, 3 passed in 4.72s =========================

FAILED tests/test_security_phase2.py::TestValidateUrlSSRFProtection::test_validate_url_rejects_localhost
FAILED tests/test_security_phase2.py::TestValidateUrlSSRFProtection::test_validate_url_rejects_localhost_with_port
... (34 more failures)
PASSED tests/test_security_phase2.py::TestCORSHardening::test_cors_origin_from_env_var
PASSED tests/test_security_phase2.py::TestCORSHardening::test_cors_request_origin_matches_allowed
PASSED tests/test_security_phase2.py::TestCORSHardening::test_cors_request_origin_disallowed
```

---

## What's in This Repository?

| File | Purpose |
|------|---------|
| `/backend/tests/test_security_phase2.py` | 39 comprehensive TDD tests |
| `/backend/pytest.ini` | Pytest configuration with markers |
| `/PHASE2_SECURITY_TEST_PLAN.md` | Detailed test specifications |
| `/PHASE2_IMPLEMENTATION_GUIDE.md` | Step-by-step implementation guide |
| `/TEST_SUMMARY_PHASE2.md` | Test execution summary |
| `/QUICKSTART_PHASE2.md` | Quick reference for developers |
| `/PHASE2_README.md` | This file |

---

## Files That Will Be Modified (GREEN Phase)

1. **`backend/pipeline/ingestion.py`** — Add `validate_url()` function
2. **`backend/app.py`** — Add security headers, rate limiting, CORS hardening, remove debug endpoint
3. **`backend/api/routes/analysis.py`** — Add SSRF validation, rate limiter decorator
4. **`backend/schemas/request.py`** — Update n_competitors constraints
5. **`backend/.env`** — Add ALLOWED_ORIGINS configuration

---

## Next Steps (GREEN Phase)

To proceed with implementation:

1. **Review** the test file and understand what's being tested
2. **Read** `/PHASE2_IMPLEMENTATION_GUIDE.md` for detailed implementation steps
3. **Implement** features one at a time (easiest first):
   - n_competitors validation (5 min)
   - Remove /api/sessions (2 min)
   - CORS hardening (10 min)
   - Security headers (10 min)
   - SSRF validator (30 min)
   - Rate limiting (30 min)
4. **Test** after each feature: `pytest tests/test_security_phase2.py -v`
5. **Verify** coverage is 80%+ : `pytest tests/test_security_phase2.py --cov`

---

## Test Philosophy

These tests follow TDD best practices:

✅ **Red-Green-Refactor Cycle**
- RED (current): Tests fail, no code exists
- GREEN (next): Implement features until tests pass
- REFACTOR (final): Clean up code while tests stay green

✅ **Independent Tests**
- No shared state between tests
- Each test can run in any order
- No test depends on another test

✅ **Clear Assertions**
- Each test has a single focus
- Error messages are descriptive
- Failure reasons are obvious

✅ **Edge Case Coverage**
- Empty/null values tested
- Boundary conditions tested
- Error paths tested (not just happy path)
- Invalid input tested

✅ **Appropriate Mocking**
- External dependencies mocked where needed
- Tests don't make real API calls
- No hardcoded API keys in tests

---

## Security Features Tested

### 1. SSRF Validator (17 tests)
Prevents requests to:
- Localhost (127.0.0.1, localhost)
- Private IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Link-local/Metadata (169.254.0.0/16, AWS EC2 metadata)
- Non-HTTP schemes (ftp, file, gopher)

Allows:
- Public domains (google.com, example.com)
- Public IPs (8.8.8.8)

### 2. Rate Limiting (3 tests)
- Limit: 10 requests per 60 seconds
- Per-IP buckets: Different IPs independent
- Reset: After 60 seconds

### 3. CORS Hardening (4 tests)
- Current: `allow_origins=["*"]` (wildcard = unsafe)
- Target: `allow_origins` from `ALLOWED_ORIGINS` env var
- Result: Only specified origins can make requests

### 4. Security Headers (4 tests)
- `X-Content-Type-Options: nosniff` — Prevent MIME sniffing
- `X-Frame-Options: DENY` — Prevent clickjacking
- `Strict-Transport-Security: max-age=...` — Force HTTPS

### 5. Remove Debug Endpoint (3 tests)
- Current: `GET /api/sessions` returns all session info
- Target: `GET /api/sessions` returns 404
- Reason: Session information is sensitive

### 6. Input Validation (6 tests)
- Current: `n_competitors` in [5, 20]
- Target: `n_competitors` in [1, 50]
- Tests: Boundary values, invalid input

### 7. Integration (2 tests)
- All features work together
- SSRF validator called by pipeline

---

## Understanding Test Failures

Each failing test clearly indicates what's missing:

### SSRF Tests Fail Because
```
ImportError: cannot import name 'validate_url' from 'pipeline.ingestion'
```
→ Function doesn't exist yet

### Rate Limiting Tests Fail Because
```
AssertionError: 11th request should be rate limited
assert 200 == 429
```
→ No rate limiting middleware

### Security Header Tests Fail Because
```
AssertionError: X-Content-Type-Options header missing
```
→ No security header middleware

### /api/sessions Tests Fail Because
```
AssertionError: GET /api/sessions should return 404
assert 200 == 404
```
→ Endpoint still active

### n_competitors Tests Fail Because
```
AssertionError: n_competitors=0 should return 422
assert 200 == 422
```
→ Schema constraints not updated

---

## Success Criteria

GREEN phase complete when:

✅ All 39 tests pass
```
========================= 39 passed in X.XXs =========================
```

✅ Coverage is 80%+
```
pipeline/ingestion.py     80%+  coverage
app.py                    80%+  coverage
api/routes/analysis.py    80%+  coverage
schemas/request.py        80%+  coverage
```

✅ No hardcoded secrets
✅ All edge cases handled
✅ Error messages are helpful
✅ Code is readable and maintainable

---

## Questions?

### For Understanding Tests
→ See `/backend/tests/test_security_phase2.py` (well-commented)

### For Implementation Details
→ See `/PHASE2_IMPLEMENTATION_GUIDE.md`

### For Quick Reference
→ See `/QUICKSTART_PHASE2.md`

### For Detailed Test Specifications
→ See `/PHASE2_SECURITY_TEST_PLAN.md`

---

## Summary

| Phase | Status | Action |
|-------|--------|--------|
| **RED** | ✅ Complete | Tests written (39 tests, 36 failing) |
| **GREEN** | → Next | Implement features until tests pass |
| **REFACTOR** | → Final | Clean code, verify coverage 80%+ |

**Total estimated implementation time: ~90 minutes (1.5 hours)**

**Estimated per-feature time:**
- n_competitors: 5 min
- Remove /api/sessions: 2 min
- CORS: 10 min
- Headers: 10 min
- SSRF: 30 min
- Rate limiting: 30 min

---

**Happy coding! Follow TDD: Red → Green → Refactor → Coverage → Done.**
