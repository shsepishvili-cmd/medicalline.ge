'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ContractRecord } from '@/app/lib/contract-types'
import { calcVatAmount, formatCurrency } from '@/app/lib/contract'
import {
  AuthBlockedView, colors, ContractAdminShell, ContractStatusBadge,
  LoadingView, requestContractPdfUrl, SummaryCard, ui, useContractAdminGate,
} from '../_components/ContractUi'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ka-GE')
}

function fmtBool(v: boolean) {
  return v ? 'კი' : 'არა'
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { loading, error, profile, accessToken } = useContractAdminGate()
  const [contract, setContract] = useState<ContractRecord | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!profile || !params.id) return
    supabase
      .from('contracts')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => setContract(data as ContractRecord | null))
  }, [params.id, profile])

  async function openPdf(generate = false) {
    if (!accessToken || !params.id) return
    setWorking(true)
    try {
      const url = await requestContractPdfUrl(accessToken, params.id)
      if (!generate) {
        // If we just want to open existing — the API always regenerates, that's fine
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      // refresh local state to show new generated_at
      const { data } = await supabase.from('contracts').select('*').eq('id', params.id).single()
      if (data) setContract(data as ContractRecord)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF შეცდომა')
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <LoadingView label="ხელშეკრულება იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (!contract) return <LoadingView label="ჩანაწერი ვერ მოიძებნა..." />

  const fin = calcVatAmount(contract.unit_price, contract.quantity, contract.vat_rate, contract.vat_included)

  return (
    <ContractAdminShell
      title={contract.contract_number}
      subtitle="გაყიდვის ხელშეკრულების დეტალი — PDF გენერაცია, სტატუსი და მყიდველის ინფო ერთ ადგილას."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>
            {searchParams.get('pdf') ? 'PDF წარმატებით გენერირდა.' : 'PDF-ის გენერაცია ხელახლა შეიძლება ნებისმიერ დროს.'}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => openPdf(true)} disabled={working} style={{ ...ui.primaryButton, opacity: working ? 0.7 : 1 }}>
              {working ? 'მუშავდება...' : 'PDF გენერაცია'}
            </button>
            <Link href={`/admin/contracts/${contract.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
          </div>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 0.85fr)', gap: 18, alignItems: 'start' }}>

        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Overview cards */}
          <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <SummaryCard label="ხელშეკრულების ნომერი" value={contract.contract_number} />
            <SummaryCard label="სტატუსი" value={<ContractStatusBadge status={contract.status} />} />
            <SummaryCard label="თარიღი" value={fmtDate(contract.contract_date)} />
            <SummaryCard label="PDF გენ. თარიღი" value={fmtDate(contract.generated_at)} />
          </div>

          {/* Product + financials */}
          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>პროდუქტი და ფინანსები</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <SummaryCard label="პროდუქტი" value={contract.product_name} />
              <SummaryCard label="ბრენდი / მოდელი" value={`${contract.brand}${contract.model ? ` / ${contract.model}` : ''}`} />
              <SummaryCard label="სერიული ნომერი" value={contract.serial_number || '—'} />
              <SummaryCard label="რაოდენობა" value={String(contract.quantity)} />
              <SummaryCard label="ერთეულის ფასი" value={formatCurrency(contract.unit_price, contract.currency)} />
              <SummaryCard label={`დღგ ${contract.vat_rate}%`} value={formatCurrency(fin.vat, contract.currency)} />
              <SummaryCard label="სულ გადასახდელი" value={<span style={{ color: '#085041', fontWeight: 700, fontSize: 16 }}>{formatCurrency(fin.gross, contract.currency)}</span>} />
              <SummaryCard label="დღგ ჩათვლილია ფასში" value={fmtBool(contract.vat_included)} />
            </div>
          </div>

          {/* Delivery */}
          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>მიწოდება და გარანტია</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <SummaryCard label="გადახდის პირობები" value={contract.payment_terms || '—'} />
              <SummaryCard label="მიწოდების თარიღი" value={fmtDate(contract.delivery_date)} />
              <SummaryCard label="მიწოდების მისამართი" value={contract.delivery_address || '—'} />
              <SummaryCard label="ინსტალაცია" value={fmtBool(contract.installation_included)} />
              <SummaryCard label="გარანტიის ვადა" value={contract.warranty_months > 0 ? `${contract.warranty_months} თვე` : '—'} />
            </div>
          </div>

          {contract.special_terms && (
            <div style={{ ...ui.panel }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: colors.text }}>სპეციალური პირობები</p>
              <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.7 }}>{contract.special_terms}</p>
            </div>
          )}

          {contract.notes && (
            <div style={{ ...ui.panel }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: colors.text }}>შენიშვნები (შიდა)</p>
              <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.7 }}>{contract.notes}</p>
            </div>
          )}
        </div>

        {/* Side column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>მყიდველი / კლინიკა</p>
            <SummaryCard label="კლინიკა" value={contract.clinic_name || '—'} />
            <SummaryCard label="მომხმარებელი" value={contract.customer_name || '—'} />
            <SummaryCard label="პ/ნ ან სამეწარმეო კოდი" value={contract.customer_id_number || '—'} />
            <SummaryCard label="მისამართი" value={contract.customer_address || '—'} />
            <SummaryCard label="ტელეფონი" value={contract.phone || '—'} />
            <SummaryCard label="ელფოსტა" value={contract.email || '—'} />
          </div>

          {contract.warranty_id && (
            <div style={{ ...ui.panel }}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>მიბმული გარანტია</p>
              <Link href={`/admin/warranty/${contract.warranty_id}`} style={ui.secondaryButton}>
                გარანტიის ნახვა
              </Link>
            </div>
          )}

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>PDF ხელშეკრულება</p>
            <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
              PDF ყოველ გენერაციაზე ხელახლა იქმნება და ინახება storage-ში.
              {contract.generated_at ? ` ბოლო გენ: ${fmtDate(contract.generated_at)}` : ' ჯერ არ გენერირებულა.'}
            </p>
            <button
              type="button"
              onClick={() => openPdf(true)}
              disabled={working}
              style={{ ...ui.primaryButton, opacity: working ? 0.7 : 1 }}
            >
              {working ? 'მუშავდება...' : 'PDF გენერაცია / ჩამოტვირთვა'}
            </button>
          </div>
        </div>
      </div>
    </ContractAdminShell>
  )
}
