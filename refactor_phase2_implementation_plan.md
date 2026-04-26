# Implementation Plan - Phase 2: Decoupling, Constants, & ORM Migration

This plan addresses the second phase of the Academic Refactor: eliminating hardcoded values, enforcing a clean layered architecture, and migrating legacy raw SQL to SQLAlchemy ORM.

## User Review Required

> [!IMPORTANT]
> This phase involves migrating critical data retrieval logic in `backend/app/modules/reviews/repository.py`. I will ensure that the SQL logic remains identical during the transition to SQLAlchemy ORM.

> [!CAUTION]
> Moving HTTP calls out of the repository layer into a service layer will change internal function signatures. I will update all callers to ensure the system remains functional.

## Proposed Changes

### 1. Centralizing Constants

#### [NEW] [frontend/src/config/constants.ts](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/config/constants.ts)
- Define default pagination limits (e.g., `DEFAULT_PAGE_SIZE = 15`).
- Define fallback values (e.g., `ANONYMOUS_USER = "Anonymous"`, `DEFAULT_LANGUAGE = "English"`).

#### [NEW] [admin-frontend/src/config/constants.ts](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/admin-frontend/src/config/constants.ts)
- Similar to frontend, extract magic numbers and strings from pages like `Scraping.tsx` and `Settings.tsx`.

### 2. Backend Layered Architecture Enforcement

#### [NEW] [backend/app/modules/reviews/services/embedding_service.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/app/modules/reviews/services/embedding_service.py)
- Move the `httpx` logic for vector search out of `repository.py` and into this new service.

#### [MODIFY] [backend/app/modules/reviews/repository.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/app/modules/reviews/repository.py)
- **Remove Raw SQL:** Convert functions like `upsert_review_pending`, `get_pending_batch`, and `get_processing_metrics` to use SQLAlchemy models (`ProcessedReview`, `Source`, etc.).
- **Remove Service Logic:** Remove the embedding search logic and `httpx` imports.
- **ORM Optimization:** Ensure `joinedload` or `selectinload` is used for relationship fetching to avoid N+1 issues.

### 3. Frontend Service Refactoring

#### [MODIFY] [frontend/src/services/reviewsService.ts](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/services/reviewsService.ts)
- Replace inline literals with constants from `src/config/constants.ts`.
- Ensure strict return types for the `mapReview` function.

## Verification Plan

### Automated Tests
- Run `pytest backend/tests/` to ensure database operations still work correctly.
- Verify that the `EMBEDDING_SERVICE_URL` is correctly resolved from environment variables.

### Manual Verification
- Test the reviews page in the frontend to ensure pagination, filtering, and search (including embedding search) still work.
- Test the scraping dashboard in the admin frontend to ensure statistics are loading correctly.
- Check backend logs to ensure no SQL syntax errors or N+1 query warnings are present.
