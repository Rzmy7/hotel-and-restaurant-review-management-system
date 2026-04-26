# Backend Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the **Hotel & Restaurant Review Management System** backend. Tests are organized into three distinct categories:

| Category | Directory | Tests | Purpose |
|----------|-----------|-------|---------|
| **Unit Tests** | `tests/unit/` | 156 | Pure function logic — no I/O or HTTP |
| **Integration Tests** | `tests/integration/` | 26 | FastAPI routes & dependency injection |
| **Schema Validation** | `tests/schema_validation/` | 146 | Pydantic model accept/reject boundaries |
| **Total** | | **328** | |

All tests run **without a live database** — external dependencies are mocked.

---

## Prerequisites

### Dependencies

```bash
pip install pytest httpx
```

### Running Tests

```bash
# Run all tests
python -m pytest tests/unit/ tests/integration/ tests/schema_validation/ -v

# Run by category
python -m pytest tests/unit/ -v                    # Unit tests only
python -m pytest tests/integration/ -v             # Integration tests only
python -m pytest tests/schema_validation/ -v       # Schema tests only

# Run a specific test file
python -m pytest tests/unit/test_security.py -v

# Run with coverage report
python -m pytest tests/unit/ tests/integration/ tests/schema_validation/ --cov=app --cov-report=term-missing
```

---

## Test Directory Structure

```
backend/tests/
├── conftest.py                              # Shared fixtures (mock DB, JWT factory, mock users)
├── unit/
│   ├── __init__.py
│   ├── test_security.py                     # Password hashing + JWT create/decode
│   ├── test_password_validator.py           # Password strength rules
│   ├── test_signup_validator.py             # Email, name, domain, full payload
│   ├── test_login_validator.py              # Login payload + OTP code format
│   ├── test_otp_validator.py                # Standalone OTP format validation
│   ├── test_geo_utils.py                    # Google Maps URL coordinate parsing
│   ├── test_db_utils.py                     # growth(), dates, SQL literals, identifiers
│   └── test_broadcasting_helpers.py         # Audience labels, plan buckets, datetime parsing
├── integration/
│   ├── __init__.py
│   ├── test_health_routes.py                # GET /, /which-main via TestClient
│   ├── test_auth_routes.py                  # POST /api/auth/signup, /login validation
│   └── test_dependencies.py                 # get_current_user, get_optional_user JWT deps
└── schema_validation/
    ├── __init__.py
    ├── test_auth_schemas.py                 # SignupModel, LoginModel, ResetModel
    ├── test_source_schemas.py               # SourceCreate, SourceUpdate, enums, SyncStatus
    ├── test_review_schemas.py               # ReviewModel, pagination, ReplyGeneration
    ├── test_competitor_schemas.py           # AddCompetitor, Edit, Track, Source schemas
    ├── test_admin_schemas.py                # Broadcast, Security, Subscription, Users, Flags
    └── test_group_schemas.py                # GroupCreate, Update, Settings, Invites, Analytics
```

---

## Unit Tests (`tests/unit/`)

### `test_security.py` — Security Module

Tests `app.core.security` — bcrypt password hashing and JWT token management.

| Class | Test | Assertion |
|-------|------|-----------|
| `TestHashPassword` | `test_returns_bcrypt_hash` | Hash starts with `$2b$` |
| | `test_different_calls_produce_different_hashes` | Random salt makes hashes unique |
| | `test_hash_is_string` | Return type is `str` |
| `TestVerifyPassword` | `test_correct_password_returns_true` | Matching password → True |
| | `test_wrong_password_returns_false` | Mismatch → False |
| | `test_bad_hash_format_returns_false` | Garbage hash → False (no crash) |
| | `test_empty_password_returns_false` | Empty string → False |
| `TestCreateAccessToken` | `test_token_contains_expected_claims` | JWT has user_id, role, org_id, exp |
| | `test_token_is_string` | Return type is `str` |
| | `test_token_has_three_segments` | Format: `header.payload.signature` |
| | `test_organization_id_defaults_to_none` | Omitted org → None in token |
| `TestDecodeAccessToken` | `test_roundtrip` | encode → decode recovers claims |
| | `test_expired_token_raises` | Expired → exception |
| | `test_invalid_signature_raises` | Wrong secret → exception |

### `test_password_validator.py` — Password Strength

Tests `app.core.validations.password_validator.validate_password_strength`.

| Test | Input | Expected |
|------|-------|----------|
| `test_valid_password_passes` | `"StrongP@ss1"` | No exception |
| `test_too_short_raises` | `"Sh1!"` | HTTPException 400 |
| `test_no_uppercase_raises` | `"weakpass1!"` | HTTPException 400 |
| `test_no_digit_raises` | `"StrongPass!"` | HTTPException 400 |
| `test_no_symbol_raises` | `"StrongPass1"` | HTTPException 400 |
| `test_exactly_8_characters_valid` | `"Abcdef1!"` | No exception |
| `test_various_symbols_accepted` | `@#$%^&*()-_` variants | All pass |

