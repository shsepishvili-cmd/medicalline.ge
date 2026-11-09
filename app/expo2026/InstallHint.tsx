'use client'

import { useEffect, useState } from 'react'
import styles from './expo.module.css'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const DISMISS_KEY = 'ml-expo-install-dismissed'

// "Add to home screen": Android/Chrome gets a one-tap install button; iPhone
// Safari has no install API, so it gets the two-step instruction. Hidden when
// already opened from the home screen or after the visitor closes it.
export function InstallHint() {
  const [mode, setMode] = useState<'android' | 'ios' | null>(null)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    try { if (window.localStorage.getItem(DISMISS_KEY)) return } catch { /* storage blocked: still show */ }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone || window.innerWidth > 760) return
    const ua = navigator.userAgent
    const isIos = /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
    if (isIos) { setMode('ios'); return }
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); setMode('android') }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setMode(null)
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice.catch(() => null)
    dismiss()
  }

  if (!mode) return null
  return (
    <div className={styles.installHint} role="note">
      <img src="/expo2026/icon-192.png" alt="" width={40} height={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>დაამატეთ ტელეფონის ეკრანზე</b>
        {mode === 'ios'
          ? <span>დააჭირეთ <b>გაზიარებას</b> <span aria-hidden="true">⬆︎</span> და აირჩიეთ <b>„Add to Home Screen“</b>.</span>
          : <span>გაიხსნება აპლიკაციასავით, ერთი შეხებით.</span>}
      </div>
      {mode === 'android' ? <button type="button" className={styles.btn} style={{ padding: '9px 14px' }} onClick={install}>დაყენება</button> : null}
      <button type="button" className={styles.sheetClose} style={{ position: 'static' }} onClick={dismiss} aria-label="დახურვა">✕</button>
    </div>
  )
}
