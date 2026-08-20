'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type CallMode = 'exact_message' | 'dialog'
type Purpose = 'notification' | 'debt_reminder' | 'sales' | 'service' | 'follow_up' | 'other'

const purposeLabels: Record<Purpose, string> = {
  notification: 'შეტყობინება',
  debt_reminder: 'დავალიანების შეხსენება',
  sales: 'შეთავაზება / გაყიდვები',
  service: 'სერვისი / საინჟინრო',
  follow_up: 'შემდგომი დაკავშირება',
  other: 'სხვა',
}

export default function AiCallsPage() {
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [mode, setMode] = useState<CallMode>('exact_message')
  const [purpose, setPurpose] = useState<Purpose>('notification')
  const [script, setScript] = useState('')
  const [maxSeconds, setMaxSeconds] = useState(60)
  const [smsAfter, setSmsAfter] = useState(false)
  const [smsText, setSmsText] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadJobs()
    const channel = supabase
      .channel('ai-call-jobs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_call_jobs' }, loadJobs)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadJobs() {
    const { data } = await supabase.from('ai_call_jobs').select('*').order('created_at', { ascending: false }).limit(100)
    if (data) setJobs(data)
  }

  const exactModeNote = useMemo(() => mode === 'exact_message'
    ? 'აგენტი კითხულობს მხოლოდ შენს ტექსტს. სხვა თემაზე არ გადადის და ახალ ფაქტს არ ამატებს.'
    : 'აგენტს შეუძლია დიალოგის გაგრძელება, მაგრამ მხოლოდ შენ მიერ მითითებული თემისა და მიზნის ფარგლებში.'
  , [mode])

  async function createCall() {
    setMessage('')
    const digits = phone.replace(/\D/g, '').replace(/^995/, '')
    if (!/^5\d{8}$/.test(digits)) {
      setMessage('ტელეფონის ნომერი სწორად ჩაწერე — 5XXXXXXXX')
      return
    }
    if (!script.trim()) {
      setMessage('ზარის ტექსტი აუცილებელია.')
      return
    }
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('ai_call_jobs').insert({
      phone: digits,
      customer_name: customerName.trim() || null,
      mode,
      purpose,
      script_text: script.trim(),
      caller_id: '+995322453821',
      max_seconds: maxSeconds,
      status: 'queued',
      sms_after: smsAfter,
      sms_text: smsAfter ? (smsText.trim() || script.trim()) : null,
      created_by: session?.user?.id || null,
    })
    setBusy(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('ზარი რიგში დაემატა. VPS აიღებს დავალებას და დარეკავს.')
    setPhone('')
    setCustomerName('')
    setScript('')
    setSmsText('')
    setSmsAfter(false)
    loadJobs()
  }

  const statusLabel = (s: string) => ({
    queued: 'რიგშია', dialing: 'რეკავს', ringing: 'რინგავს', answered: 'უპასუხა', completed: 'დასრულდა',
    no_answer: 'არ უპასუხა', busy: 'დაკავებულია', failed: 'შეცდომა', cancelled: 'გაუქმდა'
  } as Record<string,string>)[s] || s

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#085041' }}>AI ზარები</h1>
            <p style={{ margin: '5px 0 0', color: '#777', fontSize: 13 }}>Medical Line · ნომერი + ტექსტი + ზარის ისტორია</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => location.href='/admin/ai-orders'} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid #d7e3df', background: '#fff', cursor: 'pointer' }}>AI Agent შეკვეთები</button>
            <button onClick={() => location.href='/admin'} style={{ padding: '9px 12px', borderRadius: 9, border: 0, background: '#085041', color: '#fff', cursor: 'pointer' }}>← Admin</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: '#fff', padding: 18, borderRadius: 14, border: '1px solid #e6e6e0' }}>
            <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>ახალი AI ზარი</h2>

            <label style={{ fontSize: 12, color: '#666' }}>ნომერი</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="5XXXXXXXX" style={{ width:'100%', boxSizing:'border-box', padding:10, borderRadius:9, border:'1px solid #ddd', margin:'5px 0 12px' }} />

            <label style={{ fontSize: 12, color: '#666' }}>სახელი / კლინიკა (სურვილისამებრ)</label>
            <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="მაგ: დენტალ ლუქსი" style={{ width:'100%', boxSizing:'border-box', padding:10, borderRadius:9, border:'1px solid #ddd', margin:'5px 0 12px' }} />

            <label style={{ fontSize: 12, color: '#666' }}>რეჟიმი</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'6px 0 6px' }}>
              <button onClick={()=>setMode('exact_message')} style={{ padding:10, borderRadius:9, border:0, cursor:'pointer', background:mode==='exact_message'?'#085041':'#eef3f1', color:mode==='exact_message'?'#fff':'#085041' }}>ზუსტი ტექსტი</button>
              <button onClick={()=>setMode('dialog')} style={{ padding:10, borderRadius:9, border:0, cursor:'pointer', background:mode==='dialog'?'#085041':'#eef3f1', color:mode==='dialog'?'#fff':'#085041' }}>დიალოგი</button>
            </div>
            <p style={{ fontSize:11, color:'#777', margin:'0 0 12px' }}>{exactModeNote}</p>

            <label style={{ fontSize: 12, color: '#666' }}>მიზანი</label>
            <select value={purpose} onChange={e=>setPurpose(e.target.value as Purpose)} style={{ width:'100%', padding:10, borderRadius:9, border:'1px solid #ddd', margin:'5px 0 12px', background:'#fff' }}>
              {(Object.keys(purposeLabels) as Purpose[]).map(k=><option key={k} value={k}>{purposeLabels[k]}</option>)}
            </select>

            <label style={{ fontSize: 12, color: '#666' }}>რას ეტყვის აგენტი</label>
            <textarea value={script} onChange={e=>setScript(e.target.value)} rows={8} placeholder="მაგ: გამარჯობა, Medical Line Georgia-დან გიკავშირდებით..." style={{ width:'100%', boxSizing:'border-box', padding:10, borderRadius:9, border:'1px solid #ddd', margin:'5px 0 12px', resize:'vertical' }} />

            <label style={{ fontSize:12, color:'#666' }}>მაქს. საუბრის დრო — {maxSeconds} წმ</label>
            <input type="range" min={30} max={300} step={30} value={maxSeconds} onChange={e=>setMaxSeconds(Number(e.target.value))} style={{ width:'100%', margin:'6px 0 12px' }} />

            <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:12, marginBottom:8 }}>
              <input type="checkbox" checked={smsAfter} onChange={e=>setSmsAfter(e.target.checked)} />
              ზარის შემდეგ SMS-ის მომზადება
            </label>
            {smsAfter && <textarea value={smsText} onChange={e=>setSmsText(e.target.value)} rows={3} placeholder="SMS ტექსტი" style={{ width:'100%', boxSizing:'border-box', padding:10, borderRadius:9, border:'1px solid #ddd', marginBottom:12 }} />}

            <div style={{ fontSize:11, background:'#fff8e8', border:'1px solid #f2dfae', padding:10, borderRadius:9, marginBottom:12 }}>
              დავალიანებაზე: გამოიყენე „ზუსტი ტექსტი“. თუ ტექსტში წერ კონკრეტულ თანხას ან სხვა კონფიდენციალურ დეტალს, პირველივე წინადადებაში ჯობს პირის იდენტობა გადაამოწმო.
            </div>

            <button disabled={busy} onClick={createCall} style={{ width:'100%', padding:12, borderRadius:10, border:0, background:'#085041', color:'#fff', fontWeight:700, cursor:'pointer', opacity:busy?.6:1 }}>
              {busy ? 'ვაგზავნი…' : '📞 ზარის რიგში დამატება'}
            </button>
            {message && <p style={{ fontSize:12, color:message.includes('რიგში')?'#08765e':'#a33', marginBottom:0 }}>{message}</p>}
          </div>

          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e6e6e0', overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between' }}>
              <strong style={{ fontSize:14 }}>ზარების ისტორია</strong>
              <button onClick={loadJobs} style={{ border:0, background:'transparent', color:'#085041', cursor:'pointer' }}>განახლება</button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'#fafaf8' }}>
                  {['ნომერი','რეჟიმი','მიზანი','სტატუსი','დრო','შედეგი','თარიღი'].map(h=><th key={h} style={{ textAlign:'left', padding:'9px 10px', color:'#777' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {jobs.map(j=><tr key={j.id} style={{ borderTop:'1px solid #f0f0ec' }}>
                    <td style={{ padding:'9px 10px', fontWeight:600 }}>{j.phone}</td>
                    <td style={{ padding:'9px 10px' }}>{j.mode==='exact_message'?'ზუსტი':'დიალოგი'}</td>
                    <td style={{ padding:'9px 10px' }}>{purposeLabels[j.purpose as Purpose] || j.purpose}</td>
                    <td style={{ padding:'9px 10px' }}>{statusLabel(j.status)}</td>
                    <td style={{ padding:'9px 10px' }}>{j.duration_seconds ? `${j.duration_seconds} წმ` : '—'}</td>
                    <td style={{ padding:'9px 10px', maxWidth:220 }}>{j.outcome || j.summary || '—'}</td>
                    <td style={{ padding:'9px 10px', color:'#888' }}>{new Date(j.created_at).toLocaleString('ka-GE')}</td>
                  </tr>)}
                  {!jobs.length && <tr><td colSpan={7} style={{ padding:24, textAlign:'center', color:'#aaa' }}>ზარები ჯერ არ არის</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
