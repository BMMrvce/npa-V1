-- Migration: add unique partial index on brand_serial_number for non-empty values
-- This enforces that two devices cannot have the same non-empty brand serial number,
-- while allowing empty strings (if your UI uses empty string for 'none').
BEGIN;

-- Create a unique index for non-empty brand_serial_number values
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_brand_serial_number_unique_non_empty
  ON devices (brand_serial_number)
  WHERE brand_serial_number <> '';

COMMIT;
