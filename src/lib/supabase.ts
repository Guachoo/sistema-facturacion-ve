import { createClient } from '@supabase/supabase-js';

// Debug environment variables
console.log('Environment variables debug:', {
  allEnvVars: import.meta.env,
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? '[KEY_EXISTS]' : '[KEY_MISSING]'
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supfddcbyfuzvxsrzwio.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

console.log('Supabase Config:', {
  url: supabaseUrl,
  urlType: typeof supabaseUrl,
  urlLength: supabaseUrl?.length,
  hasKey: !!supabaseAnonKey,
  keyType: typeof supabaseAnonKey,
  keyLength: supabaseAnonKey?.length
});

// Validate credentials are strings and not empty
if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  console.error('Invalid Supabase URL:', supabaseUrl);
  throw new Error('URL de Supabase inválida o faltante');
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  console.error('Invalid Supabase anon key:', supabaseAnonKey);
  throw new Error('Clave anónima de Supabase inválida o faltante');
}

// Create Supabase client
let supabase: any;

try {
  supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });

  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Error creating Supabase client:', error);
  throw new Error('Error al crear cliente de Supabase');
}

export { supabase };