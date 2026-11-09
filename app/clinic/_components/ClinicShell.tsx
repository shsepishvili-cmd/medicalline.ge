'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { useClinicPortal } from './ClinicPortalProvider'

const desktopItems = [
  ['/clinic/dashboard', 'მთავარი'], ['/clinic/catalog', 'კატალოგი'], ['/clinic/offers', 'სპეციალური შეთავაზებები'],
  ['/clinic/orders', 'შეკვეთები და გადახდები'], ['/clinic/service', 'სერვისი'], ['/clinic/academy', 'Academy'], ['/clinic/profile', 'პროფილი'],
] as const
// Phone: four main sections in the bottom bar, everything else under "more".
const mobileItems = [
  ['/clinic/dashboard', '⌂', 'მთავარი'], ['/clinic/catalog', '▦', 'კატალოგი'], ['/clinic/offers', '◆', 'შეთავაზებები'], ['/clinic/payments', '₾', 'გადახდები'],
] as const
const moreItems = [
  ['/clinic/orders', 'შეკვეთები და გადახდები'], ['/clinic/service', 'სერვისი'], ['/clinic/academy', 'Academy'], ['/clinic/profile', 'პროფილი'],
] as const

export function ClinicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading, profile, signOut } = useClinicPortal()
  const [signingOut, setSigningOut] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const statusLabel = ({ active: 'აქტიური', pending: 'დადასტურების მოლოდინში', blocked: 'დაბლოკილი' } as Record<string, string>)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    await signOut()
    router.replace('/clinic')
    router.refresh()
  }
  if (loading) return <div className="clinic-portal clinic-login-gate"><div className="clinic-card">იტვირთება...</div></div>
  if (!profile) return (
    <div className="clinic-portal clinic-login-gate"><div className="clinic-card clinic-empty">
      <strong>ავტორიზაცია საჭიროა</strong><p className="clinic-muted">კლინიკის პორტალის სანახავად შედით თქვენს ანგარიშში.</p>
      <Link className="clinic-btn" href="/clinic">შესვლა / რეგისტრაცია</Link>
    </div></div>
  )
  if (profile.role === 'admin') return <div className="clinic-portal clinic-login-gate"><div className="clinic-card clinic-empty">
    <strong>ადმინის ანგარიშია აქტიური</strong>
    <p className="clinic-muted">შეთავაზების დადასტურება შეუძლია მხოლოდ იმ ექიმის ანგარიშს, ვისთვისაც შეთავაზება შეიქმნა. გამოდით და შედით შესაბამისი Clinic ანგარიშით.</p>
    <button className="clinic-btn" type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut ? 'გასვლა...' : 'ადმინის session-იდან გასვლა'}</button>
  </div></div>
  return <div className="clinic-portal"><div className="clinic-shell">
    <aside className="clinic-sidebar">
      <div className="clinic-brand"><div className="clinic-brand-mark">ML</div><div><strong>Medical Line</strong><span>Doctor / Clinic Portal</span></div></div>
      <nav className="clinic-nav">{desktopItems.map(([href, label]) => <Link key={href} href={href} data-active={pathname === href || pathname.startsWith(`${href}/`)}>{label}</Link>)}</nav>
      <div className="clinic-sidebar-foot"><strong>{profile.full_name}</strong><br />{profile.clinic_name || 'კლინიკის პროფილი'}<br />სტატუსი: {statusLabel[profile.status] || profile.status}<button className="clinic-signout" type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut ? 'გასვლა...' : 'ანგარიშიდან გასვლა'}</button></div>
    </aside>
    <header className="clinic-mobile-top">
      <div className="clinic-brand-mark">ML</div>
      <div><strong>{profile.full_name || 'Medical Line'}</strong><span>{profile.clinic_name || 'Doctor / Clinic Portal'}</span></div>
    </header>
    <main className="clinic-main">{children}</main>
    <nav className="clinic-mobile-nav">
      {mobileItems.map(([href, icon, label]) => <Link key={href} href={href} data-active={isActive(href)} onClick={() => setMoreOpen(false)}><span>{icon}</span>{label}</Link>)}
      <button type="button" data-active={moreOpen || moreItems.some(([href]) => isActive(href))} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}><span>☰</span>მეტი</button>
    </nav>
    {moreOpen ? <>
      <div className="clinic-more-backdrop" onClick={() => setMoreOpen(false)} />
      <div className="clinic-more-sheet" role="dialog" aria-label="მენიუ">
        <div className="clinic-more-grabber" />
        <div className="clinic-more-user"><strong>{profile.full_name}</strong><span>{profile.clinic_name || 'კლინიკის პროფილი'} · {statusLabel[profile.status] || profile.status}</span></div>
        {moreItems.map(([href, label]) => <Link key={href} href={href} data-active={isActive(href)} onClick={() => setMoreOpen(false)}>{label}<span aria-hidden="true">›</span></Link>)}
        <button type="button" className="clinic-more-signout" onClick={handleSignOut} disabled={signingOut}>{signingOut ? 'გასვლა...' : 'ანგარიშიდან გასვლა'}</button>
      </div>
    </> : null}
  </div></div>
}

export function ClinicPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="clinic-page-head"><div>{eyebrow && <p className="clinic-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>
}
