'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type EngineerProfile = {
  id: string
  full_name: string
  clinic_name: string
  city: string
  phone: string
  role: string
  status: string
}

type EngineerTicket = {
  id: string
  engineer_id: string | null
  status: string
  serial_number: string | null
  problem_desc: string
  created_at: string
  visit_date: string | null
  resolution: string | null
  client?: { full_name: string; clinic_name: string; phone: string; city: string }[] | null
  engineer?: { full_name: string; phone: string }[] | null
  products?: { name: string }[] | null
}

type ManualItem = {
  id: string
  title: string
  description: string | null
  url: string | null
  file_path: string | null
  mime_type: string | null
  audience: string
  tags: string[] | null
  created_at: string
  products?: { name: string }[] | null
}

const BRAND = '#085041'
const BRAND_LIGHT = '#E1F5EE'

export default function EngineerPage() {
  const [profile, setProfile] = useState<EngineerProfile | null>(null)
  const [tickets, setTickets] = useState<EngineerTicket[]>([])
  const [manuals, setManuals] = useState<ManualItem[]>([])
  const [manualSearch, setManualSearch] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  async function loadTickets(userId: string) {
    const { data, error: ticketError } = await supabase
      .from('service_tickets')
      .select('id, engineer_id, status, serial_number, problem_desc, created_at, visit_date, resolution, client:profiles!service_tickets_user_id_fkey(full_name,clinic_name,phone,city), engineer:profiles!service_tickets_engineer_id_fkey(full_name,phone), products(name)')
      .eq('engineer_id', userId)
      .order('created_at', { ascending: false })

    if (ticketError) {
      setError(ticketError.message)
      return
    }

    setTickets(data || [])
  }

  async function loadManuals() {
    const { data, error: manualError } = await supabase
      .from('academy_items')
      .select('id, title, description, url, file_path, mime_type, audience, tags, created_at, products(name)')
      .eq('type', 'manual')
      .eq('is_active', true)
      .in('audience', ['all', 'engineer'])
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (manualError) {
      setError(manualError.message)
      return
    }

    setManuals((data || []) as ManualItem[])
  }

  async function loadProfile(userId: string) {
    const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (profileError || !data) {
      setError('Engineer profile could not be loaded.')
      return
    }

    if (data.role !== 'engineer' && data.role !== 'dealer') {
      setError('This account does not have engineer access yet.')
      await supabase.auth.signOut()
      return
    }

    setProfile(data)
    setError('')
    loadTickets(userId)
    loadManuals()
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) loadProfile(session.user.id)
    })
  }, [])

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel(`engineer-live-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, () => {
        loadTickets(profile.id)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  async function login() {
    setLoading(true)
    setError('')
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (loginError || !data.user) {
      setError('Login failed. Check engineer account credentials.')
      return
    }

    loadProfile(data.user.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    setProfile(null)
    setTickets([])
  }

  async function updateTicket(ticketId: string, patch: Record<string, unknown>, message: string) {
    setLoading(true)
    const { error: updateError } = await supabase.from('service_tickets').update(patch).eq('id', ticketId)
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    if (profile) loadTickets(profile.id)
    showToast(message)
  }

  const openTickets = tickets.filter(ticket => ticket.status !== 'done').length
  const onRouteTickets = tickets.filter(ticket => ticket.status === 'assigned').length
  const inProgressTickets = tickets.filter(ticket => ticket.status === 'inprogress').length
  const assignedTickets = tickets.filter(ticket => ticket.status === 'assigned')
  const activeTickets = tickets.filter(ticket => ticket.status === 'new' || ticket.status === 'inprogress')
  const completedTickets = tickets.filter(ticket => ticket.status === 'done')
  const filteredManuals = manuals.filter((manual) => {
    const q = manualSearch.trim().toLowerCase()
    if (!q) return true

    return [manual.title, manual.description || '', manual.products?.[0]?.name || '', ...(manual.tags || [])]
      .some((value) => value.toLowerCase().includes(q))
  })

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#f6f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Georgia, serif' }}>
        {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: BRAND, color: '#fff', padding: '10px 18px', borderRadius: 24, fontSize: 13 }}>{toast}</div>}
        <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, padding: 24, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 58, height: 58, background: BRAND, borderRadius: 16, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>🔧</div>
            <h1 style={{ fontSize: 20, margin: 0, color: '#1a1a1a' }}>Engineering Division</h1>
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>Mobile service workspace for assigned field engineers</p>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.16)', boxSizing: 'border-box', fontSize: 13, fontFamily: 'Georgia, serif' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.16)', boxSizing: 'border-box', fontSize: 13, fontFamily: 'Georgia, serif' }} />
          </div>
          <button onClick={login} disabled={loading} style={{ width: '100%', background: BRAND, color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            {loading ? 'იტვირთება...' : 'Engineering Login'}
          </button>
          {error && <p style={{ fontSize: 12, color: '#9f1239', margin: '10px 0 0', textAlign: 'center' }}>{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f1', fontFamily: 'Georgia, serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: BRAND, color: '#fff', padding: '10px 18px', borderRadius: 24, fontSize: 13, zIndex: 10 }}>{toast}</div>}
      <div style={{ background: BRAND, color: '#fff', padding: '18px 16px 16px', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{profile.full_name}</p>
            <p style={{ fontSize: 12, color: '#9FE1CB', margin: '4px 0 0' }}>Engineering Division · {profile.city}</p>
          </div>
          <button onClick={logout} style={{ border: '0.5px solid rgba(255,255,255,0.25)', background: 'transparent', color: '#fff', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12 }}>
            გამოსვლა
          </button>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Open', value: openTickets },
            { label: 'On Route', value: onRouteTickets },
            { label: 'Working', value: inProgressTickets },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 14, padding: '12px 10px', border: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: BRAND, margin: 0 }}>{item.value}</p>
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{item.label}</p>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 14, border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Engineering status board</p>
          <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>Assigned jobs, active field work and completed cases are separated here so the engineering division can work independently from admin.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 14, border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Manual Library</p>
              <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>Service manuals, wiring sheets and reference documents for field engineers.</p>
            </div>
            <div style={{ minWidth: 72, textAlign: 'center', background: BRAND_LIGHT, color: BRAND, borderRadius: 12, padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>
              {manuals.length} files
            </div>
          </div>

          <input
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            placeholder="Search manual, product, tag..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.14)', boxSizing: 'border-box', fontSize: 13, marginBottom: 10 }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredManuals.map((manual) => (
              <a
                key={manual.id}
                href={manual.url || '#'}
                target="_blank"
                rel="noreferrer"
                style={{ background: '#fafaf8', borderRadius: 14, padding: 12, textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.06)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{manual.title}</p>
                    <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>{manual.description || 'Service manual file'}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>
                      {manual.products?.[0]?.name || 'General'} {manual.mime_type ? `· ${manual.mime_type.replace('application/', '').toUpperCase()}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, background: '#E6F1FB', color: '#0C447C', fontWeight: 700 }}>
                    Open
                  </span>
                </div>
              </a>
            ))}

            {filteredManuals.length === 0 && (
              <div style={{ background: '#fafaf8', borderRadius: 14, padding: 14, color: '#888', fontSize: 12 }}>
                No manuals found yet. Upload the first service manual from admin.
              </div>
            )}
          </div>
        </div>

        {[
          { title: 'Today / On Route', items: assignedTickets },
          { title: 'Active Field Work', items: activeTickets },
          { title: 'Completed Cases', items: completedTickets },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: 0.6, margin: '0 0 8px' }}>{section.title}</p>
            {section.items.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '0.5px solid rgba(0,0,0,0.08)', color: '#888', fontSize: 12 }}>
                No items in this section.
              </div>
            )}
            {section.items.map(ticket => (
          <div key={ticket.id} style={{ background: '#fff', borderRadius: 16, padding: 14, border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{ticket.products?.[0]?.name || 'Service case'}</p>
                <p style={{ fontSize: 12, color: '#666', margin: '5px 0 0' }}>{ticket.client?.[0]?.clinic_name || 'Clinic'} · {ticket.client?.[0]?.city || 'City'}</p>
                <p style={{ fontSize: 12, color: '#666', margin: '3px 0 0' }}>{ticket.client?.[0]?.full_name || 'Doctor'} · {ticket.client?.[0]?.phone || '—'}</p>
              </div>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: ticket.status === 'done' ? BRAND_LIGHT : ticket.status === 'inprogress' ? '#E6F1FB' : '#FAEEDA', color: ticket.status === 'done' ? BRAND : ticket.status === 'inprogress' ? '#0C447C' : '#633806', fontWeight: 600 }}>
                {ticket.status}
              </span>
            </div>
            {ticket.serial_number && <p style={{ fontSize: 12, color: '#555', margin: '10px 0 0' }}>Serial: {ticket.serial_number}</p>}
            <p style={{ fontSize: 13, color: '#333', lineHeight: 1.55, margin: '10px 0 0' }}>{ticket.problem_desc}</p>
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: '#fafaf8' }}>
              <p style={{ fontSize: 11, color: '#777', margin: 0 }}>Planned visit</p>
              <p style={{ fontSize: 13, color: '#1a1a1a', margin: '4px 0 0' }}>{ticket.visit_date ? new Date(ticket.visit_date).toLocaleDateString('ka-GE') : 'Not scheduled yet'}</p>
            </div>
            <textarea
              id={`engineer-note-${ticket.id}`}
              defaultValue={ticket.resolution || ''}
              placeholder="Write service note or resolution..."
              style={{ width: '100%', marginTop: 10, minHeight: 80, padding: '10px 12px', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.15)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'Georgia, serif', fontSize: 13 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
              <button onClick={() => updateTicket(ticket.id, { status: 'assigned' }, 'Marked as on route')} style={{ background: '#FAEEDA', color: '#633806', border: 'none', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                გზაში ვარ
              </button>
              <button onClick={() => updateTicket(ticket.id, { status: 'inprogress' }, 'Work started')} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                დაწყება
              </button>
              <button
                onClick={() => {
                  const noteInput = document.getElementById(`engineer-note-${ticket.id}`) as HTMLTextAreaElement | null
                  updateTicket(ticket.id, { status: 'done', resolution: noteInput?.value || 'Resolved by engineer' }, 'Ticket completed')
                }}
                style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                დასრულდა
              </button>
            </div>
          </div>
            ))}
          </div>
        ))}

        {tickets.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>No assigned tickets</p>
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>As soon as admin assigns a new visit, it will appear here automatically.</p>
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: '#9f1239', textAlign: 'center', marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  )
}
