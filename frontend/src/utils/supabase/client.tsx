import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = envUrl || `https://${projectId}.supabase.co`;
const anonKey = envAnonKey || publicAnonKey;

let client: ReturnType<typeof createSupabaseClient> | null = null;
let clientConfig: { supabaseUrl: string; anonKey: string } | null = null;

export const createClient = () => {
  const nextConfig = { supabaseUrl, anonKey };

  if (
    !client ||
    !clientConfig ||
    clientConfig.supabaseUrl !== nextConfig.supabaseUrl ||
    clientConfig.anonKey !== nextConfig.anonKey
  ) {
    client = createSupabaseClient(supabaseUrl, anonKey);
    clientConfig = nextConfig;
  }

  return client;
};
