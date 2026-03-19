# Google Maps Reviews Scraper Module

> **Status:** Production

## Overview

Platform plugin for extracting reviews from Google Maps place listings. Uses a **persistent authenticated Playwright profile** with infinite scroll pagination to bypass Google's sign-in requirements for accessing reviews.

## Files

| File | Purpose |
|------|---------|
| `browser.py` | Playwright launch with persistent Chrome profile (`chrome_profile/`) for maintaining Google sign-in |
| `config.py` | CSS selectors for Google Maps review elements (review cards, star ratings, text, images, sort button) |
| `extractor.py` | DOM parsing — extracts author, rating (from aria-label star count), text, date, author badge (Local Guide, etc.), photos, and owner replies |
| `logic.py` | Orchestrator — navigates to URL, clicks Reviews tab (with 4 strategies including auto sign-in fallback), scrolls review panel to load all reviews, extracts batches |
| `models.py` | `save_reviews_to_db()` — saves reviews directly linked to a `source_id`; upserts into `reviews` + `google_reviews` + `review_media` |
| `storage.py` | JSON file output for debugging/backup |

## Prerequisites

### Google Account Setup

Google Maps requires sign-in to access all reviews. Set credentials in `.env`:

```env
GOOGLE_EMAIL=your_email@gmail.com
GOOGLE_PASSWORD=your_password
```

### Persistent Profile Setup

Run the profile setup script once to create an authenticated Chrome profile:

```bash
python tests/setup_google_profile.py
```

This creates `platforms/google/chrome_profile/` which Playwright reuses for all subsequent scrapes.

## Technical Notes

- **4-Strategy Tab Click:** The `click_reviews_tab()` function tries 4 different strategies to click the Reviews tab:
  1. Direct CSS selector click
  2. JavaScript `click()` invocation
  3. XPath-based fallback
  4. **Auto sign-in** — if review cards aren't visible, detects if Google sign-in is needed, logs in using `.env` credentials, and retries

- **Infinite Scroll:** Google Maps uses virtual scroll for reviews. The scraper scrolls the review panel container, waits for new review cards to load, and continues until no more reviews appear.

- **Anti-Detection:** Playwright runs with persistent context (real cookies, localStorage) and anti-automation flags to avoid Google's bot detection.

- **URL Handling:** Accepts both full Google Maps URLs and short `maps.app.goo.gl` links (auto-resolved by Playwright navigation).

## Database Mapping

Reviews are saved to the unified schema:
- Common fields → `reviews` table (rating, author, text, date, reply)
- Google-specific → `google_reviews` subtype (author_badge, place_url)
- Photos → `review_media` table

## Updating Selectors

Google Maps frequently updates its UI. When reviews stop loading, update `config.py` selectors. Key areas: review container, individual review cards, star rating aria-labels, and "More" button for truncated text.
