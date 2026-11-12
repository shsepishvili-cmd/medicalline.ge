import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

export function getBearerToken(request: Request) {
  return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
}

export function createClinicTokenClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) throw new Error('Unauthorized')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

export async function requireClinicUser(request: Request) {
  const accessToken = getBearerToken(request)
  const client = createClinicTokenClient(accessToken)
  const { data: { user }, error } = await client.auth.getUser(accessToken)
  if (error || !user) throw new Error('Unauthorized')
  const { data: profile, error: profileError } = await client
    .from('profiles').select('id, full_name, clinic_name, city, phone, role, status').eq('id', user.id).single()
  if (profileError || !profile || profile.status !== 'active') throw new Error('Forbidden')
  return { user, profile, client, accessToken }
}

export function createClinicServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service role is not configured.')
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

