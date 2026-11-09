'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'

export default function AdminResetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthorized(Boolean(data.session))
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || session) setAuthorized(true)
      setChecking(false)
    })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (password.length < 8) { setMessage('პაროლი მინიმუმ 8 სიმბოლოს უნდა შეიცავდეს.'); return }
    if (password !== confirmation) { setMessage('პაროლები ერთმანეთს არ ემთხვევა.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setSaving(false); setMessage('პაროლის შეცვლა ვერ მოხერხდა. მოითხოვეთ ახალი ბმული.'); return }
    await supabase.auth.signOut()
    router.replace('/admin')
    router.refresh()
  }

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#f5f5f0' }}>
    <section style={{ width: 'min(420px, 100%)', padding: 30, borderRadius: 16, background: '#fff', border: '1px solid #e5e7eb' }}>
      <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 13, marginBottom: 16, background: '#085041', color: '#fff', fontSize: 22 }}>ML</div>
      <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>ადმინის პაროლის აღდგენა</h1>
      <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>შეიყვანეთ ახალი, მინიმუმ 8-სიმბოლოიანი პაროლი.</p>
      {checking ? <p>აღდგენის ბმული მოწმდება...</p> : authorized ? <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
        <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>ახალი პაროლი<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ padding: 11, borderRadius: 9, border: '1px solid #cbd5e1' }} /></label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>გაიმეორეთ პაროლი<input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} style={{ padding: 11, borderRadius: 9, border: '1px solid #cbd5e1' }} /></label>
        {message && <p style={{ color: '#9f1239', fontSize: 12 }}>{message}</p>}
        <button type="submit" disabled={saving} style={{ border: 0, borderRadius: 9, padding: 12, background: '#085041', color: '#fff', fontWeight: 700 }}>{saving ? 'ინახება...' : 'პაროლის განახლება'}</button>
      </form> : <p style={{ color: '#9f1239', background: '#ffe4e6', padding: 12, borderRadius: 9 }}>აღდგენის ბმული არასწორია ან ვადა გაუვიდა.</p>}
      <Link href="/admin" style={{ display: 'inline-block', marginTop: 16, color: '#2563eb', fontSize: 13, fontWeight: 700 }}>ადმინის შესვლაზე დაბრუნება</Link>
    </section>
  </main>
}
