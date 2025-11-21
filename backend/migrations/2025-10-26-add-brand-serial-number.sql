-- Migration: add brand_serial_number to devices
-- Safe multi-step migration for Postgres
BEGIN;

-- 1) Add the column with a default empty string so existing rows have a value
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS brand_serial_number text DEFAULT '';

-- 2) Ensure no NULLs remain (should be covered by DEFAULT for existing rows)
UPDATE devices SET brand_serial_number = '' WHERE brand_serial_number IS NULL;

-- 3) Make the column NOT NULL
ALTER TABLE devices
  ALTER COLUMN brand_serial_number SET NOT NULL;

-- 4) Optionally drop the default if you don't want new rows to automatically get empty string
ALTER TABLE devices
  ALTER COLUMN brand_serial_number DROP DEFAULT;

COMMIT;
