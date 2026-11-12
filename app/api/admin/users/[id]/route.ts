import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

function client(key: string, accessToken?: string) {
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}

async function requireAdmin(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Admin user management is not configured.')
  }

  const accessToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) throw new Error('Unauthorized')

  const userClient = client(supabaseAnonKey, accessToken)
  const { data: authData, error: authError } = await userClient.auth.getUser(accessToken)
  if (authError || !authData.user) throw new Error('Unauthorized')

  const adminClient = client(supabaseServiceKey)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, status')
    .eq('id', authData.user.id)
    .single()

  if (profile?.role !== 'admin' || profile?.status !== 'active') throw new Error('Forbidden')
  return { adminClient, currentUserId: authData.user.id }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error'
  const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { adminClient } = await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    if (body?.action !== 'reset-password') {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
    }

    const { data, error } = await adminClient.auth.admin.getUserById(id)
    if (error || !data.user?.email) {
      return NextResponse.json({ error: error?.message || 'User email was not found.' }, { status: 404 })
    }

    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(data.user.email, {
      redirectTo: 'https://medicalline.ge/clinic/reset-password',
    })
    if (resetError) throw resetError

    return NextResponse.json({ ok: true, message: 'პაროლის აღდგენის ბმული გაიგზავნა.' })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { adminClient, currentUserId } = await requireAdmin(request)
    const { id } = await params
    if (id === currentUserId) {
      return NextResponse.json({ error: 'საკუთარი ადმინისტრატორის ანგარიშის წაშლა დაუშვებელია.' }, { status: 400 })
    }

    const { data: target } = await adminClient.from('profiles').select('role').eq('id', id).single()
    if (target?.role === 'admin') {
      return NextResponse.json({ error: 'სხვა ადმინისტრატორის წასაშლელად ჯერ შეუცვალეთ როლი.' }, { status: 400 })
    }

    const [{ count: offers }, { count: payments }] = await Promise.all([
      adminClient.from('offers').select('id', { count: 'exact', head: true }).eq('user_id', id),
      adminClient.from('payment_transactions').select('id', { count: 'exact', head: true }).eq('user_id', id),
    ])

    if ((offers || 0) > 0 || (payments || 0) > 0) {
      return NextResponse.json({
        error: 'ანგარიშს აქვს შეთავაზების ან გადახდის ისტორია. ფინანსური ჩანაწერების დასაცავად გამოიყენეთ დაბლოკვა.',
        canBlock: true,
      }, { status: 409 })
    }

    const { error } = await adminClient.auth.admin.deleteUser(id)
    if (error) {
      return NextResponse.json({
        error: 'ანგარიშის წაშლა ვერ მოხერხდა დაკავშირებული ჩანაწერების გამო. გამოიყენეთ დაბლოკვა.',
        detail: error.message,
        canBlock: true,
      }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
