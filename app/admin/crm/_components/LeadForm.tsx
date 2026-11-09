'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  CRM_LEAD_SOURCE_LABELS,
  CRM_LEAD_SOURCES,
  type CrmLead,
  type CrmLeadFormValues,
  createEmptyLeadForm,
} from '@/app/lib/crm-types'
import { Field, ui } from './CrmUi'

function toFormValues(lead: CrmLead): CrmLeadFormValues {
  return {
    source: lead.source,
    status: lead.status,
    contactName: lead.contact_name || '',
    clinicName: lead.clinic_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    instagramHandle: lead.instagram_handle || '',
    facebookProfile: lead.facebook_profile || '',
    whatsappPhone: lead.whatsapp_phone || '',
    city: lead.city || '',
    initialInterest: lead.initial_interest || '',
    notes: lead.notes || '',
  }
}

function hasAnyIdentifier(values: CrmLeadFormValues) {
  return [
    values.phone, values.email, values.instagramHandle,
    values.facebookProfile, values.whatsappPhone, values.contactName,
  ].some((value) => value.trim().length > 0)
}

export function LeadForm({ accessToken, lead }: { accessToken: string; lead?: CrmLead | null }) {
  const router = useRouter()
  const [values, setValues] = useState<CrmLeadFormValues>(lead ? toFormValues(lead) : createEmptyLeadForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof CrmLeadFormValues>(key: K, value: CrmLeadFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!hasAnyIdentifier(values)) {
      setError('საჭიროა მინიმუმ ერთი საკონტაქტო მონაცემი: ტელეფონი, ელფოსტა, Instagram, Facebook, WhatsApp ან სახელი.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        source: values.source,
        contact_name: values.contactName,
        clinic_name: values.clinicName,
        phone: values.phone,
        email: values.email,
        instagram_handle: values.instagramHandle,
        facebook_profile: values.facebookProfile,
        whatsapp_phone: values.whatsappPhone,
        city: values.city,
        initial_interest: values.initialInterest,
        notes: values.notes,
      }

      const response = await fetch(lead ? `/api/crm/leads/${lead.id}` : '/api/crm/leads', {
        method: lead ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'ლიდის შენახვა ვერ მოხერხდა.')
      }

      router.push(`/admin/crm/leads/${result.lead.id}`)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ლიდის შენახვა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label="წყარო">
          <select value={values.source} onChange={(event) => update('source', event.target.value as CrmLeadFormValues['source'])} style={ui.input}>
            {CRM_LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>{CRM_LEAD_SOURCE_LABELS[source]}</option>
            ))}
          </select>
        </Field>
        <Field label="სახელი">
          <input value={values.contactName} onChange={(event) => update('contactName', event.target.value)} style={ui.input} placeholder="საკონტაქტო პირის სახელი" />
        </Field>
        <Field label="კლინიკა / ორგანიზაცია">
          <input value={values.clinicName} onChange={(event) => update('clinicName', event.target.value)} style={ui.input} />
        </Field>
        <Field label="ქალაქი">
          <input value={values.city} onChange={(event) => update('city', event.target.value)} style={ui.input} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label="ტელეფონი">
          <input value={values.phone} onChange={(event) => update('phone', event.target.value)} style={ui.input} />
        </Field>
        <Field label="ელფოსტა">
          <input value={values.email} onChange={(event) => update('email', event.target.value)} style={ui.input} type="email" />
        </Field>
        <Field label="Instagram">
          <input value={values.instagramHandle} onChange={(event) => update('instagramHandle', event.target.value)} style={ui.input} placeholder="@username" />
        </Field>
        <Field label="Facebook">
          <input value={values.facebookProfile} onChange={(event) => update('facebookProfile', event.target.value)} style={ui.input} />
        </Field>
        <Field label="WhatsApp">
          <input value={values.whatsappPhone} onChange={(event) => update('whatsappPhone', event.target.value)} style={ui.input} />
        </Field>
      </div>

      <Field label="რა აინტერესებს (თავისუფალი ტექსტი)">
        <textarea value={values.initialInterest} onChange={(event) => update('initialInterest', event.target.value)} style={ui.textarea} placeholder="მაგ: CBCT აპარატის ფასი" />
      </Field>

      <Field label="შენიშვნები">
        <textarea value={values.notes} onChange={(event) => update('notes', event.target.value)} style={ui.textarea} />
      </Field>

      {error ? (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#FCEBEB', color: '#9B1C1C', fontSize: 13 }}>{error}</div>
      ) : null}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={saving} style={{ ...ui.primaryButton, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'ინახება...' : lead ? 'ცვლილებების შენახვა' : 'ლიდის შექმნა'}
        </button>
      </div>
    </form>
  )
}
