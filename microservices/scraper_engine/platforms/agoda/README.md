# Agoda Reviews Scraper Module

> **Status:** Production

## Overview

Platform plugin for extracting reviews from Agoda hotel properties. Uses Playwright with Chromium to navigate paginated review sections, extract structured data, and save to the unified database schema.

## Files

| File | Purpose |
|------|---------|
| `browser.py` | Playwright launch configuration (headless mode, viewport, anti-detection args) |
| `config.py` | CSS selectors and DOM locators for Agoda's review UI (tab selectors, review cards, pagination buttons) |
| `extractor.py` | DOM parsing logic — extracts rating, author, nationality, text, heading, dates, room type, traveler type, images from review cards |
| `logic.py` | Main orchestrator — navigates to URL, clicks Agoda reviews tab (bypasses embedded Booking.com reviews), handles pagination, calls extractor per page, saves batches to DB |
| `models.py` | `save_reviews_to_db()` — saves reviews directly linked to a `source_id`; upserts into unified `reviews` + `agoda_reviews` + `review_media` tables |
| `storage.py` | JSON file output for debugging/backup |

## Technical Notes

- **Tab Selection:** Agoda pages embed both Agoda and Booking.com reviews. The logic uses JavaScript `click()` invocations directly on the Agoda reviews tab DOM element to bypass React event listeners.
- **Anti-Bot Bypass:** `Escape` key sequences flush popup overlays (date pickers, login modals) before interacting with review elements.
- **Unicode Handling:** All text columns use `Unicode()` / `UnicodeText()` (SQL Server `NVARCHAR`) to preserve international characters (Cyrillic, CJK, emojis).
- **Pagination:** Supports explicit page targets (`"5"` for pages 1-5), ranges (`"3-6"`), or all pages (`"*"`).

## Database Mapping

Reviews are saved to the unified schema:
- Common fields → `reviews` table (rating, author, text, title, date, reply)
- Agoda-specific → `agoda_reviews` subtype (nationality, stayed_dates, traveler_type, room_type)
- Images → `review_media` table

## Updating Selectors

When Agoda changes its DOM structure, update the CSS selectors in `config.py`. Key selectors include review card containers, pagination buttons, and the Agoda-specific review tab.
