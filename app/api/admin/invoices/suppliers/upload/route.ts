import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'

const allowed = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
])

function safeName(value: string) {
  return value.normalize('NFKD').replace(/[^\w.\-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160) || 'invoice'
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const { user, profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    const form = await request.formData()
    const file = form.get('file')
    const manufacturer = safeName(String(form.get('manufacturer') || 'unknown'))
    const invoiceDate = String(form.get('invoice_date') || new Date().toISOString().slice(0, 10))
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'ფაილი არ არის არჩეული.' }, { status: 400 })
    if (!allowed.has(file.type) || file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'დაშვებულია PDF, XLS/XLSX, JPG ან PNG, მაქსიმუმ 50MB.' }, { status: 400 })
    }
    const path = `${user.id}/${manufacturer}/${invoiceDate.slice(0, 4)}/${invoiceDate.slice(5, 7)}/${Date.now()}-${safeName(file.name)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error } = await tokenClient.storage.from('supplier-invoices').upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) throw error
    return NextResponse.json({ ok: true, storage_path: path, original_filename: file.name })
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : 'ფაილი ვერ აიტვირთა.' }, { status: 500 })
  }
}
