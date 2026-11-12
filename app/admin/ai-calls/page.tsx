'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'

const purposes = [
  ['notification', 'შეტყობინება'],
  ['debt_reminder', 'დავალიანება'],
  ['sales', 'გაყიდვა'],
  ['engineering_service', 'საინჟინრო სერვისი'],
  ['follow_up', 'Follow-up'],
  ['other', 'სხვა'],
] as const

const statuses = ['queued', 'dialing', 'ringing', 'answered', 'completed', 'no_answer', 'busy', 'failed', 'cancelled']
const outcomes = ['გადაიხდის კონკრეტულ თარიღში', 'უკვე გადაიხადა — გადასამოწმებელია', 'თანხას არ ეთანხმება', 'ბუღალტერთან დაკავშირება სჭირდება', 'მოგვიანებით გადარეკვა', 'არ უპასუხა', 'უარი თქვა საუბარზე']

const labelMap: Record<string, string> = Object.fromEntries(purposes)

type CallJob = Record<string, any>

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ka-GE') : '-'
}

function formatTranscript(value: unknown) {
  if (!value) return '-'
  if (typeof value === 'string') return value
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

const styles = {
  page: { minHeight: '100vh', background: '#F5F5F0', padding: '24px 18px 48px' },
  wrap: { maxWidth: 1240, margin: '0 auto' },
  card: { background: '#fff', border: '1px solid rgba(8,80,65,.12)', borderRadius: 16, padding: 20, boxShadow: '0 16px 40px rgba(8,80,65,.05)' },
  input: { width: '100%', boxSizing: 'border-box' as const, border: '1px solid rgba(15,23,42,.16)', borderRadius: 10, padding: '10px 11px', fontSize: 14 },
  label: { display: 'block', color: '#52606D', fontSize: 12, fontWeight: 600, marginBottom: 6 },
}

export default function AiCallsPage() {
  const { loading, error, profile } = useWarrantyAdminGate()
  const [jobs, setJobs] = useState<CallJob[]>([])
  const [campaigns, setCampaigns] = useState<Record<string, any>[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [purpose, setPurpose] = useState('notification')
  const [mode, setMode] = useState<'exact_message' | 'dialog'>('exact_message')
  const [scriptText, setScriptText] = useState('')
  const [callerId, setCallerId] = useState('+995322453821')
  const [maxSeconds, setMaxSeconds] = useState('180')
  const [smsAfter, setSmsAfter] = useState(false)
  const [smsText, setSmsText] = useState('')
  const [debtAmount, setDebtAmount] = useState('')
  const [debtDueDate, setDebtDueDate] = useState('')
  const [debtDocument, setDebtDocument] = useState('')
  const [debtNote, setDebtNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState('')

  async function loadJobs() {
    const { data, error: dbError } = await supabase.from('ai_call_jobs').select('*').order('created_at', { ascending: false }).limit(100)
    if (dbError) setLoadError(dbError.message)
    else setJobs(data || [])
  }

  async function loadCampaigns() {
    const { data, error: dbError } = await supabase.from('ai_campaigns').select('id, name, purpose, max_seconds').eq('active', true).order('name')
    if (dbError) setLoadError(dbError.message)
    else setCampaigns(data || [])
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return
    void loadJobs()
    void loadCampaigns()
    const channel = supabase.channel('ai-call-jobs-admin-live').on('postgres_changes', { event: '*', schema: 'public', table: 'ai_call_jobs' }, () => void loadJobs()).subscribe()
    const poll = window.setInterval(() => void loadJobs(), 5000)
    return () => { window.clearInterval(poll); supabase.removeChannel(channel) }
  }, [profile])

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setLoadError('')
    if (!profile?.id || !phone.trim() || !scriptText.trim()) { setLoadError('მიუთითეთ ტელეფონი და დავალების ტექსტი.'); return }
    if (mode === 'dialog' && !campaignId) { setLoadError('AI dialog რეჟიმისთვის აირჩიეთ აქტიური Campaign.'); return }
    if (Number(maxSeconds) < 10 || Number(maxSeconds) > 3600) { setLoadError('მაქსიმალური დრო უნდა იყოს 10-დან 3600 წამამდე.'); return }
    setSaving(true)
    const structuredDebt = purpose === 'debt_reminder' ? { amount: debtAmount || null, due_date: debtDueDate || null, document_number: debtDocument || null, note: debtNote || null } : null
    const selectedCampaign = campaigns.find(campaign => campaign.id === campaignId)
    const jobPayload = {
      phone: phone.trim(), customer_name: customerName.trim() || null, campaign_id: campaignId || null, purpose, mode, script_text: scriptText.trim(), caller_id: callerId.trim() || '+995322453821', max_seconds: Number(maxSeconds) || selectedCampaign?.max_seconds || 180, sms_after: smsAfter, sms_text: smsAfter ? smsText.trim() || null : null, created_by: profile.id, status: 'queued', ...(structuredDebt ? { debt_details: structuredDebt } : {}),
    }
    let { error: dbError } = await supabase.from('ai_call_jobs').insert(jobPayload)
    if (dbError && /campaign_id|column .* does not exist/i.test(dbError.message)) {
      const { campaign_id: _campaignId, ...legacyPayload } = jobPayload
      const retry = await supabase.from('ai_call_jobs').insert(legacyPayload)
      dbError = retry.error
    }
    setSaving(false)
    if (dbError) { setLoadError(dbError.message); return }
    setNotice('ზარის დავალება შეიქმნა და queued სტატუსით ელოდება worker-ს. ზარი ჯერ არ განხორციელებულა.')
    setPhone(''); setCustomerName(''); setScriptText(''); setSmsText(''); setDebtAmount(''); setDebtDueDate(''); setDebtDocument(''); setDebtNote(''); setCampaignId('')
    void loadJobs()
  }

  if (loading) return <LoadingView label="AI ზარები იტვირთება..." />
  if (error || !profile || profile.role !== 'admin') return <AuthBlockedView message={error || 'AI ზარებზე წვდომა მხოლოდ admin-ს აქვს.'} />

  return <main style={styles.page}><div style={styles.wrap}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
      <div><Link href="/admin/ai" style={{ color: '#085041', fontSize: 13 }}>← AI Operator</Link><h1 style={{ color: '#18212F', margin: '8px 0 4px', fontSize: 28 }}>📞 AI ზარები</h1><p style={{ color: '#6B7280', margin: 0 }}>ერთი universal dynamic bridge ასრულებს Admin-ის მიერ შექმნილ task-ს. ბრაუზერი ზარს არ ახორციელებს.</p></div>
    </header>
    <form onSubmit={createJob} style={{ ...styles.card, display: 'grid', gap: 16, marginBottom: 18 }}>
      <h2 style={{ margin: 0, color: '#18212F', fontSize: 18 }}>ახალი ზარის დავალება</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <label style={styles.label}>ტელეფონის ნომერი<input required value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} placeholder="+995..." /></label>
        <label style={styles.label}>კლიენტის/კლინიკის სახელი — optional<input value={customerName} onChange={e => setCustomerName(e.target.value)} style={styles.input} /></label>
        <label style={styles.label}>ზარის მიზანი<select value={purpose} onChange={e => setPurpose(e.target.value)} style={styles.input}>{purposes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label style={styles.label}>რეჟიმი<select value={mode} onChange={e => setMode(e.target.value as typeof mode)} style={styles.input}><option value="exact_message">ზუსტი ტექსტი</option><option value="dialog">AI დიალოგი</option></select></label>
        <label style={styles.label}>Campaign<select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={styles.input}><option value="">Campaign-ის გარეშე</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.purpose}</option>)}</select></label>
        <label style={styles.label}>Caller ID<input value={callerId} onChange={e => setCallerId(e.target.value)} style={styles.input} /></label>
        <label style={styles.label}>საუბრის მაქსიმალური დრო (წამი)<input type="number" min="10" max="3600" value={maxSeconds} onChange={e => setMaxSeconds(e.target.value)} style={styles.input} /></label>
      </div>
      {mode === 'exact_message' ? <div style={{ padding: 12, borderRadius: 10, background: '#E1F5EE', color: '#085041', fontWeight: 600, fontSize: 13 }}>აგენტს არ აქვს უფლება შეცვალოს ან დაამატოს ტექსტი.</div> : null}
      <label style={styles.label}>ტექსტი / ინსტრუქცია<textarea required value={scriptText} onChange={e => setScriptText(e.target.value)} style={{ ...styles.input, minHeight: 120, resize: 'vertical' }} /></label>
      {purpose === 'debt_reminder' ? <fieldset style={{ border: '1px solid rgba(8,80,65,.14)', borderRadius: 12, padding: 14, display: 'grid', gap: 12 }}><legend style={{ color: '#085041', fontWeight: 700, padding: '0 6px' }}>დავალიანების დეტალები</legend><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}><label style={styles.label}>დავალიანების თანხა<input value={debtAmount} onChange={e => setDebtAmount(e.target.value)} style={styles.input} /></label><label style={styles.label}>ვადა<input type="date" value={debtDueDate} onChange={e => setDebtDueDate(e.target.value)} style={styles.input} /></label><label style={styles.label}>ინვოისის/დოკუმენტის ნომერი<input value={debtDocument} onChange={e => setDebtDocument(e.target.value)} style={styles.input} /></label></div><label style={styles.label}>შენიშვნა<textarea value={debtNote} onChange={e => setDebtNote(e.target.value)} style={{ ...styles.input, minHeight: 70 }} /></label><p style={{ margin: 0, color: '#8A4B08', fontSize: 12 }}>აგენტმა არ უნდა დაემუქროს, მოახდინოს ზეწოლა ან მოიგონოს ფინანსური ინფორმაცია.</p></fieldset> : null}
      <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#18212F', fontSize: 14 }}><input type="checkbox" checked={smsAfter} onChange={e => setSmsAfter(e.target.checked)} /> SMS-ის გაგზავნა ზარის შემდეგ</label>
      {smsAfter ? <label style={styles.label}>SMS ტექსტი<textarea value={smsText} onChange={e => setSmsText(e.target.value)} style={{ ...styles.input, minHeight: 70 }} /></label> : null}
      <button type="submit" disabled={saving} style={{ justifySelf: 'start', border: 0, borderRadius: 10, padding: '12px 18px', background: saving ? '#9CA3AF' : '#085041', color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'იქმნება...' : 'ზარის დავალების შექმნა'}</button>
      {notice ? <p style={{ margin: 0, color: '#085041', fontSize: 13 }}>{notice}</p> : null}{loadError ? <p style={{ margin: 0, color: '#B42318', fontSize: 13 }}>{loadError}</p> : null}
    </form>
    <section style={styles.card}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}><h2 style={{ margin: 0, color: '#18212F', fontSize: 18 }}>ზარების ისტორია</h2><span style={{ color: '#6B7280', fontSize: 12 }}>ბოლო {jobs.length} · განახლება ყოველ 5 წამში</span></div><div style={{ display: 'grid', gap: 10 }}>{jobs.length === 0 ? <p style={{ color: '#6B7280' }}>ზარის ისტორია ჯერ ცარიელია.</p> : jobs.map(job => <details key={job.id} style={{ border: '1px solid rgba(15,23,42,.1)', borderRadius: 10, padding: 12 }}><summary style={{ cursor: 'pointer', color: '#18212F' }}><strong>{job.phone || '-'}</strong> · {job.customer_name || 'კლიენტი'} · {labelMap[job.purpose] || job.purpose || '-'} · {job.mode === 'exact_message' ? 'ზუსტი ტექსტი' : 'AI დიალოგი'} · <b style={{ color: ['completed', 'answered'].includes(job.status) ? '#085041' : job.status === 'failed' ? '#B42318' : '#8A4B08' }}>{job.status || '-'}</b></summary><div style={{ overflowX: 'auto', marginTop: 10, color: '#52606D', fontSize: 13 }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><tbody><tr><td>თარიღი</td><td>{formatDate(job.created_at)}</td><td>ხანგრძლივობა</td><td>{job.duration_seconds ?? job.duration ?? '-'} წამი</td><td>შედეგი</td><td>{outcomes.includes(job.outcome) ? job.outcome : job.outcome || '-'}</td></tr><tr><td>Answered</td><td>{formatDate(job.answered_at)}</td><td>Ended</td><td>{formatDate(job.ended_at)}</td><td>Error</td><td>{job.error_message || '-'}</td></tr><tr><td>Summary</td><td colSpan={5}>{job.summary || '-'}</td></tr><tr><td>Follow-up date</td><td colSpan={5}>{formatDate(job.follow_up_date)}</td></tr>{job.transcript ? <tr><td>Transcript</td><td colSpan={5}><pre style={{ whiteSpace: 'pre-wrap', margin: 0, maxHeight: 360, overflow: 'auto' }}>{formatTranscript(job.transcript)}</pre></td></tr> : null}</tbody></table></div></details>)}</div></section>
  </div></main>
}
