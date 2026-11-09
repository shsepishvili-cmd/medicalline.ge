import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

function tokenClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function serviceClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) throw new Error('Admin env is not configured.')
  const accessToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) throw new Error('Unauthorized')
  const userClient = tokenClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken)
  if (userError || !user) throw new Error('Unauthorized')
  const admin = serviceClient()
  const { data: profile } = await admin.from('profiles').select('role,status').eq('id', user.id).single()
  if (profile?.role !== 'admin' || profile?.status !== 'active') throw new Error('Forbidden')
  return admin
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request)
    const { data, error } = await admin
      .from('cart_invoice_requests')
      .select('*, items:cart_invoice_request_items(*)')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw error
    return NextResponse.json({ ok: true, requests: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load cart invoice requests.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const id = String(body?.id || '').trim()
    const status = String(body?.status || '').trim()
    if (!id || !['new', 'reviewed', 'invoice_sent', 'closed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request status.' }, { status: 400 })
    }
    const { error } = await admin
      .from('cart_invoice_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update request.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
