'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { calculateWarrantyEnd, createEmptyWarrantyForm, deriveWarrantyStatus, sanitizeFileName } from '@/app/lib/warranty'
import type { ProductOption, ProfileSummary, WarrantyFormValues, WarrantyRecord } from '@/app/lib/warranty-types'
import { colors, Field, ui } from './WarrantyUi'

function mapWarrantyToFormValues(warranty: WarrantyRecord): WarrantyFormValues {
  return {
    productId: warranty.product_id || '',
    brand: warranty.brand || '',
    productCategory: warranty.product_category || '',
    productName: warranty.product_name || '',
    model: warranty.model || '',
    serialNumber: warranty.serial_number || '',
    clinicName: warranty.clinic_name || '',
    customerName: warranty.customer_name || '',
    phone: warranty.phone || '',
    email: warranty.email || '',
    purchaseDate: warranty.purchase_date || '',
    installationDate: warranty.installation_date || '',
    warrantyStart: warranty.warranty_start || '',
    warrantyMonths: String(warranty.warranty_months || 0),
    invoiceNumber: warranty.invoice_number || '',
    soldBy: warranty.sold_by || '',
    status: warranty.status,
    notes: warranty.notes || '',
  }
}

export function WarrantyForm({
  profile,
  accessToken,
  warranty,
}: {
  profile: ProfileSummary
  accessToken: string
  warranty?: WarrantyRecord
}) {
  const router = useRouter()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [values, setValues] = useState<WarrantyFormValues>(() => (warranty ? mapWarrantyToFormValues(warranty) : createEmptyWarrantyForm()))
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, brand, category_slug, slug')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setProducts((data || []) as ProductOption[])
      })
  }, [])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === values.productId) || null,
    [products, values.productId],
  )

  useEffect(() => {
    if (!selectedProduct) return

    setValues((current) => {
      const next = { ...current }
      if (!current.brand || current.productId === selectedProduct.id) next.brand = selectedProduct.brand || current.brand
      if (!current.productCategory || current.productId === selectedProduct.id) next.productCategory = selectedProduct.category_slug || current.productCategory
      if (!current.productName || current.productId === selectedProduct.id) next.productName = selectedProduct.name || current.productName
      return next
    })
  }, [selectedProduct])

  const computedEnd = calculateWarrantyEnd(values.warrantyStart, Number(values.warrantyMonths || 0))
  const derivedStatus = deriveWarrantyStatus(values.status, values.warrantyStart, computedEnd)

  function setValue<K extends keyof WarrantyFormValues>(key: K, value: WarrantyFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function uploadAttachments(warrantyId: string) {
    if (!files.length) return

    const rows = []

    for (const file of files) {
      const path = `warranty/${warrantyId}/${Date.now()}-${sanitizeFileName(file.name)}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from('warranty-documents')
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError || !uploaded?.path) {
        throw new Error(uploadError?.message || `ატვირთვა ვერ მოხერხდა: ${file.name}`)
      }

      rows.push({
        warranty_id: warrantyId,
        file_name: file.name,
        file_path: uploaded.path,
        file_bucket: 'warranty-documents',
        file_type: file.type || null,
        uploaded_by: profile.id,
      })
    }

    if (rows.length) {
      const { error: insertError } = await supabase.from('warranty_attachments').insert(rows)
      if (insertError) throw new Error(insertError.message)
    }
  }

  async function requestCertificate(warrantyId: string) {
    const response = await fetch(`/api/warranty/${warrantyId}/certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || 'PDF გენერაცია ვერ მოხერხდა.')
    }
  }

  async function save({ generatePdf }: { generatePdf: boolean }) {
    if (!values.brand.trim() || !values.productName.trim() || !values.serialNumber.trim() || !values.warrantyStart || !values.warrantyMonths) {
      setError('შეავსე აუცილებელი ველები: brand, product, serial number, warranty start, months.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        product_id: values.productId || null,
        brand: values.brand.trim(),
        product_category: values.productCategory.trim() || null,
        product_name: values.productName.trim(),
        model: values.model.trim() || null,
        serial_number: values.serialNumber.trim(),
        clinic_name: values.clinicName.trim() || null,
        customer_name: values.customerName.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        purchase_date: values.purchaseDate || null,
        installation_date: values.installationDate || null,
        warranty_start: values.warrantyStart,
        warranty_months: Number(values.warrantyMonths || 0),
        warranty_end: computedEnd || values.warrantyStart,
        invoice_number: values.invoiceNumber.trim() || null,
        sold_by: values.soldBy.trim() || null,
        status: values.status,
        notes: values.notes.trim() || null,
        created_by: warranty?.created_by || profile.id,
      }

      const query = warranty
        ? supabase.from('warranties').update(payload).eq('id', warranty.id)
        : supabase.from('warranties').insert(payload)

      const { data: savedRows, error: saveError } = await query.select('*').limit(1)

      if (saveError) {
        if (saveError.message.toLowerCase().includes('serial_number')) {
          throw new Error('ეს serial number უკვე არსებობს სხვა გარანტიაში.')
        }
        throw new Error(saveError.message)
      }

      const savedWarranty = (savedRows || [])[0] as WarrantyRecord | undefined
      if (!savedWarranty?.id) throw new Error('Warranty ჩანაწერი ვერ შეინახა.')

      await uploadAttachments(savedWarranty.id)

      if (generatePdf) {
        await requestCertificate(savedWarranty.id)
      }

      router.push(`/admin/warranty/${savedWarranty.id}${generatePdf ? '?pdf=1' : ''}`)
      router.refresh()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Warranty შენახვა ვერ მოხერხდა.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label="Linked product preset">
          <select
            value={values.productId}
            onChange={(event) => setValue('productId', event.target.value)}
            style={ui.input}
          >
            <option value="">Select product (optional)</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {product.brand}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand *">
          <input value={values.brand} onChange={(event) => setValue('brand', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Product category">
          <input value={values.productCategory} onChange={(event) => setValue('productCategory', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Product name *">
          <input value={values.productName} onChange={(event) => setValue('productName', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Model">
          <input value={values.model} onChange={(event) => setValue('model', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Serial number *">
          <input value={values.serialNumber} onChange={(event) => setValue('serialNumber', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Clinic name">
          <input value={values.clinicName} onChange={(event) => setValue('clinicName', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Doctor / customer name">
          <input value={values.customerName} onChange={(event) => setValue('customerName', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Phone">
          <input value={values.phone} onChange={(event) => setValue('phone', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Email">
          <input type="email" value={values.email} onChange={(event) => setValue('email', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Purchase date">
          <input type="date" value={values.purchaseDate} onChange={(event) => setValue('purchaseDate', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Installation date">
          <input type="date" value={values.installationDate} onChange={(event) => setValue('installationDate', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Warranty start *">
          <input type="date" value={values.warrantyStart} onChange={(event) => setValue('warrantyStart', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Warranty months *">
          <input type="number" min={0} value={values.warrantyMonths} onChange={(event) => setValue('warrantyMonths', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Warranty end (auto)">
          <input value={computedEnd} readOnly style={{ ...ui.input, background: '#F8FAFC' }} />
        </Field>
        <Field label="Derived status">
          <input value={derivedStatus} readOnly style={{ ...ui.input, background: '#F8FAFC' }} />
        </Field>
        <Field label="Invoice number">
          <input value={values.invoiceNumber} onChange={(event) => setValue('invoiceNumber', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Sold by">
          <input value={values.soldBy} onChange={(event) => setValue('soldBy', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Manual override status">
          <select value={values.status} onChange={(event) => setValue('status', event.target.value as WarrantyFormValues['status'])} style={ui.input}>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="expired">expired</option>
            <option value="void">void</option>
            <option value="replaced">replaced</option>
          </select>
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Notes">
            <textarea value={values.notes} onChange={(event) => setValue('notes', event.target.value)} style={ui.textarea} />
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Attachments">
            <input
              type="file"
              multiple
              accept=".pdf,image/*,.doc,.docx"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              style={ui.input}
            />
          </Field>
          {files.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, background: '#F3F4F6', color: '#374151' }}>
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>
          {error}
        </div>
      ) : null}

      <div style={{ ...ui.panel, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
            {warranty ? 'Update warranty' : 'Create warranty'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
            Staff users can create/edit records. Delete remains admin-only through RLS.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={warranty ? `/admin/warranty/${warranty.id}` : '/admin/warranty'} style={ui.secondaryButton}>
            Cancel
          </Link>
          <button type="button" onClick={() => save({ generatePdf: false })} disabled={saving} style={{ ...ui.secondaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={() => save({ generatePdf: true })} disabled={saving} style={{ ...ui.primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Working…' : 'Save and Generate PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
