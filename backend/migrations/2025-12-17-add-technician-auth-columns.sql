-- Add auth linkage columns for technician portal login

alter table technicians
  add column if not exists auth_user_id uuid,
  add column if not exists auth_email text;

create index if not exists technicians_auth_user_id_idx on technicians(auth_user_id);
create index if not exists technicians_auth_email_idx on technicians(auth_email);

-- Notify PostgREST / schema cache refresh (Supabase)
notify pgrst, 'reload schema';
