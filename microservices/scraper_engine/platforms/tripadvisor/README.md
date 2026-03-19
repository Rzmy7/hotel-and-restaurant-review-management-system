# TripAdvisor Reviews Scraper Module

> **Status:** Production-Ready

## Overview

Platform plugin for extracting reviews from TripAdvisor hotel and place listings. Uses Playwright with Chromium to navigate review sections, handle "Read more" expansions, and extract structured data into the unified database schema.

## Key Features

- **Automated Pagination**: Handles TripAdvisor's URL-offset pagination pattern (`-or10-`, `-or20-`, etc.).
- **Dynamic Content Handling**: Automatically clicks "Read more" buttons to ensure full review text is captured.
- **Rich Data Extraction**:
    - Star ratings (parsed from SVG bubbles)
    - Reviewer origin and trip type
    - Management responses
    - Reviewer-uploaded photos
- **Unified Schema Integration**: Automatically maps TripAdvisor data to the `reviews` supertype and `tripadvisor_reviews` subtype tables.
- **Deep Audit Logging**: Records scrapers starts, completions, and detailed failure reasons.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `HEADLESS` | Whether to run the browser in headless mode | `True` |
| `REVIEWS_PER_PAGE` | Number of reviews TripAdvisor shows per page | `10` |

## Selectors (`config.py`)

All CSS selectors are centralized in `config.py` for easy maintenance if TripAdvisor updates their DOM structure.

## API Endpoints

- `POST /api/tripadvisor/scrape`: Trigger a background scrape job.
- `GET /api/tripadvisor/reviews`: Fetch stored TripAdvisor reviews.
