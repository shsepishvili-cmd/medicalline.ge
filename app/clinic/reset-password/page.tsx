'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setHasRecoverySession(Boolean(data.session))
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || session) setHasRecoverySession(true)
      setChecking(false)
    })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (password.length < 8) { setMessage('ახალი პაროლი მინიმუმ 8 სიმბოლოს უნდა შეიცავდეს.'); return }
    if (password !== confirmation) { setMessage('პაროლები ერთმანეთს არ ემთხვევა.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setSaving(false); setMessage('პაროლის განახლება ვერ მოხერხდა. მოითხოვეთ ახალი აღდგენის ბმული.'); return }
    await supabase.auth.signOut()
    router.replace('/clinic')
    router.refresh()
  }

  return <main className="clinic-portal clinic-login-gate">
    <section className="clinic-card" style={{ width: 'min(440px, 100%)' }}>
      <p className="clinic-eyebrow">Medical Line Clinic Portal</p>
      <h1 style={{ color: '#103f35', margin: '0 0 8px' }}>ახალი პაროლის დაყენება</h1>
      <p className="clinic-muted">გამოიყენეთ მინიმუმ 8 სიმბოლო და არ გაუზიაროთ პაროლი სხვა პირს.</p>
      {checking ? <div className="clinic-alert">აღდგენის ბმული მოწმდება...</div> : hasRecoverySession ? <form onSubmit={updatePassword} className="clinic-form-grid" style={{ gridTemplateColumns: '1fr', marginTop: 20 }}>
        <div className="clinic-field"><label htmlFor="new-password">ახალი პაროლი</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        <div className="clinic-field"><label htmlFor="confirm-password">გაიმეორეთ ახალი პაროლი</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
        {message && <div className="clinic-alert clinic-alert-error">{message}</div>}
        <button className="clinic-btn" type="submit" disabled={saving}>{saving ? 'ინახება...' : 'პაროლის განახლება'}</button>
      </form> : <div className="clinic-alert clinic-alert-error">აღდგენის ბმული არასწორია ან ვადა გაუვიდა. დაბრუნდით შესვლის გვერდზე და მოითხოვეთ ახალი ბმული.</div>}
      <div className="clinic-actions"><Link className="clinic-btn clinic-btn-ghost" href="/clinic">შესვლის გვერდზე დაბრუნება</Link></div>
    </section>
  </main>
}

