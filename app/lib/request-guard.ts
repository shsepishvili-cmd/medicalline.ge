import 'server-only'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { merchant } from './merchant'

// The client address as Vercel reports it. Only the first hop is trusted:
// Vercel overwrites x-forwarded-for, so a client cannot spoof the first entry.
export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function allowedHosts() {
  const hosts = new Set<string>()
  const add = (value?: string | null) => {
    if (!value) return
    try {
      hosts.add(new URL(value.includes('://') ? value : `https://${value}`).host.toLowerCase())
    } catch {
      // ignore malformed configuration
    }
  }
  add(merchant.website)
  add(merchant.website.replace('://', '://www.'))
  add(process.env.NEXT_PUBLIC_SITE_URL)
  add(process.env.VERCEL_URL)
  add(process.env.VERCEL_BRANCH_URL)
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  return hosts
}

// CSRF defence for state-changing endpoints: the browser always sends Origin on
// cross-site POSTs, so a foreign or missing Origin is refused.
export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }
  if (allowedHosts().has(host)) return true
  // Same-host requests are always fine (covers preview and local development).
  const requestHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase()
  return Boolean(requestHost) && host === requestHost
}

export function forbiddenOrigin() {
  return NextResponse.json({ error: 'მოთხოვნა უარყოფილია.' }, { status: 403 })
}

export function tooManyRequests(message = 'ძალიან ბევრი მცდელობა. სცადეთ რამდენიმე წუთში.') {
  return NextResponse.json({ error: message }, { status: 429 })
}

export type RateRule = { key: string; windowSeconds: number; max: number }

// True when every rule still has room. Fails closed by default: if the limiter
// itself is unavailable the request is treated as limited. Routes that worked
// before the limiter existed pass failOpen so they keep working without it.
export async function withinRateLimits(service: SupabaseClient, rules: RateRule[], { failOpen = false } = {}) {
  for (const rule of rules) {
    const { data, error } = await service.rpc('rate_limit_consume', {
      p_key: rule.key,
      p_window_seconds: rule.windowSeconds,
      p_max: rule.max,
    })
    if (error) {
      console.error('[rate-limit] unavailable', error.message)
      return failOpen
    }
    if (data !== true) return false
  }
  return true
}

// Never send internal error text to the browser.
export function serverError(context: string, cause: unknown, message = 'დროებითი შეცდომა. სცადეთ თავიდან.') {
  console.error(`[${context}]`, cause instanceof Error ? cause.message : cause)
  return NextResponse.json({ error: message }, { status: 500 })
}
