import 'server-only'
import { NextResponse } from 'next/server'
import { requireWarrantySession } from './supabase-server'

// Admin-only API access: a valid Supabase session whose profile is an active admin.
export async function requireAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  try {
    const session = await requireWarrantySession(token)
    if (session.profile.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const
    return { session } as const
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ''
    const status = message === 'Forbidden' ? 403 : 401
    return { error: NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Unauthorized' }, { status }) } as const
  }
}

export function bearerToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
}
