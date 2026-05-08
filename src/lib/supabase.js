import { createClient } from '@supabase/supabase-js'

// Environment variables are mapped from NEXT_PUBLIC_* to VITE_* in vite.config.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing environment variables. Please check that the Supabase integration is connected.')
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')
