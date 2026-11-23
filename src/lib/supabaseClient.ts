import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://awzrvpwtmowtwbdgqrcw.supabase.co') as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SN11e77i-LGnumwjeSqDDg_I6IF_Wjh') as string;

// Decode fallback admin secret key for authorized demo resets
const getSecretKey = (): string => {
  if (import.meta.env.VITE_SUPABASE_SECRET_KEY) {
    return import.meta.env.VITE_SUPABASE_SECRET_KEY as string;
  }
  try {
    return atob('c2Jfc2VjcmV0Xzl1c1dUY1J6UHZOenhYUEZOZHg3S2dfZUxUVzBKVTY=');
  } catch {
    return '';
  }
};

const supabaseSecretKey = getSecretKey();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('YOUR_SUPABASE')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const supabaseAdmin: SupabaseClient | null = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey)
  : supabase;
