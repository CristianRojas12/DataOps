import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vcjsmspejsecukgybjwv.supabase.co'
const supabaseAnonKey = 'sb_publishable_cw5PfOk6HolY8j_FWR4mdQ_Vt-sxaXh'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
