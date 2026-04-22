# API Refactoring & Cleanup Plan

This document identifies redundant, unnecessary, or "spamming" API endpoints that should be removed or consolidated to clean up the backend.

## 1. Redundant Authentication Routes
There is significant duplication in the `app/modules/auth/routes/` directory.

### Current State:
- `app/modules/auth/routes/auth_routes.py`: Contains Signup, Login, Forgot Password, Reset Password, SMTP Test, and Session Check.
- `app/modules/auth/routes/oauth_routes.py`: Contains Google Login and Callback.
- **AND** the modular files (currently unused in `main.py` but present):
    - `signup.py`
    - `login.py`
    - `oauth.py`
    - `password.py`
    - `session.py`

### Recommendation:
- **Keep** the modular files (`signup.py`, `login.py`, etc.) as they follow a cleaner project structure.
- **Delete** `auth_routes.py` and `oauth_routes.py`.
- **Update** `app/main.py` to use the router from `app/modules/auth/routes/__init__.py`.

---

## 2. Duplicate Scraper Endpoints
Scraping logic is scattered across several locations.

### Current State:
- `app/main.py`: Has `@app.post("/scrape/booking")`.
- `app/modules/reviews/routes/scraping.py`: Has `@router.post("/scrape/booking")`.
- `app/modules/competitors/routes/scraping.py`: Has specific competitor scraping.

### Recommendation:
- **Remove** `@app.post("/scrape/booking")` from `app/main.py`.
- Consolidate all scraping triggers under the `reviews` or `scraper` module.

---

## 3. Debug & Development Endpoints
Several endpoints are used for debugging and should not be in the production API surface.

### Identified Endpoints:
- `GET /which-main`: In `app/main.py`. Only returns which file is running.
- `GET /db-test`: In both `app/main.py` and `app/core/health.py`.
- `GET /api/test-smtp`: In `app/modules/auth/routes/auth_routes.py`.
- `DELETE /api/delete_reviews`: In `app/modules/reviews/routes/reviews.py`. (DANGEROUS)
- `GET /api/reviews_count`: Redundant if included in `/api/reviews/stats`.

### Recommendation:
- **Remove** `/which-main`.
- **Consolidate** `/db-test` into a single health check or remove it from the public API.
- **Move** `/api/test-smtp` to a CLI script or admin-only utility.
- **Protect or Remove** `/api/delete_reviews`.

---

## 4. Legacy Routers
### Current State:
- `app/main.py` includes `legacy_source_router` from `app/modules/source/routers`.
- `app/modules/source/routers/test_routers.py` exists with a simple `GET /`.

### Recommendation:
- **Remove** `legacy_source_router` if the new `org_source_router` replaces its functionality.
- **Delete** `app/modules/source/routers/test_routers.py`.

---

## 5. Overlapping Organization Routes
### Current State:
- `app/modules/organization/routes/organization_routes.py`
- `app/modules/organization/routes/user_organization_routes.py`
- `app/modules/organization/routes/source_routes.py`

While these are modular, some logic overlaps (e.g., getting a list of organizations).

### Recommendation:
- Consolidate "Get Organizations" into a single well-defined endpoint.
- Ensure `POST /organizations/{tenant_id}` and `PATCH /organizations/{org_id}` use consistent schemas.

---

## 6. Global Root Endpoints in `main.py`
Several endpoints are defined directly on the `app` object in `main.py` instead of using routers.

### Recommendation:
- Move `GET /reviews` and `GET /scrape/booking` out of `main.py` into their respective modules.
- `main.py` should ideally only contain the FastAPI initialization, middleware, and router registrations.
