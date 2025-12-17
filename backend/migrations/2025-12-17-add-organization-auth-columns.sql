-- Add columns to link organizations to Supabase Auth users (org portal login)
-- Idempotent

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS auth_email TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_auth_user_id ON organizations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_auth_email ON organizations(auth_email);

NOTIFY pgrst, 'reload schema';
