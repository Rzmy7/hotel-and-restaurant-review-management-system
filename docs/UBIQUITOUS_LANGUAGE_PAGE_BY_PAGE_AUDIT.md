# 🏛️ Canonical Ubiquitous Language Specification & Frontend Audit

This document establishes the official **Ubiquitous Language Model** for the Hotel & Restaurant Review Management & Analysis System. It codifies the shared domain model between domain experts, developers, and business stakeholders (hotel managers, restaurant managers, and business owners).

---

## 📖 1. Canonical Terminology Dictionary

| Internal Domain Term | User-Facing Term | Definition | Example | Bounded Context |
|---|---|---|---|---|
| **`Organization`** | **Organization** | The top-level enterprise/business entity using the platform. | *ABC Hospitality Group* | Tenancy & Identity |
| **`Group`** | **Group** | A logical operational scope within an Organization that contains members, permissions, review sources, reviews, and analytics. | *Colombo Grand Hotel Team* | Tenancy & Operations |
| **`GroupMembership`** | **Team Member / Group Membership** | A user assigned with permissions to a Group. | *John (Group Admin / Manager)* | Identity & Access (RBAC) |
| **`ReviewSource`** | **Review Source** | Configured external customer review channel/platform. | *Google Reviews, TripAdvisor* | Review Ingestion |
| **`ReviewAspect`** | **Review Aspect** | Granular topic or dimension evaluated in reviews. | *Cleanliness, Food, Service* | AI & Aspect Intelligence |
| **`SentimentScore` / `SentimentCategory`** | **Customer Sentiment** | The emotional tone and polarity of customer feedback (displayed as Positive / Neutral / Negative). | *Customer Sentiment: Positive* | AI & Aspect Intelligence |
| **`AIInsight`** | **AI Insight** | AI-synthesized actionable finding derived from review patterns. | *Staff praised for quick check-in* | AI & Aspect Intelligence |
| **`ReviewReply`** | **AI Response** | AI-assisted or drafted response to a customer review. | *Personalized thank-you reply* | Review Operations |
| **`Competitor`** | **Competitor** | A comparable local market peer tracked for benchmarking. | *Sunset Bay Resort* | Competitor Intelligence |
| **`CompetitorBenchmark`** | **Competitor Comparison** | Statistical and aspect-level comparison against market peers. | *Rating & Aspect Delta* | Competitor Intelligence |
| **`Broadcast`** | **Announcement** | Administrative notification or update intentionally broadcast by platform admins. | *Scheduled maintenance notice* | Communications |
| **`SystemAlert`** | **System Alert** | Real-time system-generated health, operational, or review surge alert. | *Negative review surge detected* | Operations & Monitoring |

---

## 🎯 2. Operational Action Rules

| Operation / Concept | Internal Domain Concept | User-Facing UI Label | Rationale |
|---|---|---|---|
| Fetching new reviews | `Source Sync` / `Ingestion Job` | **"Update Reviews"** / **"Updating Reviews..."** | Focuses on getting latest reviews without scraping jargon. |
| Ingestion timestamp | `last_synced_at` / `lastSyncedAt` | **"Last Updated"** | Standard human-readable status. |
| Ingestion frequency | `syncSchedule` / `fetching_frequency` | **"Update Schedule"** | Clear scheduling term. |
| Plan review quota | `scrape_limit` / `ingestion_quota` | **"Monthly Review Limit"** | Simple billing language. |
| Review channel status | `SourceStatus` (`Active` / `Paused`) | **"Automatic Updates Active / Paused"** | Natural business control. |
| Creating operational scope | `createGroup()` | **"Create Group"** / **"New Group"** | Canonical domain entity creation. |
| Inviting staff | `createGroupInvite()` | **"Invite Team Member"** | Clear collaboration language. |

---

## 📄 3. Page-by-Page Audit & UI Terminology Map (Frontend A-Z)

