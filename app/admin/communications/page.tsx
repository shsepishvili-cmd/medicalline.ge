'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, CircleAlert, Inbox, Loader2, MessageCircle, Phone, RefreshCw, Search, Send } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Contact = { id?: number; name?: string; phone_number?: string | null; email?: string | null; thumbnail?: string | null }
type Conversation = {
  id: number
  inbox_id?: number
  status?: string
  unread_count?: number
  created_at?: number | string
  last_activity_at?: number | string
  last_non_activity_message?: { content?: string | null }
  meta?: { sender?: Contact; channel?: string }
}
type InboxRecord = { id: number; name?: string; channel_type?: string }
type ChatMessage = {
  id: number
  content?: string | null
  message_type?: number | string
  private?: boolean
  created_at?: number | string
  sender?: { name?: string }
}

type CallEvent = { id: string; event_type: string; phone_number?: string; direction?: string; duration_seconds?: number; received_at: string }

function items<T>(payload: any): T[] {
  const value = payload?.data?.data?.payload ?? payload?.data?.payload ?? payload?.payload ?? []
  return Array.isArray(value) ? value : []
}

function toTime(input?: number | string) {
  if (!input) return ''
  const parsed = typeof input === 'number' ? new Date(input * 1000) : new Date(input)
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat('ka-GE', {
    timeZone: 'Asia/Tbilisi', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(parsed)
}

function channelName(value?: string) {
  const v = (value || '').toLowerCase()
  if (v.includes('whatsapp')) return 'WhatsApp'
  if (v.includes('instagram')) return 'Instagram'
  if (v.includes('facebook') || v.includes('messenger')) return 'Facebook'
  if (v.includes('sms') || v.includes('twilio')) return 'SMS'
  if (v.includes('web_widget')) return 'საიტის ჩატი'
  if (v.includes('email')) return 'ელფოსტა'
  return 'სხვა არხი'
}

export default function CommunicationsPage() {
  const [token, setToken] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [inboxes, setInboxes] = useState<InboxRecord[]>([])
  const [calls, setCalls] = useState<CallEvent[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('ყველა')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const api = useCallback(async (auth: string, url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${auth}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.ok) throw new Error(payload?.error || 'სერვერთან დაკავშირება ვერ მოხერხდა.')
    return payload
  }, [])

  const refresh = useCallback(async (auth: string) => {
    setLoading(true)
    setError('')
    try {
      const [threadPayload, inboxPayload] = await Promise.all([
        api(auth, '/api/admin/communications'),
        api(auth, '/api/admin/communications?section=inboxes'),
      ])
      const threads = items<Conversation>(threadPayload)
      setConversations(threads)
      setInboxes(items<InboxRecord>(inboxPayload))
      void api(auth, '/api/admin/communications?section=calls')
        .then(result => setCalls(Array.isArray(result.data) ? result.data : []))
        .catch(() => setCalls([]))
      setSelectedId(prev => prev && threads.some(c => c.id === prev) ? prev : threads[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'მონაცემების მიღება ვერ მოხერხდა.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      const accessToken = session?.access_token || ''
      setToken(accessToken)
      if (accessToken) void refresh(accessToken)
      else { setLoading(false); setError('შედით ადმინისტრატორის ანგარიშით.'); }
    })
    return () => { alive = false }
  }, [refresh])

  useEffect(() => {
    if (!token || !selectedId) { setMessages([]); return }
    let alive = true
    setLoadingMessages(true)
    api(token, `/api/admin/communications?section=messages&conversation_id=${selectedId}`)
      .then(payload => { if (alive) setMessages(items<ChatMessage>(payload)) })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'შეტყობინებების მიღება ვერ მოხერხდა.') })
      .finally(() => { if (alive) setLoadingMessages(false) })
    return () => { alive = false }
  }, [api, token, selectedId])

  const getChannel = useCallback((c: Conversation) =>
    channelName(inboxes.find(i => i.id === c.inbox_id)?.channel_type || c.meta?.channel), [inboxes])

  const filtered = useMemo(() => {
    const term = query.toLocaleLowerCase('ka').trim()
    return conversations.filter(c => {
      const contact = c.meta?.sender
      const value = [contact?.name, contact?.phone_number, contact?.email, c.last_non_activity_message?.content]
        .filter(Boolean).join(' ').toLocaleLowerCase('ka')
      return (channel === 'ყველა' || getChannel(c) === channel) && (!term || value.includes(term))
    })
  }, [conversations, query, channel, getChannel])
  const selected = conversations.find(c => c.id === selectedId)
  const contact = selected?.meta?.sender
  const sortedMessages = useMemo(() => [...messages].sort((a,b) =>
    (new Date(a.created_at || 0).getTime() || (Number(a.created_at) || 0) * 1000)
    - (new Date(b.created_at || 0).getTime() || (Number(b.created_at) || 0) * 1000)
  ), [messages])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!token || !selectedId || !text || sending) return
    setSending(true)
    setError('')
    try {
      await api(token, '/api/admin/communications', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: selectedId, content: text }),
      })
      setDraft('')
      const result = await api(token, `/api/admin/communications?section=messages&conversation_id=${selectedId}`)
      setMessages(items<ChatMessage>(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეტყობინება ვერ გაიგზავნა.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="mb-2 inline-flex items-center gap-2 text-sm text-blue-700 hover:underline">
              <ArrowLeft size={16} /> ადმინისტრაციული პანელი
            </Link>
            <h1 className="flex items-center gap-3 text-2xl font-bold">
              <Inbox className="text-blue-700" /> კომუნიკაციების ცენტრი
            </h1>
            <p className="mt-1 text-sm text-slate-500">Medical Line Georgia · ყველა არხის მიმოწერა ერთ სივრცეში</p>
          </div>
          <button type="button" onClick={() => token && void refresh(token)} disabled={!token || loading}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">
            <RefreshCw size={16} /> განახლება
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <CircleAlert size={18} className="shrink-0" /> {error}
          </div>
        )}

        {calls.length > 0 && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Phone size={17} /> ბოლო ზარები</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {calls.slice(0, 4).map(call => (
                <div key={call.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>{call.phone_number || 'უცნობი ნომერი'}</span>
                    <span className={call.event_type === 'call.missed' ? 'text-red-600' : 'text-green-700'}>
                      {call.event_type === 'call.missed' ? 'გამოტოვებული' : call.direction === 'outgoing' ? 'გამავალი' : 'შემომავალი'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{toTime(call.received_at)} · {call.duration_seconds || 0} წმ.</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[340px_minmax(0,1fr)]">
          <section className="border-b border-slate-200 md:border-b-0 md:border-r">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={17} />
                <input aria-label="კლიენტის ძებნა" value={query} onChange={event => setQuery(event.target.value)}
                  placeholder="სახელი, ტელეფონი, შეტყობინება" className="w-full rounded-xl border px-3 py-2.5 pl-10 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['ყველა','WhatsApp','Facebook','Instagram','SMS'].map(item => (
                  <button type="button" key={item} onClick={() => setChannel(item)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs ${channel === item ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500">{filtered.length} საუბარი</div>
            </div>
            <div className="max-h-[550px] overflow-auto">
              {loading && <div className="flex items-center gap-2 p-5 text-sm text-slate-500"><Loader2 className="animate-spin" size={18}/> მონაცემები იტვირთება…</div>}
              {!loading && filtered.length === 0 && <p className="p-5 text-sm text-slate-500">საუბრები ვერ მოიძებნა.</p>}
              {filtered.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
                  className={`w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selectedId === c.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm">{c.meta?.sender?.name || c.meta?.sender?.phone_number || `კლიენტი #${c.id}`}</strong>
                    <time className="shrink-0 text-[11px] text-slate-400">{toTime(c.last_activity_at)}</time>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-blue-700">{getChannel(c)}</span>
                    {!!c.unread_count && <span className="rounded-full bg-blue-600 px-2 text-xs text-white">{c.unread_count}</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{c.last_non_activity_message?.content || 'საუბრის გახსნა'}</p>
                </button>
              ))}
            </div>
          </section>
          <section className="flex min-h-[560px] flex-col">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                <MessageCircle size={40} />
                <p className="text-sm">აირჩიეთ საუბარი</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b p-4">
                  <div>
                    <h2 className="font-semibold">{contact?.name || contact?.phone_number || 'კლიენტი'}</h2>
                    <p className="mt-1 text-xs text-slate-500">{getChannel(selected)} · {selected.status === 'resolved' ? 'დასრულებული' : 'მიმდინარე'}</p>
                  </div>
                  {contact?.phone_number && <a href={`tel:${contact.phone_number}`} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs"><Phone size={14} /> დარეკვა</a>}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                  {loadingMessages && <p className="text-sm text-slate-500">იტვირთება…</p>}
                  {!loadingMessages && sortedMessages.length === 0 && <p className="text-sm text-slate-500">შეტყობინებები არ არის.</p>}
                  {sortedMessages.map(message => {
                    const outgoing = message.message_type === 1 || message.message_type === 'outgoing'
                    return (
                      <div key={message.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.private ? 'bg-amber-50 text-amber-900' : outgoing ? 'bg-blue-700 text-white' : 'bg-white text-slate-900'}`}>
                          {message.private && <div className="mb-1 text-xs font-semibold">შიდა ჩანაწერი</div>}
                          <p className="whitespace-pre-wrap break-words">{message.content || 'ფაილი ან სხვა შეტყობინება'}</p>
                          <time className={`mt-1 block text-right text-[10px] ${outgoing && !message.private ? 'text-blue-100' : 'text-slate-400'}`}>{toTime(message.created_at)}</time>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2 border-t bg-white p-3">
                  <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000}
                    placeholder="დაწერეთ პასუხი…" aria-label="შეტყობინების ტექსტი"
                    className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                  <button type="submit" disabled={sending || !draft.trim() || !token}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} გაგზავნა
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Check size={14} /> მიმოწერები ჩაიტვირთება მხოლოდ Chatwoot-ის დაკავშირებისა და ავტორიზაციის შემდეგ.</p>
      </div>
    </main>
  )
}
