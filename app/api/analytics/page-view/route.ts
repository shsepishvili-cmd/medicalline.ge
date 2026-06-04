import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

function createAnalyticsClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function hashVisitorId(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(request: Request) {
  const client = createAnalyticsClient()
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 })
  }

  const payload = await request.json().catch(() => null)
  const path = typeof payload?.path === 'string' ? payload.path : '/'
  const title = typeof payload?.title === 'string' ? payload.title : null
  const visitorId = typeof payload?.visitorId === 'string' ? payload.visitorId : ''
  const visitorHash = visitorId ? hashVisitorId(visitorId) : null

  const { data, error } = await client.rpc('record_page_view', {
    p_path: path,
    p_page_title: title,
    p_visitor_hash: visitorHash,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, analytics: data })
}
