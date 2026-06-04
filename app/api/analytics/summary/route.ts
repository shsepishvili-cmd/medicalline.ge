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

export async function GET() {
  const client = createAnalyticsClient()
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 })
  }

  const [pages, blogs] = await Promise.all([
    client
      .from('analytics_pages')
      .select('path,page_title,total_views,unique_visitors,last_viewed_at')
      .order('total_views', { ascending: false })
      .limit(20),
    client
      .from('blog_views')
      .select('slug,total_views,unique_visitors,last_viewed_at')
      .order('total_views', { ascending: false })
      .limit(20),
  ])

  if (pages.error || blogs.error) {
    return NextResponse.json(
      { ok: false, error: pages.error?.message || blogs.error?.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    pages: pages.data || [],
    blogs: blogs.data || [],
    totals: {
      pageViews: (pages.data || []).reduce((sum, item: any) => sum + Number(item.total_views || 0), 0),
      blogViews: (blogs.data || []).reduce((sum, item: any) => sum + Number(item.total_views || 0), 0),
    },
  })
}
