import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = envUrl || `https://${projectId}.supabase.co`;
const anonKey = envAnonKey || publicAnonKey;

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, anonKey);
};
