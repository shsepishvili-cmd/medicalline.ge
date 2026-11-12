import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''
  if (!url || !key) throw new Error('Supabase service env is not configured.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
