-- Safe migration: create a unique partial index on brand_serial_number only if it doesn't already exist.
-- This avoids errors when the index is already present or when there are no devices yet.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_devices_brand_serial_number_unique_non_empty'
  ) THEN
    CREATE UNIQUE INDEX idx_devices_brand_serial_number_unique_non_empty
    ON devices (brand_serial_number)
    WHERE brand_serial_number <> '';
  END IF;
END$$;
