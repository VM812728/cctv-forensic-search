import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables safely
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Diagnostic flag to determine if valid Supabase connection keys are provided
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Configuration] Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing or set to placeholder. ' +
    'Please set these environment variables in project settings.'
  );
}

// Create and export the Supabase client singleton
// Uses safe fallback strings to prevent client initialization crashes during pre-configuration builds
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
