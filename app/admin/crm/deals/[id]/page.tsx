'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import {
  CRM_DEAL_CURRENCIES,
  CRM_DEAL_STATUS_LABELS,
  type CrmActivity,
  type CrmDeal,
  type CrmDealProduct,
  type CrmPipelineStage,
  type CrmTask,
} from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  CrmStatusBadge,
  Field,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../../_components/CrmUi'
import { ActivityTimeline } from '../../_components/ActivityTimeline'
import { TaskForm } from '../../_components/TaskForm'

type ProductOption = { id: string; name: string; brand: string }

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ka-GE')
}

export default function CrmDealDetailPage() {
  const params = useParams<{ id: string }>()
  const { loading, error, profile, accessToken } = useCrmAdminGate()

  const [deal, setDeal] = useState<CrmDeal | null>(null)
  const [party, setParty] = useState<{ id: string; name: string } | null>(null)
  const [contact, setContact] = useState<{ id: string; full_name: string } | null>(null)
  const [owner, setOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [products, setProducts] = useState<CrmDealProduct[]>([])
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [stages, setStages] = useState<CrmPipelineStage[]>([])
  const [productCatalog, setProductCatalog] = useState<ProductOption[]>([])
  const [fetchError, setFetchError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)

  const [form, setForm] = useState({
    title: '', expectedValue: '0', currency: 'GEL', probability: '0',
    expectedCloseDate: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [newProductQty, setNewProductQty] = useState('1')

  const authHeaders = useMemo(
    () => (accessToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  )

  const loadDeal = useCallback(async () => {
    if (!accessToken || !params.id) return
    setDataLoading(true)
    setFetchError('')
    try {
      const response = await fetch(`/api/crm/deals/${params.id}`, { headers: authHeaders })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'გარიგება ვერ ჩაიტვირთა.')

      setDeal(result.deal)
      setParty(result.party)
      setContact(result.contact)
      setOwner(result.owner)
      setProducts(result.products)
      setTasks(result.tasks)
      setActivities(result.activities)
      setForm({
        title: result.deal.title,
        expectedValue: String(result.deal.expected_value ?? 0),
        currency: result.deal.currency,
        probability: String(result.deal.probability_percent ?? 0),
        expectedCloseDate: result.deal.expected_close_date || '',
        notes: result.deal.notes || '',
      })
    } catch (loadError) {
      setFetchError(loadError instanceof Error ? loadError.message : 'გარიგება ვერ ჩაიტვირთა.')
    } finally {
      setDataLoading(false)
    }
  }, [accessToken, authHeaders, params.id])

  useEffect(() => {
    void loadDeal()
  }, [loadDeal])

  const pipelineId = deal?.pipeline_id
  useEffect(() => {
    if (!pipelineId) return
    supabase.from('crm_pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('sort_order').then(({ data }) => {
      setStages((data || []) as CrmPipelineStage[])
    })
  }, [pipelineId])

  useEffect(() => {
    supabase.from('products').select('id, name, brand').eq('is_active', true).order('name').then(({ data }) => {
      setProductCatalog((data || []) as ProductOption[])
    })
  }, [])

  async function saveDealFields() {
    if (!deal || !accessToken) return
    setSaving(true)
    setFetchError('')
    try {
      const response = await fetch(`/api/crm/deals/${deal.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          title: form.title,
          expected_value: Number(form.expectedValue) || 0,
          currency: form.currency,
          probability_percent: Number(form.probability) || 0,
          expected_close_date: form.expectedCloseDate || null,
          notes: form.notes,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'შენახვა ვერ მოხერხდა.')
      setDeal(result.deal)
    } catch (saveError) {
      setFetchError(saveError instanceof Error ? saveError.message : 'შენახვა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStage(stageId: string) {
    if (!deal || !accessToken) return
    setSaving(true)
    try {
      const response = await fetch(`/api/crm/deals/${deal.id}/stage`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ stage_id: stageId }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'ეტაპის შეცვლა ვერ მოხერხდა.')
      await loadDeal()
    } catch (stageError) {
      setFetchError(stageError instanceof Error ? stageError.message : 'ეტაპის შეცვლა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  async function addProduct(event: React.FormEvent) {
    event.preventDefault()
    if (!deal || !accessToken || !newProductId) return
    setSaving(true)
    try {
      const response = await fetch(`/api/crm/deals/${deal.id}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ product_id: newProductId, quantity: Number(newProductQty) || 1 }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'პროდუქტის დამატება ვერ მოხერხდა.')
      setNewProductId('')
      setNewProductQty('1')
      await loadDeal()
    } catch (addError) {
      setFetchError(addError instanceof Error ? addError.message : 'პროდუქტის დამატება ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  async function removeProduct(productLinkId: string) {
    if (!deal || !accessToken) return
    setSaving(true)
    try {
      const response = await fetch(`/api/crm/deals/${deal.id}/products/${productLinkId}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'პროდუქტის წაშლა ვერ მოხერხდა.')
      await loadDeal()
    } catch (removeError) {
      setFetchError(removeError instanceof Error ? removeError.message : 'პროდუქტის წაშლა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (dataLoading) return <LoadingView label="გარიგება იტვირთება..." />
  if (fetchError && !deal) return <AuthBlockedView message={fetchError} />
  if (!deal) return <LoadingView label="..." />

  return (
    <CrmAdminShell
      title={deal.title}
      subtitle={party ? `ანგარიში: ${party.name}` : 'ანგარიში მიბმული არ არის'}
      profile={profile}
      actions={<CrmStatusBadge label={CRM_DEAL_STATUS_LABELS[deal.status]} tone={{ background: '#EEF2FF', color: '#3730A3' }} />}
    >
      {fetchError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{fetchError}</div>
      ) : null}

      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>ეტაპი</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              disabled={saving}
              onClick={() => changeStage(stage.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: stage.id === deal.stage_id ? `2px solid ${colors.green}` : '1px solid rgba(15,23,42,0.12)',
                background: stage.id === deal.stage_id ? colors.greenSoft : '#fff',
                color: colors.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {stage.label}
            </button>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.muted }}>
          ეტაპის ცვლილება ავტომატურად არაფერს ქმნის ERP-ში — მხოლოდ CRM-ის ვიზუალურ პოზიციას ცვლის.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>გარიგების დეტალები</p>
            <Field label="სათაური">
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} style={ui.input} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <Field label="ღირებულება">
                <input value={form.expectedValue} onChange={(event) => setForm((current) => ({ ...current, expectedValue: event.target.value }))} style={ui.input} type="number" min="0" />
              </Field>
              <Field label="ვალუტა">
                <select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} style={ui.input}>
                  {CRM_DEAL_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </Field>
              <Field label="ალბათობა %">
                <input value={form.probability} onChange={(event) => setForm((current) => ({ ...current, probability: event.target.value }))} style={ui.input} type="number" min="0" max="100" />
              </Field>
              <Field label="დახურვის სავარაუდო თარიღი">
                <input value={form.expectedCloseDate} onChange={(event) => setForm((current) => ({ ...current, expectedCloseDate: event.target.value }))} style={ui.input} type="date" />
              </Field>
            </div>
            <Field label="შენიშვნები">
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={ui.textarea} />
            </Field>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: colors.muted }}>
              <span>საკონტაქტო პირი: {contact?.full_name || '—'}</span>
              <span>პასუხისმგებელი: {owner?.full_name || '—'}</span>
            </div>
            <button type="button" onClick={saveDealFields} disabled={saving} style={{ ...ui.primaryButton, alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>

          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>დაკავშირებული პროდუქტები</p>
            {products.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted, margin: '0 0 10px' }}>პროდუქტი ჯერ არ დამატებულა.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {products.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', fontSize: 13 }}>
                    <span>{item.product?.name || 'პროდუქტი'} × {item.quantity}</span>
                    <button type="button" onClick={() => removeProduct(item.id)} disabled={saving} style={{ border: 'none', background: 'none', color: '#9B1C1C', cursor: 'pointer', fontSize: 12 }}>
                      წაშლა
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addProduct} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={newProductId} onChange={(event) => setNewProductId(event.target.value)} style={{ ...ui.input, flex: 2, minWidth: 160 }}>
                <option value="">აირჩიე პროდუქტი</option>
                {productCatalog.map((productOption) => (
                  <option key={productOption.id} value={productOption.id}>{productOption.name}</option>
                ))}
              </select>
              <input value={newProductQty} onChange={(event) => setNewProductQty(event.target.value)} type="number" min="1" style={{ ...ui.input, flex: 1, minWidth: 70 }} />
              <button type="submit" disabled={saving || !newProductId} style={ui.secondaryButton}>+ დამატება</button>
            </form>
          </div>

          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>დავალებები</p>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted, margin: '0 0 10px' }}>დავალება არ არის.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {tasks.map((task) => (
                  <div key={task.id} style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{task.title}</span>
                    <span style={{ color: colors.muted, fontSize: 12 }}>{formatDate(task.due_at)}</span>
                  </div>
                ))}
              </div>
            )}
            {showTaskForm ? (
              <TaskForm
                accessToken={accessToken}
                defaultDealId={deal.id}
                defaultPartyId={deal.party_id}
                onSaved={() => { setShowTaskForm(false); void loadDeal() }}
                onCancel={() => setShowTaskForm(false)}
              />
            ) : (
              <button type="button" onClick={() => setShowTaskForm(true)} style={ui.secondaryButton}>+ დავალების დამატება</button>
            )}
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>აქტივობის ისტორია</p>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </CrmAdminShell>
  )
}
