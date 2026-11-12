'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import styles from '@/app/expo2026/expo.module.css'

const PROFESSIONS = ['სტომატოლოგი', 'კლინიკის მფლობელი / მენეჯერი', 'სტომატოლოგიური ტექნიკოსი', 'დისტრიბუტორი', 'სხვა']

type Step = 'phone' | 'code' | 'register'

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, payload }
}

// Phone + SMS code sign-in for doctors. A number that has no account yet gets
// a short registration step; an existing doctor is signed into their account.
export function SmsSignIn({ onSignedIn, onCancel, intro }: { onSignedIn: (accessToken: string) => void; onCancel?: () => void; intro?: string }) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [form, setForm] = useState({ fullName: '', profession: PROFESSIONS[0], clinicName: '', city: '', privacyAccepted: false, marketingConsent: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function sendCode() {
    setBusy(true); setError('')
    const { ok, payload } = await post('/api/auth/sms/send', { phone })
    setBusy(false)
    if (!ok) { setError(payload.error || 'კოდი ვერ გაიგზავნა.'); return }
    setStep('code'); setCooldown(60)
  }

  async function verify(withRegistration: boolean) {
    setBusy(true); setError('')
    try {
      const { ok, payload } = await post('/api/auth/sms/verify', { phone, code, registration: withRegistration ? form : undefined })
      if (!ok) { setError(payload.error || 'კოდი არასწორია.'); return }
      if (payload.needsRegistration) { setStep('register'); return }
      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({ token_hash: payload.tokenHash, type: 'magiclink' })
      if (sessionError) { setError('შესვლა ვერ დასრულდა. სცადეთ თავიდან.'); return }
      if (!sessionData.session?.access_token) { setError('სესია ვერ შეიქმნა. სცადეთ თავიდან.'); return }
      onSignedIn(sessionData.session.access_token)
    } catch (cause) {
      console.error('[sms-sign-in] verification failed', cause)
      setError('კავშირის შეცდომა. სცადეთ თავიდან.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2>{step === 'register' ? 'მოკლე რეგისტრაცია' : 'შესვლა SMS კოდით'}</h2>
      <p className={styles.muted}>{intro || 'დარეგისტრირებული ექიმისთვის ახალი ანგარიში არ იქმნება — შეხვალთ თქვენს არსებულ კაბინეტში.'}</p>

      {step === 'phone' ? (
        <>
          <label className={styles.field}>მობილურის ნომერი
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="5XX XX XX XX" inputMode="tel" autoComplete="tel" />
          </label>
          <div className={styles.row}>
            {onCancel ? <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={onCancel}>გაუქმება</button> : null}
            <button type="button" className={styles.btn} disabled={busy || phone.replace(/\D/g, '').length < 9} onClick={sendCode}>{busy ? 'იგზავნება...' : 'კოდის მიღება'}</button>
          </div>
        </>
      ) : null}

      {step === 'code' ? (
        <>
          <label className={styles.field}>SMS კოდი, გაგზავნილი ნომერზე {phone}
            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6 ციფრი" />
          </label>
          <div className={styles.row}>
            <button type="button" className={`${styles.btn} ${styles.btnLight}`} disabled={busy || cooldown > 0} onClick={sendCode}>{cooldown > 0 ? `ხელახლა ${cooldown} წმ-ში` : 'ხელახლა გაგზავნა'}</button>
            <button type="button" className={styles.btn} disabled={busy || code.length !== 6} onClick={() => verify(false)}>{busy ? 'მოწმდება...' : 'დადასტურება'}</button>
          </div>
          <p className={styles.muted} style={{ marginTop: 10 }}><button type="button" className={styles.linkBtn} onClick={() => { setStep('phone'); setCode('') }}>ნომრის შეცვლა</button></p>
        </>
      ) : null}

      {step === 'register' ? (
        <>
          <label className={styles.field}>სახელი და გვარი *
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} autoComplete="name" />
          </label>
          <label className={styles.field}>საქმიანობა *
            <select value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })}>
              {PROFESSIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className={styles.field}>კლინიკა
            <input value={form.clinicName} onChange={(event) => setForm({ ...form, clinicName: event.target.value })} />
          </label>
          <label className={styles.field}>ქალაქი
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={form.privacyAccepted} onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })} />
            <span>ვეცნობი და ვეთანხმები <Link href="/privacy-policy" target="_blank">კონფიდენციალურობის პოლიტიკას</Link>: ჩემი მონაცემები გამოიყენება ანგარიშისა და ფასის მოთხოვნების სამართავად. *</span>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={form.marketingConsent} onChange={(event) => setForm({ ...form, marketingConsent: event.target.checked })} />
            <span>თანახმა ვარ, მივიღო სიახლეები და სარეკლამო შეტყობინებები (არასავალდებულო, ნებისმიერ დროს გაუქმებადი).</span>
          </label>
          <div className={styles.row}>
            <button type="button" className={styles.btn} disabled={busy || form.fullName.trim().length < 2 || !form.privacyAccepted} onClick={() => verify(true)}>{busy ? 'იქმნება...' : 'რეგისტრაცია და შესვლა'}</button>
          </div>
        </>
      ) : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  )
}

export function SmsSignInModal(props: { onSignedIn: () => void; onCancel: () => void; intro?: string }) {
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label="SMS-ით შესვლა">
      <div className={styles.modalBox}><SmsSignIn {...props} /></div>
    </div>
  )
}
