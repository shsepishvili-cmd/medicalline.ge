'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { calculateWarrantyEnd, createEmptyWarrantyForm, deriveWarrantyStatus, sanitizeFileName, WARRANTY_STATUS_LABELS } from '@/app/lib/warranty'
import { HANDOVER_ITEMS, suggestWarrantyCategory, WARRANTY_CATEGORIES } from '@/app/lib/warranty-catalog'
import type { ProductOption, ProfileSummary, WarrantyFormValues, WarrantyRecord } from '@/app/lib/warranty-types'
import { merchant } from '@/app/lib/merchant'
import { colors, Field, ui } from './WarrantyUi'
import { sendWarrantySmsRequest } from './warranty-sms'

const NAVY = '#102952'
const RED = '#d72c47'

const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 } as const

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '24px 0 12px', fontSize: 15, fontWeight: 700, color: NAVY, borderLeft: `3px solid ${RED}`, paddingLeft: 10 }}>
      {children}
    </h2>
  )
}

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
    customerIdNumber: warranty.customer_id_number || '',
    customerAddress: warranty.customer_address || '',
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
    componentTerms: warranty.component_terms || '',
    packageNotes: warranty.package_notes || '',
    handoverDeviceChecked: Boolean(warranty.handover_device_checked),
    handoverInstallationDone: Boolean(warranty.handover_installation_done),
    handoverManualGiven: Boolean(warranty.handover_manual_given),
    handoverTrainingDone: Boolean(warranty.handover_training_done),
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
  const [sendSmsOnCreate, setSendSmsOnCreate] = useState(true)

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

  // A saved value outside the 15 categories (older records) must stay selectable.
  const categoryOptions = useMemo(() => {
    const names = WARRANTY_CATEGORIES.map((category) => category.name)
    return values.productCategory && !names.includes(values.productCategory)
      ? [values.productCategory, ...names]
      : names
  }, [values.productCategory])

  // Runs only when staff pick a product, so opening a saved warranty for editing
  // never overwrites what the certificate already says.
  function selectProduct(productId: string) {
    const product = products.find((item) => item.id === productId)
    setValues((current) => ({
      ...current,
      productId,
      brand: product?.brand || current.brand,
      productName: product?.name || current.productName,
      productCategory: (product && suggestWarrantyCategory(product)) || current.productCategory,
    }))
  }

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
      setError('შეავსე აუცილებელი ველები: მწარმოებელი, პროდუქტი, სერიული ნომერი, გარანტიის დაწყება და თვეები.')
      return
    }
    if (!warranty && sendSmsOnCreate && !values.phone.trim()) {
      setError('SMS გაგზავნისთვის მიუთითე კლიენტის ტელეფონი.')
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
        customer_id_number: values.customerIdNumber.trim() || null,
        customer_address: values.customerAddress.trim() || null,
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
        component_terms: values.componentTerms.trim() || null,
        package_notes: values.packageNotes.trim() || null,
        handover_device_checked: values.handoverDeviceChecked,
        handover_installation_done: values.handoverInstallationDone,
        handover_manual_given: values.handoverManualGiven,
        handover_training_done: values.handoverTrainingDone,
        created_by: warranty?.created_by || profile.id,
      }

      const query = warranty
        ? supabase.from('warranties').update(payload).eq('id', warranty.id)
        : supabase.from('warranties').insert(payload)

      const { data: savedRows, error: saveError } = await query.select('*').limit(1)

      if (saveError) {
        if (saveError.message.toLowerCase().includes('serial_number')) {
          throw new Error('ეს სერიული ნომერი უკვე არსებობს სხვა გარანტიაში.')
        }
        if (/component_terms|package_notes|handover_/.test(saveError.message)) {
          throw new Error('ბაზა ჯერ არ არის განახლებული: Supabase SQL Editor-ში გაუშვით supabase/sql/52_warranty_certificate_v2.sql.')
        }
        throw new Error(saveError.message)
      }

      const savedWarranty = (savedRows || [])[0] as WarrantyRecord | undefined
      if (!savedWarranty?.id) throw new Error('გარანტიის ჩანაწერი ვერ შეინახა.')

      await uploadAttachments(savedWarranty.id)

      if (generatePdf) {
        await requestCertificate(savedWarranty.id)
      }

      let smsStatus = ''
      if (!warranty && sendSmsOnCreate) {
        try {
          const sms = await sendWarrantySmsRequest(accessToken, savedWarranty.id)
          if (sms.smsSent) {
            smsStatus = 'sent'
          } else if (sms.smsText) {
            await navigator.clipboard?.writeText(sms.smsText)
            smsStatus = 'copied'
          }
        } catch {
          smsStatus = 'failed'
        }
      }

      const redirectParams = new URLSearchParams()
      if (generatePdf) redirectParams.set('pdf', '1')
      if (smsStatus) redirectParams.set('sms', smsStatus)
      router.push(`/admin/warranty/${savedWarranty.id}${redirectParams.size ? `?${redirectParams.toString()}` : ''}`)
      router.refresh()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'გარანტიის შენახვა ვერ მოხერხდა.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={ui.panel}>
        <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>საგარანტიო სერტიფიკატი</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
              {merchant.brand} · {merchant.legalName} · ს/კ {merchant.identificationNumber}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.muted }}>{merchant.address} · {merchant.phone}</p>
          </div>
          <span style={{ background: '#fef1f3', border: '1px solid #f9d3d9', color: '#a31c36', borderRadius: 30, padding: '6px 12px', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
            {warranty ? warranty.warranty_number : 'ნომერი მიენიჭება ავტომატურად'}
          </span>
        </div>

        <SectionTitle>მყიდველის მონაცემები</SectionTitle>
        <div style={formGrid}>
          <Field label="მყიდველი / ორგანიზაცია">
            <input value={values.clinicName} onChange={(event) => setValue('clinicName', event.target.value)} placeholder="ორგანიზაციის დასახელება" style={ui.input} />
          </Field>
          <Field label="საკონტაქტო პირი">
            <input value={values.customerName} onChange={(event) => setValue('customerName', event.target.value)} placeholder="ექიმი / მომხმარებელი" style={ui.input} />
          </Field>
          <Field label="საიდენტიფიკაციო ნომერი">
            <input value={values.customerIdNumber} onChange={(event) => setValue('customerIdNumber', event.target.value)} placeholder="ს/კ ან პირადი №" style={ui.input} />
          </Field>
          <Field label="საკონტაქტო ტელეფონი">
            <input value={values.phone} onChange={(event) => setValue('phone', event.target.value)} placeholder="+995 ..." style={ui.input} />
          </Field>
          <Field label="ელფოსტა">
            <input type="email" value={values.email} onChange={(event) => setValue('email', event.target.value)} style={ui.input} />
          </Field>
          <Field label="მოწყობილობის განთავსების მისამართი">
            <input value={values.customerAddress} onChange={(event) => setValue('customerAddress', event.target.value)} placeholder="ქალაქი, მისამართი" style={ui.input} />
          </Field>
        </div>

        <SectionTitle>მოწყობილობის მონაცემები</SectionTitle>
        <div style={formGrid}>
          <Field label="კატალოგიდან არჩევა">
            <select value={values.productId} onChange={(event) => selectProduct(event.target.value)} style={ui.input}>
              <option value="">აირჩიე პროდუქტი (არასავალდებულო)</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.brand}
                </option>
              ))}
            </select>
          </Field>
          <Field label="პროდუქციის კატეგორია">
            <select value={values.productCategory} onChange={(event) => setValue('productCategory', event.target.value)} style={ui.input}>
              <option value="">აირჩიე კატეგორია</option>
              {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
          <Field label="პროდუქტის დასახელება *">
            <input value={values.productName} onChange={(event) => setValue('productName', event.target.value)} style={ui.input} />
          </Field>
          <Field label="მწარმოებელი *">
            <input value={values.brand} onChange={(event) => setValue('brand', event.target.value)} placeholder="მაგ.: Eighteeth" style={ui.input} />
          </Field>
          <Field label="მოდელი">
            <input value={values.model} onChange={(event) => setValue('model', event.target.value)} placeholder="მაგ.: FinScan F350" style={ui.input} />
          </Field>
          <Field label="სერიული ნომერი (S/N) *">
            <input value={values.serialNumber} onChange={(event) => setValue('serialNumber', event.target.value)} style={ui.input} />
          </Field>
          <Field label="ინვოისის ნომერი">
            <input value={values.invoiceNumber} onChange={(event) => setValue('invoiceNumber', event.target.value)} style={ui.input} />
          </Field>
          <Field label="გადაცემის თარიღი">
            <input type="date" value={values.purchaseDate} onChange={(event) => setValue('purchaseDate', event.target.value)} style={ui.input} />
          </Field>
          <Field label="მონტაჟის თარიღი (საჭიროების შემთხვევაში)">
            <input type="date" value={values.installationDate} onChange={(event) => setValue('installationDate', event.target.value)} style={ui.input} />
          </Field>
          <Field label="გარანტიის დაწყება *">
            <input type="date" value={values.warrantyStart} onChange={(event) => setValue('warrantyStart', event.target.value)} style={ui.input} />
          </Field>
          <Field label="საგარანტიო ვადა (თვე) *">
            <input type="number" min={0} value={values.warrantyMonths} onChange={(event) => setValue('warrantyMonths', event.target.value)} style={ui.input} />
          </Field>
          <Field label="გარანტიის დასრულება (ავტომატური)">
            <input value={computedEnd} readOnly style={{ ...ui.input, background: '#F8FAFC' }} />
          </Field>
          <Field label="დამატებითი კომპონენტების პირობები">
            <input value={values.componentTerms} onChange={(event) => setValue('componentTerms', event.target.value)} placeholder="ვადა / გამონაკლისები" style={ui.input} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="კომპლექტაცია და დამატებითი შენიშვნები (იბეჭდება სერტიფიკატზე)">
            <textarea rows={2} value={values.packageNotes} onChange={(event) => setValue('packageNotes', event.target.value)} placeholder="აქსესუარები, კომპონენტები, ცალკეული საგარანტიო პირობები" style={{ ...ui.textarea, minHeight: 70 }} />
          </Field>
        </div>

        <SectionTitle>მიღება-ჩაბარება</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
          {HANDOVER_ITEMS.map((item) => (
            <label key={item.formKey} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text }}>
              <input type="checkbox" checked={values[item.formKey]} onChange={(event) => setValue(item.formKey, event.target.checked)} />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>შიდა აღრიცხვა — სერტიფიკატზე არ იბეჭდება</p>
        <Field label="გამყიდველი">
          <input value={values.soldBy} onChange={(event) => setValue('soldBy', event.target.value)} style={ui.input} />
        </Field>
        <Field label="ავტომატური სტატუსი">
          <input value={WARRANTY_STATUS_LABELS[derivedStatus]} readOnly style={{ ...ui.input, background: '#F8FAFC' }} />
        </Field>
        <Field label="სტატუსის ხელით მითითება">
          <select value={values.status} onChange={(event) => setValue('status', event.target.value as WarrantyFormValues['status'])} style={ui.input}>
            <option value="pending">მოლოდინში</option>
            <option value="active">აქტიური</option>
            <option value="expired">ვადაგასული</option>
            <option value="void">გაუქმებული</option>
            <option value="replaced">შეცვლილი</option>
          </select>
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="შიდა შენიშვნები">
            <textarea value={values.notes} onChange={(event) => setValue('notes', event.target.value)} style={ui.textarea} />
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="დანართები">
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
        {!warranty ? (
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: colors.text }}>
            <input type="checkbox" checked={sendSmsOnCreate} onChange={(event) => setSendSmsOnCreate(event.target.checked)} />
            შექმნისთანავე გარანტიის დოკუმენტი SMS-ით გაიგზავნოს
          </label>
        ) : null}
      </div>

      {error ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>
          {error}
        </div>
      ) : null}

      <div style={{ ...ui.panel, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
            {warranty ? 'საგარანტიო ბარათის განახლება' : 'საგარანტიო ბარათის გაცემა'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
            staff მომხმარებლებს შეუძლიათ ჩანაწერის შექმნა და რედაქტირება. წაშლა ისევ მხოლოდ admin-ისთვის რჩება.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={warranty ? `/admin/warranty/${warranty.id}` : '/admin/warranty'} style={ui.secondaryButton}>
            გაუქმება
          </Link>
          <button type="button" onClick={() => save({ generatePdf: false })} disabled={saving} style={{ ...ui.secondaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'ინახება...' : 'დრაფტის შენახვა'}
          </button>
          <button type="button" onClick={() => save({ generatePdf: true })} disabled={saving} style={{ ...ui.primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'მუშავდება...' : 'შენახვა და ბარათის PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
