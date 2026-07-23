import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { unzipSync, strFromU8 } from 'fflate'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { parseInvoiceImage, parseInvoicePrompt } from '@/app/lib/ai-invoice-server'

export const runtime = 'nodejs'

const allowed = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function xmlText(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractXlsxText(bytes: Uint8Array) {
  const files = unzipSync(bytes)
  const sharedXml = files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : ''
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => xmlText(match[1]))
  const sheetNames = Object.keys(files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort()
  const lines: string[] = []
  for (const name of sheetNames.slice(0, 20)) {
    const xml = strFromU8(files[name])
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = []
      for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const raw = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? cell[2].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? ''
        const value = /\bt="s"/.test(cell[1]) ? shared[Number(raw)] || '' : xmlText(raw)
        cells.push(value)
      }
      if (cells.some(Boolean)) lines.push(cells.join(' | '))
      if (lines.length >= 5000) break
    }
  }
  return lines.join('\n').slice(0, 50_000)
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) throw new Error('Unauthorized')
    const { user, profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') throw new Error('Forbidden')
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'ფაილი არ არის არჩეული.' }, { status: 400 })
    if (!allowed.has(file.type)) return NextResponse.json({ ok: false, error: 'დაშვებულია PDF, JPG, PNG და XLSX.' }, { status: 415 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'ფაილის მაქსიმალური ზომაა 10 MB.' }, { status: 413 })
    const bytes = new Uint8Array(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    const path = `sources/${user.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await tokenClient.storage.from('invoice-documents').upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) throw uploadError

    let result
    if (file.type === 'application/pdf') {
      const parser = new PDFParse({ data: bytes })
      const extracted = await parser.getText()
      await parser.destroy()
      if (extracted.text.trim().length < 20) {
        throw new Error('PDF-ში ტექსტური layer ვერ მოიძებნა. გადააკეთეთ გვერდი JPG/PNG-დ და ატვირთეთ OCR-ისთვის.')
      }
      result = await parseInvoicePrompt(extracted.text, tokenClient)
    } else if (file.type.includes('spreadsheet')) {
      const text = extractXlsxText(bytes)
      if (text.trim().length < 10) throw new Error('XLSX ფაილში წაკითხვადი მონაცემები ვერ მოიძებნა.')
      result = await parseInvoicePrompt(text, tokenClient)
    } else {
      const dataUrl = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`
      result = await parseInvoiceImage(dataUrl, tokenClient)
    }
    return NextResponse.json({ ok: true, source_file_path: path, ...result })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ფაილის დამუშავება ვერ მოხერხდა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400 })
  }
}
