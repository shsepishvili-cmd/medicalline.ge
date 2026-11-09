'use client'

import { useState } from 'react'
import styles from '@/app/admin/installments/installments.module.css'

export function PayInstallmentButton({ token, scheduleId }: { token: string; scheduleId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/installments/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.redirectUrl) {
        window.location.href = payload.redirectUrl
        return
      }
      setError(payload?.error || 'გადახდა ვერ დაიწყო. სცადეთ თავიდან.')
    } catch {
      setError('გადახდა ვერ დაიწყო. შეამოწმეთ ინტერნეტთან კავშირი.')
    }
    setBusy(false)
  }

  return (
    <span>
      <button type="button" className={styles.smallBtn} disabled={busy} onClick={pay}>{busy ? 'იხსნება...' : 'გადახდა BOG-ით ↗'}</button>
      {error ? <small role="alert" style={{ color: '#a12238', maxWidth: 220 }}>{error}</small> : null}
    </span>
  )
}
