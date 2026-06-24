import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MessageCircle, Phone, CheckCircle2, ArrowLeft, Clock, ShieldCheck, Truck } from 'lucide-react'
import BogInstallmentCalculator from './BogInstallmentCalculator'
import CredoInstallmentButton from './CredoInstallmentButton'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

type Offer = {
  id: string
  token: string
  product_slug: string | null
  product_name: string
  product_category: string | null
  product_brand: string | null
  product_description: string | null
  product_image: string | null
  product_specs: string[] | Record<string, string> | null
  client_name: string | null
  client_phone: string | null
  price_gel: number | null
  installment_monthly: number | null
  installment_months: number | null
  warranty_note: string | null
  delivery_note: string | null
  custom_note: string | null
  status: string
  views_count: number
  expires_at: string | null
}

let cachedClient: SupabaseClient | null = null

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cachedClient
}

function money(value: number | null | undefined) {
  if (!value) return null
  return `₾${Number(value).toLocaleString('ka-GE')}`
}

function specsList(specs: Offer['product_specs']) {
  if (Array.isArray(specs)) return specs.filter(Boolean).map(String)
  if (specs && typeof specs === 'object') return Object.values(specs).filter(Boolean).map(String)
  return []
}

function displayBrand(offer: Pick<Offer, 'product_slug' | 'product_name' | 'product_brand'>) {
  const key = `${offer.product_slug || ''} ${offer.product_name || ''}`.toLowerCase()
  if (key.includes('finscan') || key.includes('f350')) return 'FinScan'
  return offer.product_brand || 'Medical Line'
}

async function getOffer(token: string, trackView = false) {
  const client = getAdminClient()
  if (!client) return null

  const { data } = await client
    .from('product_offers')
    .select('*')
    .eq('token', token)
    .single()

  const offer = data as Offer | null
  if (!offer) return null

  const expired = offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()
  if (expired || offer.status === 'expired' || offer.status === 'archived' || offer.status === 'draft') {
    return null
  }

  if (trackView) {
    await client
      .from('product_offers')
      .update({
        status: offer.status === 'sent' ? 'viewed' : offer.status,
        views_count: (offer.views_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', offer.id)
  }

  return offer
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const offer = await getOffer(token)
  if (!offer) {
    return {
      title: 'შეთავაზება ვერ მოიძებნა | Medical Line',
    }
  }

  return {
    title: `${offer.product_name} შეთავაზება | Medical Line`,
    description: offer.product_description || 'Medical Line-ის ინდივიდუალური შეთავაზება.',
  }
}

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const offer = await getOffer(token, true)
  if (!offer) notFound()

  const specs = specsList(offer.product_specs).slice(0, 6)
  const price = money(offer.price_gel)
  const monthly = money(offer.installment_monthly)
  const expires = offer.expires_at ? new Date(offer.expires_at).toLocaleDateString('ka-GE') : null
  const brand = displayBrand(offer)
  const whatsappText = encodeURIComponent(
    `გამარჯობა, მივიღე შეთავაზება ${offer.product_name}-ზე. მსურს დეტალების დაზუსტება.`,
  )

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-900">
      <section className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-0 bg-white lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex min-h-[48vh] items-center justify-center bg-[#eef6f2] p-6 md:p-12">
          <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl bg-white p-8 shadow-sm">
            {offer.product_image ? (
              <Image src={offer.product_image} alt={offer.product_name} fill className="object-contain p-8" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl font-black text-[#085041]">
                ML
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 md:p-10 lg:p-14">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <ArrowLeft size={16} /> Medical Line
          </Link>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e2f4ed] px-3 py-1 text-xs font-bold text-[#085041]">
              ინდივიდუალური შეთავაზება
            </span>
            {expires && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Clock size={13} /> ვადა: {expires}
              </span>
            )}
          </div>

          {offer.client_name && (
            <p className="mb-2 text-sm font-semibold text-slate-500">
              {offer.client_name}-სთვის
            </p>
          )}

          <h1 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl">
            {offer.product_name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {offer.product_description || 'ოფიციალური შეთავაზება Medical Line Georgia-სგან.'}
          </p>

          <div className="my-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">ფასი</p>
              <p className="mt-2 text-2xl font-black text-[#085041]">{price || 'შეთანხმებით'}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">განვადება</p>
              <p className="mt-2 text-lg font-black text-slate-900">
                {monthly ? `${monthly} / თვე` : 'შესაძლებელია'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">ბრენდი</p>
              <p className="mt-2 text-lg font-black text-slate-900">{brand}</p>
            </div>
          </div>

          <BogInstallmentCalculator amount={offer.price_gel} productName={offer.product_name} />
          <CredoInstallmentButton token={offer.token} amount={offer.price_gel} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-lg border border-slate-100 p-4">
              <ShieldCheck className="mt-1 text-[#085041]" size={20} />
              <p className="text-sm leading-6 text-slate-600">{offer.warranty_note || 'გარანტია ოფიციალური სერვისით'}</p>
            </div>
            <div className="flex gap-3 rounded-lg border border-slate-100 p-4">
              <Truck className="mt-1 text-[#085041]" size={20} />
              <p className="text-sm leading-6 text-slate-600">{offer.delivery_note || 'მიწოდება შეთანხმებით'}</p>
            </div>
          </div>

          {offer.custom_note && (
            <div className="mt-4 rounded-lg border border-[#c7eadf] bg-[#f0faf6] p-4 text-sm leading-6 text-[#085041]">
              {offer.custom_note}
            </div>
          )}

          {specs.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">მახასიათებლები</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {specs.map((spec) => (
                  <div key={spec} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#085041]" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={`https://wa.me/995514011116?text=${whatsappText}`}
              className="inline-flex flex-1 items-center justify-center gap-3 rounded-lg bg-[#085041] px-5 py-4 text-sm font-black text-white"
            >
              <MessageCircle size={18} /> WhatsApp-ზე პასუხი
            </a>
            <a
              href="tel:+995514011116"
              className="inline-flex flex-1 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900"
            >
              <Phone size={18} /> დარეკვა
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
