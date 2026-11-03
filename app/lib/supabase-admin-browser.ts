import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.invalid'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'public-anon-key-placeholder'

// Admin and Clinic accounts must be able to coexist in one browser. A unique
// storage key prevents an admin login from replacing the doctor's session.
export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'medical-line-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
