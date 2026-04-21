import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { formatDate, WARRANTY_STATUS_LABELS } from '@/app/lib/warranty'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

export const dynamic = 'force-dynamic'

async function loadWarranty(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!supabaseUrl || !supabaseAnonKey) return null

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data } = await supabase.rpc('get_warranty_public_summary', {
    p_verify_token: token,
  })

  return ((data || [])[0] || null) as WarrantyRecord | null
}

export default async function WarrantyVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const warranty = await loadWarranty(token)

  return (
    <main style={{ minHeight: '100vh', background: '#F5F5F0', padding: '30px 18px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(8,80,65,1) 0%, rgba(11,97,77,1) 58%, rgba(13,125,98,1) 100%)',
            color: '#fff',
            borderRadius: 24,
            padding: '26px 24px',
            boxShadow: '0 20px 50px rgba(8, 80, 65, 0.14)',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: '#9FE1CB' }}>Medical Line Georgia</p>
          <h1 style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 700 }}>Warranty Verification</h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: '#D6F2E8', lineHeight: 1.7 }}>
            This page is opened from a warranty QR code or tokenized link and shows the public verification summary for the registered product.
          </p>
        </div>

        {!warranty ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid rgba(15, 23, 42, 0.08)', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#18212F' }}>Warranty not found</p>
            <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
              The verification token may be invalid, rotated, or not generated yet for this warranty certificate.
            </p>
            <div style={{ marginTop: 18 }}>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '11px 16px',
                  borderRadius: 12,
                  background: '#085041',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                Back to Medical Line
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: 22, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                ['Warranty #', warranty.warranty_number],
                ['Status', WARRANTY_STATUS_LABELS[warranty.status] || warranty.status],
                ['Clinic', warranty.clinic_name || '—'],
                ['Customer', warranty.customer_name || '—'],
                ['Product', warranty.product_name],
                ['Brand / Model', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
                ['Serial Number', warranty.serial_number],
                ['Purchase Date', formatDate(warranty.purchase_date)],
                ['Installation Date', formatDate(warranty.installation_date)],
                ['Warranty Start', formatDate(warranty.warranty_start)],
                ['Warranty End', formatDate(warranty.warranty_end)],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#FAFAF8', borderRadius: 16, padding: '14px 15px', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{label}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: '#18212F' }}>{value}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: '18px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
              If the product requires support, contact Medical Line Georgia and provide the warranty number or serial number shown above.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
