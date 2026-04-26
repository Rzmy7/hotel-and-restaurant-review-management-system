# Academic Refactoring Roadmap: Achieving 100/100 on Assessment Rubric

## Executive Summary
This document serves as a strict, phased action plan to transition the existing codebase from its current functional state to a meticulously structured, academic-grade submission. The primary constraint—**preserving all existing functionality and business logic**—will be strictly maintained. Following the latest integrations (including the `admin-frontend`, review repository overhauls, and new internal auth logic), the codebase requires focused cleanup to address raw SQL usage, lingering test scripts, and monolithic data functions to achieve maximum points (100/100) across all rubric sections.

---

## Phase 1: Housekeeping (Code Formatting, Naming & Dead Code) [COMPLETED]
*Targeting Rubric Sections A1 & A2 (Alignments & Naming)*

**Objectives:**
- Enforce strict indentation (e.g., 2 spaces for JS/TS, 4 spaces for Python).
- Standardize naming conventions: `camelCase` for TS/JS variables and functions, `PascalCase` for React components/classes, `snake_case` for Python methods/variables.
- Eliminate all commented-out dead code, unused imports, and lingering manual testing files.

**Action Items:**
1. **Remove Dead Testing Code:**
   - Immediately delete `backend/test_route.py` and `backend/test_route2.py`. These contain manual `TestClient` scripts and hardcoded UUIDs (`781c6c67...`) which will fail academic review for leaving scratchpad code in the main branch.
2. **Frontend & Admin-Frontend Formatting:**
   - Run Prettier across `frontend/src/`, `admin-frontend/src/`, and the newly added `frontend/server.js`.
   - Ensure new contexts like `admin-frontend/src/contexts/ThemeContext.tsx` perfectly adhere to `PascalCase` naming for the file and component.
3. **Backend Formatting:**
   - Run Black formatter to unify Python alignments, specifically targeting the newly added `backend/app/modules/auth/utils/internal_auth.py` and `backend/app/modules/reviews/repository.py`.

---

## Phase 2: Decoupling, Constants, & ORM Migration [COMPLETED]
*Targeting Rubric Sections A4 & A5 (No Hardcoding, Separation of Concerns)*

**Objectives:**
- Eliminate "magic numbers" and hardcoded strings (e.g., URL endpoints, role names, default limits).
- Enforce a strict layered architecture (Routes -> Controllers -> Services -> Repositories).
- Replace raw SQL string interpolations with secure SQLAlchemy ORM queries.

**Action Items:**
1. **Refactor Monolithic Repositories:**
   - **`backend/app/modules/reviews/repository.py`:** This file is currently monolithic. Functions like `fetch_all_reviews_enriched` mix database extraction, complex JSON parsing, and HTTP requests to the embedding service. **Action:** Decouple the HTTP call to `EMBEDDING_SERVICE_URL` into a dedicated service layer, leaving the repository strictly responsible for database retrieval.
2. **Migrate Raw SQL to ORM:**
   - The same `repository.py` contains raw `pyodbc` queries (e.g., `SELECT TOP {limit} ... FROM dbo.processed_review`). Convert `upsert_review_pending`, `get_pending_batch`, and `get_processing_metrics` to use SQLAlchemy models to ensure type safety and prevent SQL injection risks.
3. **Extracting Hardcoded Values:**
   - **Frontend:** Extract hardcoded API routes and default pagination limits from `admin-frontend/src/pages/Scraping.tsx` and `frontend/src/services/reviewsService.ts` into a centralized `constants.ts`.

---

## Phase 3: Robustness & Testing Readiness [COMPLETED]
*Targeting Rubric Sections C1, C2, C3, & C4 (Data Types, Testing, Modifiability, Error Handling)*

**Objectives:**
- Ensure 100% strict typing (remove `any` in TypeScript, ensure Python type hints).
- Decouple functions for "Testing Readiness" (pure functions, dependency injection).
- Implement centralized error handling and strict input validation.

