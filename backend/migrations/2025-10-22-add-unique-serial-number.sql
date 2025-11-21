-- Add unique constraint on devices.serial_number
ALTER TABLE devices
ADD CONSTRAINT devices_serial_number_unique UNIQUE (serial_number);

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
