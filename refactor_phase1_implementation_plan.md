# Implementation Plan - Phase 1: Housekeeping

This plan addresses the first phase of the Academic Refactor: cleaning up the codebase, enforcing naming conventions, and establishing consistent formatting to meet academic standards.

## User Review Required

> [!IMPORTANT]
> This phase involves deleting several files identified as "scratch" or "dead code". Please verify that none of these are currently in use for ongoing development tasks.

> [!WARNING]
> Automated formatting (Prettier/Black) will touch a large number of files. Ensure you have a clean git state before I execute these commands.

## Proposed Changes

### Dead Code & Script Cleanup

#### [DELETE] [test_route.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/test_route.py)
#### [DELETE] [test_route2.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/test_route2.py)
#### [DELETE] [_migrate_org_location.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/_migrate_org_location.py) (One-off migration script in root)
#### [DELETE] [backend/app/test/main.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/app/test/main.py) (Monolithic testing script)
#### [DELETE] [backend/app/test/analyzed_data_frontend.json](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/app/test/analyzed_data_frontend.json)

### Log Cleanup
- Remove local log files from the repository tracking (they should be gitignored):
  - `backend/backend_error.log`
  - `backend/db_error_dump.log`
  - `backend/ingest_debug.log`

### Formatting & Naming Standardization

#### [MODIFY] [ThemeContext.tsx](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/admin-frontend/src/contexts/ThemeContext.tsx)
- Ensure the component and exported types follow strict PascalCase.

#### [COMMAND] Frontend Formatting
- Run Prettier to unify indentation and styling across all frontend applications.
- `npx prettier --write "frontend/src/**/*.{ts,tsx,css}" "admin-frontend/src/**/*.{ts,tsx,css}" "frontend/server.js"`

#### [COMMAND] Backend Formatting
- Run Black to enforce PEP 8 compliance on key backend files.
- `python -m black backend/app/modules/auth/utils/internal_auth.py backend/app/modules/reviews/repository.py`

## Verification Plan

### Automated Checks
- Run `git status` to verify file deletions.
- Run `npm run lint` in `frontend` and `admin-frontend` to ensure formatting didn't break linting rules.
- Run `flake8` or `pylint` on modified backend files.

### Manual Verification
- Verify that the applications still start correctly after formatting:
  - `npm run dev` in `frontend`
  - `npm run dev` in `admin-frontend`
  - FastAPI backend health check: `http://localhost:8000/health`
