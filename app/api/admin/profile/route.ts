import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

function tokenClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function serviceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Admin auth env is not configured.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userClient = tokenClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken)

  if (userError || !user) {
    return NextResponse.json({ error: userError?.message || 'Unauthorized' }, { status: 401 })
  }

  // The authenticated token client can read the caller's own profile through
  // RLS. Use service role when configured, but do not make admin login depend
  // on that optional key.
  const admin = supabaseServiceKey ? serviceClient() : userClient
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message || 'Admin profile could not be loaded.' }, { status: 404 })
  }

  if (profile.role !== 'admin' || profile.status !== 'active') {
    return NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, profile })
}
