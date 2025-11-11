-- Drop NOT NULL constraint on code column in devices table
ALTER TABLE devices ALTER COLUMN code DROP NOT NULL;

-- Add missing columns to devices table
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
