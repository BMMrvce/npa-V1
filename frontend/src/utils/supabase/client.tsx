import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = envUrl || `https://${projectId}.supabase.co`;
const anonKey = envAnonKey || publicAnonKey;

let client: ReturnType<typeof createSupabaseClient> | null = null;

export const createClient = () => {
  if (!client) {
    client = createSupabaseClient(supabaseUrl, anonKey);
  }
  return client;
};
