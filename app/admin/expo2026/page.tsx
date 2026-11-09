'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'
import styles from '@/app/expo2026/expo.module.css'

type RequestRow = {
  id: string; group_id: string | null; status: string; quantity: number; created_at: string; source: string
  doctor_name_snapshot: string; clinic_name_snapshot: string; phone_snapshot: string; products: { name: string } | null
}
type OutboxRow = { id: string; created_at: string; recipient: string; purpose: string; status: string; attempts: number; last_error: string | null; sent_at: string | null }
type AuditRow = { id: string; created_at: string; actor: string | null; action: string; target_type: string | null; target_id: string | null; details: Record<string, unknown> }
type Conflict = { phone: string; profiles: number }

const MIGRATION_HINT = 'ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/54_expo2026_integration.sql.'
const STATUS: Record<string, string> = { received: 'ახალი', reviewing: 'განხილვაში', offer_ready: 'შეთავაზება გაგზავნილია', offer_received: 'ექიმმა ნახა', cancelled: 'გაუქმებული', expired: 'ვადაგასული' }
const OUTBOX: Record<string, string> = { queued: 'რიგში', sending: 'იგზავნება', sent: 'გაიგზავნა', failed: 'ვერ გაიგზავნა', cancelled: 'გაუქმდა' }
const PURPOSE: Record<string, string> = { offer_link: 'შეთავაზების ბმული', sms_login: 'შესვლის კოდი' }
const time = (value: string | null) => (value ? new Date(value).toLocaleString('ka-GE') : '—')
const masked = (phone: string) => (phone.length > 6 ? `${phone.slice(0, 5)}***${phone.slice(-2)}` : phone)

