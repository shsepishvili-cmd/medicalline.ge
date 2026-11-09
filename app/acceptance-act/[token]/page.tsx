'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { PublicInvoiceAcceptanceAct } from '@/app/lib/invoice-acceptance-act-types'

const statusLabels = {
  draft: 'მოსამზადებელი',
  sent: 'გაგზავნილი',
  viewed: 'ნანახი',
  accepted: 'დადასტურებული',
  cancelled: 'გაუქმებული',
}

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('ka-GE') : '-'
}

export default function InvoiceAcceptanceActPage() {
  const params = useParams<{ token: string }>()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [act, setAct] = useState<PublicInvoiceAcceptanceAct | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [acceptedBy, setAcceptedBy] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/public-invoice-acceptance-acts/${token}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'აქტი ვერ ჩაიტვირთა.')
        setAct(payload.act)
        setPdfUrl(payload.pdfUrl || '')
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'აქტი ვერ ჩაიტვირთა.'))
      .finally(() => setLoading(false))
  }, [token])

  async function acceptAct() {
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/public-invoice-acceptance-acts/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedBy, otpCode, acceptTerms }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'დადასტურება ვერ შესრულდა.')
      setSuccess('მიღება-ჩაბარების აქტი წარმატებით დადასტურდა.')
      setAct((current) => current ? { ...current, status: 'accepted', accepted_at: payload.acceptedAt || new Date().toISOString(), accepted_by: acceptedBy } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'დადასტურება ვერ შესრულდა.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main style={styles.center}>აქტი იტვირთება...</main>
  if (!act) return <main style={styles.center}><div style={styles.error}>{error || 'აქტი ვერ მოიძებნა.'}</div></main>
  const accepted = act.status === 'accepted'

  return <main style={styles.page}>
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div><div style={styles.brand}>MEDICAL LINE GEORGIA</div><h1 style={styles.title}>მიღება-ჩაბარების აქტი</h1></div>
        <span style={{ ...styles.badge, background: accepted ? '#dcfce7' : '#dbeafe', color: accepted ? '#166534' : '#1d4ed8' }}>{statusLabels[act.status]}</span>
      </header>

      <section style={styles.paper}>
        <div style={styles.meta}><b>{act.act_number}</b><span>{fmtDate(act.act_date)}</span></div>
        <p style={styles.intro}>ინვოისით <b>{act.invoice_number}</b> გათვალისწინებული საქონლის გადაცემისა და მიღების დადასტურება.</p>
        <div style={styles.parties}>
          <div style={styles.party}><small>ჩამბარებელი</small><b>შპს „მედიქალ ლაინ ჯორჯია“</b><span>ს/კ 417893569</span></div>
          <div style={styles.party}><small>მიმღები</small><b>{act.customer_name}</b><span>ს/კ {act.customer_tax_id || '-'}</span><span>{act.customer_address || ''}</span></div>
        </div>

        <div style={styles.tableWrap}><table style={styles.table}>
          <thead><tr><th>№</th><th>დასახელება</th><th>კოდი</th><th>ერთ.</th><th>რაოდენობა</th></tr></thead>
          <tbody>{act.items.map((item, index) => <tr key={item.id || `${index}-${item.product_name}`}>
            <td>{index + 1}</td><td><b>{item.product_name}</b></td><td>{item.product_code || '-'}</td><td>{item.unit}</td><td>{item.quantity}</td>
          </tr>)}</tbody>
        </table></div>

        <p style={styles.terms}>მიმღები ადასტურებს, რომ ჩამონათვალი და რაოდენობა შეამოწმა, საქონელი მიიღო შეთანხმებულ მდგომარეობაში და მიღების მომენტში პრეტენზია არ აქვს, გარდა აქტში მითითებული შენიშვნისა.</p>
        {act.notes ? <p style={styles.note}><b>შენიშვნა:</b> {act.notes}</p> : null}

        <div style={styles.signatures}>
          <div style={styles.party}><b>ჩამბარებელი</b><span>შპს „მედიქალ ლაინ ჯორჯია“</span><img src="/images/invoice-stamp.jpg" alt="Medical Line-ის ბეჭედი" style={styles.stamp}/></div>
          <div style={styles.party}><b>მიმღები</b><span>{act.accepted_by || 'ელექტრონული OTP დადასტურება'}</span>{accepted ? <strong style={styles.accepted}>დადასტურებულია · {fmtDate(act.accepted_at)}</strong> : null}</div>
        </div>

        {pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer" style={styles.pdfButton}>ბეჭდიანი PDF-ის ჩამოტვირთვა</a> : null}
      </section>

      <section style={styles.confirmCard}>
        {success ? <div style={styles.success}>{success}</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}
        {accepted ? <div style={styles.completed}>აქტი დადასტურებულია {act.accepted_by ? `— ${act.accepted_by}` : ''}.</div> : <>
          <h2 style={{ margin: 0, fontSize: 18 }}>OTP დადასტურება</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>შეიყვანეთ SMS-ით ან მეილით მიღებული 6-ნიშნა კოდი.</p>
          <div style={styles.inputs}>
            <input style={styles.input} value={acceptedBy} onChange={(event) => setAcceptedBy(event.target.value)} placeholder="მიმღების სახელი და გვარი" />
            <input style={styles.input} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="OTP კოდი" />
          </div>
          <label style={styles.checkbox}><input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)}/><span>გავეცანი აქტს, ვეთანხმები მის შინაარსს და ვადასტურებ საქონლის მიღებას.</span></label>
          <button style={styles.confirmButton} type="button" onClick={acceptAct} disabled={saving}>{saving ? 'დადასტურება...' : 'აქტის დადასტურება'}</button>
        </>}
      </section>
    </div>
  </main>
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#eef4f2', padding: '18px 10px 42px', color: '#111827' },
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#eef4f2', color: '#334155', padding: 20 },
  wrap: { maxWidth: 860, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 4px 16px' },
  brand: { color: '#075344', fontSize: 12, fontWeight: 900, letterSpacing: '0.12em' },
  title: { margin: '4px 0 0', fontSize: 26 },
  badge: { borderRadius: 999, padding: '7px 11px', fontSize: 12, fontWeight: 900 },
  paper: { background: '#fff', border: '1px solid #dce7e3', borderRadius: 18, padding: 'clamp(16px,4vw,34px)', boxShadow: '0 18px 48px rgba(15,65,52,.09)' },
  meta: { display: 'flex', justifyContent: 'space-between', color: '#475569', paddingBottom: 12, borderBottom: '2px solid #075344' },
  intro: { lineHeight: 1.7, margin: '20px 0' },
  parties: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 20 },
  party: { display: 'flex', flexDirection: 'column', gap: 5, background: '#f8fafc', borderRadius: 10, padding: 13, color: '#475569' },
  tableWrap: { overflowX: 'auto', border: '1px solid #dce7e3', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 620 },
  terms: { lineHeight: 1.75, color: '#334155', margin: '22px 0 0' },
  note: { background: '#fffbeb', borderRadius: 10, padding: 12, color: '#854d0e' },
  signatures: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, marginTop: 34, paddingTop: 18, borderTop: '1px solid #cbd5e1' },
  stamp: { display: 'block', width: 92, height: 92, objectFit: 'contain', marginTop: 8 },
  accepted: { display: 'block', color: '#166534', marginTop: 16, fontSize: 13 },
  pdfButton: { display: 'inline-flex', marginTop: 24, background: '#eef6f3', color: '#075344', border: '1px solid #bcd8cf', borderRadius: 9, padding: '10px 14px', textDecoration: 'none', fontWeight: 800 },
  confirmCard: { marginTop: 16, background: '#fff', border: '1px solid #dce7e3', borderRadius: 16, padding: 18, display: 'grid', gap: 12, boxShadow: '0 12px 34px rgba(15,65,52,.07)' },
  inputs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 13px', fontSize: 15 },
  confirmButton: { border: 0, borderRadius: 10, padding: '13px 16px', background: '#075344', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' },
  checkbox: { display: 'flex', gap: 9, alignItems: 'flex-start', color: '#334155', lineHeight: 1.5, fontSize: 14 },
  success: { background: '#dcfce7', color: '#166534', padding: 11, borderRadius: 10 },
  error: { background: '#fff1f2', color: '#9f1239', padding: 11, borderRadius: 10 },
  completed: { background: '#dcfce7', color: '#166534', padding: 14, borderRadius: 10, fontWeight: 800 },
}
