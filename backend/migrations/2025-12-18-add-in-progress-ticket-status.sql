-- Add in_progress ticket status (and keep compatibility with existing 'assigned')
-- Run in Supabase SQL editor

-- If you already ran a previous attempt, the constraint may already exist.
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_status_check;

DO $$
DECLARE r RECORD;
BEGIN
  -- Drop any existing CHECK constraint that validates tickets.status
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tickets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%in%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Allow open / in_progress / done (and legacy assigned)
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('open', 'assigned', 'in_progress', 'done'));

-- Optional backfill: treat legacy assigned as in_progress
UPDATE public.tickets
SET status = 'in_progress'
WHERE status = 'assigned';

NOTIFY pgrst, 'reload schema';
