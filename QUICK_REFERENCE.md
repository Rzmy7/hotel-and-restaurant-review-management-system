# QUICK REFERENCE CARD - Verification Flow

## RIGHT NOW: Check Current State

Copy this query and run in SQL Server:
```sql
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id');
```

**If result is NULL** → Migration not applied yet (expected)  
**If result is 4** → Migration already applied, skip to Phase 3

---

## THEN: Apply Migration

Copy this entire script and run:
```sql
IF COL_LENGTH('dbo.organization_review_sources', 'user_id') IS NULL
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD user_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_org_review_sources_user'
      AND parent_object_id = OBJECT_ID('dbo.organization_review_sources'))
BEGIN
    ALTER TABLE dbo.organization_review_sources
    ADD CONSTRAINT FK_org_review_sources_user
        FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
        ON DELETE CASCADE;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_org_review_sources_user_org'
      AND object_id = OBJECT_ID('dbo.organization_review_sources'))
BEGIN
    CREATE INDEX IX_org_review_sources_user_org
    ON dbo.organization_review_sources(user_id, organization_id);
END;

PRINT 'Migration complete!';
```

---

## VERIFY MIGRATION Applied

Run this to confirm migration worked:
```sql
SELECT COL_LENGTH('dbo.organization_review_sources', 'user_id') AS result;
```

Should return: **4** (If NULL = something went wrong)

---

## TEST in Swagger (Multi-User)

### User A Test:
```
GET /api/setup/sources?organization_id=<org_id>
Auth: Bearer <user_a_token>
→ Result: EMPTY sources (first time)

POST /api/setup/sources/connect
Body: {"source_name": "Google Reviews", "organization_id": "<org_id>", "source_url": null, "fetching_frequency": "daily"}
→ Result: Success with source_id

Repeat for Booking.com
```

### Switch to User B:
```
GET /api/setup/sources?organization_id=<org_id>
Auth: Bearer <user_b_token>
→ Result: EMPTY sources! (Different user, same org)

This proves User B can't see User A's sources! ✅
```

### User B Connects:
```
POST /api/setup/sources/connect
Body: {"source_name": "Trip Advisor", "organization_id": "<org_id>", "source_url": null, "fetching_frequency": "weekly"}
→ Result: Success with DIFFERENT source_id than User A

POST /api/setup/sources/custom
Body: {"source_name": "Custom URL", "organization_id": "<org_id>", "source_url": "https://custom.com", "fetching_frequency": "daily"}
→ Result: Success
```

### Final DB Check:
```sql
SELECT 
    u.user_name,
    ors.source_name,
    ors.fetching_frequency
FROM dbo.organization_review_sources ors
JOIN dbo.users u ON ors.user_id = u.user_id
WHERE ors.organization_id = '<org_id>'
ORDER BY u.user_name;
```

**Expected**: 
- User A: Google, Booking (daily)
- User B: TripAdvisor, Custom URL (weekly)

**If different = SUCCESS!** ✅

---

## Files to Reference

1. **COMPLETE_VERIFICATION_FLOW.md** ← Start here! (Step-by-step everything)
2. **BEFORE_MIGRATION_CHECKS.sql** ← Run BEFORE migration
3. **AFTER_MIGRATION_CHECKS.sql** ← Run AFTER migration  
4. **SWAGGER_TESTING_GUIDE.md** ← Detailed Swagger tests
5. **TROUBLESHOOTING.md** ← If something fails
6. **BEFORE_AFTER_COMPARISON.md** ← Visual comparison

---

## Success Indicators ✅

- [ ] COL_LENGTH returns 4 (column exists)
- [ ] FK constraint FK_org_review_sources_user exists
- [ ] Index IX_org_review_sources_user_org exists
- [ ] User A sees 2 sources
- [ ] User B sees EMPTY sources (same org!)
- [ ] User B creates 2 different sources
- [ ] DB query shows separate records per user
- [ ] Different fetching frequencies per user

---

## Quick Troubleshoot

**Migration script fails?** → Run without IF EXISTS checks OR check TROUBLESHOOTING.md

**User B still sees User A's sources?** → Migration not applied, check Phase 1

**DB query shows NULL user_id?** → Old data from before migration, that's normal

**Swagger test fails with 403?** → User not in organization, verify in dbo.user_organizations

**Still seeing same columns?** → Migration script wasn't executed, check Phase 2

---

## Next: Full Documentation

👉 Open **COMPLETE_VERIFICATION_FLOW.md** for full step-by-step guide
