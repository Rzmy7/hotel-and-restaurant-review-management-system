# Embedding Service Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the **Embedding Service** microservice — a FastAPI application that manages text embeddings via SentenceTransformer (MiniLM) and ChromaDB for vector storage.

| Category | Directory | Tests | Purpose |
|----------|-----------|-------|---------|
| **Unit Tests** | `tests/unit/` | 60 | Config, embedding, ChromaDB, job tracking |
| **Integration Tests** | `tests/integration/` | 44 | All API endpoints via TestClient |
| **Schema Validation** | `tests/schema_validation/` | 38 | Pydantic request model boundaries |
| **Total** | | **142** | |

All tests run **without a live ML model or persistent ChromaDB** — the SentenceTransformer model and ChromaDB collection are mocked.

---

## Prerequisites

### Dependencies

```bash
# Using the service's venv (recommended)
venv\Scripts\pip.exe install pytest httpx
```

### Running Tests

```bash
# Run all tests (use the venv Python)
venv\Scripts\python.exe -m pytest tests/ -v

# Run by category
venv\Scripts\python.exe -m pytest tests/unit/ -v                    # Unit tests only
venv\Scripts\python.exe -m pytest tests/integration/ -v             # Integration tests only
venv\Scripts\python.exe -m pytest tests/schema_validation/ -v       # Schema tests only

# Run a specific test file
venv\Scripts\python.exe -m pytest tests/unit/test_config.py -v

# Run with coverage
venv\Scripts\python.exe -m pytest tests/ --cov=app --cov-report=term-missing
```

---

## Test Directory Structure

```
microservices/embedding-service/tests/
├── conftest.py                          # Shared fixtures (mock model, mock collection, temp files)
├── unit/
│   ├── __init__.py
│   ├── test_config.py                   # Config load/save, thresholds, pause state
│   ├── test_embedding.py               # embed_text() with mocked SentenceTransformer
│   ├── test_chroma.py                  # save_embedding() ChromaDB integration
│   └── test_jobs.py                    # Job tracking (add, update, get_recent)
├── integration/
│   ├── __init__.py
│   └── test_routes.py                  # All 15 API endpoints via TestClient
└── schema_validation/
    ├── __init__.py
    └── test_schemas.py                 # Pydantic model accept/reject tests
```

---

## Unit Tests (`tests/unit/`)

### `test_config.py` — Configuration Management (28 tests)

Tests `app.config` — threshold loading/saving, query-based threshold selection, and service pause state.

| Class | Tests | What it verifies |
|-------|-------|-----------------|
| `TestDefaultThresholds` | 5 | Default constants (oneWord=1.3, twoWords=1.2, threeOrMore=1.1) |
| `TestFullConfig` | 6 | File creation, loading, corrupt JSON handling, save/load roundtrip |
| `TestThresholdConfig` | 3 | Threshold-only save/load, isPaused preservation |
| `TestGetThresholdByQuery` | 6 | Word count → threshold mapping (1 word, 2 words, 3 words, 4+ words, custom) |
| `TestServicePauseState` | 5 | Pause/resume toggling, threshold preservation during pause |

### `test_embedding.py` — Text Embedding (8 tests)

Tests `app.embedding.embed_text()` with mocked SentenceTransformer model.

| Test | What it verifies |
|------|-----------------|
| `test_returns_list` | Output is a Python list (not numpy array) |
| `test_returns_384_dimensions` | MiniLM produces 384-dimensional vectors |
| `test_all_elements_are_floats` | Every element is a float |
| `test_different_texts_call_model` | Model's encode called for each text |
| `test_empty_string_still_works` | Empty string produces a valid vector |
| `test_long_text_still_works` | Very long text produces a valid vector |
| `test_unicode_text` | Unicode characters don't crash |
| `test_model_called_with_correct_text` | Exact input text passed to model.encode() |

### `test_chroma.py` — ChromaDB Integration (7 tests)

Tests `app.chroma.save_embedding()` with mocked ChromaDB collection.

| Test | What it verifies |
|------|-----------------|
| `test_calls_collection_add` | Correct args passed to collection.add() |
| `test_wraps_id_in_list` | review_id wrapped in list for ChromaDB |
| `test_wraps_embedding_in_list` | Embedding vector wrapped in list |
| `test_wraps_metadata_in_list` | Metadata dict wrapped in list |
| `test_document_none_passes_none` | None document → documents=None |
| `test_document_provided_passes_list` | String document → documents=["text"] |
| `test_rule_type_metadata` | Rule embeddings have type="rule" |

