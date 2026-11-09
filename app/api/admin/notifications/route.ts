import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

function client(key: string, accessToken?: string) {
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}

async function requireAdmin(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) throw new Error('Admin SMS is not configured.')
  const accessToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) throw new Error('Unauthorized')
  const userClient = client(supabaseAnonKey, accessToken)
  const { data: authData, error: authError } = await userClient.auth.getUser(accessToken)
  if (authError || !authData.user) throw new Error('Unauthorized')
  const adminClient = client(supabaseServiceKey)
  const { data: profile } = await adminClient.from('profiles').select('role, status').eq('id', authData.user.id).single()
  if (profile?.role !== 'admin' || profile.status !== 'active') throw new Error('Forbidden')
  return adminClient
}

export async function POST(request: Request) {
  try {
    const adminClient = await requireAdmin(request)
    if (!isSmsProviderConfigured()) return NextResponse.json({ error: 'GoSMS ჯერ არ არის კონფიგურირებული.' }, { status: 503 })
    const body = await request.json().catch(() => null)
    const message = String(body?.message || '').trim()
    const userIds = Array.isArray(body?.userIds) ? [...new Set(body.userIds.map(String))].slice(0, 500) : []
    if (!message || message.length > 480) return NextResponse.json({ error: 'SMS ტექსტი უნდა იყოს 1-დან 480 სიმბოლომდე.' }, { status: 400 })
    if (userIds.length === 0) return NextResponse.json({ error: 'მიმღებები არ არის არჩეული.' }, { status: 400 })

    const { data: profiles, error } = await adminClient.from('profiles').select('id, phone, status').in('id', userIds)
    if (error) throw error
    const recipients = (profiles || []).filter((profile) => profile.phone && profile.status !== 'blocked')
    let sent = 0
    const failures: Array<{ id: string; error: string }> = []

    for (const profile of recipients) {
      try {
        await sendContractSms(profile.phone, message)
        sent += 1
      } catch (sendError) {
        failures.push({ id: profile.id, error: sendError instanceof Error ? sendError.message : 'SMS failed' })
      }
    }

    console.info('[admin-notifications] SMS batch completed', { requested: userIds.length, recipients: recipients.length, sent, failed: failures.length })
    return NextResponse.json({ ok: true, sent, failed: failures.length, failures })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMS დაგზავნა ვერ შესრულდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    console.error('[admin-notifications] SMS batch failed', { error: message })
    return NextResponse.json({ error: message }, { status })
  }
}
