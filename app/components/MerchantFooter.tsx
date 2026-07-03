'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { legalLinks, merchant } from '@/app/lib/merchant'

export default function MerchantFooter() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin') || pathname.startsWith('/invoice')) return null

  return <footer className="merchant-footer">
    <div className="merchant-footer-inner">
      <div className="merchant-footer-company">
        <strong>{merchant.legalName}</strong>
        <span>საიდენტიფიკაციო ნომერი: {merchant.identificationNumber}</span>
        <span>{merchant.address}</span>
        <span><a href={merchant.phoneHref}>{merchant.phone}</a> · <a href={merchant.emailHref}>{merchant.email}</a></span>
        <span>{merchant.hours}</span>
      </div>
      <nav className="merchant-footer-links" aria-label="იურიდიული ინფორმაცია">
        {legalLinks.map((link, index) => <span key={link.href} className="merchant-footer-link-item">
          {index > 0 ? <span className="merchant-footer-separator" aria-hidden="true">|</span> : null}
          <Link href={link.href}>{link.label}</Link>
        </span>)}
      </nav>
      <p className="merchant-footer-copy">© {new Date().getFullYear()} {merchant.brand}. ყველა უფლება დაცულია.</p>
    </div>
  </footer>
}
