import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'

function cleanSearch(value: string | null) {
  return (value || '').replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const { profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const term = cleanSearch(new URL(request.url).searchParams.get('q'))
    let erpQuery = tokenClient
      .from('erp_products')
      .select('id, code, name, unit, default_price, vat_rate')
      .eq('is_active', true)
      .order('name')
      .limit(term ? 50 : 800)
    if (term) erpQuery = erpQuery.or(`name.ilike.%${term}%,code.ilike.%${term}%`)

    let catalogQuery = tokenClient
      .from('products')
      .select('id, slug, name, brand, prices(price_gel)')
      .eq('is_active', true)
      .order('name')
      .limit(term ? 25 : 150)
    if (term) catalogQuery = catalogQuery.or(`name.ilike.%${term}%,slug.ilike.%${term}%,brand.ilike.%${term}%`)

    const [erpResult, catalogResult] = await Promise.all([erpQuery, catalogQuery])
    if (erpResult.error) throw erpResult.error
    if (catalogResult.error) throw catalogResult.error

    const erpProducts = (erpResult.data || []).map((product) => ({
      id: product.id,
      source: 'erp' as const,
      code: product.code || '',
      name: product.name,
      unit: product.unit || 'ცალი',
      price: Number(product.default_price || 0),
      vat_rate: Number(product.vat_rate || 18),
    }))
    const erpKeys = new Set(erpProducts.map((product) => `${product.code}|${product.name}`.toLocaleLowerCase('ka-GE')))
    const catalogProducts = (catalogResult.data || [])
      .map((product) => ({
        id: product.id,
        source: 'catalog' as const,
        code: product.slug || '',
        name: product.name,
        unit: 'ცალი',
        price: Number((product.prices as Array<{ price_gel?: number }> | null)?.[0]?.price_gel || 0),
        vat_rate: 18,
      }))
      .filter((product) => !erpKeys.has(`${product.code}|${product.name}`.toLocaleLowerCase('ka-GE')))

    return NextResponse.json({ ok: true, products: [...erpProducts, ...catalogProducts] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'პროდუქტები ვერ ჩაიტვირთა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}
