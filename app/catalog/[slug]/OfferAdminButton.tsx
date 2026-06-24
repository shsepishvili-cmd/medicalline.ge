'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'

export default function OfferAdminButton({ slug }: { slug: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(sessionStorage.getItem('ml_admin_auth') === '1')
    } catch {
      setVisible(false)
    }
  }, [])

  if (!visible) return null

  return (
    <Link
      href={`/admin/offers?product=${encodeURIComponent(slug)}`}
      className="mb-4 inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-xs font-black uppercase tracking-widest text-emerald-800"
    >
      <Send size={18} /> შეთავაზების შექმნა
    </Link>
  )
}
