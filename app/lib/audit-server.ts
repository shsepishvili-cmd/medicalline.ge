import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditEntry = {
  actorId?: string | null
  actor?: string | null
  action: string
  targetType?: string
  targetId?: string
  ip?: string
  details?: Record<string, unknown>
}

// Best effort: an audit failure is logged but never breaks the user's action.
export async function writeAudit(service: SupabaseClient, entry: AuditEntry) {
  const { error } = await service.from('audit_log').insert({
    actor_id: entry.actorId ?? null,
    actor: entry.actor ?? null,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    ip: entry.ip ?? null,
    details: entry.details ?? {},
  })
  if (error) console.error('[audit] write failed', entry.action, error.message)
}

// Phone numbers in logs and audit details: enough to recognise, not to reuse.
export function maskPhone(phone: string) {
  return phone.length > 6 ? `${phone.slice(0, 5)}***${phone.slice(-2)}` : '***'
}
