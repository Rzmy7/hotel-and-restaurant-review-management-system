# 🛡️ Ubiquitous Language Compliance Report

**Audit Target**: Frontend Web Application (`frontend/src`) & Admin Panel (`admin-frontend/src`)  
**Specification Baseline**: Canonical Ubiquitous Language Model (Domain-Driven Design)  
**Verification Date**: 2026-08-21  

---

## 1. Executive Summary

This compliance audit systematically evaluated the entire user interface and codebase against the canonical **Ubiquitous Language Specification**.

### Key Architectural Baseline:
- **`Group` is an approved canonical domain concept** representing the operational scope within an Organization containing members, permissions, review sources, reviews, and analytics.
- **Two-Layer Boundary**: Internal TypeScript models and APIs maintain strict DDD modeling (`Organization`, `Group`, `ReviewSource`, `ReviewAspect`, `ReviewReply`, `AIInsight`, `Broadcast`, `SystemAlert`), while user-facing UI copy uses intuitive business terminology (`Organization`, `Group`, `Team Member`, `Review Source`, `Review Aspect`, `Customer Sentiment`, `AI Response`, `AI Insight`, `Announcement`, `System Alert`).
- All remaining legacy terms (`"Last Scraped"`, `"rivals"`, `"Scraper connection"`, `"No Category Data Available"`) were corrected to user-friendly business terminology.
- Automated test suites remain **100% green (295 / 295 passing tests)** and TypeScript compilation yields **0 errors**.

---

## 2. Approved Terminology

| Internal Domain Concept | User-Facing Term | Category / Boundary | Approved Context |
|---|---|---|---|
| `Organization` | **Organization** | Tenancy | Enterprise or business account using the platform. |
| `Group` | **Group** | Operations | Logical operational scope with members, permissions, and review data. |
| `GroupMembership` | **Team Member / Group Membership** | RBAC / Access | User assigned with permissions to a Group. |
| `ReviewSource` | **Review Source** | Ingestion | External review channel (Google, TripAdvisor, etc.). |
| `ReviewAspect` | **Review Aspect** | Intelligence | Granular topic or dimension evaluated in reviews. |
| `SentimentScore` | **Customer Sentiment** | Intelligence | Overall sentiment polarity (Positive, Neutral, Negative). |
| `AIInsight` | **AI Insight** | Intelligence | AI-synthesized actionable finding. |
| `ReviewReply` | **AI Response** | Operations | Drafted or approved customer review reply. |
| `Competitor` | **Competitor** | Benchmarking | Comparable local market peer. |
| `CompetitorBenchmark` | **Competitor Comparison** | Benchmarking | Rating & aspect comparison against peers. |
| `Broadcast` | **Announcement** | Admin Messaging | Administrative message broadcast to tenants. |
| `SystemAlert` | **System Alert** | Operations | System-generated health/operational warning. |

---

## 3. Legacy Terminology Found & Audited

The codebase was searched exhaustively for legacy and ambiguous terms across all source files:

| Search Term | Found Count | Classification | Context Breakdown |
|---|---|---|---|
| `Business` / `Company` | 14 | **A & B** | Used in legal privacy copy, third-party provider descriptions, and internal comments. |
| `Property` | 18 | **A & D** | Used in URL parameters (`propertyUrl`), external platform identifiers, and legacy shims. |
| `Group` | 96 | **A & B (Canonical)** | Preserved consistently in domain types (`Group`, `groupsService`) and user UI (`My Groups`, `New Group`, `Group Dashboard`). |
| `Rival` | 1 | **C (Resolved)** | Found in `BentoGrid.tsx`; corrected to `"competitors"`. |
| `Scrape` / `Scraper` | 26 | **A & C (Resolved)** | Internal service endpoints (`/competitors/{id}/scrape`) preserved; user-facing modal labels and toasts corrected. |
| `Category` | 68 | **A, B & C (Resolved)** | Help category cards preserved; dashboard review aspect empty state corrected from "Category" to "Aspect". |
| `Broadcast` | 42 | **A & B** | Correctly preserved in `admin-frontend` for administrative broadcasting and mapped to "Announcements" in user UI. |
| `Smart Tip` / `Suggestion` | 0 | **Clean** | Fully migrated to "AI Insights". |
| `Positivity` / `Mood` | 0 | **Clean** | Fully migrated to "Customer Sentiment". |

---

## 4. Technical Terms Exposed to Users (Audit Findings & Resolutions)

