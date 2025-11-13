import { createClient } from '@supabase/supabase-js';

// Force fallback values in production to avoid undefined errors
const FALLBACK_SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.JQQbEn4ORkKR63fvfO0mUOo1hfFPQHgUr_9F2I0NV0E';

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

// Import types from centralized location
import type {
  FiscalDocument,
  FiscalDocumentItem,
  FiscalSeries,
  TfhkaLog
} from '@/types';

// Supabase helpers for fiscal documents
export const fiscalDocumentHelpers = {
  // Get fiscal series for a company
  getFiscalSeries: async (companyId: string): Promise<FiscalSeries[]> => {
    const { data, error } = await supabase
      .from('fiscal_series')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('serie');

    if (error) throw error;
    return data || [];
  },

  // Get next document number for a series
  getNextDocumentNumber: async (companyId: string, serie: string, documentType: string) => {
    const { data, error } = await supabase
      .from('fiscal_series')
      .select('current_number')
      .eq('company_id', companyId)
      .eq('serie', serie)
      .eq('document_type', documentType)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const nextNumber = (data?.current_number || 0) + 1;

    // Update current number
    await supabase
      .from('fiscal_series')
      .update({ current_number: nextNumber })
      .eq('company_id', companyId)
      .eq('serie', serie)
      .eq('document_type', documentType);

    return nextNumber;
  },

  // Create fiscal document with items
  createDocument: async (document: Omit<FiscalDocument, 'id' | 'created_at' | 'updated_at'>, items: Omit<FiscalDocumentItem, 'id' | 'document_id' | 'created_at'>[]) => {
    const { data: doc, error: docError } = await supabase
      .from('fiscal_documents')
      .insert(document)
      .select()
      .single();

    if (docError) throw docError;

    const documentItems = items.map(item => ({
      ...item,
      document_id: doc.id
    }));

    const { error: itemsError } = await supabase
      .from('fiscal_document_items')
      .insert(documentItems);

    if (itemsError) throw itemsError;

    return doc;
  },

  // Log TFHKA API calls
  logTfhkaAction: async (log: Omit<TfhkaLog, 'id' | 'created_at'>) => {
    const { error } = await supabase
      .from('tfhka_logs')
      .insert(log);

    if (error) console.error('Failed to log TFHKA action:', error);
  },

  // Get document with items
  getDocumentWithItems: async (documentId: string) => {
    const { data: document, error: docError } = await supabase
      .from('fiscal_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;

    const { data: items, error: itemsError } = await supabase
      .from('fiscal_document_items')
      .select('*')
      .eq('document_id', documentId);

    if (itemsError) throw itemsError;

    return { document, items };
  },

  // Update document status
  updateDocumentStatus: async (documentId: string, status: FiscalDocument['status'], tfhkaData?: { tfhka_document_id?: string; tfhka_status?: string }) => {
    const updateData: Partial<FiscalDocument> = { status };

    if (tfhkaData) {
      Object.assign(updateData, tfhkaData);
    }

    const { error } = await supabase
      .from('fiscal_documents')
      .update(updateData)
      .eq('id', documentId);

    if (error) throw error;
  }
};