'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CRM_DEAL_STATUS_LABELS,
  CRM_TASK_STATUS_LABELS,
  type CrmActivity,
  type CrmContact,
  type CrmDeal,
  type CrmDealProduct,
  type CrmAccount,
  type CrmTask,
} from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  CrmStatusBadge,
  EmptyState,
  InfoStat,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../../_components/CrmUi'
import { ActivityTimeline } from '../../_components/ActivityTimeline'
import { TaskForm } from '../../_components/TaskForm'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ka-GE')
}

export default function CrmCustomer360Page() {
  const params = useParams<{ partyId: string }>()
  const { loading, error, profile, accessToken } = useCrmAdminGate()

  const [account, setAccount] = useState<CrmAccount | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<{ id: string; full_name: string } | null>(null)
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [productInterests, setProductInterests] = useState<CrmDealProduct[]>([])
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([])
  const [fetchError, setFetchError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)

  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactSaving, setContactSaving] = useState(false)

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  )

  const load360 = useCallback(async () => {
    if (!accessToken || !params.partyId) return
    setDataLoading(true)
    setFetchError('')

    try {
      const response = await fetch(`/api/crm/customers/${params.partyId}/360`, { headers: authHeaders })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'Customer 360 ვერ ჩაიტვირთა.')
      }
      setAccount(result.account)
      setOwnerProfile(result.ownerProfile)
      setContacts(result.contacts)
      setDeals(result.deals)
      setTasks(result.tasks)
      setActivities(result.activities)
      setProductInterests(result.productInterests)
      setWarranties(result.warranties || [])
    } catch (loadError) {
      setFetchError(loadError instanceof Error ? loadError.message : 'Customer 360 ვერ ჩაიტვირთა.')
    } finally {
      setDataLoading(false)
    }
  }, [accessToken, authHeaders, params.partyId])

  useEffect(() => {
    void load360()
  }, [load360])

  async function submitNote(event: React.FormEvent) {
    event.preventDefault()
    if (!noteText.trim() || !accessToken || !account) return
    setNoteSaving(true)
    try {
      const response = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ body: noteText.trim(), party_id: account.id }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'შენიშვნა ვერ დაემატა.')
      setNoteText('')
      await load360()
    } catch (submitError) {
      setFetchError(submitError instanceof Error ? submitError.message : 'შენიშვნა ვერ დაემატა.')
    } finally {
      setNoteSaving(false)
    }
  }

  async function submitContact(event: React.FormEvent) {
    event.preventDefault()
    if (!contactName.trim() || !accessToken || !account) return
    setContactSaving(true)
    try {
      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ party_id: account.id, full_name: contactName.trim(), phone: contactPhone.trim() || undefined }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'კონტაქტი ვერ დაემატა.')
      setContactName('')
      setContactPhone('')
      await load360()
    } catch (submitError) {
      setFetchError(submitError instanceof Error ? submitError.message : 'კონტაქტი ვერ დაემატა.')
    } finally {
      setContactSaving(false)
    }
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (dataLoading) return <LoadingView label="Customer 360 იტვირთება..." />
  if (fetchError && !account) return <AuthBlockedView message={fetchError} />
  if (!account) return <LoadingView label="..." />

  const openDeals = deals.filter((deal) => deal.status === 'open' || deal.status === 'won_pending_setup')
  const closedDeals = deals.filter((deal) => deal.status === 'won' || deal.status === 'lost')
  const openPipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.expected_value || 0), 0)

  return (
    <CrmAdminShell
      title={account.name}
      subtitle={`${account.is_individual ? 'ინდივიდუალური კლიენტი' : 'ორგანიზაცია'} · ${account.party_type}`}
      profile={profile}
    >
      {fetchError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{fetchError}</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <InfoStat value={openDeals.length} label="აქტიური გარიგება" />
        <InfoStat value={`${openPipelineValue.toFixed(0)} GEL`} label="აქტიური ღირებულება" />
        <InfoStat value={tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled').length} label="აქტიური დავალება" />
        <InfoStat value={contacts.length} label="კონტაქტი" />
        <InfoStat value={warranties.length} label="გარანტია" />
      </div>

      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>ანგარიშის მონაცემები</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: colors.muted }}>ტელეფონი: </span>{account.phone || '—'}</div>
          <div><span style={{ color: colors.muted }}>ელფოსტა: </span>{account.email || '—'}</div>
          <div><span style={{ color: colors.muted }}>მისამართი: </span>{account.address || '—'}</div>
          <div><span style={{ color: colors.muted }}>ქალაქი: </span>{account.city || '—'}</div>
          <div><span style={{ color: colors.muted }}>ლიდის წყარო: </span>{account.lead_source || '—'}</div>
          <div><span style={{ color: colors.muted }}>პასუხისმგებელი: </span>{ownerProfile?.full_name || '—'}</div>
          <div><span style={{ color: colors.muted }}>საგადასახადო ნომერი: </span>{account.tax_id || '—'}</div>
          <div><span style={{ color: colors.muted }}>კოდი: </span>{account.code || '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>კონტაქტები</p>
            {contacts.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>კონტაქტი არ არის დამატებული.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {contacts.map((contact) => (
                  <div key={contact.id} style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', fontSize: 13 }}>
                    <strong>{contact.full_name}</strong>{contact.title ? ` · ${contact.title}` : ''}
                    <div style={{ color: colors.muted, fontSize: 12 }}>{[contact.phone, contact.email].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={submitContact} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="სახელი" style={{ ...ui.input, flex: 1, minWidth: 140 }} />
              <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="ტელეფონი" style={{ ...ui.input, flex: 1, minWidth: 120 }} />
              <button type="submit" disabled={contactSaving || !contactName.trim()} style={{ ...ui.secondaryButton, opacity: contactSaving ? 0.7 : 1 }}>
                + კონტაქტი
              </button>
            </form>
          </div>

          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>პროდუქტის ინტერესი</p>
            {productInterests.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>ამ ანგარიშის გარიგებებში პროდუქტი ჯერ არ დამატებულა.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {productInterests.map((item) => (
                  <div key={item.id} style={{ fontSize: 13, color: colors.text }}>
                    {item.product?.name || 'პროდუქტი'} × {item.quantity}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>გარანტიები</p>
            {warranties.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>ამ კლიენტზე გარანტია ჯერ არ არის შექმნილი.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {warranties.map((warranty) => (
                  <Link
                    key={warranty.id}
                    href={`/admin/warranty/${warranty.id}`}
                    style={{ padding: '9px 10px', borderRadius: 10, background: '#F0FDF4', color: colors.text, textDecoration: 'none', fontSize: 13 }}
                  >
                    <strong>{warranty.warranty_number}</strong> · {warranty.brand} {warranty.product_name}
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                      S/N {warranty.serial_number} · {formatDate(warranty.warranty_start)} — {formatDate(warranty.warranty_end)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
                    <span style={{ color: colors.muted, fontSize: 12 }}>{CRM_TASK_STATUS_LABELS[task.status]}{task.due_at ? ` · ${formatDate(task.due_at)}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            {showTaskForm ? (
              <TaskForm
                accessToken={accessToken}
                defaultPartyId={account.id}
                onSaved={() => { setShowTaskForm(false); void load360() }}
                onCancel={() => setShowTaskForm(false)}
              />
            ) : (
              <button type="button" onClick={() => setShowTaskForm(true)} style={ui.secondaryButton}>+ დავალების დამატება</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>აქტიური გარიგებები</p>
            {openDeals.length === 0 ? (
              <EmptyState title="აქტიური გარიგება არ არის" description="ამ ანგარიშისთვის ჯერ არ არსებობს ღია გარიგება." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {openDeals.map((deal) => (
                  <Link key={deal.id} href={`/admin/crm/deals/${deal.id}`} style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', fontSize: 13, textDecoration: 'none', color: colors.text, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{deal.title}</span>
                    <span style={{ color: colors.muted, fontSize: 12 }}>{deal.expected_value} {deal.currency}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>დახურული გარიგებები (მოგებული/წაგებული)</p>
            {closedDeals.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>დახურული გარიგება არ არის.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {closedDeals.map((deal) => (
                  <Link key={deal.id} href={`/admin/crm/deals/${deal.id}`} style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', fontSize: 13, textDecoration: 'none', color: colors.text, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{deal.title}</span>
                    <CrmStatusBadge
                      label={CRM_DEAL_STATUS_LABELS[deal.status]}
                      tone={deal.status === 'won' ? { background: '#E1F5EE', color: '#085041' } : { background: '#FCEBEB', color: '#9B1C1C' }}
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...ui.panel }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>შენიშვნის დამატება</p>
            <form onSubmit={submitNote} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} style={ui.textarea} placeholder="დაწერე შენიშვნა..." />
              <button type="submit" disabled={noteSaving || !noteText.trim()} style={{ ...ui.primaryButton, alignSelf: 'flex-start', opacity: noteSaving ? 0.7 : 1 }}>
                {noteSaving ? 'ინახება...' : 'დამატება'}
              </button>
            </form>
          </div>

          <div>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>აქტივობის ისტორია</p>
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>
    </CrmAdminShell>
  )
}
