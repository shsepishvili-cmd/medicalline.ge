'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AI_KNOWLEDGE_FALLBACK, AI_KNOWLEDGE_SCOPE } from '@/app/lib/ai-knowledge-policy'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'

type Item = {
  id: string
  title: string
  content: string
  category: string
  product_slug: string | null
  priority: number | null
  strict_answer: boolean | null
  active: boolean | null
  source_type: string | null
  source_ref: string | null
  status: string | null
  valid_from: string | null
  valid_until: string | null
}
type AliasRow = {
  id: string
  alias: string
  canonical_term: string
  product_slug: string | null
  knowledge_item_id: string | null
  is_active: boolean
  created_at?: string | null
}
type ImportCandidate = {
  sourceIndex: number
  alias: string
  canonical_term: string
  product_slug: string | null
  sourceActive: boolean
}
type InvalidImportRow = {
  sourceIndex: number
  reason: string
  raw: Record<string, unknown>
}
type DuplicateImportRow = {
  sourceIndex: number
  alias: string
  reason: string
  existing?: AliasRow
}
type ImportPreview = {
  totalRows: number
  validRows: ImportCandidate[]
  invalidRows: InvalidImportRow[]
  duplicateRows: DuplicateImportRow[]
  importableRows: ImportCandidate[]
  productSlugRows: number
  generalRows: number
}

const categories = ['company', 'product', 'price', 'sales_rule', 'service', 'technical', 'logistics', 'faq', 'response_template', 'prohibited', 'general']
const inputStyle = { width: '100%', boxSizing: 'border-box' as const, border: '1px solid rgba(15,23,42,.16)', borderRadius: 10, padding: '10px 11px', fontSize: 14 }
const labelStyle = { display: 'block', color: '#52606D', fontSize: 12, fontWeight: 600, marginBottom: 6 }
const cardStyle = { background: '#fff', border: '1px solid rgba(8,80,65,.12)', borderRadius: 16, padding: 20, boxShadow: '0 16px 40px rgba(8,80,65,.05)' }
const buttonStyle = { border: 0, borderRadius: 10, padding: '11px 16px', background: '#085041', color: '#fff', fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#085041', fontWeight: 700, cursor: 'pointer' }

function normalizeAliasKey(value: string) {
  return value.trim().toLocaleLowerCase('ka-GE')
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'კი', 'active'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'არა', 'inactive'].includes(normalized)) return false
  return fallback
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)

  const [headerRow, ...dataRows] = rows
  if (!headerRow) return []
  const headers = headerRow.map((header) => header.trim().replace(/^\uFEFF/, '').toLowerCase())
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function parseJsonLike(text: string, fileName: string) {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (fileName.toLowerCase().endsWith('.jsonl')) {
    return trimmed.split(/\r?\n/).map((line) => JSON.parse(line))
  }
  const parsed = JSON.parse(trimmed)
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.aliases)) return parsed.aliases
  if (Array.isArray(parsed.rows)) return parsed.rows
  if (Array.isArray(parsed.items)) return parsed.items
  return [parsed]
}

function toImportCandidate(raw: Record<string, unknown>, sourceIndex: number) {
  return {
    sourceIndex,
    alias: cleanText(raw.alias),
    canonical_term: cleanText(raw.canonical_term ?? raw.canonicalTerm),
    product_slug: cleanText(raw.product_slug ?? raw.productSlug) || null,
    sourceActive: parseBoolean(raw.is_active ?? raw.isActive ?? raw.active, false),
  }
}

function buildImportPreview(rawRows: Record<string, unknown>[], existingAliases: AliasRow[], updateExisting: boolean): ImportPreview {
  const invalidRows: InvalidImportRow[] = []
  const duplicateRows: DuplicateImportRow[] = []
  const validRows: ImportCandidate[] = []
  const importableRows: ImportCandidate[] = []
  const existingByAlias = new Map(existingAliases.map((row) => [normalizeAliasKey(row.alias), row]))
  const seenInFile = new Set<string>()

  rawRows.forEach((raw, index) => {
    const candidate = toImportCandidate(raw, index + 2)
    const key = normalizeAliasKey(candidate.alias)

    if (!candidate.alias || !candidate.canonical_term) {
      invalidRows.push({ sourceIndex: candidate.sourceIndex, reason: 'alias and canonical_term are required', raw })
      return
    }

    if (seenInFile.has(key)) {
      duplicateRows.push({ sourceIndex: candidate.sourceIndex, alias: candidate.alias, reason: 'duplicate inside import file' })
      return
    }

    seenInFile.add(key)
    validRows.push(candidate)

    const existing = existingByAlias.get(key)
    if (existing) {
      duplicateRows.push({ sourceIndex: candidate.sourceIndex, alias: candidate.alias, reason: 'alias already exists', existing })
      if (!updateExisting) return
    }

    importableRows.push(candidate)
  })

  return {
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    duplicateRows,
    importableRows,
    productSlugRows: validRows.filter((row) => row.product_slug).length,
    generalRows: validRows.filter((row) => !row.product_slug).length,
  }
}

