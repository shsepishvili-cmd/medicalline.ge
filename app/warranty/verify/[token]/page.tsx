import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { formatDate, WARRANTY_STATUS_LABELS } from '@/app/lib/warranty'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

async function loadWarranty(token: string): Promise<{
  warranty: WarrantyRecord | null
  rpcError: string | null
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return { warranty: null, rpcError: 'Supabase not configured.' }
  }

  if (!isValidUuid(token)) {
    return { warranty: null, rpcError: 'invalid_token' }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('get_warranty_public_summary', {
    p_verify_token: token,
  })

  if (error) {
    console.error('[warranty/verify] RPC error:', error.message, error.code)
    return { warranty: null, rpcError: error.message }
  }

  const row = (data || [])[0] || null
  return { warranty: row as WarrantyRecord | null, rpcError: null }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WarrantyVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { warranty, rpcError } = await loadWarranty(token)

  const isRpcMissing =
    rpcError !== null &&
    (rpcError.includes('does not exist') || rpcError.includes('function') || rpcError.includes('42883'))

  const isInvalidToken = rpcError === 'invalid_token'

  return (
    <main style={{ minHeight: '100vh', background: '#F5F5F0', padding: '30px 18px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(8,80,65,1) 0%, rgba(11,97,77,1) 58%, rgba(13,125,98,1) 100%)',
          color: '#fff', borderRadius: 24, padding: '26px 24px',
          boxShadow: '0 20px 50px rgba(8, 80, 65, 0.14)',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#9FE1CB' }}>Medical Line Georgia</p>
          <h1 style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 700 }}>გარანტიის ვერიფიკაცია</h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: '#D6F2E8', lineHeight: 1.7 }}>
            ეს გვერდი იხსნება გარანტიის QR კოდიდან ან დაცული ბმულიდან და აჩვენებს
            რეგისტრირებული პროდუქტის საჯარო ვერიფიკაციის მოკლე შეჯამებას.
          </p>
        </div>

        {/* ── Not found / error states ── */}
        {!warranty && (
          <div style={{
            background: '#fff', borderRadius: 20, padding: 28,
            border: '1px solid rgba(15, 23, 42, 0.08)', textAlign: 'center',
          }}>
            {isInvalidToken ? (
              <>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#18212F' }}>
                  არასწორი ბმული
                </p>
                <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
                  ვერიფიკაციის ბმული არასწორია. გთხოვთ გამოიყენოთ QR კოდიდან მიღებული ბმული.
                </p>
              </>
            ) : isRpcMissing ? (
              <>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#18212F' }}>
                  სისტემური შეცდომა
                </p>
                <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
                  ვერიფიკაციის სერვისი დროებით მიუწვდომელია. გთხოვთ დაუკავშირდეთ Medical Line-ს.
                </p>
                <p style={{ margin: '8px auto 0', maxWidth: 480, fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
                  ERR: get_warranty_public_summary not found
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#18212F' }}>
                  გარანტია ვერ მოიძებნა
                </p>
                <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
                  ვერიფიკაციის ტოკენი შეიძლება არასწორი იყოს, განახლებული იყოს ან ამ
                  გარანტიის სერტიფიკატისთვის ჯერ არ იყოს გენერირებული.
                </p>
              </>
            )}
            <div style={{ marginTop: 18 }}>
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '11px 20px', borderRadius: 12, background: '#085041',
                color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14,
              }}>
                დაბრუნება Medical Line-ზე
              </Link>
            </div>
          </div>
        )}

        {/* ── Warranty data ── */}
        {warranty && (
          <>
            {/* Verified badge */}
            <div style={{
              background: '#F0FDF4', borderRadius: 16, padding: '14px 18px',
              border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#15803D' }}>
                  გარანტია ვერიფიცირებულია
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#166534' }}>
                  ეს პროდუქტი Medical Line Georgia-ს მიერ გარანტირებულია.
                </p>
              </div>
            </div>

            {/* Data grid */}
            <div style={{
              background: '#fff', borderRadius: 20, padding: 22,
              border: '1px solid rgba(15, 23, 42, 0.08)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}>
                {([
                  ['გარანტიის ნომერი', warranty.warranty_number],
                  ['სტატუსი', WARRANTY_STATUS_LABELS[warranty.status] || warranty.status],
                  ['კლინიკა', warranty.clinic_name || '—'],
                  ['მომხმარებელი', warranty.customer_name || '—'],
                  ['პროდუქტი', warranty.product_name],
                  ['ბრენდი / მოდელი', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
                  ['სერიული ნომერი', warranty.serial_number],
                  ['ყიდვის თარიღი', formatDate(warranty.purchase_date)],
                  ['ინსტალაციის თარიღი', formatDate(warranty.installation_date)],
                  ['გარანტიის დაწყება', formatDate(warranty.warranty_start)],
                  ['გარანტიის დასრულება', formatDate(warranty.warranty_end)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} style={{
                    background: '#FAFAF8', borderRadius: 16, padding: '14px 15px',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{label}</p>
                    <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: '#18212F' }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <p style={{ margin: '18px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                თუ პროდუქტს სერვისი სჭირდება, დაუკავშირდი Medical Line Georgia-ს და მიუთითე
                გარანტიის ნომერი ან სერიული ნომერი.
              </p>
            </div>

            {/* Contact */}
            <div style={{
              background: '#fff', borderRadius: 20, padding: '18px 22px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#18212F' }}>
                  Medical Line Georgia
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6B7280' }}>
                  სერვისი და მხარდაჭერა
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a
                  href="tel:514011116"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 12, background: '#085041',
                    color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14,
                  }}
                >
                  📞 514 011 116
                </a>
                <Link href="/" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 12,
                  border: '1px solid rgba(8, 80, 65, 0.18)',
                  color: '#085041', textDecoration: 'none', fontWeight: 700, fontSize: 14,
                }}>
                  medicalline.ge
                </Link>
              </div>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
