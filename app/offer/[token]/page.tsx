import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

export default async function OfferTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || !key) notFound()

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data } = await db.from('offers').select('*').eq('token', token).maybeSingle()
  if (!data) notFound()

  const offer = data as Record<string, unknown>
  const title = String(offer.title || offer.name || 'კომერციული შეთავაზება')
  const customer = String(offer.client_name || offer.customer_name || '')
  const note = String(offer.description || offer.notes || offer.details || '')
  const total = offer.total || offer.amount || offer.total_amount || ''
  const currency = String(offer.currency || 'GEL')

  return (
    <main style={{ minHeight: '100vh', background: '#f4f7fb', padding: '24px 14px', fontFamily: 'Arial, sans-serif', color: '#172033' }}>
      <article style={{ maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 34px rgba(23,32,51,.12)' }}>
        <header style={{ background: '#102a56', color: '#fff', padding: '28px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>MEDICAL LINE GEORGIA</div>
          <h1 style={{ margin: '9px 0 0', fontSize: 27 }}>{title}</h1>
        </header>
        <section style={{ padding: '28px', lineHeight: 1.65 }}>
          {customer ? <p><b>კლიენტი:</b> {customer}</p> : null}
          {note ? <p style={{ whiteSpace: 'pre-wrap' }}>{note}</p> : null}
          {total ? <div style={{ marginTop: 24, textAlign: 'right', fontSize: 24, fontWeight: 800, color: '#102a56' }}>სულ: {String(total)} {currency}</div> : null}
          <hr style={{ border: 0, borderTop: '1px solid #e4eaf3', margin: '28px 0 16px' }} />
          <div style={{ color: '#64748b', fontSize: 14 }}>დამატებითი ინფორმაციისთვის: +995 514 01 11 16</div>
        </section>
      </article>
    </main>
  )
}