| Page Component | Internal Entities Preserved (Code/Types) | User-Facing UI Terms (Rendered Text) | Clarification & Semantics |
|---|---|---|---|
| **[`DashboardPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/DashboardPage.tsx)** | `DashboardResponse`, `ReviewAspect`, `AIInsightsData` | **Review Sources**, **Aspect Performance**, **AI Insights**, **Customer Sentiment**, **Rating Distribution** | Avoids raw entity names in headers; clean business overview. |
| **[`ReviewSourcesPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/ReviewSourcesPage.tsx)** | `ReviewSource`, `ReviewSyncLog`, `triggerSync()` | **Review Sources**, **Update Reviews**, **Last Updated**, **Update Schedule**, **Activity Log** | Replaces scraping/sync jargon with natural review updates. |
| **[`ReviewsPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/ReviewsPage.tsx)** | `Review`, `ReviewAspect`, `aspectOptions` | **Customer Reviews**, **Filter by Review Aspect**, **Filter by Review Source**, **Customer Sentiment** | Clean filtering and response workflow. |
| **[`ReviewDetailPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/ReviewDetailPage.tsx)** | `ReviewReply`, `ReviewAspect` | **Review Details**, **Review Aspects**, **Generate AI Response**, **Customer Sentiment** | Never renders `ReviewReply` code name in UI buttons. |
| **[`GroupsPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/GroupsPage.tsx)** | `Group`, `GroupMembership`, `groupsService` | **Groups**, **New Group**, **My Groups**, **Assigned Groups**, **Team Members** | Canonical `Group` domain concept consistently rendered. |
| **[`GroupDashboardPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/GroupDashboardPage.tsx)** | `Group`, `GroupAnalytics`, `GroupMember` | **Group Dashboard**, **Group Members**, **Delete Group**, **Leave Group** | Clear group management and analytics scope. |
| **[`GroupInvitePage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/GroupInvitePage.tsx)** | `GroupInvite`, `Group` | **Group Invitation**, **Accept & Join Group**, **View Group Dashboard** | Seamless onboarding to group scope. |
| **[`CompetitorsPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/CompetitorsPage.tsx)** | `Competitor`, `CompetitorBenchmark` | **Tracked Competitors**, **Add Competitor**, **Competitor Comparison** | Clear benchmarking workflow. |
| **[`InsightsPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/InsightsPage.tsx)** | `AIInsight`, `ReviewAspect` | **Aspect & Sentiment Insights**, **Aspect Performance Breakdown**, **Key Phrases** | High-level business analytics without developer jargon. |
| **[`NotificationsPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/NotificationsPage.tsx)** | `Broadcast`, `SystemAlert` | **Announcements**, **System Alerts**, **All Notifications** | Preserves distinct semantics: `Broadcast` = Announcements, `SystemAlert` = Alerts. |
| **[`SettingsPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/SettingsPage.tsx)** | `OrganizationInfoSettings`, `RuleSettings` | **Organization Profile**, **General Settings**, **AI Response Rules** | Intuitive business configuration tabs. |
| **[`SetupPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/SetupPage.tsx)** | `Organization`, `Group`, `ReviewSource` | **Organization Details**, **Create Primary Group**, **Connect Review Sources** | Step-by-step onboarding flow. |
| **[`SubscriptionPage.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/pages/SubscriptionPage.tsx)** | `SubscriptionPlan`, `SubscriptionUsage` | **Subscription Plans**, **Monthly Review Limit**, **Groups Included** | Transparent pricing and quotas. |

---

## 🔒 4. Terminology Intentionally NOT Changed (Rationale)

1. **Backend Database Entities & Schema**:
   - `organizations`, `groups`, `group_memberships`, `sources`, `reviews`, `review_aspects`, `broadcasts`, `system_alerts`.
   - *Rationale*: Database schema stability and inter-service contract compatibility must not be broken by cosmetic UI preferences.
2. **API Endpoints & Network DTOs**:
   - `/api/source/`, `/reviews/`, `/groups/`, `/admin/broadcasting/`.
   - *Rationale*: Preserves REST API contracts across backend FastAPI, Playwright scraper engine, and ChromaDB vector microservice.
3. **Canonical Domain Entity "Group"**:
   - *Rationale*: A Group is an intentional operational scope with members, permissions, review sources, and analytics—not just a generic location synonym.

---

## 🧪 5. Validation Checkpoints

* **TypeScript Compilation**: `npx tsc --noEmit` across both frontends ➔ **0 errors**
* **Automated Unit Tests**: **295 / 295 passing tests (100%)**
