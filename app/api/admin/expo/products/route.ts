import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { requireAdmin } from '@/app/lib/admin-guard'
import { writeAudit } from '@/app/lib/audit-server'
import { checkPhoto, PRODUCT_PHOTO_BUCKET, uploadProductPhoto } from '@/app/lib/product-photo-server'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError } from '@/app/lib/request-guard'

export const runtime = 'nodejs'

const text = (value: FormDataEntryValue | null, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

const GEORGIAN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh',
  რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
}

// Readable URL from the product name, with a short random tail so two
// products with the same name never collide.
function slugFor(name: string) {
  const latin = [...name.toLowerCase()].map((char) => GEORGIAN[char] ?? char).join('')
  const base = latin.normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
  return `${base || 'product'}-${randomBytes(2).toString('hex')}`
}

function specsRecord(raw: FormDataEntryValue | null) {
  if (typeof raw !== 'string') return {}
  const lines = raw.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim().slice(0, 140)).filter(Boolean).slice(0, 15)
  return Object.fromEntries(lines.map((line, index) => [`Feature ${index + 1}`, line]))
}

// Quick add: an admin creates a product from a phone with a photo the admin
// took or received, for the expo selection, the main catalogue, or both.
// No price is stored here; prices are still set per offer by a manager.
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const guard = await requireAdmin(request)
  if ('error' in guard) return guard.error
  const { profile } = guard.session

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'ფორმა ვერ წავიკითხე.' }, { status: 400 })
  const name = text(form.get('name'), 120)
  const brand = text(form.get('brand'), 60)
  const description = text(form.get('description'), 600)
  const note = text(form.get('note'), 80)
  const categoryInput = text(form.get('category'), 60)
  const inExpo = form.get('inExpo') !== '0'
  const inCatalog = form.get('inCatalog') === '1'
  const specs = specsRecord(form.get('specs'))

  if (name.length < 2) return NextResponse.json({ error: 'მიუთითეთ პროდუქტის დასახელება.' }, { status: 400 })
  if (!brand) return NextResponse.json({ error: 'მიუთითეთ ბრენდი.' }, { status: 400 })
  if (!inExpo && !inCatalog) return NextResponse.json({ error: 'აირჩიეთ, სად გამოჩნდეს პროდუქტი.' }, { status: 400 })
  const photo = await checkPhoto(form.get('photo'))
  if ('error' in photo) return NextResponse.json({ error: photo.error }, { status: photo.status })

  try {
    const service = createSupabaseServiceClient()
    let category: string | null = null
    if (categoryInput) {
      const { data } = await service.from('categories').select('slug').eq('slug', categoryInput).maybeSingle()
      category = data?.slug ?? null
    }

    const slug = slugFor(name)
    const uploaded = await uploadProductPhoto(service, photo, slug)

    const { data: product, error } = await service.from('products').insert({
      slug, name, brand, category_slug: category, short_desc: description || null, specs,
      images: [uploaded.url], is_active: true, sort_order: 9000, quick_added: true, show_in_catalog: inCatalog,
    }).select('id').single()
    if (error || !product) {
      await service.storage.from(PRODUCT_PHOTO_BUCKET).remove([uploaded.path])
      if (error && /quick_added|show_in_catalog/.test(error.message)) {
        return NextResponse.json({ error: 'ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/56_quick_catalog_products.sql.' }, { status: 409 })
      }
      throw new Error(`product: ${error?.message || 'not created'}`)
    }

    let pickError: { message: string } | null = null
    if (inExpo) {
      const { data: last } = await service.from('expo_catalog_items').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
      pickError = (await service.from('expo_catalog_items').insert({
        product_id: product.id, sort_order: (last?.sort_order ?? 0) + 10, note: note || 'სიახლე',
      })).error
      if (pickError) console.error('[expo-products] selection', pickError.message)
    }

    await writeAudit(service, {
      actorId: profile.id, action: 'expo.product_quick_added', targetType: 'product', targetId: product.id,
      ip: clientIp(request), details: { name, brand, inExpo, inCatalog },
    })
    return NextResponse.json({ ok: true, productId: product.id, slug, inExpo: inExpo && !pickError, inCatalog }, { status: 201 })
  } catch (cause) {
    return serverError('expo-products', cause)
  }
}