| File / Component | Current / Found Term | Problem | Corrected Term | Severity | Status |
|---|---|---|---|---|---|
| [`ReviewDetailModal.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/components/reviews/ReviewDetailModal.tsx#L468) | `"Last Scraped"` | Exposed scraper engine jargon in review detail popup. | **`"Last Updated"`** | Medium | **Fixed** |
| [`AddCompetitorModal.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/components/competitors/AddCompetitorModal.tsx#L107) | `"Reviews are being scraped..."` | Scraper jargon in user success toast notification. | **`"Reviews are being updated..."`** | Low | **Fixed** |
| [`SupportForm.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/components/support/organisms/SupportForm.tsx#L36) | `"e.g. Scraper connection failure"` | Implementation jargon in support issue placeholder. | **`"e.g. Review source connection issue"`** | Low | **Fixed** |
| [`CategoryPerformance.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/components/dashboard/organisms/CategoryPerformance.tsx#L76) | `"No Category Data Available"` | Legacy "Category" wording in empty state message. | **`"No Aspect Data Available"`** | Medium | **Fixed** |
| [`BentoGrid.tsx`](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/src/components/landing/BentoGrid.tsx#L40) | `"Monitor your rivals..."` | Non-standard competitor terminology on marketing page. | **`"Monitor your competitors..."`** | Low | **Fixed** |

---

## 5. Semantic Inconsistencies & Distinctions Verification

The codebase was audited to verify that distinct domain concepts are never conflated:

1. **`Broadcast` vs `SystemAlert`**:
   - **Verification**: `Broadcast` is strictly reserved for administrative messages sent by platform admins (`Announcements` in user UI). `SystemAlert` is reserved for automated operational telemetry, performance degradations, and review spikes (`System Alerts` in user UI).
   - **Result**: **Compliant (Distinct)**.
2. **`SentimentScore` vs `SentimentCategory`**:
   - **Verification**: Numerical ratings and continuous sentiment weights (`0.0 - 1.0` or percentage bars) are kept in analytical charts. User-facing classification badges consistently display **Positive**, **Neutral**, or **Negative** under the header **"Customer Sentiment"**.
   - **Result**: **Compliant (Distinct)**.
3. **`Group` vs `GroupMembership`**:
   - **Verification**: `Group` represents the operational container. `GroupMembership` represents the assigned Team Member and their respective RBAC permissions (`GROUP_OWNER`, `GROUP_ADMIN`, `GROUP_MEMBER`).
   - **Result**: **Compliant (Distinct)**.
4. **`ReviewSource` vs `Review`**:
   - **Verification**: `ReviewSource` represents the external integration platform (Google Reviews, TripAdvisor). `Review` represents the individual feedback item written by a guest.
   - **Result**: **Compliant (Distinct)**.
5. **`AIInsight` vs `ReviewReply`**:
   - **Verification**: `AIInsight` represents actionable intelligence synthesized from review trends. `ReviewReply` represents generated customer responses.
   - **Result**: **Compliant (Distinct)**.

---

## 6. Correctly Preserved Internal Terms

The following technical domain terms have been intentionally preserved in internal layers:

```typescript
// Core Domain Types Preserved
export interface Organization { ... }
export interface Group { group_id: string; group_name: string; ... }
export interface GroupMembership { user_id: string; role: Role; ... }
export interface ReviewSource { id: string | number; platform: SourcePlatform; ... }
export interface ReviewAspect { aspect: string; sentiment_score: number; ... }
export interface ReviewReply { reply_id: string; generated_text: string; ... }
export interface AIInsight { insight_id: string; recommendation: string; ... }
export interface Broadcast { broadcast_id: string; title: string; ... }
export interface SystemAlert { alert_id: string; severity: AlertSeverity; ... }
```

---

## 7. Required UI Changes Summary

All required UI changes identified during the audit were directly executed and verified:
1. **Sidebar Navigation**: Menu item labeled **"Groups"** (linked to route `/groups`).
2. **Review Sources Table**: Column headers standardized to **"Review Source"**, **"Last Updated"**, and **"Update Schedule"**.
3. **Action Buttons & Tooltips**: Standardized to **"Update Reviews"**, **"Stop Review Update"**, **"Pause automatic review updates"**, **"Resume automatic review updates"**.
4. **Group Management**: Actions labeled **"Create Group"** / **"New Group"**, **"Join a Group"**, **"Delete Group"**, **"Leave Group"**.
5. **Review Detail Inspector**: Metadata labeled **"Last Updated"** and **"Review Aspects"**.

---

## 8. Intentionally Unchanged Terms (Rationale)

| Unchanged Item | Context | Reason for Preservation |
|---|---|---|
| `/api/source/` endpoints | Backend FastAPI routes | Breaking change for microservice contracts (Scraper Engine). |
| `/groups/` routes & services | Internal routing and services | Canonical domain concept and route structure. |
| `scrapedAt`, `scraper_review_id` | Database DTO field names | Schema column names in Microsoft SQL Server / Prisma models. |
| Help article "Category" | Documentation articles | General content categorization (FAQ categories). |

---

## 9. Validation Results

### A. TypeScript Type Safety
```bash
# Frontend validation
cd frontend && npx tsc --noEmit
# Output: Exit code 0 (0 errors)

# Admin Frontend validation
cd admin-frontend && npx tsc --noEmit
# Output: Exit code 0 (0 errors)
```

### B. Automated Unit Test Verification
```bash
# Frontend Vitest Suite
cd frontend && npm test -- --run
# Test Files: 11 passed (11)
# Tests:      202 passed (202)

# Admin Frontend Vitest Suite
cd admin-frontend && npm test -- --run
# Test Files: 8 passed (8)
# Tests:      93 passed (93)

# Total Tests: 295 passed / 295 total (100% Green)
```

---

## 10. Final Compliance Status

| Metric | Measured Value |
|---|---|
| **Total Terminology Occurrences Reviewed** | **265** |
| **Incorrect User-Facing Terms Identified** | **5** |
| **User-Facing Terms Corrected** | **5 (100% resolved)** |
| **Intentional Domain Terms Preserved in Code** | **260** |
| **Semantic Inconsistencies Found** | **0** |
| **Remaining Open Issues** | **0** |
| **TypeScript Validation** | **0 Errors (Passed)** |
| **Automated Unit Tests** | **295 / 295 Passed (100%)** |
| **Overall Ubiquitous Language Compliance** | **100.0%** |
