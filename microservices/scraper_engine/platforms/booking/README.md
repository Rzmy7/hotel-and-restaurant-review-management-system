# Booking.com Reviews Scraper Module

> **Status:** Production

## Overview

Platform plugin for extracting reviews from Booking.com hotel properties. Uses Playwright with Chromium to navigate review sections, extract structured data including separate positive/negative text fields, and save to the unified database schema.

## Files

| File | Purpose |
|------|---------|
| `browser.py` | Playwright launch config with `--disable-blink-features=AutomationControlled` to bypass anti-bot detection |
| `config.py` | CSS selectors using Booking.com's `[data-testid]` attribute system |
| `extractor.py` | DOM parsing — extracts score, title, positive/negative text, nationality, traveler type, stay date, nights, room name, and user-uploaded images |
| `logic.py` | Orchestrator — navigates to review URL, handles pagination, extracts per page, saves batches |
| `models.py` | `save_reviews_to_db()` — resolves/creates Organization + OrganizationSource, upserts into `reviews` + `booking_reviews` + `review_media` |
| `storage.py` | JSON file output for debugging/backup |

## Technical Notes

- **Anti-Bot Bypass:** Overrides Chromium Blink automation flags to avoid detection. Booking.com actively blocks automated browsers without this.
- **Data-TestId Traversal:** Booking.com uses React `data-testid` attributes extensively. The extractor relies on these instead of brittle CSS class selectors.
- **Image Extraction:** Uses mouse `.hover()` and `.click()` sequences on review card thumbnail galleries to reveal full-resolution image URLs.
- **Separate Positive/Negative Text:** Booking.com reviews have distinct positive and negative text fields. Both are stored in the `booking_reviews` subtype table. The combined text is also stored in the `reviews` supertype as `review_text` with `[+]`/`[-]` prefixes.

## Database Mapping

Reviews are saved to the unified schema:
- Common fields → `reviews` table (score as rating, author, title, combined text, posted_date, reply)
- Booking-specific → `booking_reviews` subtype (nationality, positive_txt, negative_txt, stay_date, num_of_nights, traveler_type, room_name)
- Photos → `review_media` table

## Updating Selectors

When Booking.com changes its DOM, update `config.py`. The `[data-testid]` selectors tend to be more stable than class-based selectors.