export default function Expo2026AdminPage() {
  const { loading, error: gateError, profile, accessToken } = useWarrantyAdminGate()
  const [tab, setTab] = useState<'requests' | 'messages' | 'audit' | 'conflicts'>('requests')
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [outbox, setOutbox] = useState<OutboxRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [message, setMessage] = useState('')
  const isAdmin = profile?.role === 'admin'

  const load = useCallback(async () => {
    const [r, o, a, c] = await Promise.all([
      supabase.from('special_price_requests').select('id, group_id, status, quantity, created_at, source, doctor_name_snapshot, clinic_name_snapshot, phone_snapshot, products(name)').eq('source', 'EXPO2026').order('created_at', { ascending: false }).limit(500),
      supabase.from('message_outbox').select('id, created_at, recipient, purpose, status, attempts, last_error, sent_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_log').select('id, created_at, actor, action, target_type, target_id, details').order('created_at', { ascending: false }).limit(200),
      supabase.from('phone_identity_conflicts').select('phone, profiles'),
    ])
    const failed = [r.error, o.error, a.error, c.error].find(Boolean)
    if (failed) setMessage(/does not exist|schema cache|column/i.test(failed.message) ? MIGRATION_HINT : failed.message)
    setRequests((r.data || []) as unknown as RequestRow[])
    setOutbox((o.data || []) as OutboxRow[])
    setAudit((a.data || []) as AuditRow[])
    setConflicts((c.data || []) as Conflict[])
  }, [])

  useEffect(() => { if (isAdmin) void load() }, [isAdmin, load])

  const groups = useMemo(() => {
    const map = new Map<string, RequestRow[]>()
    for (const row of requests) {
      const key = row.group_id || row.id
      map.set(key, [...(map.get(key) || []), row])
    }
    return [...map.values()]
  }, [requests])

  async function retry(row: OutboxRow) {
    setMessage('')
    const response = await fetch(`/api/admin/outbox/${row.id}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
    const payload = await response.json().catch(() => ({}))
    setMessage(response.ok ? (payload.sent ? 'შეტყობინება გაიგზავნა.' : 'ხელახლა ვერ გაიგზავნა — ნახეთ შეცდომა.') : payload.error || 'შეცდომა.')
    await load()
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (gateError || !profile || !accessToken) return <AuthBlockedView message={gateError || 'წვდომა აკრძალულია.'} />
  if (!isAdmin) return <AuthBlockedView message="ეს გვერდი მხოლოდ ადმინისთვისაა." />

  const failedCount = outbox.filter((row) => row.status === 'failed').length
  const tabs: Array<[typeof tab, string]> = [
    ['requests', `Expo მოთხოვნები (${groups.length})`],
    ['messages', `SMS${failedCount ? ` · ${failedCount} ჩავარდნილი` : ''}`],
    ['audit', 'აუდიტი'],
    ['conflicts', `ნომრის კონფლიქტები (${conflicts.length})`],
  ]

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/admin" className={styles.brand}>MEDICAL LINE <span>GEORGIA</span> · Expo 2026</Link>
          <nav className={styles.topNav}>
            {tabs.map(([key, label]) => (
              <button key={key} type="button" className={styles.linkBtn} style={{ color: tab === key ? '#d72c47' : undefined }} onClick={() => setTab(key)}>{label}</button>
            ))}
            <Link href="/admin/clinic-offers">შეთავაზებები →</Link>
          </nav>
        </div>
      </header>
      <main className={`${styles.wrap} ${styles.main}`}>
        {message ? <p className={styles.error}>{message}</p> : null}

        {tab === 'requests' ? (
          <>
            <p className={styles.muted}>ფასს და შეთავაზებას ადგენთ „შეთავაზებებში“ — იქ ჯგუფის ყველა პროდუქტი ერთ შეთავაზებაში ჩაჯდება და „SMS ბმული“ ღილაკით გაიგზავნება.</p>
            {groups.length ? groups.map((rows) => (
              <div key={rows[0].group_id || rows[0].id} className={styles.step} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <b style={{ color: '#102952', fontSize: 14 }}>{rows[0].doctor_name_snapshot || '—'} · {rows[0].clinic_name_snapshot || 'კლინიკა არ არის მითითებული'}</b>
                  <span className={styles.muted}>{time(rows[0].created_at)} · {STATUS[rows[0].status] || rows[0].status}</span>
                </div>
                <p>{rows.map((row) => `${row.products?.name || 'პროდუქტი'} × ${row.quantity}`).join(', ')}</p>
                <p className={styles.muted}>{rows[0].phone_snapshot}</p>
              </div>
            )) : <p className={styles.muted}>Expo-დან მოთხოვნა ჯერ არ შემოსულა.</p>}
          </>
        ) : null}

        {tab === 'messages' ? (
          <>
            <p className={styles.muted}>შეტყობინების ტექსტი აქ არ ჩანს: ის ბმულს ან კოდს შეიცავს. გაგზავნის შემდეგ ტექსტი იშლება.</p>
            {outbox.map((row) => (
              <div key={row.id} className={styles.cartRow} style={{ alignItems: 'center' }}>
                <span>{PURPOSE[row.purpose] || row.purpose} → {masked(row.recipient)}<br /><small className={styles.muted}>{time(row.created_at)} · ცდა {row.attempts}{row.last_error ? ` · ${row.last_error}` : ''}</small></span>
                <span>
                  <b style={{ color: row.status === 'failed' ? '#a12238' : '#102952' }}>{OUTBOX[row.status] || row.status}</b>
                  {row.status === 'failed' && !['offer_link', 'sms_login'].includes(row.purpose) ? <> · <button type="button" className={styles.linkBtn} onClick={() => retry(row)}>ხელახლა</button></> : null}
                </span>
              </div>
            ))}
            {!outbox.length ? <p className={styles.muted}>შეტყობინებები ჯერ არ არის.</p> : null}
          </>
        ) : null}

        {tab === 'audit' ? (
          audit.length ? audit.map((row) => (
            <div key={row.id} className={styles.cartRow}>
              <span><b>{row.action}</b> · {row.target_type} {row.target_id ? String(row.target_id).slice(0, 13) : ''}<br /><small className={styles.muted}>{row.actor || ''} {Object.keys(row.details || {}).length ? JSON.stringify(row.details) : ''}</small></span>
              <small className={styles.muted}>{time(row.created_at)}</small>
            </div>
          )) : <p className={styles.muted}>ჩანაწერები ჯერ არ არის.</p>
        ) : null}

        {tab === 'conflicts' ? (
          <>
            <p className={styles.muted}>ეს ნომრები რამდენიმე პროფილზეა მიბმული. ამიტომ SMS-ით შესვლა მათთვის დაბლოკილია, რომ სისტემამ სხვისი ანგარიში არ გახსნას. გააერთიანეთ ან შეასწორეთ პროფილები „მომხმარებლებში“; პაროლით შესვლა ჩვეულებრივ მუშაობს.</p>
            {conflicts.map((row) => <div key={row.phone} className={styles.cartRow}><span>{row.phone}</span><b>{row.profiles} პროფილი</b></div>)}
            {!conflicts.length ? <p className={styles.notice}>კონფლიქტი არ არის.</p> : null}
          </>
        ) : null}
      </main>
    </div>
  )
}
