import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

const isValidSupabaseUrl = (() => {
  if (!supabaseUrl) return false

  try {
    const url = new URL(supabaseUrl)
    return Boolean(url.protocol && url.hostname)
  } catch {
    return false
  }
})()

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    : !isValidSupabaseUrl
      ? 'NEXT_PUBLIC_SUPABASE_URL is invalid.'
      : null

export const isSupabaseReady = !supabaseConfigError

export const supabase = createClient(
  isValidSupabaseUrl ? supabaseUrl : 'https://placeholder.invalid',
  supabaseAnonKey || 'public-anon-key-placeholder',
)