### `test_signup_validator.py` — Signup Validation

Tests email normalization, name validation, domain realism, and full payload.

**Key scenarios tested:**
- Email lowercasing and whitespace stripping
- Rejection of unrealistic TLDs (`.kaa`), consecutive dots, leading/trailing dots
- Name length boundaries (2–100 chars), character restrictions
- Realistic domain detection (subdomain support, short domain rejection)
- Full payload validation combining all validators

### `test_login_validator.py` — Login & OTP Validation

Tests login payload normalization and OTP code format.

- Login payload: email normalization, password pass-through
- OTP code: exact 6-digit requirement, rejection of letters, special chars, 5/7 digits

### `test_otp_validator.py` — Standalone OTP Validator

Tests `validate_otp_format()` — the standalone version used for 2FA verification.

### `test_geo_utils.py` — Google Maps Coordinate Parsing

Tests `parse_google_maps_url()` for all URL formats:

| URL Format | Example | Coordinates |
|-----------|---------|-------------|
| `/@lat,lng` | `/@6.9271,79.8612,17z` | `(6.9271, 79.8612)` |
| `?q=lat,lng` | `?q=6.9271,79.8612` | `(6.9271, 79.8612)` |
| `?ll=lat,lng` | `?ll=6.9271,79.8612` | `(6.9271, 79.8612)` |
| Negative coords | `/@-33.8688,151.2093` | `(-33.8688, 151.2093)` |
| Empty/None | `""` / `None` | `None` |

### `test_db_utils.py` — Database Utilities

Tests pure helper functions:

- **`growth()`** — percentage growth with edge cases (0/0, negative, rounding)
- **`month_start()`** — first day of month
- **`shift_month()`** — month arithmetic with year wrapping
- **`_sql_literal()`** — SQL value escaping (None, strings, booleans, dates)
- **`is_valid_sql_identifier()`** — SQL injection prevention
- **`to_relative_timestamp()`** — "2 hours ago" style formatting
- **`to_datetime()`** — date/datetime/None coercion

### `test_broadcasting_helpers.py` — Broadcasting Logic

Tests pure broadcasting helper functions:

- **`get_audience_label()`** — label generation for all/role/plan audiences
- **`_derive_plan_bucket()`** — admin/email/phone verification → plan mapping
- **`_parse_iso_datetime()`** — ISO 8601 parsing with Z suffix, timezone offsets
- **`_to_iso()`** — datetime → ISO string conversion

---

## Integration Tests (`tests/integration/`)

### `test_health_routes.py` — Health Endpoints

Uses `FastAPI TestClient` with the app lifespan replaced by a no-op.

| Test | Endpoint | Assertion |
|------|----------|-----------|
| `test_returns_200` | `GET /` | Status 200 |
| `test_response_contains_status` | `GET /` | `"healthy"` in response |
| `test_response_contains_message` | `GET /` | `"API is online"` in response |
| `test_returns_200` | `GET /which-main` | Status 200 |
| `test_identifies_main_file` | `GET /which-main` | `"main.py"` in message |

### `test_auth_routes.py` — Auth Route Validation

Verifies Pydantic validation returns 422 for malformed requests:

| Test | Endpoint | Input | Expected |
|------|----------|-------|----------|
| `test_missing_all_fields_returns_422` | `POST /api/auth/signup` | `{}` | 422 |
| `test_missing_password_returns_422` | `POST /api/auth/signup` | name + email only | 422 |
| `test_missing_email_returns_422` | `POST /api/auth/signup` | name + password only | 422 |
| `test_missing_name_returns_422` | `POST /api/auth/signup` | email + password only | 422 |
| `test_missing_all_fields_returns_422` | `POST /api/auth/login` | `{}` | 422 |
| `test_invalid_email_format_returns_422` | `POST /api/auth/login` | `"not-an-email"` | 422 |
| `test_short_password_returns_422` | `POST /api/auth/login` | `"short"` | 422 |

### `test_dependencies.py` — JWT Dependencies

Tests `get_current_user` and `get_optional_user` directly:

| Class | Test | Scenario |
|-------|------|----------|
| `TestGetCurrentUser` | `test_valid_token_returns_user_dict` | Valid JWT → user dict |
| | `test_invalid_token_raises_401` | Bad signature → HTTPException 401 |
| | `test_non_jwt_string_raises_401` | Plain string → 401 |
| | `test_expired_token_raises_401` | Expired → 401 |
| | `test_bearer_prefix_stripped` | `"Bearer <token>"` → works |
| | `test_wrong_secret_raises_401` | Different key → 401 |
| `TestGetOptionalUser` | `test_no_credentials_returns_none` | No header → None |
| | `test_valid_token_returns_user` | Valid JWT → user dict |
| | `test_invalid_token_returns_none` | Bad token → None (no error) |
| | `test_expired_token_returns_none` | Expired → None |

