'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'

type AgentOrder = Record<string, any>

function value(order: AgentOrder, ...keys: string[]) {
  for (const key of keys) if (order[key] !== undefined && order[key] !== null && order[key] !== '') return order[key]
  return '-'
}

export default function AiOrdersPage() {
  const { loading, error, profile } = useWarrantyAdminGate()
  const [orders, setOrders] = useState<AgentOrder[]>([])
  const [loadError, setLoadError] = useState('')

  async function loadOrders() {
    const { data, error: dbError } = await supabase.from('ai_agent_orders').select('*').eq('source', 'ai_voice_agent').order('created_at', { ascending: false }).limit(300)
    if (dbError) setLoadError(dbError.message)
    else setOrders(data || [])
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return
    void loadOrders()
    const channel = supabase.channel('ai-agent-orders-admin-live').on('postgres_changes', { event: '*', schema: 'public', table: 'ai_agent_orders' }, () => void loadOrders()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  if (loading) return <LoadingView label="AI Agent შეკვეთები იტვირთება..." />
  if (error || !profile || profile.role !== 'admin') return <AuthBlockedView message={error || 'AI შეკვეთებზე წვდომა მხოლოდ admin-ს აქვს.'} />

  return <main style={{ minHeight: '100vh', background: '#F5F5F0', padding: '24px 18px 48px' }}><div style={{ maxWidth: 1240, margin: '0 auto' }}><header style={{ marginBottom: 18 }}><Link href="/admin" style={{ color: '#085041', fontSize: 13 }}>← Admin Panel</Link><h1 style={{ color: '#18212F', margin: '8px 0 4px', fontSize: 28 }}>🤖 AI Agent შეკვეთები</h1><p style={{ color: '#6B7280', margin: 0 }}>მხოლოდ voice agent-ის source-ით შექმნილი შეკვეთები.</p></header><section style={{ background: '#fff', border: '1px solid rgba(8,80,65,.12)', borderRadius: 16, padding: 20, overflowX: 'auto' }}>{loadError ? <p style={{ color: '#B42318' }}>{loadError}</p> : <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', color: '#18212F', fontSize: 13 }}><thead><tr>{['order number', 'customer', 'phone', 'clinic', 'product', 'quantity', 'date', 'status'].map(header => <th key={header} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #E1F5EE' }}>{header}</th>)}</tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={8} style={{ padding: 20, color: '#6B7280' }}>AI Agent შეკვეთები ჯერ არ არის.</td></tr> : orders.map(order => <tr key={value(order, 'id', 'order_number')}><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'order_number', 'order_no', 'number')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'customer', 'customer_name', 'full_name')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'phone', 'customer_phone')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'clinic', 'clinic_name')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'product', 'product_name')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'quantity', 'qty')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'created_at', 'date')}</td><td style={{ padding: '11px 8px', borderBottom: '1px solid #EEF2F1' }}>{value(order, 'status')}</td></tr>)}</tbody></table>}</section></div></main>
}