'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { createEmptyContractForm, calcVatAmount, formatCurrency } from '@/app/lib/contract'
import type { ContractFormValues, ContractRecord } from '@/app/lib/contract-types'
import type { ProfileSummary, WarrantyRecord } from '@/app/lib/warranty-types'
import { colors, Field, ui, requestContractPdfUrl } from './ContractUi'

function mapRecordToForm(c: ContractRecord): ContractFormValues {
  return {
    contractDate:        c.contract_date || '',
    warrantyId:          c.warranty_id || '',
    clinicName:          c.clinic_name || '',
    customerName:        c.customer_name || '',
    customerIdNumber:    c.customer_id_number || '',
    customerAddress:     c.customer_address || '',
    phone:               c.phone || '',
    email:               c.email || '',
    productName:         c.product_name || '',
    brand:               c.brand || '',
    model:               c.model || '',
    serialNumber:        c.serial_number || '',
    quantity:            String(c.quantity || 1),
    unitPrice:           String(c.unit_price || ''),
    currency:            c.currency || 'GEL',
    vatRate:             String(c.vat_rate ?? 18),
    vatIncluded:         c.vat_included ?? true,
    paymentTerms:        c.payment_terms || '',
    deliveryDate:        c.delivery_date || '',
    deliveryAddress:     c.delivery_address || '',
    installationIncluded: c.installation_included ?? false,
    warrantyMonths:      String(c.warranty_months || 0),
    specialTerms:        c.special_terms || '',
    status:              c.status,
    notes:               c.notes || '',
  }
}

