import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
const statusToken = process.env.AI_OPERATOR_STATUS_TOKEN?.trim() || ''

function isAuthorized(request: Request) {
  if (!statusToken) return true
  const auth = request.headers.get('authorization') || ''
  const headerToken = request.headers.get('x-ai-operator-token') || ''
  return auth === `Bearer ${statusToken}` || headerToken === statusToken
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = serviceKey || anonKey
  if (!supabaseUrl || !key) {
    return NextResponse.json({ callsEnabled: false, error: 'Supabase is not configured.' }, { status: 503 })
  }

  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.rpc('get_ai_operator_status')
  if (error) {
    return NextResponse.json({ callsEnabled: false, error: error.message }, { status: 500 })
  }

  const status = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    callsEnabled: status?.calls_enabled === true,
    disabledReason: status?.disabled_reason || null,
    updatedAt: status?.updated_at || null,
  })
}
