-- Add official_email column to organizations table
-- This stores the official email address where credentials are sent

ALTER TABLE organizations
ADD COLUMN official_email VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX idx_organizations_official_email ON organizations(official_email);

-- Add comment for clarity
COMMENT ON COLUMN organizations.official_email IS 'Official email address where account credentials are sent';
