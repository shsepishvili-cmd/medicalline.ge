'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ClinicProduct } from '@/app/lib/clinic-portal-types'

export function SpecialPriceRequestModal({ product, onClose, onCreated }: { product: ClinicProduct; onClose: () => void; onCreated: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [timeline, setTimeline] = useState('now')
  const [paymentMethod, setPaymentMethod] = useState('advance_and_balance')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  async function submit() {
    setSaving(true); setError('')
    const { error: rpcError } = await supabase.rpc('submit_special_price_request', {
      p_product_id: product.id, p_quantity: quantity, p_purchase_timeline: timeline,
      p_preferred_payment_method: paymentMethod, p_note: note || null,
    })
    setSaving(false)
    if (rpcError) { setError(rpcError.message); return }
    setDone(true); onCreated()
  }
  return <div className="clinic-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="clinic-modal" role="dialog" aria-modal="true" aria-labelledby="special-price-title">
      <div className="clinic-row"><div><p className="clinic-eyebrow">{product.brand}</p><h2 id="special-price-title">სპეციალური ფასის მოთხოვნა</h2></div><button className="clinic-btn clinic-btn-ghost" onClick={onClose}>დახურვა</button></div>
      {done ? <div className="clinic-empty"><strong>თქვენი მოთხოვნა მიღებულია</strong><p className="clinic-muted">ინდივიდუალურ შეთავაზებას მიიღებთ კაბინეტში ან ჩვენი გუნდი დაგიკავშირდებათ.</p><button className="clinic-btn" onClick={onClose}>დასრულება</button></div> : <>
        <div className="clinic-card" style={{ margin: '18px 0' }}><strong>{product.name}</strong><p className="clinic-muted">პროდუქტი ავტომატურად არის არჩეული.</p></div>
        <div className="clinic-form-grid">
          <div className="clinic-field"><label htmlFor="request-quantity">რაოდენობა</label><input id="request-quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></div>
          <div className="clinic-field"><label htmlFor="request-timeline">შეძენის სავარაუდო პერიოდი</label><select id="request-timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)}><option value="now">ახლავე</option><option value="within_1_month">1 თვის განმავლობაში</option><option value="within_1_3_months">1–3 თვის განმავლობაში</option><option value="later">მოგვიანებით</option></select></div>
          <div className="clinic-field clinic-field-full"><label htmlFor="request-payment">სასურველი გადახდის მეთოდი</label><select id="request-payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="full">სრული გადახდა</option><option value="bank_installment">ბანკის განვადება</option><option value="medical_line_installment">Medical Line-ის ეტაპობრივი გადახდა</option><option value="advance_and_balance">ავანსი + დარჩენილი თანხა</option></select></div>
          <div className="clinic-field clinic-field-full"><label htmlFor="request-note">კომენტარი / დამატებითი მოთხოვნა</label><textarea id="request-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="სასურველი პირობები, მიწოდების დრო ან სხვა დეტალი" /></div>
        </div>
        {error && <p className="clinic-alert clinic-alert-error">{error}</p>}
        <div className="clinic-actions"><button className="clinic-btn" disabled={saving} onClick={submit}>{saving ? 'იგზავნება...' : 'მოთხოვნის გაგზავნა'}</button><button className="clinic-btn clinic-btn-ghost" onClick={onClose}>გაუქმება</button></div>
      </>}
    </div>
  </div>
}

