# Testing Multi-User Review Sources in Swagger UI

## Prerequisites
1. Migration script executed successfully ✅
2. Database verification queries passed ✅
3. Backend running (uvicorn app.main:app --reload)
4. Two test users available (User A and User B)
5. One organization where both users are members

## Scenario Setup
- **Organization**: "ABC Company" (org_id = some-uuid)
- **User A**: Has access to org ABC
- **User B**: Also has access to same org ABC
- **Goal**: User A selects (Google + Booking), User B selects (TripAdvisor + Custom)

---

## Test 1: User A - Get Initial Sources

**Endpoint**: `GET /api/setup/sources`

**Authorization**: User A Token

**Parameters**:
```
organization_id = <copy-org-uuid-here>
```

**Expected Response (200 OK)**:
```json
{
  "organization_id": "12345678-1234-1234-1234-123456789012",
  "sources": [
    {
      "name": "Google Reviews",
      "icon": "G",
      "connected": false
    },
    {
      "name": "Booking.com",
      "icon": "B",
      "connected": false
    },
    {
      "name": "Trip Advisor",
      "icon": "T",
      "connected": false
    }
  ],
  "connected_sources": []
}
```

✅ **What this proves**: User A has no sources selected yet
- `connected_sources` is empty array
- All default sources show `connected: false`

---

## Test 2: User A - Connect Google Reviews

**Endpoint**: `POST /api/setup/sources/connect`

**Authorization**: User A Token

**Request Body**:
```json
{
  "organization_id": "<org-uuid>",
  "source_name": "Google Reviews",
  "source_url": null,
  "fetching_frequency": "daily"
}
```

**Expected Response (200 OK)**:
```json
{
  "message": "Source connected successfully",
  "source_id": "<new-uuid>",
  "organization_id": "<org-uuid>"
}
```

✅ **What this proves**: 
- Source stored with User A's ID
- New source_id created
- User A now has 1 connected source

---

## Test 3: User A - Connect Booking.com

**Endpoint**: `POST /api/setup/sources/connect`

**Authorization**: User A Token

**Request Body**:
```json
{
  "organization_id": "<org-uuid>",
  "source_name": "Booking.com",
  "source_url": null,
  "fetching_frequency": "daily"
}
```

**Expected Response (200 OK)**:
```json
{
  "message": "Source connected successfully",
  "source_id": "<new-uuid>",
  "organization_id": "<org-uuid>"
}
```

✅ **What this proves**: User A now has 2 sources

---

## Test 4: User A - Get Sources Again (Verify)

**Endpoint**: `GET /api/setup/sources`

**Authorization**: User A Token

**Parameters**:
```
organization_id = <org-uuid>
```

**Expected Response (200 OK)**:
```json
{
  "organization_id": "<org-uuid>",
  "sources": [
    {
      "name": "Google Reviews",
      "icon": "G",
      "connected": true  // <-- NOW TRUE!
    },
    {
      "name": "Booking.com",
      "icon": "B",
      "connected": true  // <-- NOW TRUE!
    },
    {
      "name": "Trip Advisor",
      "icon": "T",
      "connected": false
    }
  ],
  "connected_sources": [
    {
      "source_id": "<uuid-1>",
      "source_name": "Google Reviews",
      "source_url": null,
      "connected": true,
      "fetching_frequency": "daily"
    },
    {
      "source_id": "<uuid-2>",
      "source_name": "Booking.com",
      "source_url": null,
      "connected": true,
      "fetching_frequency": "daily"
    }
  ]
}
```

✅ **What this proves**: 
- User A's selected sources are persisted
- `connected_sources` array now has 2 items
- Each source has correct ID and fetching_frequency

---

## Test 5: **CRITICAL TEST** - Switch to User B - Get Sources

**Endpoint**: `GET /api/setup/sources`

**Authorization**: User B Token (DIFFERENT USER!)

**Parameters**:
```
organization_id = <SAME org-uuid as before>
```

**Expected Response (200 OK)**:
```json
{
  "organization_id": "<org-uuid>",
  "sources": [
    {
      "name": "Google Reviews",
      "icon": "G",
      "connected": false  // <-- FALSE! Not User A's selection
    },
    {
      "name": "Booking.com",
      "icon": "B",
      "connected": false  // <-- FALSE!
    },
    {
      "name": "Trip Advisor",
      "icon": "T",
      "connected": false
    }
  ],
  "connected_sources": []  // <-- EMPTY! Different user = different selection
}
```

🎯 **THIS IS THE KEY TEST** ✅
- User B sees **EMPTY sources** for SAME organization
- User B's selection is completely **ISOLATED** from User A
- This proves the per-user filtering is working!

---

## Test 6: User B - Connect TripAdvisor

**Endpoint**: `POST /api/setup/sources/connect`

**Authorization**: User B Token

**Request Body**:
```json
{
  "organization_id": "<org-uuid>",
  "source_name": "Trip Advisor",
  "source_url": null,
  "fetching_frequency": "weekly"
}
```

**Expected Response (200 OK)**:
```json
{
  "message": "Source connected successfully",
  "source_id": "<different-uuid>",
  "organization_id": "<org-uuid>"
}
```

✅ **What this proves**: User B creates their own source record (different source_id)

---

## Test 7: User B - Connect Custom Source

**Endpoint**: `POST /api/setup/sources/custom`

**Authorization**: User B Token

**Request Body**:
```json
{
  "organization_id": "<org-uuid>",
  "source_name": "Custom Review Platform",
  "source_url": "https://reviews.customsite.com/my-property",
  "fetching_frequency": "daily"
}
```

