'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import type { CrmDeal, CrmPipelineStage } from '@/app/lib/crm-types'
import { colors, EmptyState, LoadingView, ui } from './CrmUi'

// Milestone 1 uses native HTML5 drag-and-drop (built into the browser, no extra
// dependency) instead of a physics-based framer-motion Kanban implementation —
// simpler and more reliable for "move a card to another column," which is all
// this milestone needs. See CRM_PHASE1_M1_REPORT.md for the rationale.

export function PipelineBoard({ accessToken }: { accessToken: string }) {
  const [stages, setStages] = useState<CrmPipelineStage[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dragDealId, setDragDealId] = useState<string | null>(null)
  const [movingDealId, setMovingDealId] = useState<string | null>(null)
  const [newDealTitle, setNewDealTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  )

  const loadBoard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: pipeline, error: pipelineError } = await supabase
        .from('crm_pipelines')
        .select('id')
        .eq('is_default', true)
        .single()

      if (pipelineError || !pipeline) {
        throw new Error('ნაგულისხმევი პაიფლაინი ვერ მოიძებნა.')
      }

      const { data: stageRows, error: stageError } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('sort_order', { ascending: true })

      if (stageError) throw new Error(stageError.message)

      const response = await fetch(`/api/crm/deals?pipeline_id=${pipeline.id}`, { headers: authHeaders })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'გარიგებები ვერ ჩაიტვირთა.')
      }

      setPipelineId(pipeline.id)
      setStages((stageRows || []) as CrmPipelineStage[])
      setDeals(result.deals as CrmDeal[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'ბორდი ვერ ჩაიტვირთა.')
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    void loadBoard()
  }, [loadBoard])

  async function moveDeal(dealId: string, stageId: string) {
    const deal = deals.find((item) => item.id === dealId)
    if (!deal || deal.stage_id === stageId) return

    setMovingDealId(dealId)
    setDeals((current) => current.map((item) => (item.id === dealId ? { ...item, stage_id: stageId } : item)))

    try {
      const response = await fetch(`/api/crm/deals/${dealId}/stage`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ stage_id: stageId }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'ეტაპის განახლება ვერ მოხერხდა.')
      }
    } catch (moveError) {
      // Roll back the optimistic move on failure.
      setDeals((current) => current.map((item) => (item.id === dealId ? { ...item, stage_id: deal.stage_id } : item)))
      setError(moveError instanceof Error ? moveError.message : 'ეტაპის განახლება ვერ მოხერხდა.')
    } finally {
      setMovingDealId(null)
    }
  }

  async function createDeal(stageId: string) {
    const title = newDealTitle.trim()
    if (!title || !pipelineId) return

    setCreating(true)
    setError('')

    try {
      const response = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title, pipeline_id: pipelineId, stage_id: stageId }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'გარიგების შექმნა ვერ მოხერხდა.')
      }

      setDeals((current) => [result.deal as CrmDeal, ...current])
      setNewDealTitle('')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'გარიგების შექმნა ვერ მოხერხდა.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <LoadingView label="გაყიდვების დაფა იტვირთება..." />

  const firstStageId = stages[0]?.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error ? (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#FCEBEB', color: '#9B1C1C', fontSize: 13 }}>{error}</div>
      ) : null}

      <div style={{ ...ui.panel, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={newDealTitle}
          onChange={(event) => setNewDealTitle(event.target.value)}
          placeholder="ახალი გარიგების სათაური (მაგ: კლინიკა X — CBCT)"
          style={{ ...ui.input, maxWidth: 360 }}
        />
        <button
          type="button"
          disabled={creating || !newDealTitle.trim() || !firstStageId}
          onClick={() => firstStageId && void createDeal(firstStageId)}
          style={{ ...ui.primaryButton, opacity: creating || !newDealTitle.trim() ? 0.7 : 1 }}
        >
          {creating ? 'იქმნება...' : '+ გარიგების დამატება'}
        </button>
      </div>

      {stages.length === 0 ? (
        <EmptyState title="ეტაპები ვერ მოიძებნა" description="გაუშვი CRM მიგრაცია ეტაპების შესაქმნელად." />
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {stages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage_id === stage.id)
            return (
              <div
                key={stage.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const dealId = event.dataTransfer.getData('text/plain') || dragDealId
                  if (dealId) void moveDeal(dealId, stage.id)
                  setDragDealId(null)
                }}
                style={{
                  minWidth: 260,
                  maxWidth: 260,
                  background: '#F8FAFC',
                  borderRadius: 16,
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 240,
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: stage.is_won ? '#E1F5EE' : stage.is_lost ? '#FCEBEB' : '#fff',
                    borderRadius: '16px 16px 0 0',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{stage.label}</span>
                  <span style={{ fontSize: 12, color: colors.muted }}>{stageDeals.length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {stageDeals.length === 0 ? (
                    <p style={{ fontSize: 12, color: colors.muted, textAlign: 'center', padding: '18px 6px' }}>გარიგებები არ არის</p>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(event) => {
                          setDragDealId(deal.id)
                          event.dataTransfer.setData('text/plain', deal.id)
                          event.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => setDragDealId(null)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          background: '#fff',
                          border: '1px solid rgba(15, 23, 42, 0.1)',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                          cursor: 'grab',
                          opacity: movingDealId === deal.id ? 0.6 : 1,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>{deal.title}</p>
                        {deal.expected_value ? (
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
                            {deal.expected_value} {deal.currency}
                          </p>
                        ) : null}
                        <Link
                          href={`/admin/crm/deals/${deal.id}`}
                          onClick={(event) => event.stopPropagation()}
                          style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: colors.green, textDecoration: 'none', fontWeight: 700 }}
                        >
                          დეტალურად →
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
