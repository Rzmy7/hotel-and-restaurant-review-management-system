# Database Schema & Module Analysis

This document outlines the required database tables as defined by the FastAPI backend modules (ORM models) and contrasts them with the full schema available in the actual `ReviewMate` SQL Server database.

## 1. Needed Tables per Module (Backend Requirements)

The backend defines SQLAlchemy models for the following tables across various modules. These are the tables the backend actively uses or manages:

### **`auth` Module**
*   **`role`**: `role_id` (PK), `role_name`, `description`, `created_at`
*   **`session`**: `session_id` (PK), `user_id` (FK), `refresh_token_hash`, `ip_address`, `user_agent`, `is_revoked`, `created_at`, `expires_at`, `revoked_at`
*   **`password_reset_token`**: `token_id` (PK), `user_id` (FK), `token_hash`, `expires_at`, `used_at`, `created_at`

### **`groups` Module**
*   **`group`**: `group_id` (PK), `group_name`, `organization_id`, `created_by` (FK), `created_at`
*   **`group_member`**: `group_id` (PK/FK), `user_id` (PK/FK), `role`, `role_id` (FK), `joined_at`
*   **`group_member_role`**: `role_id` (PK), `role_name`, `description`, `skills`, `created_at`

### **`source` Module**
*   **`tenant`**: `tenant_id` (PK/FK), `plan`, `created_at`
*   **`organization_type`**: `type_code` (PK), `type_name`, `description`
*   **`organization`**: `organization_id` (PK), `tenant_id` (FK), `organization_name`, `organization_type_id` (FK), `created_at`, `updated_at`
*   **`platform`**: `platform_id` (PK), `platform_name`, `base_url`, `fetching_type`, `platform_status`, `num_of_syncs`, `success_sync_count`, `success_rate`, `review_table`, `created_at`, `updated_at`
*   **`sync_frequency`**: `frq_id` (PK), `name`, `info`, `description`
*   **`source`**: `source_id` (PK), `organization_id` (FK), `platform_id` (FK), `source_url`, `source_status`, `fetching_frequency` (FK), `last_synced_at`, `next_synced_at`, `num_of_syncs`, `success_sync_count`, `success_rate`, `created_at`
*   **`sync_log`**: `log_id` (PK), `source_id` (FK), `status`, `timestamp`, `duration_ms`, `reviews_fetched`, `error_message`

### **`user` Module**
*   **`user`**: `user_id` (PK), `email`, `password_hash`, `first_name`, `last_name`, `phone`, `job_title`, `bio`, `location`, `profile_image_url`, `google_id`, `is_active`, `is_email_verified`, `is_phone_verified`, `last_login_at`, `created_at`, `updated_at`, `role_id` (FK)

### **`reviews` Module**
*   **`processed_review`**: `id` (PK), `platformReviewId`, `organization_id` (FK), `platform_id` (FK), `source_id` (FK), `rating`, `reviewerName`, `text`, `summary`, `sentiment`, `sentiment_score`, `language`, `categories`, `keyPhrases`, `positive_text`, `negative_text`, `error_message`, `retry_count`, `last_attempt`, `reviewDate`, `scrapedAt`, `status`, `ai_reply`
*   **`review_media`**: `media_id` (PK), `review_id` (FK), `src`, `alt`

---

## 2. Discrepancies (ORM vs Live Database)

Based on a comparison of the backend's SQLAlchemy Python models and the live `ReviewMate` SQL database, the following mismatches require attention:

### Missing Columns in Python Models
*   **`user`.`tenant_id`**: The database `user` table contains a `tenant_id` (`uniqueidentifier`) column. This column is **missing** from `backend/app/modules/user/models/user_models.py`.

### Column Length Mismatches
*   **`organization_type.description`**: Defined in Python as `String(255)`, but the DB restricts it to `nvarchar(100)`.
*   **`sync_frequency.description`**: Defined in Python as `String(255)`, but the DB restricts it to `nvarchar(100)`.

### Missing ORM Models for Existing Relationships
*   **Notifications**: The `User` Python model has a relationship mapping to `UserNotification`, but neither `UserNotification` nor `Notification` models exist in any Python files, despite the tables securely existing in the database.

---

## 3. Full Database Schema (All Tables Available in ReviewMate DB)

