import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isActiveProfileStatus, isInternalWarrantyRole } from './warranty'
import type { ProfileSummary } from './warranty-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

export function createSupabaseTokenClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public keys are not configured.')
  }

  // Keep the global header: callers use client.auth.getUser(token), which
  // supabase-js forbids when the client is built with the accessToken option.
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function requireWarrantySession(accessToken: string) {
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

export async function createSignedStorageUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 60 * 10,
) {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Could not create signed URL.')
  }

  return data.signedUrl
}