export default function AiKnowledgePage() {
  const { loading, error, profile } = useWarrantyAdminGate()
  const [items, setItems] = useState<Item[]>([])
  const [editing, setEditing] = useState<Item | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [aliases, setAliases] = useState('')
  const [category, setCategory] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [priority, setPriority] = useState('0')
  const [strictAnswer, setStrictAnswer] = useState(false)
  const [active, setActive] = useState(true)
  const [sourceType, setSourceType] = useState('admin')
  const [sourceRef, setSourceRef] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [aliasRows, setAliasRows] = useState<AliasRow[]>([])
  const [selectedAliasIds, setSelectedAliasIds] = useState<string[]>([])
  const [aliasSearch, setAliasSearch] = useState('')
  const [editingAlias, setEditingAlias] = useState<AliasRow | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [activateImportedAliases, setActivateImportedAliases] = useState(false)
  const [updateExistingAliases, setUpdateExistingAliases] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [dbError, setDbError] = useState('')

  async function loadItems() {
    const { data, error: loadError } = await supabase.from('ai_knowledge_items').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false })
    if (loadError) setDbError(loadError.message)
    else setItems((data || []) as Item[])
  }

  async function loadAliases() {
    const { data, error: loadError } = await supabase
      .from('ai_knowledge_aliases')
      .select('id, alias, canonical_term, product_slug, knowledge_item_id, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(2000)
    if (loadError) setDbError(loadError.message)
    else setAliasRows((data || []) as AliasRow[])
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return
    void loadItems()
    void loadAliases()
    const channel = supabase
      .channel('ai-knowledge-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_knowledge_items' }, () => void loadItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_knowledge_aliases' }, () => void loadAliases())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  function resetForm() {
    setEditing(null); setAliases(''); setCategory('general'); setTitle(''); setContent(''); setProductSlug(''); setPriority('0'); setStrictAnswer(false); setActive(true); setSourceType('admin'); setSourceRef(''); setStatus('ACTIVE'); setValidFrom(''); setValidUntil('')
  }

  async function editItem(item: Item) {
    setEditing(item); setCategory(item.category || 'general'); setTitle(item.title || ''); setContent(item.content || ''); setProductSlug(item.product_slug || ''); setPriority(String(item.priority ?? 0)); setStrictAnswer(Boolean(item.strict_answer)); setActive(item.active !== false); setSourceType(item.source_type || 'admin'); setSourceRef(item.source_ref || ''); setStatus(item.status || 'ACTIVE'); setValidFrom(item.valid_from ? String(item.valid_from).slice(0, 10) : ''); setValidUntil(item.valid_until ? String(item.valid_until).slice(0, 10) : '')
    const { data } = await supabase.from('ai_knowledge_aliases').select('alias').eq('knowledge_item_id', item.id)
    setAliases(((data || []) as Array<{ alias: string | null }>).map((row) => row.alias).filter(Boolean).join(', '))
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setDbError('')
    const payload = { category, title: title.trim(), content: content.trim(), product_slug: productSlug.trim() || null, priority: Number(priority) || 0, strict_answer: strictAnswer, active, source_type: sourceType.trim() || 'admin', source_ref: sourceRef.trim() || null, status, valid_from: validFrom || null, valid_until: validUntil || null, created_by: profile?.id }
    const result = editing ? await supabase.from('ai_knowledge_items').update(payload).eq('id', editing.id).select().single() : await supabase.from('ai_knowledge_items').insert(payload).select().single()
    if (result.error || !result.data) { setDbError(result.error?.message || 'ცოდნის ჩანაწერი ვერ შეინახა.'); return }
    if (editing) await supabase.from('ai_knowledge_aliases').delete().eq('knowledge_item_id', result.data.id)
    const aliasRowsToSave = aliases.split(',').map(alias => alias.trim()).filter(Boolean).map(alias => ({ knowledge_item_id: result.data.id, alias, canonical_term: result.data.title, product_slug: result.data.product_slug || null, is_active: result.data.active !== false }))
    if (aliasRowsToSave.length) {
      const aliasResult = await supabase.from('ai_knowledge_aliases').insert(aliasRowsToSave)
      if (aliasResult.error) { setDbError(aliasResult.error.message); return }
    }
    setMessage(editing ? 'ცოდნის ჩანაწერი განახლდა.' : 'ცოდნის ჩანაწერი დაემატა.')
    resetForm(); void loadItems(); void loadAliases()
  }

  async function toggleActive(item: Item) {
    const { error: updateError } = await supabase.from('ai_knowledge_items').update({ active: !item.active, status: item.active ? 'ARCHIVED' : 'ACTIVE' }).eq('id', item.id)
    if (updateError) setDbError(updateError.message); else void loadItems()
  }

  async function readImportFile(file: File) {
    const text = await file.text()
    const lowerName = file.name.toLowerCase()
    const rows = lowerName.endsWith('.csv') ? parseCsv(text) : parseJsonLike(text, file.name)
    return rows.filter((row: unknown): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
  }

  async function previewImport() {
    setMessage(''); setDbError('')
    if (!importFile) { setDbError('აირჩიეთ CSV, JSON ან JSONL ფაილი.'); return }
    try {
      const rows = await readImportFile(importFile)
      setImportPreview(buildImportPreview(rows, aliasRows, updateExistingAliases))
    } catch (caught) {
      setImportPreview(null)
      setDbError(caught instanceof Error ? caught.message : 'ფაილის წაკითხვა ვერ მოხერხდა.')
    }
  }

  function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImportFile(event.target.files?.[0] || null)
    setImportPreview(null)
    setMessage('')
    setDbError('')
  }

  async function importAliases() {
    if (!importPreview) { setDbError('ჯერ Preview Import გაუშვით.'); return }
    setImporting(true); setMessage(''); setDbError('')
    try {
      const existingByAlias = new Map(aliasRows.map((row) => [normalizeAliasKey(row.alias), row]))
      let inserted = 0
      let updated = 0
      const rowsToInsert: Array<Omit<AliasRow, 'id' | 'created_at'>> = []

      for (const row of importPreview.importableRows) {
        const payload = {
          alias: row.alias,
          canonical_term: row.canonical_term,
          product_slug: row.product_slug,
          knowledge_item_id: null,
          is_active: activateImportedAliases ? true : false,
        }
        const existing = existingByAlias.get(normalizeAliasKey(row.alias))
        if (existing && updateExistingAliases) {
          const { error: updateError } = await supabase.from('ai_knowledge_aliases').update(payload).eq('id', existing.id)
          if (updateError) throw updateError
          updated += 1
        } else if (!existing) {
          rowsToInsert.push(payload)
        }
      }

      for (let index = 0; index < rowsToInsert.length; index += 100) {
        const batch = rowsToInsert.slice(index, index + 100)
        const { error: insertError } = await supabase.from('ai_knowledge_aliases').insert(batch)
        if (insertError) throw insertError
        inserted += batch.length
      }

      setMessage(`Import complete: inserted ${inserted}, updated ${updated}, skipped ${importPreview.duplicateRows.length - (updateExistingAliases ? updated : 0)} duplicates.`)
      setImportPreview(null)
      setImportFile(null)
      setSelectedAliasIds([])
      void loadAliases()
    } catch (caught) {
      setDbError(caught instanceof Error ? caught.message : 'Alias import ვერ შესრულდა.')
    } finally {
      setImporting(false)
    }
  }

  async function toggleAlias(alias: AliasRow) {
    const { error: updateError } = await supabase.from('ai_knowledge_aliases').update({ is_active: !alias.is_active }).eq('id', alias.id)
    if (updateError) setDbError(updateError.message); else void loadAliases()
  }

  async function saveAliasEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingAlias) return
    const payload = {
      alias: editingAlias.alias.trim(),
      canonical_term: editingAlias.canonical_term.trim(),
      product_slug: editingAlias.product_slug?.trim() || null,
      is_active: editingAlias.is_active,
    }
    if (!payload.alias || !payload.canonical_term) { setDbError('Alias და canonical term აუცილებელია.'); return }
    const { error: updateError } = await supabase.from('ai_knowledge_aliases').update(payload).eq('id', editingAlias.id)
    if (updateError) { setDbError(updateError.message); return }
    setEditingAlias(null); setMessage('Alias განახლდა.'); void loadAliases()
  }

  async function deleteAlias(alias: AliasRow) {
    if (!window.confirm(`Delete alias "${alias.alias}"?`)) return
    const { error: deleteError } = await supabase.from('ai_knowledge_aliases').delete().eq('id', alias.id)
    if (deleteError) setDbError(deleteError.message)
    else { setMessage('Alias წაიშალა.'); setSelectedAliasIds(current => current.filter(id => id !== alias.id)); void loadAliases() }
  }

  async function bulkSetAliases(isActive: boolean) {
    if (!selectedAliasIds.length) return
    const { error: updateError } = await supabase.from('ai_knowledge_aliases').update({ is_active: isActive }).in('id', selectedAliasIds)
    if (updateError) setDbError(updateError.message)
    else { setMessage(`${selectedAliasIds.length} alias ${isActive ? 'activated' : 'deactivated'}.`); setSelectedAliasIds([]); void loadAliases() }
  }

  const visibleItems = items.filter(item => {
    const haystack = `${item.title || ''} ${item.content || ''} ${item.product_slug || ''} ${item.category || ''}`.toLowerCase()
    return (filterCategory === 'all' || item.category === filterCategory) && (!search.trim() || haystack.includes(search.trim().toLowerCase()))
  })

  const visibleAliases = useMemo(() => {
    const query = aliasSearch.trim().toLocaleLowerCase('ka-GE')
    if (!query) return aliasRows
    return aliasRows.filter((row) => `${row.alias} ${row.canonical_term} ${row.product_slug || ''}`.toLocaleLowerCase('ka-GE').includes(query))
  }, [aliasRows, aliasSearch])

  function toggleSelectedAlias(id: string) {
    setSelectedAliasIds((current) => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  if (loading) return <LoadingView label="AI ცოდნის ბაზა იტვირთება..." />
  if (error || !profile || profile.role !== 'admin') return <AuthBlockedView message={error || 'AI ცოდნის ბაზაზე წვდომა მხოლოდ admin-ს აქვს.'} />

  return (
    <main style={{ minHeight: '100vh', background: '#F5F5F0', padding: '24px 18px 48px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <Link href="/admin/ai" style={{ color: '#085041', fontSize: 13 }}>← AI Operator</Link>
          <h1 style={{ color: '#18212F', margin: '8px 0 4px', fontSize: 28 }}>AI Knowledge Base</h1>
          <p style={{ color: '#6B7280', margin: 0 }}>{AI_KNOWLEDGE_SCOPE} უცნობი ფაქტი: &quot;{AI_KNOWLEDGE_FALLBACK}&quot;</p>
        </header>

        <section style={{ ...cardStyle, display: 'grid', gap: 14, marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, color: '#18212F', fontSize: 18 }}>Doctor Language Decoder Import</h2>
            <p style={{ margin: '6px 0 0', color: '#52606D', fontSize: 13 }}>ექიმების სასაუბრო ტერმინების, არასწორი სახელებისა და პროდუქტის alias-ების იმპორტი.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) repeat(2, auto)', gap: 10, alignItems: 'center' }}>
            <input type="file" accept=".csv,.json,.jsonl,application/json,text/csv" onChange={onImportFileChange} style={inputStyle} />
            <button type="button" onClick={() => void previewImport()} style={secondaryButtonStyle}>Preview Import</button>
            <button type="button" onClick={() => void importAliases()} disabled={importing || !importPreview} style={{ ...buttonStyle, opacity: importing || !importPreview ? 0.55 : 1, cursor: importing || !importPreview ? 'wait' : 'pointer' }}>{importing ? 'Importing...' : 'Import'}</button>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: '#18212F', fontSize: 14 }}>
            <label><input type="checkbox" checked={activateImportedAliases} onChange={event => setActivateImportedAliases(event.target.checked)} /> Activate imported aliases</label>
            <label><input type="checkbox" checked={updateExistingAliases} onChange={event => { setUpdateExistingAliases(event.target.checked); setImportPreview(null) }} /> Update existing alias mappings</label>
          </div>
          {importPreview ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                {[
                  ['total rows', importPreview.totalRows],
                  ['valid rows', importPreview.validRows.length],
                  ['duplicates', importPreview.duplicateRows.length],
                  ['invalid rows', importPreview.invalidRows.length],
                  ['with product_slug', importPreview.productSlugRows],
                  ['without product_slug', importPreview.generalRows],
                ].map(([label, value]) => <div key={label} style={{ border: '1px solid rgba(8,80,65,.12)', borderRadius: 10, padding: 12, background: '#FAFAF8' }}><strong style={{ display: 'block', color: '#085041', fontSize: 20 }}>{value}</strong><span style={{ color: '#6B7280', fontSize: 12 }}>{label}</span></div>)}
              </div>
              {importPreview.duplicateRows.length ? <details><summary style={{ cursor: 'pointer', color: '#8A4B08', fontWeight: 700 }}>Duplicate rows ({importPreview.duplicateRows.length})</summary><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto', background: '#FFF7ED', padding: 12, borderRadius: 10 }}>{importPreview.duplicateRows.map(row => `row ${row.sourceIndex}: ${row.alias} - ${row.reason}`).join('\n')}</pre></details> : null}
              {importPreview.invalidRows.length ? <details><summary style={{ cursor: 'pointer', color: '#B42318', fontWeight: 700 }}>Invalid rows ({importPreview.invalidRows.length})</summary><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto', background: '#FEF2F2', padding: 12, borderRadius: 10 }}>{importPreview.invalidRows.map(row => `row ${row.sourceIndex}: ${row.reason}`).join('\n')}</pre></details> : null}
            </div>
          ) : null}
        </section>

        <section style={{ ...cardStyle, display: 'grid', gap: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, color: '#18212F', fontSize: 18 }}>Doctor Language Decoder Aliases</h2>
              <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: 13 }}>Alias rows stay separate from manual knowledge items.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => void bulkSetAliases(true)} disabled={!selectedAliasIds.length} style={secondaryButtonStyle}>Activate selected</button>
              <button type="button" onClick={() => void bulkSetAliases(false)} disabled={!selectedAliasIds.length} style={secondaryButtonStyle}>Deactivate selected</button>
            </div>
          </div>
          <input value={aliasSearch} onChange={event => setAliasSearch(event.target.value)} style={inputStyle} placeholder="Search alias, canonical term, product slug..." />
          {editingAlias ? (
            <form onSubmit={saveAliasEdit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: 12, borderRadius: 10, background: '#F8FAFC' }}>
              <input value={editingAlias.alias} onChange={event => setEditingAlias({ ...editingAlias, alias: event.target.value })} style={inputStyle} placeholder="Alias" />
              <input value={editingAlias.canonical_term} onChange={event => setEditingAlias({ ...editingAlias, canonical_term: event.target.value })} style={inputStyle} placeholder="Canonical term" />
              <input value={editingAlias.product_slug || ''} onChange={event => setEditingAlias({ ...editingAlias, product_slug: event.target.value || null })} style={inputStyle} placeholder="Product slug optional" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#18212F' }}><input type="checkbox" checked={editingAlias.is_active} onChange={event => setEditingAlias({ ...editingAlias, is_active: event.target.checked })} /> Active</label>
              <button type="submit" style={buttonStyle}>Save alias</button>
              <button type="button" onClick={() => setEditingAlias(null)} style={secondaryButtonStyle}>Cancel</button>
            </form>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#F8FAFC', color: '#52606D', fontSize: 12 }}><th style={{ padding: 10 }}></th><th style={{ padding: 10, textAlign: 'left' }}>Alias</th><th style={{ padding: 10, textAlign: 'left' }}>Canonical term</th><th style={{ padding: 10, textAlign: 'left' }}>Product slug</th><th style={{ padding: 10, textAlign: 'left' }}>Active</th><th style={{ padding: 10, textAlign: 'left' }}>Actions</th></tr></thead>
              <tbody>{visibleAliases.map(row => <tr key={row.id} style={{ borderTop: '1px solid #E5E7EB' }}><td style={{ padding: 10 }}><input type="checkbox" checked={selectedAliasIds.includes(row.id)} onChange={() => toggleSelectedAlias(row.id)} /></td><td style={{ padding: 10, fontWeight: 700 }}>{row.alias}</td><td style={{ padding: 10 }}>{row.canonical_term}</td><td style={{ padding: 10 }}>{row.product_slug || '—'}</td><td style={{ padding: 10 }}>{row.is_active ? 'Active' : 'Inactive'}</td><td style={{ padding: 10 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={() => void toggleAlias(row)} style={secondaryButtonStyle}>{row.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => setEditingAlias(row)} style={secondaryButtonStyle}>Edit</button><button type="button" onClick={() => void deleteAlias(row)} style={{ ...secondaryButtonStyle, color: '#B42318' }}>Delete</button></div></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <form onSubmit={saveItem} style={{ ...cardStyle, display: 'grid', gap: 14, marginBottom: 18 }}>
          <h2 style={{ margin: 0, color: '#18212F', fontSize: 18 }}>{editing ? 'რედაქტირება' : 'ახალი ჩანაწერი'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label style={labelStyle}>კატეგორია<select value={category} onChange={event => setCategory(event.target.value)} style={inputStyle}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
            <label style={labelStyle}>სათაური<input required value={title} onChange={event => setTitle(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Product slug<input value={productSlug} onChange={event => setProductSlug(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Priority<input type="number" value={priority} onChange={event => setPriority(event.target.value)} style={inputStyle} /></label>
          </div>
          <label style={labelStyle}>Content<textarea required value={content} onChange={event => setContent(event.target.value)} style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }} /></label>
          <label style={labelStyle}>Keywords / aliases<input value={aliases} onChange={event => setAliases(event.target.value)} style={inputStyle} placeholder="ფინსკანი, ფინ სკან, FinScan F350" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label style={labelStyle}>Source<input value={sourceType} onChange={event => setSourceType(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Source ref<input value={sourceRef} onChange={event => setSourceRef(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Status<select value={status} onChange={event => setStatus(event.target.value)} style={inputStyle}><option>DRAFT</option><option>ACTIVE</option><option>OUTDATED</option><option>ARCHIVED</option></select></label>
            <label style={labelStyle}>Valid from<input type="date" value={validFrom} onChange={event => setValidFrom(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Valid until<input type="date" value={validUntil} onChange={event => setValidUntil(event.target.value)} style={inputStyle} /></label>
          </div>
          <div style={{ display: 'flex', gap: 18, color: '#18212F', fontSize: 14 }}><label><input type="checkbox" checked={strictAnswer} onChange={event => setStrictAnswer(event.target.checked)} /> strict_answer</label><label><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} /> active</label></div>
          <div style={{ display: 'flex', gap: 10 }}><button type="submit" style={buttonStyle}>შენახვა</button>{editing ? <button type="button" onClick={resetForm} style={secondaryButtonStyle}>გაუქმება</button> : null}</div>
          {message ? <p style={{ color: '#085041', margin: 0 }}>{message}</p> : null}{dbError ? <p style={{ color: '#B42318', margin: 0 }}>{dbError}</p> : null}
        </form>

        <section style={cardStyle}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input aria-label="ცოდნის ძებნა" value={search} onChange={event => setSearch(event.target.value)} style={{ ...inputStyle, flex: '1 1 260px' }} placeholder="ძებნა სათაურით, ტექსტით, slug-ით" />
            <select aria-label="კატეგორიის ფილტრი" value={filterCategory} onChange={event => setFilterCategory(event.target.value)} style={{ ...inputStyle, width: 210 }}><option value="all">ყველა კატეგორია</option>{categories.map(item => <option key={item}>{item}</option>)}</select>
          </div>
          <h2 style={{ margin: '0 0 14px', color: '#18212F', fontSize: 18 }}>ჩანაწერები ({visibleItems.length}/{items.length})</h2>
          <div style={{ display: 'grid', gap: 10 }}>{visibleItems.map(item => <article key={item.id} style={{ border: '1px solid rgba(15,23,42,.1)', borderRadius: 10, padding: 12, opacity: item.active && item.status !== 'OUTDATED' ? 1 : .58 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{item.title}</strong><span style={{ color: item.status === 'OUTDATED' ? '#B42318' : '#52606D', fontSize: 12 }}>{item.status}{item.status === 'OUTDATED' ? ' · Knowledge item expired' : ''}</span></div><p style={{ margin: '7px 0', color: '#52606D', fontSize: 13 }}>{item.category} · priority {item.priority} · {item.source_type} · {item.product_slug || 'general'}</p><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.content}</p><div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button type="button" onClick={() => void editItem(item)} style={secondaryButtonStyle}>რედაქტირება</button><button type="button" onClick={() => void toggleActive(item)} style={secondaryButtonStyle}>{item.active ? 'Disable' : 'Enable'}</button></div></article>)}</div>
        </section>
      </div>
    </main>
  )
}
