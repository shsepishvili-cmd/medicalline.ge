import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { deriveWarrantyStatus, formatDate, WARRANTY_STATUS_LABELS } from '@/app/lib/warranty'
import { HANDOVER_ITEMS, WARRANTY_PUBLIC_STATUS } from '@/app/lib/warranty-catalog'
import { merchant } from '@/app/lib/merchant'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

export const dynamic = 'force-dynamic'

const NAVY = '#102952'
const RED = '#d72c47'
const LINE = '#dce5f1'
const MUTED = '#62738d'

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

const card = { background: '#fff', borderRadius: 18, border: `1px solid ${LINE}` } as const
const contactButton = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
  textDecoration: 'none', fontWeight: 700, fontSize: 14,
} as const

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

  // Stored status only refreshes on write, so work out today's status here.
  const status = warranty ? deriveWarrantyStatus(warranty.status, warranty.warranty_start, warranty.warranty_end) : null
  const tone = status ? WARRANTY_PUBLIC_STATUS[status] : null
  const handover = warranty ? HANDOVER_ITEMS.filter((item) => warranty[item.column]) : []

  return (
    <main style={{ minHeight: '100vh', background: '#f5f8fd', padding: '30px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 24%, #2e6bc9 0, transparent 35%), linear-gradient(110deg, #0a2044, #15396d)',
          color: '#fff', borderRadius: 20, padding: '26px 24px',
        }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, fontWeight: 700, color: '#adcafa' }}>MEDICAL LINE GEORGIA · WARRANTY</p>
          <h1 style={{ margin: '10px 0 12px', fontSize: 30, fontWeight: 700 }}>საგარანტიო სერტიფიკატის შემოწმება</h1>
          <div style={{ width: 56, height: 4, borderRadius: 3, background: RED }} />
          <p style={{ margin: '12px 0 0', fontSize: 14, color: '#d4e2fa', lineHeight: 1.7 }}>
            ეს გვერდი იხსნება საგარანტიო ბარათის QR კოდიდან ან დაცული ბმულიდან და აჩვენებს
            რეგისტრირებული მოწყობილობის საგარანტიო მონაცემებს.
          </p>
        </div>

        {/* ── Not found / error states ── */}
        {!warranty && (
          <div style={{ ...card, padding: 28, textAlign: 'center' }}>
            {isInvalidToken ? (
              <>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>არასწორი ბმული</p>
                <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: MUTED, lineHeight: 1.7 }}>
                  ვერიფიკაციის ბმული არასწორია. გთხოვთ გამოიყენოთ QR კოდიდან მიღებული ბმული.
                </p>
              </>
            ) : isRpcMissing ? (
              <>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>სისტემური შეცდომა</p>
                <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: MUTED, lineHeight: 1.7 }}>
                  ვერიფიკაციის სერვისი დროებით მიუწვდომელია. გთხოვთ დაუკავშირდეთ Medical Line-ს.
                </p>
                <p style={{ margin: '8px auto 0', maxWidth: 480, fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
                  ERR: get_warranty_public_summary not found
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>გარანტია ვერ მოიძებნა</p>
                <p style={{ margin: '10px auto 0', maxWidth: 480, fontSize: 14, color: MUTED, lineHeight: 1.7 }}>
                  ვერიფიკაციის ტოკენი შეიძლება არასწორი იყოს, განახლებული იყოს ან ამ
                  გარანტიის სერტიფიკატისთვის ჯერ არ იყოს გენერირებული.
                </p>
              </>
            )}
            <div style={{ marginTop: 18 }}>
              <Link href="/warranty" style={{ ...contactButton, background: RED, color: '#fff' }}>
                გარანტიის გვერდზე გადასვლა
              </Link>
            </div>
          </div>
        )}

        {/* ── Warranty data ── */}
        {warranty && tone && status && (
          <>
            {/* Status banner — only an active warranty is presented as valid */}
            <div style={{ background: tone.background, border: `1px solid ${tone.border}`, borderRadius: 16, padding: '14px 18px' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tone.color }}>{tone.title}</p>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: tone.color }}>{tone.text}</p>
            </div>

            {/* Data grid */}
            <div style={{ ...card, padding: 22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {([
                  ['სერტიფიკატის ნომერი', warranty.warranty_number],
                  ['სტატუსი', WARRANTY_STATUS_LABELS[status] || status],
                  ['მყიდველი / ორგანიზაცია', warranty.clinic_name || warranty.customer_name || '—'],
                  ['საკონტაქტო პირი', warranty.clinic_name ? warranty.customer_name || '—' : '—'],
                  ['საიდენტიფიკაციო ნომერი', warranty.customer_id_number || '—'],
                  ...(warranty.product_category ? [['პროდუქციის კატეგორია', warranty.product_category]] : []),
                  ['პროდუქტი', warranty.product_name],
                  ['მწარმოებელი / მოდელი', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
                  ['სერიული ნომერი', warranty.serial_number],
                  ['გადაცემის თარიღი', formatDate(warranty.purchase_date)],
                  ['მონტაჟის თარიღი', formatDate(warranty.installation_date)],
                  ['საგარანტიო ვადა', warranty.warranty_months ? `${warranty.warranty_months} თვე` : '—'],
                  ['გარანტიის დაწყება', formatDate(warranty.warranty_start)],
                  ['გარანტიის დასრულება', formatDate(warranty.warranty_end)],
                  ...(warranty.component_terms ? [['დამატებითი კომპონენტები', warranty.component_terms]] : []),
                  ...(warranty.package_notes ? [['კომპლექტაცია და შენიშვნები', warranty.package_notes]] : []),
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} style={{ background: '#f8fbff', borderRadius: 14, padding: '13px 15px', border: `1px solid ${LINE}` }}>
                    <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{label}</p>
                    <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: NAVY, overflowWrap: 'anywhere' }}>{value}</p>
                  </div>
                ))}
              </div>

              {handover.length > 0 ? (
                <div style={{ marginTop: 18 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>მიღება-ჩაბარება</p>
                  <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                    {handover.map((item) => (
                      <li key={item.column} style={{ fontSize: 13, color: '#40516f' }}>✓ {item.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p style={{ margin: '18px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
                თუ მოწყობილობას სერვისი სჭირდება, დაგვიკავშირდით და მიუთითეთ სერტიფიკატის ან სერიული ნომერი.
                სრული პირობები იხილეთ <Link href="/warranty#policy" style={{ color: '#2257ad', fontWeight: 700 }}>საგარანტიო გვერდზე</Link>.
              </p>
            </div>

            {/* Download PDF */}
            <a
              href={`/api/warranty/public-pdf/${token}`}
              download
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px 20px', borderRadius: 12, background: RED,
                color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15,
              }}
            >
              PDF სერტიფიკატის ჩამოტვირთვა
            </a>

            {/* Contact */}
            <div style={{
              background: NAVY, borderRadius: 18, padding: '18px 22px', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Medical Line Georgia</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#c3d4ed' }}>სერვისი და მხარდაჭერა</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={merchant.phoneHref} style={{ ...contactButton, background: '#fff', color: NAVY }}>{merchant.phone}</a>
                <Link href="/warranty" style={{ ...contactButton, border: '1px solid #6e94c3', color: '#fff' }}>გარანტია და სერვისი</Link>
              </div>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
