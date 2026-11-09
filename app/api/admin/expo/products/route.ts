import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { requireAdmin } from '@/app/lib/admin-guard'
import { writeAudit } from '@/app/lib/audit-server'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError } from '@/app/lib/request-guard'

export const runtime = 'nodejs'

const BUCKET = 'expo-products'
const MAX_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Checks the file really is the image type it claims, by its first bytes.
function matchesSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  return false
}

const text = (value: FormDataEntryValue | null, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

function slugFor(name: string) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return `expo-${base || 'product'}-${randomBytes(3).toString('hex')}`
}

async function ensureBucket(service: ReturnType<typeof createSupabaseServiceClient>) {
  const { data } = await service.storage.getBucket(BUCKET)
  if (data) return
  const { error } = await service.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(TYPES) })
  if (error && !/already exists/i.test(error.message)) throw new Error(`bucket: ${error.message}`)
}

// Quick add during the expo: an admin creates a product from a phone with a
// photo the admin took or received. It goes straight into the expo selection.
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
  const photo = form.get('photo')

  if (name.length < 2) return NextResponse.json({ error: 'მიუთითეთ პროდუქტის დასახელება.' }, { status: 400 })
  if (!brand) return NextResponse.json({ error: 'მიუთითეთ ბრენდი.' }, { status: 400 })
  if (!(photo instanceof File) || !photo.size) return NextResponse.json({ error: 'დაამატეთ ფოტო.' }, { status: 400 })
  if (photo.size > MAX_BYTES) return NextResponse.json({ error: 'ფოტო 4 MB-ზე დიდია.' }, { status: 413 })
  const extension = TYPES[photo.type]
  const bytes = new Uint8Array(await photo.arrayBuffer())
  if (!extension || !matchesSignature(bytes, photo.type)) return NextResponse.json({ error: 'ფოტო უნდა იყოს JPG, PNG ან WEBP.' }, { status: 415 })

  try {
    const service = createSupabaseServiceClient()
    let category: string | null = null
    if (categoryInput) {
      const { data } = await service.from('categories').select('slug').eq('slug', categoryInput).maybeSingle()
      category = data?.slug ?? null
    }

    await ensureBucket(service)
    const slug = slugFor(name)
    const path = `${new Date().toISOString().slice(0, 10)}/${slug}.${extension}`
    const upload = await service.storage.from(BUCKET).upload(path, bytes, { contentType: photo.type, upsert: false, cacheControl: '31536000' })
    if (upload.error) throw new Error(`upload: ${upload.error.message}`)
    const imageUrl = service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

    const { data: product, error } = await service.from('products').insert({
      slug, name, brand, category_slug: category, short_desc: description || null,
      images: [imageUrl], is_active: true, sort_order: 9000,
    }).select('id').single()
    if (error || !product) {
      await service.storage.from(BUCKET).remove([path])
      throw new Error(`product: ${error?.message || 'not created'}`)
    }

    const { data: last } = await service.from('expo_catalog_items').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const { error: pickError } = await service.from('expo_catalog_items').insert({
      product_id: product.id, sort_order: (last?.sort_order ?? 0) + 10, note: note || 'სიახლე',
    })
    if (pickError) console.error('[expo-products] selection', pickError.message)

    await writeAudit(service, {
      actorId: profile.id, action: 'expo.product_quick_added', targetType: 'product', targetId: product.id,
      ip: clientIp(request), details: { name, brand },
    })
    return NextResponse.json({ ok: true, productId: product.id, inExpo: !pickError }, { status: 201 })
  } catch (cause) {
    return serverError('expo-products', cause)
  }
}
