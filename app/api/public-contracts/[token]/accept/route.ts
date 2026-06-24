import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestIp, getRequestUserAgent } from '@/app/lib/contact-contract-server'

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase is not configured.')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const body = await req.json().catch(() => ({}))
    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('accept_public_contract', {
      p_public_token: token,
      p_otp_code: String(body?.otpCode || ''),
      p_accept_terms: Boolean(body?.acceptTerms),
      p_ip_address: getRequestIp(req.headers),
      p_user_agent: getRequestUserAgent(req.headers),
      p_phone: body?.phone ? String(body.phone) : null,
      p_email: body?.email ? String(body.email) : null,
      p_identity_suffix: body?.identitySuffix ? String(body.identitySuffix) : null,
      p_acceptor_name: body?.acceptorName ? String(body.acceptorName) : null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (data || [])[0]
    if (!result?.ok) {
      return NextResponse.json({ error: result?.message || 'Acceptance failed.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, status: result.status })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Acceptance failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
