'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AiOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    load()
    const channel = supabase
      .channel('ai-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_portal_orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function load() {
    const { data } = await supabase.from('ai_agent_orders').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) setOrders(data)
  }

  async function updateStatus(id: string, next: string) {
    await supabase.from('order_portal_orders').update({ status: next }).eq('id', id)
    load()
  }

  const filtered = useMemo(() => orders.filter(o => {
    if (status !== 'all' && o.status !== status) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [o.order_number,o.full_name,o.phone_display,o.clinic_name,o.requested_product,o.delivery_city]
      .some(v => String(v||'').toLowerCase().includes(q))
  }), [orders, search, status])

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f0', padding:24, fontFamily:'sans-serif' }}>
      <div style={{ maxWidth:1180, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h1 style={{ margin:0, fontSize:24, color:'#085041' }}>AI Agent შეკვეთები</h1>
            <p style={{ margin:'5px 0 0', color:'#777', fontSize:13 }}>მხოლოდ ხმოვანი აგენტის მიერ შექმნილი შეკვეთები</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>location.href='/admin/ai-calls'} style={{ padding:'9px 12px', borderRadius:9, border:'1px solid #d7e3df', background:'#fff', cursor:'pointer' }}>AI ზარები</button>
            <button onClick={()=>location.href='/admin'} style={{ padding:'9px 12px', borderRadius:9, border:0, background:'#085041', color:'#fff', cursor:'pointer' }}>← Admin</button>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {['all','new','processing','quoted','confirmed','delivered','cancelled'].map(s=><button key={s} onClick={()=>setStatus(s)} style={{ padding:'7px 10px', borderRadius:20, border:'1px solid #ddd', background:status===s?'#085041':'#fff', color:status===s?'#fff':'#333', cursor:'pointer', fontSize:12 }}>{s==='all'?'ყველა':s}</button>)}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ძებნა: სახელი, ნომერი, პროდუქტი..." style={{ marginLeft:'auto', minWidth:260, padding:'8px 10px', borderRadius:10, border:'1px solid #ddd' }} />
        </div>

        <div style={{ background:'#fff', border:'1px solid #e6e6e0', borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'#fafaf8' }}>
              {['შეკვეთა','კლიენტი','ტელეფონი','პროდუქტი','რაოდ.','სტატუსი','თარიღი','მოქმედება'].map(h=><th key={h} style={{ textAlign:'left', padding:'10px 12px', color:'#777' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(o=><tr key={o.id} style={{ borderTop:'1px solid #f0f0ec' }}>
                <td style={{ padding:'10px 12px', fontWeight:600 }}>{o.order_number}</td>
                <td style={{ padding:'10px 12px' }}>{o.full_name}{o.clinic_name ? <div style={{ color:'#888', fontSize:11 }}>{o.clinic_name}</div> : null}</td>
                <td style={{ padding:'10px 12px' }}>{o.phone_display}</td>
                <td style={{ padding:'10px 12px' }}>{o.requested_product}</td>
                <td style={{ padding:'10px 12px' }}>{o.quantity}</td>
                <td style={{ padding:'10px 12px' }}><strong>{o.status}</strong></td>
                <td style={{ padding:'10px 12px', color:'#888' }}>{new Date(o.created_at).toLocaleString('ka-GE')}</td>
                <td style={{ padding:'10px 12px' }}>
                  <select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} style={{ padding:'6px 8px', borderRadius:8, border:'1px solid #ddd', background:'#fff' }}>
                    {['new','processing','quoted','confirmed','delivered','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>)}
              {!filtered.length && <tr><td colSpan={8} style={{ textAlign:'center', padding:28, color:'#aaa' }}>AI შეკვეთები ჯერ არ არის</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
