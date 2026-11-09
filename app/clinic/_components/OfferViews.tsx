'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { formatClinicMoney, isOfferExpired, offerStatusLabels, scheduleStatusLabels, type ClinicOffer, type PaymentSchedule } from '@/app/lib/clinic-portal-types'
import { useClinicPortal } from './ClinicPortalProvider'
import { merchant } from '@/app/lib/merchant'
import { CreditCard } from 'lucide-react'

export function OfferCard({ offer }: { offer: ClinicOffer }) {
  const next = [...(offer.payment_schedules || [])].sort((a, b) => a.installment_number - b.installment_number).find((row) => row.status === 'available' || row.status === 'overdue')
  const expired = isOfferExpired(offer)
  return <Link className="clinic-card clinic-offer-card" href={`/clinic/offers/${offer.id}`}>
    <div className="clinic-row"><div><span className={`clinic-badge ${expired ? 'clinic-badge-danger' : ''}`}>{expired ? 'ვადა გასულია' : offerStatusLabels[offer.status]}</span><h3 style={{ margin: '11px 0 4px' }}>შეთავაზება {offer.offer_number}</h3><p className="clinic-muted">{offer.clinic_name_snapshot} · {new Date(offer.created_at).toLocaleDateString('ka-GE')}</p></div><div style={{ textAlign: 'right' }}><div className="clinic-amount">{formatClinicMoney(offer.total_amount, offer.currency)}</div>{offer.valid_until && <div className="clinic-muted">ძალაშია {new Date(offer.valid_until).toLocaleDateString('ka-GE')}-მდე</div>}</div></div>
    {next && <div className="clinic-alert" style={{ marginTop: 14 }}>შემდეგი გადახდა: <strong>{formatClinicMoney(next.amount, offer.currency)}</strong> · {new Date(next.due_date).toLocaleDateString('ka-GE')}</div>}
  </Link>
}

export function PaymentScheduleView({ rows, currency, onPay, payingId }: { rows: PaymentSchedule[]; currency: string; onPay?: (row: PaymentSchedule) => void; payingId?: string | null }) {
  return <div className="clinic-table-wrap"><table className="clinic-table"><thead><tr><th>ეტაპი</th><th>თარიღი</th><th>თანხა</th><th>სტატუსი</th><th>მოქმედება</th></tr></thead><tbody>{[...rows].sort((a, b) => a.installment_number - b.installment_number).map((row) => <tr key={row.id}><td><strong>{row.title}</strong></td><td>{new Date(row.due_date).toLocaleDateString('ka-GE')}</td><td>{formatClinicMoney(row.amount, currency)}</td><td><span className={`clinic-badge ${row.status === 'overdue' ? 'clinic-badge-danger' : row.status === 'pending' ? 'clinic-badge-blue' : ''}`}>{scheduleStatusLabels[row.status]}</span></td><td>{onPay && (row.status === 'available' || row.status === 'overdue') ? <button className="clinic-btn" disabled={payingId === row.id} onClick={() => onPay(row)}>{payingId === row.id ? 'მზადდება...' : 'გადაიხადე ონლაინ'}</button> : '—'}</td></tr>)}</tbody></table></div>
}

