import { createClient } from '@supabase/supabase-js'

// Try VITE_ prefix (standard for Vite), fallback to NEXT_PUBLIC_ (as defined by user in GitHub Secrets),
// fallback to hardcoded value to prevent app from breaking if env vars are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcjsmspejsecukgybjwv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cw5PfOk6HolY8j_FWR4mdQ_Vt-sxaXh'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
