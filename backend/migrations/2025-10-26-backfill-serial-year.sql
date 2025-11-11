-- Migration: backfill year into serial_number values that are missing the YEAR component
-- This will update serials that do NOT match the pattern: NPA-ORGCODE-YYYY-XXXXXX
-- It uses the device's created_at year when available, otherwise the current year.

BEGIN;

-- Preview rows that will be affected (run this SELECT first to review)
-- SELECT id, serial_number, organization_id, organization_code, created_at
-- FROM devices
-- WHERE serial_number !~ '^[Nn][Pp][Aa]-[^-]+-\d{4}-\d{6}$';

-- Update serial_number for rows missing the YEAR component.
-- Strategy:
-- 1) Extract the last numeric group from the existing serial (if present) to preserve the sequence number.
-- 2) Use the device.created_at year (or current year if NULL) as the YEAR part.
-- 3) Use organization_code (stripped of a leading 'NPA-') where available; fall back to organization_id.

WITH to_update AS (
  SELECT
    id,
    serial_number,
    COALESCE(organization_code, '') AS org_code,
    COALESCE(EXTRACT(YEAR FROM created_at)::int, EXTRACT(YEAR FROM now())::int) AS yr,
    -- capture trailing digits from serial_number (like 000001). If none, use row_number per org later
    (regexp_matches(serial_number, '(\d+)$'))[1] AS trailing_digits
  FROM devices
  WHERE serial_number IS NOT NULL
    AND serial_number !~ '^[Nn][Pp][Aa]-[^-]+-\d{4}-\d{6}$'
)

-- First, for rows that already have a trailing numeric group, update using that number
UPDATE devices d
SET serial_number = (
  'NPA-' || regexp_replace(t.org_code, '^NPA-', '') || '-' || t.yr::text || '-' || lpad(t.trailing_digits, 6, '0')
)
FROM to_update t
WHERE d.id = t.id
  AND t.trailing_digits IS NOT NULL
  AND t.trailing_digits <> '';

-- For the remaining rows (no trailing digits), assign a sequence per org+year based on created_at ordering
WITH remaining AS (
  SELECT d.id, COALESCE(regexp_replace(d.organization_code, '^NPA-', ''), d.organization_id::text) AS org_code, COALESCE(EXTRACT(YEAR FROM d.created_at)::int, EXTRACT(YEAR FROM now())::int) AS yr
  FROM devices d
  WHERE d.serial_number IS NOT NULL
    AND d.serial_number !~ '^[Nn][Pp][Aa]-[^-]+-\d{4}-\d{6}$'
    AND (regexp_matches(d.serial_number, '(\d+)$'))[1] IS NULL
)
,
numbered AS (
  SELECT id, org_code, yr,
    ROW_NUMBER() OVER (PARTITION BY org_code, yr ORDER BY id) AS seq
  FROM remaining
)
UPDATE devices d
SET serial_number = ('NPA-' || n.org_code || '-' || n.yr::text || '-' || lpad(n.seq::text, 6, '0'))
FROM numbered n
WHERE d.id = n.id;

COMMIT;