---

## Schema Validation Tests (`tests/schema_validation/`)

### `test_auth_schemas.py`

| Schema | Happy Path | Rejection Tests |
|--------|-----------|-----------------|
| `SignupModel` | Valid name+email+password | Blank name, short name, long name, short password, long password, invalid email |
| `LoginModel` | Valid email+password | Invalid email, short password, missing fields |
| `LoginTwoFactorModel` | Email + 6-char code | Short/long code, missing code |
| `EmailModel` | Valid email | Invalid email |
| `ResetModel` | Valid password | Empty password, long password |

### `test_source_schemas.py`

| Schema | Tests |
|--------|-------|
| `SourceStatus` enum | All 6 values verified as strings |
| `SourceType` enum | API, SCRAPING, BOTH |
| `PlatformStatus` enum | active, inactive |
| `SourceCreate` | Valid source, custom status, defaults, missing required fields |
| `SourceUpdate` | All-none defaults, partial update |
| `SyncStatusRequest` | Completed, default counts, failed with error |
| `SyncFrequencyRead` | Valid, with optional fields |

### `test_review_schemas.py`

| Schema | Tests |
|--------|-------|
| `PhotoModel` | Valid, default alt, missing src |
| `ReviewModel` | Valid, defaults (sentiment, language, status), photos, nullable text, AI metadata |
| `ReviewSummaryModel` | Valid summary |
| `PaginatedReviewResponse` | Empty and populated data |
| `ReplyGenerationRequest` | Valid, custom options, empty text rejection |
| `ReplyGenerationResponse` | Valid, with provider error |
| `BookingScrapeRequest` | Valid URL, headless override |

### `test_competitor_schemas.py`

| Schema | Tests |
|--------|-------|
| `CompetitorSourceInput` | Valid, missing fields |
| `AddCompetitorRequest` | Valid, default type, multiple sources, missing required fields |
| `EditCompetitorRequest` | Valid, missing fields |
| `TrackCompetitorRequest` | Valid, missing ID |
| `AddFromOrganizationRequest` | Valid, missing org ID |
| `ScrapeCompetitorRequest` | Default headless, override |

### `test_admin_schemas.py`

| Schema | Tests |
|--------|-------|
| `BroadcastCreate` | Valid, scheduled, empty subject/body, invalid channel/audience/message type, max length |
| `SecuritySettingsPayload` | Valid, boundary values (5–10080 min), default 2FA false |
| `SubscriptionPlanUpsertPayload` | Valid, all fields, negative price, invalid icon, all valid icons |
| `AdminUserCreatePayload` | Valid, all fields, invalid role/status, short password |
| `AdminUserUpdatePayload` | All-none defaults, partial update |
| `AdminPasswordChangePayload` | Valid, short new password, empty current password |
| `FeatureFlagUpdatePayload` | Enabled/Disabled, with limit, invalid status, zero limit |
| `GeneralSettingsPayload` | Valid, empty timezone rejection |
| `ReplyGenerationSettingsPayload` | Defaults, custom values |

### `test_group_schemas.py`

| Schema | Tests |
|--------|-------|
| `GroupSettings` | Defaults, custom values |
| `GroupCreate` | Minimal, all fields, missing name, with settings |
| `GroupUpdate` | All-none defaults, partial updates, full update |
| `InviteCreate` | Valid, with message, missing org ID |
| `MemberResponse` | Valid, nullable names |
| `InviteResponse` | Valid with all fields |
| `GroupResponse` | Valid with settings and counts |
| `GroupAnalytics` | Valid, nullable avg_rating |

---

## Shared Fixtures (`conftest.py`)

| Fixture | Purpose |
|---------|---------|
| `mock_db` | MagicMock SQLAlchemy Session (commit, rollback, close, flush, refresh) |
| `mock_current_user` | Regular Tenant user dict with user_id, role, organization_id |
| `mock_admin_user` | Admin user dict with user_id, role, no organization |
| `jwt_token_factory` | Factory that creates real signed JWT tokens for testing |
| `expired_jwt_token` | Pre-built expired JWT token |

---

## Test Results Summary

```
============================= test session starts =============================
tests/unit/           ... 156 passed
tests/integration/    ...  26 passed
tests/schema_validation/ ... 146 passed
====================== 328 passed, 20 warnings ======================
```

All **328 tests pass** with 0 failures, 0 errors.


## To Run Again

```

cd backend
python -m pytest tests/unit/ tests/integration/ tests/schema_validation/ -v

```
