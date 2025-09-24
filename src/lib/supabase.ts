import { createClient } from '@supabase/supabase-js';

// Force fallback values in production to avoid undefined errors
const FALLBACK_SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

// Robust environment variable handling for production
function getEnvVar(key: string, fallback: string): string {
  const value = import.meta.env[key];

  // Log for debugging in production
  console.log(`Env var ${key}:`, {
    exists: value !== undefined,
    type: typeof value,
    length: value?.length || 0
  });

  // Ensure we return a valid string
  if (value && typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  console.warn(`Using fallback for ${key}`);
  return fallback;
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', FALLBACK_SUPABASE_URL);
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', FALLBACK_SUPABASE_KEY);

// Additional validation to prevent header issues
if (typeof supabaseUrl !== 'string' || supabaseUrl.length < 10) {
  throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
}

if (typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length < 10) {
  throw new Error(`Invalid Supabase key: ${supabaseAnonKey.substring(0, 20)}...`);
}

console.log('Supabase client initializing with:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey.length,
  env: import.meta.env.MODE
});

// Create client with explicit string values to prevent header errors
export const supabase = createClient(
  String(supabaseUrl),
  String(supabaseAnonKey),
  {
    auth: {
      autoRefreshToken: false, // Disable to avoid token refresh header issues
      persistSession: false,   // Disable to avoid session header issues
    }
  }
);