**Expected Response (200 OK)**:
```json
{
  "message": "Source connected successfully",
  "source_id": "<new-uuid>",
  "organization_id": "<org-uuid>"
}
```

✅ **What this proves**: User B can have custom sources (with URLs)

---

## Test 8: User B - Get Sources (Verify Different from User A)

**Endpoint**: `GET /api/setup/sources`

**Authorization**: User B Token

**Parameters**:
```
organization_id = <org-uuid>
```

**Expected Response (200 OK)**:
```json
{
  "organization_id": "<org-uuid>",
  "sources": [
    {
      "name": "Google Reviews",
      "icon": "G",
      "connected": false  // User B didn't select this
    },
    {
      "name": "Booking.com",
      "icon": "B",
      "connected": false  // User B didn't select this
    },
    {
      "name": "Trip Advisor",
      "icon": "T",
      "connected": true  // User B selected this
    }
  ],
  "connected_sources": [
    {
      "source_id": "<uuid-3>",
      "source_name": "Trip Advisor",
      "source_url": null,
      "connected": true,
      "fetching_frequency": "weekly"
    },
    {
      "source_id": "<uuid-4>",
      "source_name": "Custom Review Platform",
      "source_url": "https://reviews.customsite.com/my-property",
      "connected": true,
      "fetching_frequency": "daily"
    }
  ]
}
```

🎯 **COMPLETE ISOLATION CONFIRMED** ✅
- User A: 2 sources (Google + Booking)
- User B: 2 sources (TripAdvisor + Custom)
- Same organization but completely different selections!
- Different source_ids, different fetching_frequencies

---

## Test 9: Database Verification Query

Run this SQL to **PROVE** data separation in database:

```sql
SELECT 
    u.user_name,
    ors.organization_id,
    ors.source_id,
    ors.source_name,
    ors.source_url,
    ors.fetching_frequency,
    ors.is_active,
    ors.user_id  -- <-- Should be different for each user
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.organization_id = '<insert-org-uuid>'
  AND ors.is_active = 1
ORDER BY u.user_name, ors.created_at;
```

**Expected Output**:
| user_name | organization_id | source_id | source_name | source_url | fetching_frequency | is_active | user_id |
|-----------|-----------------|-----------|-------------|------------|-------------------|-----------|---------|
| User A | abc... | uuid-1 | Google Reviews | NULL | daily | 1 | user-a-uuid |
| User A | abc... | uuid-2 | Booking.com | NULL | daily | 1 | user-a-uuid |
| User B | abc... | uuid-3 | Trip Advisor | NULL | weekly | 1 | user-b-uuid |
| User B | abc... | uuid-4 | Custom Review Platform | https://... | daily | 1 | user-b-uuid |

✅ **Notice**: Same organization_id, but different user_ids and sources!

---

## Test 10: User A - Finalize Schedule

**Endpoint**: `POST /api/setup/schedule/finalize`

**Authorization**: User A Token

**Request Body**:
```json
{
  "organization_id": "<org-uuid>",
  "selected_schedule": "daily"
}
```

**Expected Response (200 OK)**:
```json
{
  "message": "Setup schedule finalized successfully",
  "organization_id": "<org-uuid>",
  "selected_schedule": "daily",
  "updated_count": 2  // User A has 2 sources
}
```

✅ **What this proves**: Only User A's sources updated (count = 2, not 4)

---

## Test 11: Verify User A's Frequencies Updated

Run SQL:
```sql
SELECT source_name, fetching_frequency FROM dbo.organization_review_sources
WHERE organization_id = '<org-uuid>'
  AND user_id = '<user-a-uuid>'
  AND is_active = 1
ORDER BY created_at;
```

**Expected**: All User A sources have fetching_frequency = 'daily'

---

## Test 12: User B - Finalize Different Schedule

**Endpoint**: `POST /api/setup/schedule/finalize`

**Authorization**: User B Token

**Request Body**:
```json
{
  "organization_id": "<org-uuid>",
  "selected_schedule": "weekly"
}
```

**Expected Response (200 OK)**:
```json
{
  "message": "Setup schedule finalized successfully",
  "organization_id": "<org-uuid>",
  "selected_schedule": "weekly",
  "updated_count": 2  // User B has 2 sources
}
```

✅ **What this proves**: User B can have different schedule than User A for same org!

---

## Test 13: Final Database Verification

```sql
SELECT 
    u.user_name,
    ors.source_name,
    ors.fetching_frequency  -- Notice different per user
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.organization_id = '<org-uuid>'
  AND ors.is_active = 1
ORDER BY u.user_name, ors.created_at;
```

**Expected Output**:
| user_name | source_name | fetching_frequency |
|-----------|-------------|-------------------|
| User A | Google Reviews | daily |
| User A | Booking.com | daily |
| User B | Trip Advisor | weekly |
| User B | Custom Review Platform | weekly |

✅ **PERFECT**: Same org, different users = different schedules!

---

## Summary Checklist

- [ ] Migration script executed ✅
- [ ] user_id column exists in DB ✅
- [ ] FK constraint created ✅
- [ ] Index created ✅
- [ ] Test 1: User A gets initial sources ✅
- [ ] Test 2-3: User A connects 2 sources ✅
- [ ] Test 4: User A sources confirmed ✅
- [ ] **Test 5: User B sees EMPTY sources (KEY TEST)** ✅
- [ ] Test 6-7: User B connects different sources ✅
- [ ] Test 8: User B sources completely different from User A ✅
- [ ] Test 9: DB shows separate records per user ✅
- [ ] Test 10-12: Schedule finalization per user ✅
- [ ] Test 13: Final DB verification shows complete isolation ✅

**🎉 If all tests pass = Multi-user sources working perfectly!**
