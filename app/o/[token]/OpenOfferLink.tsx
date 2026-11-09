'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { SmsSignIn } from '@/app/components/expo/SmsSignIn'
import styles from '@/app/expo2026/expo.module.css'

const STORE_KEY = 'ml-offer-link'

type State = 'checking' | 'sign-in' | 'opening' | 'error'

// Opens a one-time offer link. The token is removed from the address bar at
// once (so it does not linger in history or screenshots) and kept only for
// this tab until it is used.
export function OpenOfferLink({ token }: { token: string }) {
  const router = useRouter()
  const tokenRef = useRef<string>('')
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState('')
  const [wrongAccount, setWrongAccount] = useState(false)

  async function open() {
    setState('opening'); setError(''); setWrongAccount(false)
    const { data } = await supabase.auth.getSession()
    if (!data.session) { setState('sign-in'); return }
    const response = await fetch('/api/offer-links/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ token: tokenRef.current }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && payload.offerId) {
      window.sessionStorage.removeItem(STORE_KEY)
      router.replace(`/clinic/offers/${payload.offerId}`)
      return
    }
    if (payload.reason === 'used' || payload.reason === 'expired' || payload.reason === 'revoked') window.sessionStorage.removeItem(STORE_KEY)
    setWrongAccount(response.status === 404)
    setError(payload.error || 'ბმული ვერ გაიხსნა.')
    setState('error')
  }

  useEffect(() => {
    // After the address is cleaned the route reads "/o/secure"; a reload then
    // falls back to the token kept for this tab.
    tokenRef.current = /^[A-Za-z0-9_-]{43}$/.test(token) ? token : window.sessionStorage.getItem(STORE_KEY) || ''
    if (tokenRef.current) window.sessionStorage.setItem(STORE_KEY, tokenRef.current)
    window.history.replaceState(null, '', '/o/secure')
    void open()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function switchAccount() {
    await supabase.auth.signOut()
    setState('sign-in')
  }

  return (
    <div className={styles.page}>
      <div className={styles.center}>
        <h1>პერსონალური შეთავაზება</h1>
        {state === 'checking' || state === 'opening' ? <p className={styles.muted}>მოწმდება...</p> : null}
        {state === 'sign-in' ? (
          <>
            <p className={styles.muted}>ბმული ერთჯერადია. გასახსნელად შედით იმ ნომრით, რომელზეც SMS მიიღეთ.</p>
            <SmsSignIn onSignedIn={() => void open()} intro="შეიყვანეთ ნომერი, რომელზეც შეთავაზების SMS მიიღეთ." />
          </>
        ) : null}
        {state === 'error' ? (
          <>
            <p className={styles.error} role="alert">{error}</p>
            <div className={styles.row}>
              {wrongAccount ? <button type="button" className={styles.btn} onClick={switchAccount}>სხვა ნომრით შესვლა</button> : null}
              <Link className={`${styles.btn} ${styles.btnLight}`} href="/clinic/offers">ჩემი შეთავაზებები</Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
