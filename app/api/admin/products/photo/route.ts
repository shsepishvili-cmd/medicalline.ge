import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { requireAdmin } from '@/app/lib/admin-guard'
import { writeAudit } from '@/app/lib/audit-server'
import { checkPhoto, PRODUCT_PHOTO_BUCKET, uploadProductPhoto } from '@/app/lib/product-photo-server'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError } from '@/app/lib/request-guard'
import { builtInCatalogRow, findBuiltInProduct } from '@/app/lib/catalog-corrections'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Replaces the main photo of a product. For an admin-added product it is
// identified by id; for a product built into the site code, by slug, and the
// change becomes a catalogue correction (the original stays in the code and
// comes back with "restore original").
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const guard = await requireAdmin(request)
  if ('error' in guard) return guard.error
  const { profile } = guard.session

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'ფორმა ვერ წავიკითხე.' }, { status: 400 })
  const productId = String(form.get('productId') || '')
  const slug = String(form.get('slug') || '').slice(0, 120)
  if (!UUID.test(productId) && !slug) return NextResponse.json({ error: 'პროდუქტი არ არის მითითებული.' }, { status: 400 })
  const photo = await checkPhoto(form.get('photo'))
  if ('error' in photo) return NextResponse.json({ error: photo.error }, { status: photo.status })

  try {
    const service = createSupabaseServiceClient()
    const builtIn = slug ? findBuiltInProduct(slug) : null
    if (slug && !builtIn) return NextResponse.json({ error: 'პროდუქტი ვერ მოიძებნა.' }, { status: 404 })

    const query = service.from('products').select('id, slug, images, quick_added, catalog_override')
    const { data: existing, error: readError } = builtIn ? await query.eq('slug', builtIn.slug).maybeSingle() : await query.eq('id', productId).maybeSingle()
    if (readError) {
      if (/catalog_override|quick_added/.test(readError.message)) return NextResponse.json({ error: 'ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/57_catalog_corrections.sql.' }, { status: 409 })
      throw new Error(readError.message)
    }
    if (!builtIn && !existing) return NextResponse.json({ error: 'პროდუქტი ვერ მოიძებნა.' }, { status: 404 })
    if (!builtIn && !existing?.quick_added) return NextResponse.json({ error: 'ამ პროდუქტის ფოტო კატალოგის კორექციიდან იცვლება.' }, { status: 409 })

    const uploaded = await uploadProductPhoto(service, photo, existing?.slug || builtIn?.slug || 'product')

    let result
    if (builtIn) {
      // First correction of a built-in product: start from the code's current
      // text so nothing else changes on the page.
      const base = existing?.catalog_override ? {} : builtInCatalogRow(builtIn)
      const currentImages = existing?.catalog_override && existing.images?.length ? existing.images : builtInCatalogRow(builtIn).images
      const images = [uploaded.url, ...currentImages.slice(1)]
      result = existing
        ? await service.from('products').update({ ...base, images, catalog_override: true }).eq('id', existing.id).select('id').single()
        : await service.from('products').insert({ ...builtInCatalogRow(builtIn), images, catalog_override: true, is_active: true }).select('id').single()
    } else {
      const images = [uploaded.url, ...((existing?.images as string[] | null) || []).slice(1)]
      result = await service.from('products').update({ images }).eq('id', existing!.id).select('id').single()
    }
    if (result.error || !result.data) {
      await service.storage.from(PRODUCT_PHOTO_BUCKET).remove([uploaded.path])
      throw new Error(`photo: ${result.error?.message || 'not saved'}`)
    }

    await writeAudit(service, {
      actorId: profile.id, action: 'product.photo_replaced', targetType: 'product', targetId: result.data.id,
      ip: clientIp(request), details: { slug: existing?.slug || builtIn?.slug, builtIn: !!builtIn },
    })
    return NextResponse.json({ ok: true, url: uploaded.url })
  } catch (cause) {
    return serverError('product-photo', cause)
  }
}
