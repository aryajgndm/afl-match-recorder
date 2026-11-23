import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://awzrvpwtmowtwbdgqrcw.supabase.co') as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SN11e77i-LGnumwjeSqDDg_I6IF_Wjh') as string;

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
