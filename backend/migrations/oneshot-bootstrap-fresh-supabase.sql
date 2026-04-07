-- NPA one-shot bootstrap for a fresh Supabase project
-- Safe to run once on a new project. Mostly idempotent if re-run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enforce maintenance.charges only for Non Comprehensive devices
CREATE OR REPLACE FUNCTION enforce_charges_non_comprehensive()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.charges IS NOT NULL) THEN
    PERFORM 1
    FROM public.devices
    WHERE id = NEW.device_id
      AND lower(trim(device_type)) = 'non comprehensive';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Charges can only be set for non-comprehensive devices';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core tables
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  organization_code TEXT,
  pan TEXT,
  phone_no TEXT,
  email TEXT,
  official_email TEXT,
  gst_no TEXT,
  address TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  auth_user_id UUID,
  auth_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  phone TEXT,
  email TEXT,
  official_email TEXT,
  pan TEXT,
  aadhar TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  auth_user_id UUID,
  auth_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  serial_number TEXT,
  brand_serial_number TEXT NOT NULL DEFAULT '',
  model TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  device_type TEXT NOT NULL DEFAULT 'Comprehensive',
  location TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Yet to Start',
  charges NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'organization', 'technician')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_scope_check CHECK (
    (role = 'admin' AND organization_id IS NULL AND technician_id IS NULL)
    OR (role = 'organization' AND organization_id IS NOT NULL AND technician_id IS NULL)
    OR (role = 'technician' AND technician_id IS NOT NULL AND organization_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  assigned_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_code_unique
  ON public.organizations(organization_code)
  WHERE organization_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_archived ON public.organizations(archived);
CREATE INDEX IF NOT EXISTS idx_organizations_auth_user_id ON public.organizations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_auth_email ON public.organizations(auth_email);
CREATE INDEX IF NOT EXISTS idx_organizations_official_email ON public.organizations(official_email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_serial_number_unique
  ON public.devices(serial_number)
  WHERE serial_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_brand_serial_number_unique_non_empty
  ON public.devices(brand_serial_number)
  WHERE brand_serial_number <> '';

CREATE INDEX IF NOT EXISTS idx_devices_organization_id ON public.devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON public.devices(created_at DESC);

CREATE INDEX IF NOT EXISTS technicians_auth_user_id_idx ON public.technicians(auth_user_id);
CREATE INDEX IF NOT EXISTS technicians_auth_email_idx ON public.technicians(auth_email);
CREATE INDEX IF NOT EXISTS idx_technicians_official_email ON public.technicians(official_email);

CREATE INDEX IF NOT EXISTS idx_maintenance_device_id ON public.maintenance(device_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_technician_id ON public.maintenance(technician_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_organization_id ON public.maintenance(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at ON public.maintenance(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_technician_id ON public.profiles(technician_id);

CREATE INDEX IF NOT EXISTS idx_tickets_org ON public.tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_device ON public.tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_technician ON public.tickets(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);

-- Trigger wiring
DROP TRIGGER IF EXISTS trg_organizations_set_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_technicians_set_updated_at ON public.technicians;
CREATE TRIGGER trg_technicians_set_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_devices_set_updated_at ON public.devices;
CREATE TRIGGER trg_devices_set_updated_at
BEFORE UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_set_updated_at ON public.maintenance;
CREATE TRIGGER trg_maintenance_set_updated_at
BEFORE UPDATE ON public.maintenance
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_set_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_set_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_enforce_charges_non_comprehensive ON public.maintenance;
CREATE TRIGGER trg_enforce_charges_non_comprehensive
BEFORE INSERT OR UPDATE ON public.maintenance
FOR EACH ROW EXECUTE FUNCTION enforce_charges_non_comprehensive();

COMMIT;

-- Refresh PostgREST schema cache in Supabase
NOTIFY pgrst, 'reload schema';

-- Optional: map an existing auth user to admin role (run after creating your admin auth user)
-- INSERT INTO public.profiles (user_id, role)
-- VALUES ('<AUTH_USER_UUID>', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();