**Action Items:**
1. **Strict Data Typing (C1):**
   - **Frontend:** Audit all `*.ts` and `*.tsx` files. Specifically target files like `frontend/server.js` (convert to TS if possible, or add strict JSDoc types) and the new `admin-frontend` API clients.
   - **Backend:** Ensure all FastAPI endpoints and service functions have strict Pydantic return models. In `repository.py`, replace `Dict` and `List[dict]` returns with typed Pydantic schemas.
2. **Testing Readiness & Pure Functions (C2):**
   - Refactor heavy functions in the `Scraper Engine` (`microservices/scraper_engine/`) into smaller, easily testable "pure functions".
3. **Error Handling & Validation (C4):**
   - **Global Error Handling:** Replace the raw file logging in `repository.py` (`with open("db_error_dump.log", "a")`) with a standardized, system-wide Python `logging` configuration or structured exception handling. Writing raw logs to the filesystem bypasses standard telemetry and violates academic best practices for production error tracking.

---

## Phase 4: Academic Documentation [COMPLETED]
*Targeting Rubric Section A3 (Comments) & Section B (System Contribution)*

**Objectives:**
- Prove deep technical understanding through strategic, high-quality comments.
- Explain the *why* behind complex algorithms and design choices.

**Action Items:**
1. **File-Level Documentation:**
   - Add brief header comments to newly added files like `backend/app/database/scripts/optimize_indexes.sql` explaining their impact on query performance.
2. **Function-Level Documentation (JSDoc / Docstrings):**
   - **Frontend:** Add JSDoc comments to all shared components, especially new ones like `ThemeContext.tsx`.
   - **Backend:** Expand Python Docstrings (Google or Sphinx style) in the newly restructured `repository.py` methods.
3. **Highlighting Complexity (System Contribution):**
   - Leave detailed inline comments in algorithmically complex areas (like the vector search integration inside `fetch_all_reviews_enriched`) to ensure the evaluator recognizes the advanced engineering effort and cross-service communication.

---


---

## Phase 5: Formatting, Linting & Final Cleanup [COMPLETED]
*Targeting Rubric Sections A1, A2, A3, & C4*

**Objectives:**
- System-wide automated formatting.
- Deleting all temporary scratch files and logs.
- Final dependency audit and requirements cleanup.

**Action Items:**
1. **Automated Formatting:**
   - Ran `black` on all Python modules (Backend & Scraper Engine).
   - Ran `prettier` on all Frontend components (Admin & User).
2. **Scratch File Removal:**
   - Deleted `backend/scratch/` and root `.log` files.
3. **Dependency Check:**
   - Updated `backend/requirements.txt` with missing dependencies (e.g., `python-json-logger`).

---

## Phase 6: Handover & Documentation Finalization [COMPLETED]
*Targeting Rubric Section B (System Contribution) & Section C3 (Modifiability)*

**Objectives:**
- Ensure the project is 100% "Plug-and-Play" for the evaluator.
- Create a high-level technical summary of the refactor.

**Action Items:**
1. **README Optimization:**
   - Updated main `README.md` to highlight the new phased architecture and testing suite.
2. **Technical Summary:**
   - Created `REFACTOR_SUMMARY.md` documenting the transition from raw SQL/Monolithic to ORM/Layered architecture.
3. **Final Startup Verification:**
   - Verified that the system initializes cleanly after fixing terminal encoding issues.


---

## Phase 7: Repository Hygiene & Professionalization [COMPLETED]
*Targeting Rubric Sections A1 & A5*

**Objectives:**
- Remove developer-specific artifacts and scratch scripts.
- Optimize `.gitignore` for industry standards.
- Ensure the repository root is clean and professional.

**Action Items:**
1. **Script Cleanup:**
   - Deleted `scraper_engine/scripts/debug/` and `maintenance/` folders.
2. **Global .gitignore Optimization:**
   - Standardized and consolidated ignores into a professional template.
3. **Audit Tracking:**
   - Verified that no sensitive or junk files are committed via `git ls-files`.

---

## 🏁 Final Submission Readiness
The project is now fully modernized, documented, and formatted to achieve a perfect 100/100 score. All business logic remains intact while the underlying engineering has been elevated to institutional standards.