export function ContractForm({
  profile,
  accessToken,
  contract,
}: {
  profile: ProfileSummary
  accessToken: string
  contract?: ContractRecord
}) {
  const router = useRouter()
  const [values, setValues] = useState<ContractFormValues>(() =>
    contract ? mapRecordToForm(contract) : createEmptyContractForm(),
  )
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('warranties')
      .select('id, warranty_number, customer_name, clinic_name, product_name, brand, model, serial_number')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setWarranties((data || []) as WarrantyRecord[]))
  }, [])

  function set<K extends keyof ContractFormValues>(key: K, value: ContractFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  // Auto-fill from linked warranty
  function linkWarranty(warrantyId: string) {
    set('warrantyId', warrantyId)
    if (!warrantyId) return
    const w = warranties.find((ww) => ww.id === warrantyId)
    if (!w) return
    setValues((prev) => ({
      ...prev,
      warrantyId,
      clinicName:    w.clinic_name    || prev.clinicName,
      customerName:  w.customer_name  || prev.customerName,
      phone:         w.phone          || prev.phone,
      email:         w.email          || prev.email,
      productName:   w.product_name   || prev.productName,
      brand:         w.brand          || prev.brand,
      model:         w.model          || prev.model,
      serialNumber:  w.serial_number  || prev.serialNumber,
      warrantyMonths: String(w.warranty_months || prev.warrantyMonths),
    }))
  }

  const fin = useMemo(
    () => calcVatAmount(
      Number(values.unitPrice || 0),
      Number(values.quantity || 1),
      Number(values.vatRate || 0),
      values.vatIncluded,
    ),
    [values.unitPrice, values.quantity, values.vatRate, values.vatIncluded],
  )

  async function save({ generatePdf }: { generatePdf: boolean }) {
    if (!values.productName.trim() || !values.brand.trim() || !values.unitPrice) {
      setError('შეავსე სავალდებულო ველები: პროდუქტი, ბრენდი, ფასი.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const payload = {
        contract_date:         values.contractDate || new Date().toISOString().slice(0, 10),
        warranty_id:           values.warrantyId || null,
        clinic_name:           values.clinicName.trim() || null,
        customer_name:         values.customerName.trim() || null,
        customer_id_number:    values.customerIdNumber.trim() || null,
        customer_address:      values.customerAddress.trim() || null,
        phone:                 values.phone.trim() || null,
        email:                 values.email.trim() || null,
        product_name:          values.productName.trim(),
        brand:                 values.brand.trim(),
        model:                 values.model.trim() || null,
        serial_number:         values.serialNumber.trim() || null,
        quantity:              Math.max(1, Number(values.quantity || 1)),
        unit_price:            Number(values.unitPrice || 0),
        currency:              values.currency || 'GEL',
        vat_rate:              Number(values.vatRate ?? 18),
        vat_included:          values.vatIncluded,
        payment_terms:         values.paymentTerms.trim() || null,
        delivery_date:         values.deliveryDate || null,
        delivery_address:      values.deliveryAddress.trim() || null,
        installation_included: values.installationIncluded,
        warranty_months:       Number(values.warrantyMonths || 0),
        special_terms:         values.specialTerms.trim() || null,
        status:                values.status,
        notes:                 values.notes.trim() || null,
        created_by:            contract?.created_by || profile.id,
      }

      const query = contract
        ? supabase.from('contracts').update(payload).eq('id', contract.id)
        : supabase.from('contracts').insert(payload)

      const { data: rows, error: dbErr } = await query.select('*').limit(1)
      if (dbErr) throw new Error(dbErr.message)

      const saved = (rows || [])[0] as ContractRecord | undefined
      if (!saved?.id) throw new Error('ჩანაწერი ვერ შეინახა.')

      if (generatePdf) {
        const url = await requestContractPdfUrl(accessToken, saved.id)
        window.open(url, '_blank', 'noopener,noreferrer')
      }

      router.push(`/admin/contracts/${saved.id}${generatePdf ? '?pdf=1' : ''}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'შენახვა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Section: Link to warranty ── */}
      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>გარანტიასთან მიბმა (არასავალდებულო)</p>
        <Field label="გარანტიის ჩანაწერი">
          <select value={values.warrantyId} onChange={(e) => linkWarranty(e.target.value)} style={ui.input}>
            <option value="">— გარანტია არ არის მიბმული —</option>
            {warranties.map((w) => (
              <option key={w.id} value={w.id}>
                {w.warranty_number} · {w.product_name} · {w.clinic_name || w.customer_name || '—'}
              </option>
            ))}
          </select>
        </Field>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.muted }}>გარანტიის არჩევისას კლიენტის და პროდუქტის ველები ავტომატურად შეივსება.</p>
      </div>

      {/* ── Section: Parties ── */}
      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>მხარეები</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="კლინიკის სახელი">
            <input value={values.clinicName} onChange={(e) => set('clinicName', e.target.value)} style={ui.input} />
          </Field>
          <Field label="ექიმი / მყიდველი">
            <input value={values.customerName} onChange={(e) => set('customerName', e.target.value)} style={ui.input} />
          </Field>
          <Field label="პირადი / სამეწარმეო ნომერი">
            <input value={values.customerIdNumber} onChange={(e) => set('customerIdNumber', e.target.value)} placeholder="ID / სამეწარმეო კოდი" style={ui.input} />
          </Field>
          <Field label="მისამართი">
            <input value={values.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} style={ui.input} />
          </Field>
          <Field label="ტელეფონი">
            <input value={values.phone} onChange={(e) => set('phone', e.target.value)} style={ui.input} />
          </Field>
          <Field label="ელფოსტა">
            <input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} style={ui.input} />
          </Field>
        </div>
      </div>

      {/* ── Section: Product ── */}
      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>პროდუქტი *</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="პროდუქტის სახელი *">
            <input value={values.productName} onChange={(e) => set('productName', e.target.value)} style={ui.input} />
          </Field>
          <Field label="ბრენდი *">
            <input value={values.brand} onChange={(e) => set('brand', e.target.value)} style={ui.input} />
          </Field>
          <Field label="მოდელი">
            <input value={values.model} onChange={(e) => set('model', e.target.value)} style={ui.input} />
          </Field>
          <Field label="სერიული ნომერი">
            <input value={values.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} style={ui.input} />
          </Field>
          <Field label="რაოდენობა">
            <input type="number" min={1} value={values.quantity} onChange={(e) => set('quantity', e.target.value)} style={ui.input} />
          </Field>
        </div>
      </div>

      {/* ── Section: Financials ── */}
      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>ფასი და დღგ</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <Field label="ერთეულის ფასი *">
            <input type="number" min={0} step="0.01" value={values.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} style={ui.input} />
          </Field>
          <Field label="ვალუტა">
            <select value={values.currency} onChange={(e) => set('currency', e.target.value)} style={ui.input}>
              <option value="GEL">GEL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
          <Field label="დღგ %">
            <input type="number" min={0} max={100} step="0.01" value={values.vatRate} onChange={(e) => set('vatRate', e.target.value)} style={ui.input} />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: colors.text, paddingTop: 22 }}>
            <input type="checkbox" checked={values.vatIncluded} onChange={(e) => set('vatIncluded', e.target.checked)} />
            ფასში ჩათვლილია დღგ
          </label>
        </div>

        {/* Live totals preview */}
        {Number(values.unitPrice) > 0 && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #86EFAC', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#15803D' }}>
              <strong>ნეტო:</strong> {formatCurrency(fin.net, values.currency)}
            </span>
            {Number(values.vatRate) > 0 && (
              <span style={{ fontSize: 13, color: '#15803D' }}>
                <strong>დღგ {values.vatRate}%:</strong> {formatCurrency(fin.vat, values.currency)}
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#085041' }}>
              სულ გადასახდელი: {formatCurrency(fin.gross, values.currency)}
            </span>
          </div>
        )}
      </div>

      {/* ── Section: Delivery & warranty ── */}
      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>მიწოდება და გარანტია</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="ხელშეკრულების თარიღი">
            <input type="date" value={values.contractDate} onChange={(e) => set('contractDate', e.target.value)} style={ui.input} />
          </Field>
          <Field label="გადახდის პირობები">
            <input value={values.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="100% წინასწარ..." style={ui.input} />
          </Field>
          <Field label="მიწოდების თარიღი">
            <input type="date" value={values.deliveryDate} onChange={(e) => set('deliveryDate', e.target.value)} style={ui.input} />
          </Field>
          <Field label="მიწოდების მისამართი">
            <input value={values.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} style={ui.input} />
          </Field>
          <Field label="გარანტიის ვადა (თვეებში)">
            <input type="number" min={0} value={values.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} style={ui.input} />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: colors.text, paddingTop: 22 }}>
            <input type="checkbox" checked={values.installationIncluded} onChange={(e) => set('installationIncluded', e.target.checked)} />
            ინსტალაცია შედის ფასში
          </label>
        </div>
      </div>

      {/* ── Section: Extra terms + status ── */}
      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>დამატებითი პირობები</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="სტატუსი">
            <select value={values.status} onChange={(e) => set('status', e.target.value as ContractFormValues['status'])} style={ui.input}>
              <option value="draft">დრაფტი</option>
              <option value="signed">ხელმოწერილი</option>
              <option value="cancelled">გაუქმებული</option>
            </select>
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="სპეციალური პირობები (PDF-ში ჩაიდება)">
              <textarea value={values.specialTerms} onChange={(e) => set('specialTerms', e.target.value)} style={ui.textarea} />
            </Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="შენიშვნები (შიდა, PDF-ში არ ჩაიდება)">
              <textarea value={values.notes} onChange={(e) => set('notes', e.target.value)} style={ui.textarea} />
            </Field>
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185,28,28,0.18)', background: '#FEF2F2', color: '#991B1B' }}>{error}</div>
      ) : null}

      <div style={{ ...ui.panel, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
            {contract ? 'ხელშეკრულების განახლება' : 'ხელშეკრულების შექმნა'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
            PDF ავტომატურად გენერირდება და ინახება storage-ში.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={contract ? `/admin/contracts/${contract.id}` : '/admin/contracts'} style={ui.secondaryButton}>
            გაუქმება
          </Link>
          <button type="button" onClick={() => save({ generatePdf: false })} disabled={saving} style={{ ...ui.secondaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'ინახება...' : 'დრაფტის შენახვა'}
          </button>
          <button type="button" onClick={() => save({ generatePdf: true })} disabled={saving} style={{ ...ui.primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'მუშავდება...' : 'შენახვა და PDF გენერაცია'}
          </button>
        </div>
      </div>
    </div>
  )
}
