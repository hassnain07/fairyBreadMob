import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { secureStorage } from './secureStorage';

// Placeholder for Database types — will be generated from supabase
type Database = any;

export type AppSupabase = SupabaseClient<Database>;

export function createAppSupabase(url: string, anonKey: string, opts?: { storage?: unknown; detectSessionInUrl?: boolean }): AppSupabase {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: opts?.detectSessionInUrl ?? true,
      ...(opts?.storage ? { storage: opts.storage as never } : {}),
    },
  });
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createAppSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
  storage: secureStorage,
  detectSessionInUrl: false,
});

// Token auto-refresh only while the app is foregrounded
AppState.addEventListener('change', (s) => {
  if (s === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
