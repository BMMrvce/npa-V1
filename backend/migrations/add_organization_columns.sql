-- ========================================
-- COMPLETE DATABASE MIGRATION FOR NPA APP
-- Run this in Supabase SQL Editor
-- ========================================

-- First, drop the old 'code' column NOT NULL constraint or rename it
ALTER TABLE organizations 
ALTER COLUMN code DROP NOT NULL;

-- OR if 'code' should be renamed to 'organization_code':
-- ALTER TABLE organizations RENAME COLUMN code TO organization_code;

-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS organization_code TEXT,
ADD COLUMN IF NOT EXISTS pan TEXT,
ADD COLUMN IF NOT EXISTS phone_no TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS gst_no TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create unique constraint on organization_code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_code_unique ON organizations(organization_code) WHERE organization_code IS NOT NULL;

-- Create index on archived for filtering
CREATE INDEX IF NOT EXISTS idx_organizations_archived ON organizations(archived);

-- Add missing columns to devices table (if needed)
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add missing columns to technicians table (if needed)
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add missing columns to maintenance table (if needed)
ALTER TABLE maintenance
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
