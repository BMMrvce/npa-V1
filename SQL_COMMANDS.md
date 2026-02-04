# 📋 Copy-Paste SQL Commands

## For Supabase SQL Editor

### Option 1: Run Individual Queries

#### Query 1: Add Column to Organizations

```sql
ALTER TABLE organizations
ADD COLUMN official_email VARCHAR(255);
```

#### Query 2: Create Index on Organizations

```sql
CREATE INDEX idx_organizations_official_email
ON organizations(official_email);
```

#### Query 3: Add Column to Technicians

```sql
ALTER TABLE technicians
ADD COLUMN official_email VARCHAR(255);
```

#### Query 4: Create Index on Technicians

```sql
CREATE INDEX idx_technicians_official_email
ON technicians(official_email);
```

---

### Option 2: Run All at Once

Copy and paste this entire block:

```sql
-- Add official_email column to organizations
ALTER TABLE organizations
ADD COLUMN official_email VARCHAR(255);

-- Create index for organizations
CREATE INDEX idx_organizations_official_email
ON organizations(official_email);

-- Add official_email column to technicians
ALTER TABLE technicians
ADD COLUMN official_email VARCHAR(255);

-- Create index for technicians
CREATE INDEX idx_technicians_official_email
ON technicians(official_email);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('organizations', 'technicians')
AND column_name = 'official_email';
```

---

## How to Run in Supabase

1. Go to https://supabase.com → Select your project
2. Click **SQL Editor** (top menu)
3. Click **New Query**
4. Copy & paste one of the blocks above
5. Click **Run** (Ctrl+Enter or Cmd+Enter)
6. You should see: `"Query executed successfully"`

---

## Verify It Worked

Run this query to check:

```sql
-- Check if columns exist
SELECT
  t.table_name,
  c.column_name,
  c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c
  ON t.table_name = c.table_name
WHERE t.table_name IN ('organizations', 'technicians')
AND c.column_name = 'official_email'
ORDER BY t.table_name;
```

You should see:

```
table_name      | column_name    | data_type
----------------|----------------|----------
organizations   | official_email | character varying
technicians     | official_email | character varying
```

---

## View the New Columns

### See Organizations Table Structure

```sql
SELECT * FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;
```

### See Technicians Table Structure

```sql
SELECT * FROM information_schema.columns
WHERE table_name = 'technicians'
ORDER BY ordinal_position;
```

---

## Check Indexes

```sql
-- List all indexes on organizations
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organizations'
AND indexname LIKE '%official%';

-- List all indexes on technicians
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'technicians'
AND indexname LIKE '%official%';
```

Expected result:

```
indexname                          | indexdef
------------------------------------|----------------------------------------
idx_organizations_official_email   | CREATE INDEX idx_organizations_official_email...
idx_technicians_official_email     | CREATE INDEX idx_technicians_official_email...
```

---

## Query Data Examples

### Find Organizations by Official Email

```sql
SELECT id, name, email, official_email
FROM organizations
WHERE official_email = 'admin@company.com';
```

### Find All Organizations with Official Email Set

```sql
SELECT id, name, email, official_email
FROM organizations
WHERE official_email IS NOT NULL
ORDER BY created_at DESC;
```

### Find All Technicians with Official Email Set

```sql
SELECT id, name, email, official_email
FROM technicians
WHERE official_email IS NOT NULL
ORDER BY created_at DESC;
```

### Get Full Details for an Organization

```sql
SELECT
  id,
  name,
  organization_code,
  email,
  official_email,
  pan,
  phone_no,
  gst_no,
  auth_user_id,
  auth_email,
  created_at,
  updated_at
FROM organizations
WHERE id = 'YOUR_ORG_ID';
```

### Get Full Details for a Technician

```sql
SELECT
  id,
  name,
  code,
  email,
  official_email,
  phone,
  pan,
  aadhar,
  auth_user_id,
  auth_email,
  created_at,
  updated_at
FROM technicians
WHERE id = 1;
```

---

## Update Official Email (If Needed)

### Update Organization Official Email

```sql
UPDATE organizations
SET official_email = 'newemail@company.com'
WHERE id = 'YOUR_ORG_ID';
```

### Update Technician Official Email

```sql
UPDATE technicians
SET official_email = 'newemail@company.com'
WHERE id = 1;
```

---

## Delete Official Email (If Needed)

### Clear Organization Official Email

```sql
UPDATE organizations
SET official_email = NULL
WHERE id = 'YOUR_ORG_ID';
```

### Clear Technician Official Email

```sql
UPDATE technicians
SET official_email = NULL
WHERE id = 1;
```

---

## Troubleshooting Queries

### Check if Column Already Exists

```sql
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name = 'official_email';
```

Result:

- `1` = Column exists ✅
- `0` = Column doesn't exist (run migration)

### Check Column Data Type

```sql
SELECT data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name = 'official_email';
```

### List All Columns in Organizations

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;
```

### Count Records with Official Email

```sql
SELECT
  COUNT(*) as total,
  COUNT(official_email) as with_email,
  COUNT(CASE WHEN official_email IS NULL THEN 1 END) as without_email
FROM organizations;
```

---

## Statistics Queries

### Email Distribution

```sql
SELECT
  'Organizations' as type,
  COUNT(*) as total,
  COUNT(official_email) as with_email
FROM organizations

UNION ALL

SELECT
  'Technicians' as type,
  COUNT(*) as total,
  COUNT(official_email) as with_email
FROM technicians;
```

### Recent Signups with Official Email

```sql
SELECT
  name,
  email,
  official_email,
  created_at
FROM organizations
WHERE official_email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## Rollback (If Needed)

If you need to remove the columns:

```sql
-- Drop columns
ALTER TABLE organizations DROP COLUMN IF EXISTS official_email;
ALTER TABLE technicians DROP COLUMN IF EXISTS official_email;

-- Drop indexes (if exists)
DROP INDEX IF EXISTS idx_organizations_official_email;
DROP INDEX IF EXISTS idx_technicians_official_email;
```

⚠️ This will DELETE all stored official email data!

---

## Common SQL Errors & Solutions

### Error: "column already exists"

**Solution:** Column already added. Run the verification query above.

### Error: "syntax error"

**Solution:** Check for typos. Copy from this file exactly.

### Error: "permission denied"

**Solution:** Make sure you're using the service role key or admin account.

### Error: "table not found"

**Solution:** Table names are case-sensitive. Use `organizations` (lowercase).

---

## Quick Copy-Paste Bundle

For fastest setup, copy and paste this entire block at once:

```sql
-- Migration: Add official_email columns
-- Date: 2026-02-03

-- Organizations table
ALTER TABLE organizations ADD COLUMN official_email VARCHAR(255);
CREATE INDEX idx_organizations_official_email ON organizations(official_email);

-- Technicians table
ALTER TABLE technicians ADD COLUMN official_email VARCHAR(255);
CREATE INDEX idx_technicians_official_email ON technicians(official_email);

-- Verify
SELECT 'Migrations completed successfully' as status;
```

---

## After Running These Queries

1. ✅ Backend can save official_email
2. ✅ Frontend can send it in API
3. ✅ Email service can use it
4. ✅ Database can store it
5. ✅ You can query it

Next: Go to [EMAIL_SETUP_GUIDE.md](./EMAIL_SETUP_GUIDE.md) Step 2!

---

**Need Help?**

- See [EMAIL_SETUP_GUIDE.md](./EMAIL_SETUP_GUIDE.md) Step 1 for visual guide
- See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for summary
