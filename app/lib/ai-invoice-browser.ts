'use client'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.invalid'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'public-anon-key-placeholder'

export const aiInvoiceSupabase = createClient(url, anonKey, {
  auth: {
    storageKey: 'medical-line-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
