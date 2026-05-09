import { createClient } from '@supabase/supabase-js'
import { createLogger, getLevel } from './logger'

const log = createLogger('supabase')

// Environment variables are mapped from NEXT_PUBLIC_* to VITE_* in vite.config.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  log.error('Faltan variables de entorno. Verifica que la integración de Supabase esté conectada.')
} else {
  log.debug('cliente inicializado', { url: SUPABASE_URL, logLevel: getLevel() })
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')
