import { createSupabaseTokenClient } from './supabase-server'
import { isActiveProfileStatus, isInternalWarrantyRole } from './warranty'
import type { ProfileSummary } from './warranty-types'

export async function requireCrmSession(accessToken: string) {
  const tokenClient = createSupabaseTokenClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await tokenClient.auth.getUser(accessToken)

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await tokenClient
    .from('profiles')
    .select('id, full_name, clinic_name, phone, role, status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Profile not found')
  }

  if (!isActiveProfileStatus(profile.status) || !isInternalWarrantyRole(profile.role)) {
    throw new Error('Forbidden')
  }

  return {
    user,
    profile: profile as ProfileSummary,
    tokenClient,
  }
}

export function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}