The following represents the complete structural state of the *actual* database. This includes tables configured in the ORM *plus* extra tables used by parallel services (scrapers, billing engines, legacy features).

**Table: agoda_reviews**
  review_id (int)
  rating (numeric)
  author (nvarchar, 255)
  review_text (nvarchar, string max)
  review_date (nvarchar, 100)
  author_badge (nvarchar, 500)
  reply (nvarchar, string max)

**Table: booking_reviews**
  review_id (int)
  rating (numeric)
  author (nvarchar, 255)
  review_text (nvarchar, string max)
  review_date (nvarchar, 100)
  author_badge (nvarchar, 255)
  reply (nvarchar, string max)
  room_info (nvarchar, string max)
  stay_date (nvarchar, 100)
  author_country (nvarchar, 255)

**Table: facebook_reviews**
  review_id (int)
  rating (numeric)
  author (nvarchar, 255)
  review_text (nvarchar, string max)
  review_date (nvarchar, 100)

**Table: google_reviews**
  review_id (int)
  rating (numeric)
  author (nvarchar, 255)
  review_text (nvarchar, string max)
  review_date (nvarchar, 100)
  author_badge (nvarchar, 500)
  reply (nvarchar, string max)

**Table: group**
  group_id (uniqueidentifier)
  group_name (varchar, 255)
  organization_id (uniqueidentifier)
  created_by (uniqueidentifier)
  created_at (datetimeoffset)

**Table: group_hotels**
  hotel_id (uniqueidentifier)
  group_id (uniqueidentifier)
  hotel_name (nvarchar, 255)
  location (nvarchar, 255)
  avg_rating (float)
  review_count (int)
  status (nvarchar, 50)
  added_at (datetime2)

**Table: group_member**
  group_id (uniqueidentifier)
  user_id (uniqueidentifier)
  role (varchar, 30)
  role_id (uniqueidentifier)
  joined_at (datetimeoffset)

**Table: group_member_role**
  role_id (uniqueidentifier)
  role_name (varchar, 100)
  description (varchar, 255)
  skills (varchar, string max)
  created_at (datetimeoffset)

**Table: notification**
  notification_id (uniqueidentifier)
  title (varchar, 200)
  message (varchar, string max)
  notification_type (varchar, 30)
  created_at (datetimeoffset)

**Table: organization**
  organization_id (uniqueidentifier)
  tenant_id (uniqueidentifier)
  organization_name (varchar, 255)
  created_at (datetimeoffset)
  organization_type_id (int)
  updated_at (datetime2)

**Table: organization_type**
  type_code (int)
  type_name (nvarchar, 50)
  description (nvarchar, 100)

**Table: password_reset_token**
  token_id (uniqueidentifier)
  user_id (uniqueidentifier)
  token_hash (varchar, 255)
  expires_at (datetimeoffset)
  used_at (datetimeoffset)
  created_at (datetimeoffset)

**Table: plan_feature**
  plan_feature_id (int)
  plan_id (int)
  feature_id (int)
  is_enabled (bit)
  feature_limit (int)
  created_at (datetime2)
  updated_at (datetime2)

**Table: plans**
  plan_id (int)
  name (nvarchar, 100)
  description (nvarchar, 255)
  monthly_price (decimal)
  annual_price (decimal)
  currency (nvarchar, 16)
  is_popular (bit)
  is_active (bit)
  color (nvarchar, 100)
  icon_name (nvarchar, 30)
  created_at (datetime2)
  updated_at (datetime2)

**Table: platform**
  platform_id (int)
  platform_name (varchar, 100)
  base_url (varchar, 500)
  fetching_type (varchar, 20)
  platform_status (varchar, 20)
  num_of_syncs (int)
  success_sync_count (int)
  success_rate (float)
  created_at (datetimeoffset)
  updated_at (datetimeoffset)
  review_table (nvarchar, 255)

**Table: processed_review**
  id (uniqueidentifier)
  platformReviewId (varchar, 100)
  organization_id (uniqueidentifier)
  platform_id (int)
  rating (int)
  reviewerName (varchar, 255)
  text (varchar, string max)
  summary (varchar, string max)
  sentiment (varchar, 20)
  sentiment_score (float)
  language (varchar, 50)
  categories (varchar, string max)
  keyPhrases (varchar, string max)
  reviewDate (datetime2)
  scrapedAt (datetime2)
  status (varchar, 20)
  ai_reply (varchar, string max)
  positive_text (nvarchar, string max)
  negative_text (nvarchar, string max)
  error_message (nvarchar, string max)
  retry_count (int)
  last_attempt (datetime2)
  source_id (uniqueidentifier)

