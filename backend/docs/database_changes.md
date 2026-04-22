# Database Audit & Changes Report

This document records any schema modifications performed by the AI assistant during the system audit and repair session on April 09, 2026.

## Summary of Schema Changes
**No tables were added or modified (DDL) during this session.**

The system's database schema remained intact. The primary work focused on restoring **connectivity** and **data handle integrity** rather than modifying the underlying structures.

---

## Current `processed_review` Schema
For reference, here is the current structure of the primary data table as verified during the audit:

| Column Name | Data Type | Purpose |
| :--- | :--- | :--- |
| `id` | `uniqueidentifier` | Primary key / Internal UUID |
| `platformReviewId` | `varchar` | Unique ID from the source platform |
| `organization_id` | `uniqueidentifier` | Link to tenant/org |
| `platform_id` | `int` | Platform reference (Agoda, Booking, etc.) |
| `rating` | `int` | Numeric rating score |
| `reviewerName` | `varchar` | Author name |
| `text` | `varchar` | Raw review content |
| `summary` | `varchar` | AI-generated summary |
| `sentiment` | `varchar` | Sentiment label (Positive/Neutral/Negative) |
| `sentiment_score`| `float` | AI-calculated sentiment score |
| `language` | `varchar` | Detected review language |
| `categories` | `varchar` | AI-extracted classification categories (JSON list) |
| `keyPhrases` | `varchar` | AI-extracted key phrases (JSON list) |
| `reviewDate` | `datetime2` | Original platform review date |
| `scrapedAt` | `datetime2` | Timestamp of ingestion |
| `status` | `varchar` | Processing status (pending/processed/failed) |
| `ai_reply` | `varchar` | AI-drafted response |
| `positive_text` | `nvarchar` | Segmented positive highlights |
| `negative_text` | `nvarchar` | Segmented negative highlights |
| `error_message` | `nvarchar` | Error log for processing failures |
| `retry_count` | `int` | Current attempt count for AI processing |
| `last_attempt` | `datetime2` | Last processing timestamp |
| `source_id` | `uniqueidentifier` | Link to scraping source |

---

## Infrastructure Fixes (Database-Related)
While no tables were changed, the following critical configuration changes were made to enable the database to function:

1.  **Connection Parameter Adjustment:** Added `Encrypt=no;` to the connection strings. The database server was rejecting connections from the backend because it was not using the correct SSL/Encryption handshake.
2.  **NULL Compliance:** Updated the repository layer to handle `NULL` values in fields like `sentiment` and `language`. Previously, if a database row had a `NULL` value, the entire application would crash due to validation errors.
3.  **JSON Parsing Integration:** Implemented automatic `json.loads` for the `categories` and `keyPhrases` columns to allow the frontend to read these as native lists.

---
*Last Audit performed by Antigravity AI on 2026-04-09.*
