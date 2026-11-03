'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { strFromU8, unzipSync } from 'fflate'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'

const categories = ['SALES', 'SERVICE', 'TECHNICAL', 'ORDERS', 'DEBT', 'FOLLOW-UP', 'COMPANY INFO', 'OBJECTIONS', 'PRODUCT COMPARISON', 'ESCALATION']
const inputStyle = { width: '100%', boxSizing: 'border-box' as const, border: '1px solid rgba(15,23,42,.16)', borderRadius: 10, padding: '10px 11px', fontSize: 14 }
const labelStyle = { display: 'block', color: '#52606D', fontSize: 12, fontWeight: 600, marginBottom: 6 }
type Example = Record<string, any>

export default function AiTrainingPage() {
  const { loading, error, profile } = useWarrantyAdminGate()
  const [examples, setExamples] = useState<Example[]>([])
  const [message, setMessage] = useState('')
  const [dbError, setDbError] = useState('')
  const [importing, setImporting] = useState(false)
  const [customerMessage, setCustomerMessage] = useState('')
  const [idealAnswer, setIdealAnswer] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [product, setProduct] = useState('')
  const [allowed, setAllowed] = useState('')
  const [forbidden, setForbidden] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('0')

  async function loadExamples() {
    const { data, error: loadError } = await supabase.from('ai_training_examples').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false })
    if (loadError) setDbError(loadError.message)
    else setExamples(data || [])
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return
    void loadExamples()
    const channel = supabase.channel('ai-training-admin-live').on('postgres_changes', { event: '*', schema: 'public', table: 'ai_training_examples' }, () => void loadExamples()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  function split(value: string) { return value.split(',').map(item => item.trim()).filter(Boolean) }

  function parseMarkdownTraining(text: string) {
    return text.split(/(?=^##\s+\d+\.)/m).map(section => {
      const categoryMatch = section.match(/^##\s+\d+\.\s*([^\r\n]+)/m)
      const customerMatch = section.match(/\*\*კლიენტი:\*\*\s*([^\r\n]+)/)
      const answerMatch = section.match(/\*\*AI:\*\*\s*([\s\S]*?)(?=\n\n\*\*პროდუქტი:\*\*|\n\n##|$)/)
      const productMatch = section.match(/\*\*პროდუქტი:\*\*\s*`([^`]+)`/)
      if (!categoryMatch || !customerMatch || !answerMatch) return null
      return { category: categoryMatch[1].trim().toUpperCase(), customer_message: customerMatch[1].trim(), ideal_answer: answerMatch[1].trim(), product_slug: productMatch?.[1] || null }
    }).filter(Boolean)
  }

  async function readTrainingText(file: File) {
    if (file.name.endsWith('.zip')) {
      const archive = unzipSync(new Uint8Array(await file.arrayBuffer()))
      const entry = Object.entries(archive).find(([name]) => name.endsWith('ai_training_facebook_full_ge_v2.jsonl') || name.endsWith('ai_training_facebook_ge_v1.jsonl'))
      if (!entry) throw new Error('ZIP-ში AI training JSONL ვერ მოიძებნა.')
      return { format: 'jsonl', text: strFromU8(entry[1]) }
    }
    return { format: file.name.endsWith('.md') ? 'md' : 'jsonl', text: await file.text() }
  }

  async function addExample(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setDbError('')
    const payload = { customer_message: customerMessage.trim(), ideal_answer: idealAnswer.trim(), category, product_slug: product.trim() || null, allowed_topics: split(allowed), forbidden_topics: split(forbidden), notes: notes.trim() || null, priority: Number(priority) || 0, is_active: true, active: true, created_by: profile?.id }
    let { error: insertError } = await supabase.from('ai_training_examples').insert(payload)
    if (insertError && /active|column .* does not exist/i.test(insertError.message)) { const { active: _active, ...fallback } = payload; insertError = (await supabase.from('ai_training_examples').insert(fallback)).error }
    if (insertError) { setDbError(insertError.message); return }
    setCustomerMessage(''); setIdealAnswer(''); setProduct(''); setAllowed(''); setForbidden(''); setNotes(''); setMessage('Training example დაემატა.'); void loadExamples()
  }

  async function importJsonl(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return
    setImporting(true); setMessage(''); setDbError('')
    try {
      if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.md') && !file.name.endsWith('.zip')) throw new Error('აირჩიეთ .jsonl, .md ან training .zip ფაილი.')
      const source = await readTrainingText(file)
      const rows = source.format === 'md' ? parseMarkdownTraining(source.text) : source.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => JSON.parse(line))
      const valid = rows.filter(row => typeof row.customer_message === 'string' && typeof row.ideal_answer === 'string').map(row => ({ category: String(row.category || 'COMPANY INFO').toUpperCase(), customer_message: row.customer_message.trim(), ideal_answer: row.ideal_answer.trim(), product_slug: row.product_slug || null, allowed_topics: Array.isArray(row.allowed_topics) ? row.allowed_topics : [], forbidden_topics: Array.isArray(row.forbidden_topics) ? row.forbidden_topics : [], notes: `${row.notes || ''} ${row.source_type ? `Source: ${row.source_type}.` : ''} ${row.requires_current_fact_check ? 'Current fact verification required.' : ''} Imported from ${file.name}; review before activation.`.trim(), priority: Number(row.priority) || 0, is_active: false, active: false, created_by: profile?.id }))
      if (!valid.length) throw new Error('JSONL-ში ვალიდური მაგალითები ვერ მოიძებნა.')
      let inserted = 0
      for (let index = 0; index < valid.length; index += 50) {
        const batch = valid.slice(index, index + 50)
        let result = await supabase.from('ai_training_examples').insert(batch)
        if (result.error && /active|column .* does not exist/i.test(result.error.message)) result = await supabase.from('ai_training_examples').insert(batch.map(({ active: _active, ...row }) => row))
        if (result.error) throw result.error
        inserted += batch.length
      }
      setMessage(`${inserted} training მაგალითი ჩაიტვირთა inactive მდგომარეობაში. თითოეული ჯერ უნდა გადაიხედოს.`); void loadExamples()
    } catch (caught) { setDbError(caught instanceof Error ? caught.message : 'JSONL import ვერ შესრულდა.') }
    finally { setImporting(false); event.target.value = '' }
  }

  async function toggleExample(example: Example) {
    const active = example.is_active !== false && example.active !== false
    let { error: updateError } = await supabase.from('ai_training_examples').update({ is_active: !active, active: !active }).eq('id', example.id)
    if (updateError && /active|column .* does not exist/i.test(updateError.message)) updateError = (await supabase.from('ai_training_examples').update({ is_active: !active }).eq('id', example.id)).error
    if (updateError) setDbError(updateError.message); else void loadExamples()
  }

  if (loading) return <LoadingView label="AI Training იტვირთება..." />
  if (error || !profile || profile.role !== 'admin') return <AuthBlockedView message={error || 'AI Training-ზე წვდომა მხოლოდ admin-ს აქვს.'} />

  return <main style={{ minHeight: '100vh', background: '#F5F5F0', padding: '24px 18px 48px' }}><div style={{ maxWidth: 1180, margin: '0 auto' }}>
    <Link href="/admin/ai" style={{ color: '#085041', fontSize: 13 }}>← AI Operator</Link><h1 style={{ color: '#18212F', margin: '10px 0 4px', fontSize: 28 }}>🎓 AI Training</h1><p style={{ color: '#6B7280', margin: '0 0 18px' }}>Training განსაზღვრავს ქცევას და პასუხის სტილს; კომპანიის ფაქტები Knowledge Base-დან მოდის.</p>
    <section style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: 14, marginBottom: 18 }}><b>Facebook training import</b><p style={{ margin: '6px 0 10px', color: '#7C2D12', fontSize: 13 }}>შეგიძლია აირჩიო v1/v2 JSONL, Markdown ან ZIP. ZIP-იდან მხოლოდ training JSONL იკითხება; corpus და review-required facts არ იმპორტირდება. ყველა მაგალითი inactive-ად ინახება.</p><input type="file" accept=".jsonl,.md,.zip,application/json,text/markdown,application/zip" onChange={event => void importJsonl(event)} disabled={importing} />{importing ? <span style={{ marginLeft: 10, color: '#7C2D12', fontSize: 13 }}>იტვირთება...</span> : null}</section>
    <form onSubmit={addExample} style={{ background: '#fff', border: '1px solid rgba(8,80,65,.12)', borderRadius: 16, padding: 20, display: 'grid', gap: 14, marginBottom: 18 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}><label style={labelStyle}>კატეგორია<select value={category} onChange={event => setCategory(event.target.value)} style={inputStyle}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label style={labelStyle}>Product slug<input value={product} onChange={event => setProduct(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>Priority<input type="number" value={priority} onChange={event => setPriority(event.target.value)} style={inputStyle} /></label></div><label style={labelStyle}>Customer message<textarea required value={customerMessage} onChange={event => setCustomerMessage(event.target.value)} style={{ ...inputStyle, minHeight: 80 }} /></label><label style={labelStyle}>Ideal answer<textarea required value={idealAnswer} onChange={event => setIdealAnswer(event.target.value)} style={{ ...inputStyle, minHeight: 100 }} /></label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><label style={labelStyle}>Allowed topics<input value={allowed} onChange={event => setAllowed(event.target.value)} style={inputStyle} placeholder="კომა-ით გამოყოფილი" /></label><label style={labelStyle}>Forbidden topics<input value={forbidden} onChange={event => setForbidden(event.target.value)} style={inputStyle} placeholder="კომა-ით გამოყოფილი" /></label></div><label style={labelStyle}>Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></label><button type="submit" style={{ justifySelf: 'start', border: 0, borderRadius: 10, padding: '11px 16px', background: '#085041', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>მაგალითის დამატება</button>{message ? <p style={{ color: '#085041', margin: 0 }}>{message}</p> : null}{dbError ? <p style={{ color: '#B42318', margin: 0 }}>{dbError}</p> : null}</form>
    <section style={{ display: 'grid', gap: 10 }}>{examples.map(example => { const active = example.is_active !== false && example.active !== false; return <article key={example.id} style={{ background: '#fff', border: '1px solid rgba(8,80,65,.12)', borderRadius: 12, padding: 16, opacity: active ? 1 : .58 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{example.category} · {example.product_slug || 'ზოგადი'}</strong><button type="button" onClick={() => void toggleExample(example)} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '5px 9px', background: '#fff', cursor: 'pointer' }}>{active ? 'Disable' : 'Enable'}</button></div><p style={{ marginBottom: 6 }}><b>კლიენტი:</b> {example.customer_message}</p><p style={{ margin: 0, color: '#52606D' }}><b>პასუხი:</b> {example.ideal_answer}</p></article> })}</section>
  </div></main>
}