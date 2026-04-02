# Project Tasks - Review Management System

## ✅ Sync Frequency Normalization
- [x] **Database Schema Refactor**
    - [x] Create `sync_frequency` lookup table (1: DAILY, 2: THREE_DAYS, 3: WEEKLY).
    - [x] Drop string-based `ck_source_fetching_frequency` constraint from `source` table.
    - [x] Alter `source.fetching_frequency` column type from `VARCHAR` to `INT`.
    - [x] Add Foreign Key `fk_source_sync_frequency` to `source` table.
- [x] **Backend Implementation**
    - [x] Added `SyncFrequency` model to `app/modules/source/models.py`.
    - [x] Updated `Source` model to use `Integer` foreign key.
    - [x] Refactored `app/modules/source/schemas.py` to use `int` for frequencies.
    - [x] Updated `source_service.py` calculation logic.
- [x] **Data Migration & Seeding**
    - [x] Seeded `sync_frequency` table with default intervals.
    - [x] Migrated existing source data to new integer-based IDs.

## ✅ Organization & Nested Source Creation
- [x] **Schema Enhancement**
    - [x] Updated `OrganizationCreate` in `organization_schema.py` to include optional `sources` list.
    - [x] Defined `SourceCreateNested` for clean API payloads.
- [x] **API Route Update**
    - [x] Refactored `upsert_organization` in `organization_routes.py`.
    - [x] Fixed Bug: Allowed multiple organizations per tenant by changing the upsert check to include the organization name.
    - [x] Implemented batch source insertion logic within organization creation/update.
    - [x] Set default `source_status` to `'active'` for nested sources.
    - [x] Automated initial sync scheduling (`next_synced_at`) for nested sources.

## 🛠️ Infrastructure & Maintenance
- [x] **Cleanup**
    - [x] Updated `.gitignore` with comprehensive Python and log rules.
    - [x] Removed temporary diagnostic and migration scripts.
    - [x] Verified database integrity and multi-tenancy logic.
