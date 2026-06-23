'use client'

import { useMemo, useState } from 'react'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #dbe3ee', borderRadius: 12, padding: '12px 14px',
  fontSize: 15, outline: 'none', background: '#fff', boxSizing: 'border-box',
}

export default function OfferPage() {
  const [password, setPassword] = useState('')
  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('შეთავაზება Medical Line Georgia-სგან')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GEL')
  const [details, setDetails] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const smsText = useMemo(() => {
    const greeting = clientName.trim() ? `გამარჯობა, ${clientName.trim()}!` : 'გამარჯობა!'
    const amountLine = amount.trim() ? `\nღირებულება: ${amount.trim()} ${currency}` : ''
    const detailsLine = details.trim() ? `\n${details.trim()}` : ''
    const linkLine = link.trim() ? `\n${link.trim()}` : ''
    return `${greeting}\n${title.trim() || 'შეთავაზება Medical Line Georgia-სგან'}${amountLine}${detailsLine}${linkLine}\nMedical Line Georgia | 514 01 11 16`
  }, [clientName, title, amount, currency, details, link])

  async function sendSms() {
    setStatus('')
    if (!phone.trim()) return setStatus('მიუთითე კლიენტის ტელეფონის ნომერი.')
    if (!password.trim()) return setStatus('მიუთითე Offers-ის პაროლი.')
    setBusy(true)
    try {
      const response = await fetch('/api/offer/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-offer-secret': password.trim() },
        body: JSON.stringify({ phone, text: smsText }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'SMS ვერ გაიგზავნა.')
      setStatus(`SMS გაიგზავნა${data?.balance !== null && data?.balance !== undefined ? ` · დარჩენილი ბალანსი: ${data.balance}` : ''}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SMS ვერ გაიგზავნა.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f8fc', padding: '28px 16px', fontFamily: 'Arial, sans-serif', color: '#172033' }}>
      <section style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, color: '#1769e0', fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>MEDICAL LINE GEORGIA</p>
          <h1 style={{ margin: '7px 0 4px', fontSize: 30 }}>Offers</h1>
          <p style={{ margin: 0, color: '#667085', lineHeight: 1.5 }}>შეთავაზების ტექსტის შექმნა და SMS-ით გაგზავნა</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
          <section style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 8px 30px rgba(20,45,90,.08)' }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>კლიენტი და შეთავაზება</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <label>Offers-ის პაროლი<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
              <label>კლიენტის სახელი<input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="მაგ: ნინო" style={inputStyle} /></label>
              <label>ტელეფონი<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5XX XX XX XX" style={inputStyle} /></label>
              <label>სათაური<input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
                <label>ფასი<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="მაგ: 2,500" style={inputStyle} /></label>
                <label>ვალუტა<select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}><option>GEL</option><option>USD</option><option>EUR</option></select></label>
              </div>
              <label>დეტალები<textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="პროდუქტი, განვადება, მოქმედების ვადა..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></label>
              <label>ბმული (სურვილისამებრ)<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." style={inputStyle} /></label>
            </div>
          </section>

          <section style={{ background: '#102a56', color: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 8px 30px rgba(20,45,90,.15)' }}>
            <p style={{ marginTop: 0, opacity: .72, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>SMS PREVIEW</p>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.6, margin: '10px 0 20px' }}>{smsText}</pre>
            <p style={{ color: '#bcd2f6', fontSize: 12, marginBottom: 16 }}>{smsText.length} / 459 სიმბოლო</p>
            <button onClick={sendSms} disabled={busy} style={{ width: '100%', border: 0, borderRadius: 12, padding: '14px', background: busy ? '#8aa9d7' : '#fff', color: '#102a56', fontWeight: 800, cursor: busy ? 'wait' : 'pointer', fontSize: 15 }}>
              {busy ? 'იგზავნება...' : 'SMS გაგზავნა'}
            </button>
            {status ? <p style={{ marginBottom: 0, marginTop: 14, color: status.startsWith('SMS გაიგზავნა') ? '#a8f0c7' : '#ffb4b4', lineHeight: 1.4 }}>{status}</p> : null}
          </section>
        </div>
      </section>
    </main>
  )
}
