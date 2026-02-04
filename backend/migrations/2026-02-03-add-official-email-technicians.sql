-- Add official_email column to technicians table
-- This stores the official email address where credentials are sent

ALTER TABLE technicians
ADD COLUMN official_email VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX idx_technicians_official_email ON technicians(official_email);

-- Add comment for clarity
COMMENT ON COLUMN technicians.official_email IS 'Official email address where account credentials are sent';
