import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseStorageConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseStorageConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const SUPABASE_STORAGE_BUCKET = 'comic-pages';
