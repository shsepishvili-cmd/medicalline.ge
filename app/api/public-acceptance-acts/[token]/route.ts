import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestIp, getRequestUserAgent } from '@/app/lib/contact-contract-server'
import type { PublicAcceptanceActSummary } from '@/app/lib/acceptance-act-types'

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase is not configured.')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('get_public_acceptance_act_summary', {
      p_public_token: token,
      p_ip_address: getRequestIp(req.headers),
      p_user_agent: getRequestUserAgent(req.headers),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const act = ((data || [])[0] || null) as PublicAcceptanceActSummary | null
    if (!act) {
      return NextResponse.json({ error: 'Acceptance act not found.' }, { status: 404 })
    }

    return NextResponse.json({ act })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not load acceptance act.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
