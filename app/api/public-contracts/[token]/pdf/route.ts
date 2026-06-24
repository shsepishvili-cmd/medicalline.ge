import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateContractPdfBuffer } from '@/app/lib/contract-server'
import { mapPublicSummaryToContractRecord } from '@/app/lib/contact-contract-server'
import type { PublicContractSummary } from '@/app/lib/contract-types'

function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase is not configured.')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('get_public_contract_summary', {
      p_public_token: token,
      p_ip_address: null,
      p_user_agent: null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const summary = ((data || [])[0] || null) as PublicContractSummary | null
    if (!summary) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
    }

    const shouldUseStoredPdf = summary.pdf_path && summary.status !== 'signed' && summary.status !== 'paid'

    // Before acceptance, prefer the generated PDF that was sent to the client.
    // After acceptance, regenerate it so the SMS/OTP confirmation certificate is included.
    if (shouldUseStoredPdf) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('warranty-documents')
        .createSignedUrl(summary.pdf_path, 60 * 5)
      if (!signErr && signed?.signedUrl) {
        const fileRes = await fetch(signed.signedUrl)
        if (fileRes.ok) {
          const blob = await fileRes.arrayBuffer()
          return new NextResponse(blob, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${summary.contract_number}.pdf"`,
              'Cache-Control': 'no-store',
            },
          })
        }
      }
    }

    const pdfBuffer = await generateContractPdfBuffer(mapPublicSummaryToContractRecord(summary))
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${summary.contract_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'PDF generation failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
