# Comprehensive Database Table Documentation

## Document Info
**Total Tables Identified:** 41

**Full Table List:**
- `broadcast_event`
- `broadcast_events`
- `CompetitorReviews`
- `Competitors`
- `features`
- `group`
- `group_member`
- `group_member_role`
- `notification`
- `notifications`
- `organization`
- `organization_review_sources`
- `organization_type`
- `organizations`
- `organizations_source`
- `password_reset_token`
- `plan_feature`
- `plans`
- `platform`
- `platforms_source`
- `processed_review`
- `ProcessedReviews`
- `review_media`
- `review_photos`
- `reviews`
- `role`
- `session`
- `source`
- `sources_source`
- `sync_frequency`
- `sync_log`
- `sync_log_source`
- `system_settings`
- `tenant`
- `tenants_source`
- `user`
- `user_feature_usage`
- `user_notification`
- `user_organizations`
- `user_subscription`
- `users`

---

This document provides a detailed mapping of all database tables found within the **Hotel and Restaurant Review Management System**. It categorizes tables by their active usage in the backend, their access method (ORM vs. Raw SQL), and identifies legacy or duplicate tables.

---

## 1. Core Application Tables (Active)
These tables are central to the system's functionality and are actively maintained by the backend.

### 👤 User & Access Management
| Table Name | Access Method | Model / Service | Description |
|------------|---------------|-----------------|-------------|
| `user` | ORM | `User` | Primary user accounts. |
| `role` | ORM / SQL | `Role` | RBAC roles (Admin, Tenant, etc.). |
| `session` | ORM | `Session` | JWT refresh tokens and active session tracking. |
| `password_reset_token` | ORM / SQL | `PasswordResetToken` | Security tokens for password recovery. |
| `user_organizations` | Raw SQL | `source_routes.py` | Junction table for users and organizations. |

### 🏢 Organization & Multi-Tenancy
| Table Name | Access Method | Model / Service | Description |
|------------|---------------|-----------------|-------------|
| `tenant` | ORM / SQL | `Tenant` | Top-level accounts for multi-tenancy. |
| `organization` | ORM / SQL | `Organization` | Physical locations (Hotels/Restaurants). |
| `organization_type` | ORM / SQL | `OrganizationType` | Classification (e.g., Hotel, Resort). |
| `group` | ORM | `Group` | Logical team groupings within an organization. |
| `group_member` | ORM | `GroupMember` | Mapping of users to specific groups. |
| `group_member_role` | ORM | `GroupMemberRole` | Permissions within a specific group. |

### 📥 Review Scraping & AI Analysis
| Table Name | Access Method | Model / Service | Description |
|------------|---------------|-----------------|-------------|
| `processed_review` | ORM / SQL | `ProcessedReview` | **Main storage** for analyzed reviews (Sentiment, AI Summary). |
| `review_media` | ORM / SQL | `ReviewMedia` | Images and videos associated with reviews. |
| `platform` | ORM / SQL | `Platform` | Platform metadata (Booking, Google, TripAdvisor). |
| `source` | ORM / SQL | `Source` | Target URLs for specific organizations. |
| `sync_frequency` | ORM | `SyncFrequency` | Scheduling definitions (Daily, Weekly). |
| `sync_log` | ORM | `SyncLog` | Audit trail of scraping job outcomes. |
| `organization_review_sources` | Raw SQL | `source_routes.py` | Ad-hoc source connections for setup. |

### 💳 Subscriptions & Limits
| Table Name | Access Method | Model / Service | Description |
|------------|---------------|-----------------|-------------|
| `plans` | Raw SQL | `subscription_service` | Definition of pricing tiers (Free, Pro, etc.). |
| `features` | Raw SQL | `subscription_service` | List of system features that can be limited. |
| `plan_feature` | Raw SQL | `subscription_service` | Junction table defining limits per plan. |
| `user_subscription` | Raw SQL | `subscription_service` | Historical tracking of user plan assignments. |
| `user_feature_usage` | Raw SQL | `subscription_service` | Real-time tracking of feature consumption (e.g., scrapings used). |

### 📢 Communication & Settings
| Table Name | Access Method | Model / Service | Description |
|------------|---------------|-----------------|-------------|
| `notification` | ORM / SQL | `Notification` | System announcements and in-app alerts. |
| `user_notification` | ORM / SQL | `UserNotification` | User-specific read status for notifications. |
| `broadcast_event` | ORM / SQL | `BroadcastEvent` | History of mass messages sent by admins. |
| `system_settings` | Raw SQL | `system_settings_service` | Global app config (Timezone, AI Model selection). |

### 📊 Competitor Benchmarking
| Table Name | Access Method | Model / Service | Description |
|------------|---------------|-----------------|-------------|
| `Competitors` | Raw SQL | `competitor_service` | List of external hotels tracked for comparison. |
| `CompetitorReviews` | Raw SQL | `competitor_service` | Scraped reviews of competitors for sentiment analysis. |

---

## 2. Legacy & Redundant Tables
These tables were identified in the database or legacy scripts but are largely replaced or deprecated in the current architecture.

| Table Name | Status | Replaced By |
|------------|--------|-------------|
| `dbo.reviews` | 🔴 Legacy | `processed_review` |
| `dbo.review_photos` | 🔴 Legacy | `review_media` |
| `dbo.ProcessedReviews` | 🔴 Legacy | `processed_review` |
| `dbo.notifications` | ⚠️ Plural Version | `notification` (ORM uses singular) |
| `dbo.broadcast_events` | ⚠️ Plural Version | `broadcast_event` (ORM uses singular) |
| `dbo.users` | ⚠️ Plural Version | `user` (ORM uses singular) |
| `dbo.organizations` | ⚠️ Plural Version | `organization` |
| `dbo.sync_log_source` | 🔴 Legacy | `sync_log` |

---

## 3. Test & Seed Tables
Tables used primarily for development, testing, or initial data seeding.

| Table Name | Usage |
|------------|-------|
| `tenants_source` | Seeding script `seed_source_data.sql` |
| `organizations_source` | Seeding script `seed_source_data.sql` |
| `platforms_source` | Seeding script `seed_source_data.sql` |
| `sources_source` | Seeding script `seed_source_data.sql` |

---

## 🏗️ Schema Details (Critical Tables)

### `processed_review`
Stores the final output of the scraping and AI pipeline.
- `id`: UUID (PK)
- `platformReviewId`: External platform ID (NVARCHAR)
- `organization_id`: UUID (FK)
- `rating`: Star rating (INT)
- `reviewText`: Raw content (NVARCHAR(MAX))
- `sentiment`: AI Sentiment (Positive, Negative, Neutral)
- `summary`: AI-generated summary
- `categories`: JSON list of tags (NVARCHAR)

### `system_settings`
Key-value store for system-wide configuration.
- `setting_key`: Identifier (e.g., `timezone`, `reply_provider`)
- `setting_value`: Stored value
- `updated_at`: Timestamp

---
*Last Updated: 2026-04-09*