**Table: review_media**
  media_id (uniqueidentifier)
  review_id (uniqueidentifier)
  src (varchar, 1000)
  alt (varchar, 500)

**Table: reviews**
  review_id (int)
  source_id (varchar, 36)
  platform_review_id (nvarchar, 255)
  is_embedded (bit)
  created_at (datetime)

**Table: role**
  role_id (int)
  role_name (varchar, 100)
  description (varchar, 255)
  created_at (datetimeoffset)

**Table: session**
  session_id (uniqueidentifier)
  user_id (uniqueidentifier)
  refresh_token_hash (varchar, 255)
  ip_address (varchar, 50)
  user_agent (varchar, 500)
  is_revoked (bit)
  created_at (datetimeoffset)
  expires_at (datetimeoffset)
  revoked_at (datetimeoffset)

**Table: source**
  source_id (uniqueidentifier)
  organization_id (uniqueidentifier)
  platform_id (int)
  source_url (varchar, 1000)
  source_status (varchar, 20)
  last_synced_at (datetimeoffset)
  next_synced_at (datetimeoffset)
  num_of_syncs (int)
  success_sync_count (int)
  success_rate (float)
  created_at (datetimeoffset)
  fetching_frequency (int)

**Table: sources**
  source_id (varchar, 36)
  source_url (nvarchar, 1000)
  platform_name (nvarchar, 100)
  created_at (datetime)

**Table: sync_frequency**
  frq_id (int)
  name (varchar, 50)
  info (varchar, 255)
  description (nvarchar, 100)

**Table: sync_log**
  log_id (uniqueidentifier)
  source_id (uniqueidentifier)
  status (varchar, 20)
  timestamp (datetimeoffset)
  duration_ms (int)
  reviews_fetched (int)
  error_message (varchar, 1000)

**Table: system_settings**
  setting_key (nvarchar, 100)
  setting_value (nvarchar, 255)
  updated_at (datetime2)

**Table: tenant**
  tenant_id (uniqueidentifier)
  created_at (datetimeoffset)
  plan (nvarchar, 50)

**Table: tripadvisor_reviews**
  review_id (int)
  rating (numeric)
  review_heading (nvarchar, 500)
  author (nvarchar, 255)
  review_text (nvarchar, string max)
  review_date (nvarchar, 100)
  reviewer_nationality (nvarchar, 255)
  stay_date (nvarchar, 100)
  traveler_type (nvarchar, 255)
  likes_count (int)
  reply (nvarchar, string max)
  rating_value (numeric)
  rating_rooms (numeric)
  rating_location (numeric)
  rating_cleanliness (numeric)
  rating_service (numeric)
  rating_sleep_quality (numeric)

**Table: user**
  user_id (uniqueidentifier)
  email (varchar, 255)
  password_hash (varchar, 255)
  first_name (varchar, 100)
  last_name (varchar, 100)
  phone (varchar, 30)
  job_title (varchar, 200)
  bio (varchar, 1000)
  location (varchar, 200)
  profile_image_url (varchar, 500)
  google_id (varchar, string max)
  is_active (bit)
  is_email_verified (bit)
  is_phone_verified (bit)
  last_login_at (datetimeoffset)
  created_at (datetimeoffset)
  updated_at (datetimeoffset)
  role_id (int)
  tenant_id (uniqueidentifier)

**Table: user_feature_usage**
  user_feature_usage_id (int)
  user_id (nvarchar, 64)
  feature_id (int)
  used_quantity (int)
  period_start (date)
  period_end (date)
  created_at (datetime2)
  updated_at (datetime2)

**Table: user_notification**
  notification_id (uniqueidentifier)
  user_id (uniqueidentifier)
  is_read (bit)
  read_at (datetimeoffset)
  delivered_at (datetimeoffset)

**Table: user_subscription**
  user_subscription_id (int)
  user_id (nvarchar, 64)
  plan_id (int)
  status (nvarchar, 30)
  starts_at (datetime2)
  ends_at (datetime2)
  created_at (datetime2)
  updated_at (datetime2)
