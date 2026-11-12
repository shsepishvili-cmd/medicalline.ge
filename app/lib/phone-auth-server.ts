import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeAudit, maskPhone } from './audit-server'
import { phoneLoginEmail, type RegistrationInput } from './phone-auth'
import { normalizeGeorgianPhone } from './phone-verification'

export type ResolvedAccount =
  | { kind: 'existing'; userId: string; email: string }
  | { kind: 'new' }
  | { kind: 'blocked' }
  | { kind: 'ambiguous' }

// Finds the one doctor a number belongs to, without ever guessing between two.
export async function resolveAccount(service: SupabaseClient, phone: string): Promise<ResolvedAccount> {
  const { data: identity, error } = await service.from('phone_identities').select('user_id').eq('phone', phone).maybeSingle()
  if (error) throw new Error(error.message)

  if (identity?.user_id) {
    const [{ data: profile }, { data: auth }] = await Promise.all([
      service.from('profiles').select('status').eq('id', identity.user_id).maybeSingle(),
      service.auth.admin.getUserById(identity.user_id),
    ])
    if (profile?.status === 'blocked') return { kind: 'blocked' }
    if (!auth?.user?.email) throw new Error('Account has no sign-in address')
    return { kind: 'existing', userId: identity.user_id, email: auth.user.email }
  }

  // Not linked yet: a profile may still carry this number (several profiles
  // share it, or it predates the migration). Never create a second account then.
  const { data: candidates } = await service.from('profiles').select('id, phone').ilike('phone', `%${phone.slice(-9)}%`)
  if ((candidates || []).some((row) => normalizeGeorgianPhone(String(row.phone || '')) === phone)) return { kind: 'ambiguous' }
  return identity ? { kind: 'ambiguous' } : { kind: 'new' }
}

const CLAIM_STALE_MS = 2 * 60_000

// Creates the account for a number that has none. The phone_identities primary
// key makes this safe against two sign-ups racing for the same number.
export async function createPhoneAccount(service: SupabaseClient, phone: string, input: RegistrationInput, ip: string) {
  const { error: claimError } = await service.from('phone_identities').insert({ phone })
  if (claimError) {
    const { data: existing } = await service.from('phone_identities').select('user_id, created_at').eq('phone', phone).maybeSingle()
    if (existing?.user_id) return { kind: 'raced' as const }
    if (!existing || Date.now() - new Date(existing.created_at).getTime() < CLAIM_STALE_MS) return { kind: 'busy' as const }
    // A claim abandoned by a crashed request: take it over.
    await service.from('phone_identities').update({ created_at: new Date().toISOString() }).eq('phone', phone).is('user_id', null)
  }

  const email = phoneLoginEmail(phone)
  const { data: created, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, clinic_name: input.clinicName, city: input.city, phone, role: 'doctor', phone_verified: true },
  })
  if (error || !created.user) {
    await service.from('phone_identities').delete().eq('phone', phone).is('user_id', null)
    throw new Error(error?.message || 'Account could not be created')
  }

  const now = new Date().toISOString()
  // The on_auth_user_created trigger has made a 'pending' profile; add what it cannot know.
  await service.from('profiles').update({
    phone_verified_at: now,
    profession: input.profession,
    privacy_accepted_at: now,
    marketing_consent: input.marketingConsent,
    marketing_consent_at: input.marketingConsent ? now : null,
    signup_source: 'expo2026',
  }).eq('id', created.user.id)
  await service.from('phone_identities').update({ user_id: created.user.id, updated_at: now }).eq('phone', phone)

  await writeAudit(service, {
    actorId: created.user.id, action: 'doctor.registered_by_sms', targetType: 'profile', targetId: created.user.id, ip,
    details: { phone: maskPhone(phone), marketingConsent: input.marketingConsent },
  })
  return { kind: 'created' as const, userId: created.user.id, email }
}

// A one-time Supabase sign-in token for the browser. Nothing is e-mailed:
// generateLink only returns the token, the browser exchanges it for a session.
export async function mintSignInToken(service: SupabaseClient, email: string) {
  const { data, error } = await service.auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) throw new Error(error?.message || 'Sign-in token unavailable')
  return tokenHash
}
