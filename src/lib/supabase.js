import { createClient } from '@supabase/supabase-js'

const environment = import.meta.env || {}
const supabaseUrl = environment.VITE_SUPABASE_URL
const supabasePublishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