### `test_jobs.py` — Job Tracking (17 tests)

Tests `app.jobs` — job add/update/retrieval with file persistence.

| Class | Tests | What it verifies |
|-------|-------|-----------------|
| `TestAddJob` | 8 | Job creation, timestamp, ID formatting, persistence, accumulation |
| `TestUpdateJob` | 5 | Status/progress update, auto-duration on complete/fail, no crash on missing ID |
| `TestGetRecentJobs` | 6 | Ordering (most recent first), limit, timestamp formatting, pause interaction, immutability |

---

## Integration Tests (`tests/integration/`)

### `test_routes.py` — All API Endpoints (44 tests)

Tests every endpoint via FastAPI `TestClient` with mocked model and ChromaDB.

| Class | Endpoint | Tests | What it verifies |
|-------|----------|-------|-----------------|
| `TestEmbedEndpoint` | `POST /embed` | 5 | Success, missing fields (422) |
| `TestBatchEmbedEndpoint` | `POST /embed/batch` | 3 | Batch success, empty reviews, missing source_id |
| `TestEmbedRuleEndpoint` | `POST /embed/rule` | 2 | Rule embed success, missing text |
| `TestBatchRuleEmbedEndpoint` | `POST /embed/rule/batch` | 2 | Batch rules, empty rules |
| `TestSearchEndpoint` | `POST /search` | 6 | Structure, query echo, top_k, multiple sources, missing query |
| `TestThresholdsEndpoints` | `GET/PUT /thresholds`, `POST /thresholds/reset` | 5 | Get, update, invalid range, negative values, reset |
| `TestJobsEndpoint` | `GET /jobs/recent` | 3 | Empty jobs, after embed, limit param |
| `TestServicePauseEndpoints` | `POST /service/pause`, `/resume`, `GET /service/status` | 4 | Pause, resume, status running/paused |
| `TestHealthEndpoint` | `GET /health` | 5 | 200, required fields, status, CPU/RAM numeric |
| `TestDatabaseStatsEndpoint` | `GET /database/stats` | 6 | 200, all fields, namespace, index type, dimensions, healthy |
| `TestDatabaseClearEndpoint` | `POST /database/clear` | 1 | Success response |
| `TestDeleteBySourceEndpoint` | `DELETE /delete/source/{id}` | 2 | Success, source_id in message |

---

## Schema Validation Tests (`tests/schema_validation/`)

### `test_schemas.py` — All Pydantic Models (38 tests)

| Class | Schema | Tests | What it verifies |
|-------|--------|-------|-----------------|
| `TestReviewSchema` | `Review` | 6 | Valid, missing fields, empty/long text |
| `TestReviewItemSchema` | `ReviewItem` | 3 | Valid, missing fields |
| `TestBatchEmbedRequestSchema` | `BatchEmbedRequest` | 5 | Valid batch, empty, missing fields, large batch |
| `TestSearchRequestSchema` | `SearchRequest` | 6 | Valid, custom top_k, multiple sources, missing fields |
| `TestRuleSchema` | `Rule` | 4 | Valid, missing fields |
| `TestRuleItemSchema` | `RuleItem` | 2 | Valid, missing fields |
| `TestBatchRuleEmbedRequestSchema` | `BatchRuleEmbedRequest` | 4 | Valid, empty, missing fields |
| `TestThresholdConfigSchema` | `ThresholdConfig` | 8 | Valid, floats, missing fields, zero/high values |

---

## Shared Fixtures (`conftest.py`)

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `mock_embedding_model` | autouse | Replaces SentenceTransformer with deterministic mock (384-dim vectors) |
| `mock_collection` | function | MagicMock ChromaDB Collection with count/get/query stubs |
| `temp_config_file` | function | Temporary config.json with default thresholds |
| `temp_jobs_file` | function | Temporary empty jobs.json |

---

## Test Results Summary

```
============================= test session starts =============================
tests/unit/               ...  60 passed
tests/integration/         ...  44 passed
tests/schema_validation/   ...  38 passed
====================== 142 passed, 2 warnings ======================
```

All **142 tests pass** with 0 failures, 0 errors.

## Running All Tests

```
cd microservices/embedding-service
venv\Scripts\python.exe -m pytest tests/ -v
```