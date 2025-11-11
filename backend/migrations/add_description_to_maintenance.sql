-- Add description column to maintenance table if it doesn't exist
ALTER TABLE maintenance
ADD COLUMN IF NOT EXISTS description TEXT;

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
