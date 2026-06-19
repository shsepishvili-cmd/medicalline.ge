'use client'
import { useState } from 'react'

export default function InvoiceLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(new URL('/api/invoice-auth', window.location.origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      })

      if (res.ok) {
        window.location.assign('/invoice')
        return
      }

      const data = await res.json().catch(() => ({}))
      setError(data.error || 'პაროლი არასწორია')
    } catch {
      setError('შესვლა ვერ მოხერხდა. გადაამოწმე ინტერნეტი და სცადე თავიდან.')
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f1f5f9', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 360,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '0.5px solid #e2e8f0',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, background: '#2563eb', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 22,
          }}>📄</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>InvoiceGE</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>შეიყვანეთ პაროლი გასასვლელად</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="პაროლი"
            autoFocus
            style={{
              width: '100%', padding: '11px 14px', fontSize: 15,
              border: error ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
              borderRadius: 10, outline: 'none', boxSizing: 'border-box',
              marginBottom: 10,
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 10px' }}>⚠ {error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              background: loading || !password ? '#94a3b8' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'მოწმდება...' : 'შესვლა'}
          </button>
        </form>
      </div>
    </div>
  )
}
