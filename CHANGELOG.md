# Changelog

## [Unreleased]

### Added
- Real-Time Sync Observability with global progress bar
- WebSocket SyncConnectionManager for live sync tracking
- System monitoring dashboard in Admin Panel (CPU, RAM, uptime)
- Bidirectional Safe Reset for crash recovery (zombie task cleanup)
- Deduplicated Shared Scraping (multiple source_ids share single browser instance)
- Rate limiting with two-tier protection (SlowAPI + domain-aware scheduling)
- Deduplication endpoints (`/api/sources/{id}/cleanup`, `/api/sources/{id}/integrity`)
- Feature flags system (content search embeddings, reply regeneration limits)
- Subscription plans management (Admin panel)

### Changed
- System UI theme updated to #597FE6 primary color
- Success Rate calculation now filters for terminal states
- Scraper Engine URL normalization strips query parameters for dedup

### Fixed
- Port mismatch in WebSocket connections
- Undefined `platform` variable in `source_service.py`
- Decreasing success rate display in Sync History

---

**Format**: Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
