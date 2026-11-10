import { createSupabaseTokenClient } from '@/app/lib/supabase-server'

export class CommunicationError extends Error {
  constructor(message: string, public status = 500) {
    super(message)
    this.name = 'CommunicationError'
  }
}

export async function requireCommunicationsAdmin(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new CommunicationError('საჭიროა ავტორიზაცია.', 401)

  const client = createSupabaseTokenClient(token)
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) throw new CommunicationError('სესია არასწორია ან ვადაგასულია.', 401)

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin' || profile?.status !== 'active') {
    throw new CommunicationError('ამ განყოფილებაზე წვდომა შეზღუდულია.', 403)
  }
  return { client, user }
}

function chatwootConfig() {
  const base = process.env.CHATWOOT_BASE_URL?.trim().replace(/\/+$/, '')
  const account = process.env.CHATWOOT_ACCOUNT_ID?.trim()
  const token = process.env.CHATWOOT_API_TOKEN?.trim()
  if (!base || !account || !token || !/^\d+$/.test(account)) {
    throw new CommunicationError('Chatwoot ჯერ არ არის დაკავშირებული. გადაამოწმეთ სერვერის პარამეტრები.', 503)
  }
  const url = new URL(base)
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new CommunicationError('Chatwoot-ის მისამართი უნდა იწყებოდეს HTTPS-ით.', 503)
  }
  return { base: url.origin + url.pathname.replace(/\/$/, ''), account, token }
}

export async function chatwootRequest(path: string, init: RequestInit = {}) {
  const { base, account, token } = chatwootConfig()
  const url = `${base}/api/v1/accounts/${account}/${path}`
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      'api_access_token': token,
      'Accept': 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new CommunicationError(
      `Chatwoot-თან კავშირი ვერ შედგა (HTTP ${response.status}).`,
      response.status >= 500 ? 502 : 400,
    )
  }
  return result
}

export function communicationErrorResponse(error: unknown) {
  const err = error instanceof CommunicationError
    ? error
    : new CommunicationError('მოთხოვნის შესრულება ვერ მოხერხდა.')
  return Response.json({ ok: false, error: err.message }, { status: err.status, headers: { 'Cache-Control': 'no-store' } })
}