export function OfferDetails({ offerId }: { offerId: string }) {
  const { session } = useClinicPortal()
  const [offer, setOffer] = useState<ClinicOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [consents, setConsents] = useState({ offer: false, delivery: false, privacy: false })
  const [message, setMessage] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('offers').select('*, offer_items(*, products(short_desc,specs,brand)), payment_schedules(*)').eq('id', offerId).single()
    setLoading(false); if (error) { setMessage(error.message); return }
    setOffer(data as ClinicOffer); if (data?.status === 'sent') void supabase.rpc('mark_clinic_offer_viewed', { p_offer_id: offerId })
  }, [offerId])
  useEffect(() => { void load() }, [load])
  async function acceptOffer() {
    setMessage('')
    if (!session?.user?.id || offer?.user_id !== session.user.id) {
      setMessage('ეს შეთავაზება სხვა Clinic ანგარიშზეა შექმნილი. შედით შეთავაზების მიმღები ექიმის ანგარიშით.')
      return
    }
    const { error } = await supabase.rpc('accept_clinic_offer', {
      p_offer_id: offerId,
      p_offer_terms: consents.offer,
      p_delivery_policy: consents.delivery,
      p_privacy_terms: consents.privacy,
    })
    if (error) { setMessage(error.message); return }
    await load()
  }
  async function pay(row: PaymentSchedule) {
    if (!session?.access_token) return
    setPayingId(row.id); setMessage('')
    const response = await fetch('/api/payments/bog/create-order', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ paymentScheduleId: row.id }) })
    const payload = await response.json().catch(() => ({})); setPayingId(null)
    if (!response.ok) { setMessage(payload.error || 'გადახდის შექმნა ვერ მოხერხდა.'); return }
    window.location.assign(payload.redirectUrl)
  }
  if (loading) return <div className="clinic-card">შეთავაზება იტვირთება...</div>
  if (!offer) return <div className="clinic-card clinic-empty"><strong>შეთავაზება ვერ მოიძებნა</strong><p className="clinic-muted">{message}</p></div>
  const expired = isOfferExpired(offer)
  const ownsOffer = offer.user_id === session?.user?.id
  const canAccept = ownsOffer && !expired && (offer.status === 'sent' || offer.status === 'viewed')
  const canPay = !expired && ['accepted', 'partially_paid'].includes(offer.status)
  const nextPayable = [...(offer.payment_schedules || [])]
    .sort((a, b) => a.installment_number - b.installment_number)
    .find((row) => row.status === 'available' || row.status === 'overdue')
  const remaining = Math.max(0, offer.total_amount - (offer.payment_schedules || []).filter((row) => row.status === 'paid').reduce((sum, row) => sum + Number(row.amount), 0))
  return <>
    <div className="clinic-card"><div className="clinic-row"><div><span className={`clinic-badge ${expired ? 'clinic-badge-danger' : ''}`}>{expired ? 'ვადა გასულია' : offerStatusLabels[offer.status]}</span><h2 style={{ margin: '10px 0 5px' }}>შეთავაზება {offer.offer_number}</h2><p className="clinic-muted">{offer.clinic_name_snapshot} · შექმნილია {new Date(offer.created_at).toLocaleDateString('ka-GE')}</p></div><div>{offer.valid_until && <div className="clinic-muted">მოქმედების ბოლო დღე</div>}<strong>{offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('ka-GE') : 'უვადო'}</strong></div></div></div>
    <h2 className="clinic-section-title">პროდუქტები</h2><div className="clinic-list">{(offer.offer_items || []).map((item) => <div className="clinic-card" key={item.id}><div className="clinic-row"><div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>{item.product_image_snapshot && <img src={item.product_image_snapshot} alt={item.product_name_snapshot} width={70} height={60} style={{ objectFit: 'contain' }} />}<div>{item.products?.brand && <div className="clinic-eyebrow">{item.products.brand}</div>}<strong>{item.product_name_snapshot}</strong><div className="clinic-muted">{item.quantity} × {formatClinicMoney(item.unit_price, offer.currency)} · ფასდაკლება {item.discount_percent}%</div></div></div><strong>{formatClinicMoney(item.total_price, offer.currency)}</strong></div>{item.products?.short_desc && <p className="clinic-muted">{item.products.short_desc}</p>}{item.products?.specs && Object.keys(item.products.specs).length > 0 && <div className="clinic-muted">{Object.entries(item.products.specs).slice(0, 6).map(([key, value]) => <span key={key} style={{ display: 'inline-block', marginRight: 14 }}><strong>{key}:</strong> {String(value)}</span>)}</div>}</div>)}</div>
    <h2 className="clinic-section-title">ფინანსური შეჯამება</h2><div className="clinic-grid clinic-grid-4"><div className="clinic-card"><div className="clinic-stat-label">ჯამური ღირებულება</div><div className="clinic-stat-value">{formatClinicMoney(offer.subtotal_amount, offer.currency)}</div></div><div className="clinic-card"><div className="clinic-stat-label">ფასდაკლება</div><div className="clinic-stat-value">{formatClinicMoney(offer.discount_amount, offer.currency)}</div></div><div className="clinic-card"><div className="clinic-stat-label">სპეციალური ფასი</div><div className="clinic-stat-value">{formatClinicMoney(offer.total_amount, offer.currency)}</div><div className="clinic-stat-meta">დღგ {offer.vat_included ? 'ჩათვლილია' : 'არ არის ჩათვლილი'}</div></div><div className="clinic-card"><div className="clinic-stat-label">დარჩენილი თანხა</div><div className="clinic-stat-value">{formatClinicMoney(remaining, offer.currency)}</div><div className="clinic-stat-meta">ავანსი {formatClinicMoney(offer.advance_amount, offer.currency)}</div></div></div>
    {canPay && nextPayable && <section className="clinic-pay-callout" aria-label="ონლაინ გადახდა">
      <div><span>ახლა გადასახდელი</span><strong>{formatClinicMoney(nextPayable.amount, offer.currency)}</strong><small>{nextPayable.title}</small></div>
      <button className="clinic-pay-button" disabled={payingId === nextPayable.id} onClick={() => pay(nextPayable)}><CreditCard size={22} />{payingId === nextPayable.id ? 'გადახდა მზადდება...' : 'გადახდა'}</button>
    </section>}
    <h2 className="clinic-section-title">გადახდის გრაფიკი</h2><div className="clinic-card"><PaymentScheduleView rows={offer.payment_schedules || []} currency={offer.currency} onPay={canPay ? pay : undefined} payingId={payingId} /></div>
    <h2 className="clinic-section-title">პირობები</h2><div className="clinic-grid clinic-grid-3"><div className="clinic-card"><strong>გადახდის პირობები</strong><p className="clinic-muted">{offer.payment_terms || 'ინდივიდუალური გრაფიკის შესაბამისად.'}</p></div><div className="clinic-card"><strong>მიწოდების პირობები</strong><p className="clinic-muted">{offer.delivery_terms || 'დეტალებს დაგიდასტურებთ Medical Line-ის გუნდი.'}</p></div><div className="clinic-card"><strong>საგარანტიო პირობები</strong><p className="clinic-muted">{offer.warranty_terms || 'განისაზღვრება პროდუქტის საგარანტიო დოკუმენტაციით.'}</p></div></div>
    {message && <p className="clinic-alert clinic-alert-error">{message}</p>}
    {!ownsOffer && <p className="clinic-alert clinic-alert-error">ეს შეთავაზება სხვა Clinic ანგარიშზეა შექმნილი. დადასტურებისთვის შედით შეთავაზების მიმღები ექიმის ანგარიშით.</p>}
    {canAccept && <div className="clinic-card clinic-accept" style={{ marginTop: 20 }}>
      <LegalConsents value={consents} onChange={setConsents} />
      <div className="clinic-actions"><button className="clinic-btn" disabled={!Object.values(consents).every(Boolean)} onClick={acceptOffer}>შეთავაზების დადასტურება</button></div>
    </div>}
    <div className="clinic-card" style={{ marginTop: 20 }}><strong>{merchant.legalName}</strong><p className="clinic-muted" style={{ marginBottom: 0 }}>ს/ნ {merchant.identificationNumber} · {merchant.address}<br />{merchant.phone} · {merchant.email} · {merchant.hours}</p></div>
    <div className="clinic-actions"><button className="clinic-btn clinic-btn-ghost" onClick={() => window.print()}>შეთავაზების PDF / ბეჭდვა</button><a className="clinic-btn clinic-btn-ghost" href={`https://wa.me/995514011116?text=${encodeURIComponent(`გამარჯობა, მსურს კონსულტაცია შეთავაზებაზე ${offer.offer_number}`)}`} target="_blank" rel="noreferrer">კონსულტაცია WhatsApp-ზე</a></div>
  </>
}

type ConsentState = { offer: boolean; delivery: boolean; privacy: boolean }

function LegalConsents({ value, onChange }: { value: ConsentState; onChange: (value: ConsentState) => void }) {
  return <div style={{ display: 'grid', gap: 12 }}>
    <label className="clinic-check"><input type="checkbox" checked={value.offer} onChange={(event) => onChange({ ...value, offer: event.target.checked })} /><span>ვეთანხმები შეთავაზების პირობებს და გადახდის გრაფიკს.</span></label>
    <label className="clinic-check"><input type="checkbox" checked={value.delivery} onChange={(event) => onChange({ ...value, delivery: event.target.checked })} /><span>გავეცანი <Link href="/delivery-returns" target="_blank">მიწოდების, გაუქმების, დაბრუნებისა და თანხის დაბრუნების პოლიტიკას</Link>.</span></label>
    <label className="clinic-check"><input type="checkbox" checked={value.privacy} onChange={(event) => onChange({ ...value, privacy: event.target.checked })} /><span>გავეცანი <Link href="/privacy" target="_blank">კონფიდენციალურობის პოლიტიკას</Link> და <Link href="/terms" target="_blank">წესებსა და პირობებს</Link>.</span></label>
  </div>
}
