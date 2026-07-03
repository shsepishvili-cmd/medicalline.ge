import Link from 'next/link'
import type { ReactNode } from 'react'
import { merchant } from '@/app/lib/merchant'

export function LegalPage({ title, updated = '29 ივნისი, 2026', children }: { title: string; updated?: string; children: ReactNode }) {
  return <main className="legal-page">
    <div className="legal-page-inner">
      <Link className="legal-home-link" href="/">← მთავარ გვერდზე დაბრუნება</Link>
      <header className="legal-page-header">
        <p>{merchant.brand}</p>
        <h1>{title}</h1>
        <span>ბოლო განახლება: {updated}</span>
      </header>
      <article className="legal-content">{children}</article>
      <aside className="legal-contact-card">
        <strong>{merchant.legalName}</strong>
        <span>ს/ნ {merchant.identificationNumber} · {merchant.address}</span>
        <span><a href={merchant.phoneHref}>{merchant.phone}</a> · <a href={merchant.emailHref}>{merchant.email}</a></span>
      </aside>
    </div>
  </main>
}
