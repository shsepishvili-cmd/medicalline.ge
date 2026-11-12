import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

function adminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Likes API env is not configured.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const raw = (searchParams.get('ids') || '').split(',').map((v) => v.trim()).filter(Boolean)
  const videoIds = raw.filter(isUuid).slice(0, 300)
  if (videoIds.length === 0) {
    return NextResponse.json({ ok: true, likes: {} })
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('academy_video_likes')
    .select('video_id')
    .in('video_id', videoIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const likes: Record<string, number> = {}
  for (const id of videoIds) likes[id] = 0
  for (const row of data || []) {
    likes[row.video_id] = (likes[row.video_id] || 0) + 1
  }

  return NextResponse.json({ ok: true, likes })
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Likes API env is not configured.' }, { status: 500 })
  }

  const body = await request.json().catch(() => null) as {
    videoId?: string
    deviceId?: string
  } | null

  const videoId = (body?.videoId || '').trim()
  const deviceId = (body?.deviceId || '').trim()

  if (!isUuid(videoId)) {
    return NextResponse.json({ error: 'Invalid video id.' }, { status: 400 })
  }
  if (deviceId.length < 8) {
    return NextResponse.json({ error: 'Invalid device id.' }, { status: 400 })
  }

  const supabase = adminClient()
  const { error } = await supabase
    .from('academy_video_likes')
    .upsert(
      { video_id: videoId, device_id: deviceId },
      { onConflict: 'video_id,device_id', ignoreDuplicates: true },
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { count, error: countError } = await supabase
    .from('academy_video_likes')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId)

  if (countError) {
    return NextResponse.json({ ok: true, liked: true })
  }

  return NextResponse.json({ ok: true, liked: true, count: count || 0 })
}
