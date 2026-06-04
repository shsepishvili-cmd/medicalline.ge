import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

function createAnalyticsClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const client = createAnalyticsClient()
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 })
  }

  const { data, error } = await client
    .from('blog_views')
    .select('slug,total_views,unique_visitors,last_viewed_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  return NextResponse.json({
    ok: true,
    views: data?.total_views ?? 0,
    visitors: data?.unique_visitors ?? 0,
    lastViewedAt: data?.last_viewed_at ?? null,
  })
}
