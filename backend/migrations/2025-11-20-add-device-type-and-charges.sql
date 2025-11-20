-- Add device_type to devices table (default to 'Comprehensive' to avoid allowing charges on existing records)
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'Comprehensive';

-- Add charges column to maintenance (nullable)
ALTER TABLE maintenance
ADD COLUMN IF NOT EXISTS charges NUMERIC(10,2);

-- Create trigger function to ensure charges are only set for Non Comprehensive devices
CREATE OR REPLACE FUNCTION enforce_charges_non_comprehensive()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.charges IS NOT NULL) THEN
    -- Check the referenced device has device_type = 'Non Comprehensive'
    -- Use trimmed, lower-cased comparison to avoid failures from extra spaces or case differences
    PERFORM 1 FROM devices WHERE id = NEW.device_id AND lower(trim(device_type)) = 'non comprehensive';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Charges can only be set for non-comprehensive devices';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists to be idempotent)
DROP TRIGGER IF EXISTS trg_enforce_charges_non_comprehensive ON maintenance;
CREATE TRIGGER trg_enforce_charges_non_comprehensive
BEFORE INSERT OR UPDATE ON maintenance
FOR EACH ROW EXECUTE FUNCTION enforce_charges_non_comprehensive();

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
