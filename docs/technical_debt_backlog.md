# Technical Debt Backlog

This document tracks accumulated technical debt relating to internal system architecture, authentication, and inter-service configurations discovered during the Phase 2 Authentication Migration.

## Pending Architecture Debt

### 1. Hardcoded HTTP Timeouts
* **Location:** `backend/app/modules/source/services/embedding_client.py`, `microservices/scraper_engine/api/main.py`, etc.
* **Issue:** `timeout=10.0` and `timeout=120.0` parameters are hardcoded inside `requests` and `httpx` invocations.
* **Resolution:** Move all timeouts to environment variables governed by `app.core.config`.
* **Priority:** Medium

### 2. Manual Router-Level Dependency Injection
* **Location:** `microservices/scraper_engine/api/endpoints/*.py`
* **Issue:** `Depends(verify_internal_request)` is manually applied to individual functions (e.g. `def trigger_agoda_scrape(...)`). If a new endpoint is added to the router, a developer might forget to apply the dependency, leaving it exposed.
* **Resolution:** Refactor routers to apply dependencies globally during the `APIRouter()` instantiation: `APIRouter(dependencies=[Depends(verify_internal_request)])`.
* **Priority:** High

### 3. Legacy Secret Deprecation
* **Location:** Ecosystem-wide `.env` configurations.
* **Issue:** `INTERNAL_API_KEY` is still supported by all services as a fallback for backward compatibility. While functionally safe, it leaves a technical artifact and conceptual gap in fully separating trust zones.
* **Resolution:** Complete Phase 3 Migration. Ensure all CI/CD deployment pipelines explicitly inject the granular keys (`BACKEND_API_KEY`, etc.), verify logs for zero usage of the fallback key, and then formally remove `INTERNAL_API_KEY` from the code logic.
* **Priority:** Low (Functionally stable, cleanup task)

### 4. Admin Frontend Static Keys
* **Location:** `admin-frontend/src/services/monitoringService.ts`
* **Issue:** The React/Vite Admin Frontend exposes its `VITE_EMBEDDING_API_KEY` to the browser memory to communicate directly with the Embedding Service. Because it's an internal admin tool, this is acceptable locally, but poses a minor risk if publicly hosted.
* **Resolution:** Route Admin Frontend calls to the Embedding Service through the Main Backend using JWT authentication, removing the need for the Admin Frontend to hold internal service API keys.
* **Priority:** High (Before internet exposure)
