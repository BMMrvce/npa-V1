-- Drop NOT NULL constraint on code column in technicians table
ALTER TABLE technicians ALTER COLUMN code DROP NOT NULL;

-- Add missing columns to technicians table (if any)
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
