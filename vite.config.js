import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Map the Supabase environment variables from Vercel integration to Vite format
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    // Optional: set LOG_LEVEL or VITE_LOG_LEVEL to control runtime logging
    // ('silent' | 'error' | 'warn' | 'info' | 'debug'). Defaults to 'debug' in dev.
    'import.meta.env.VITE_LOG_LEVEL': JSON.stringify(
      process.env.VITE_LOG_LEVEL || process.env.LOG_LEVEL || ''
    ),
  },
})
