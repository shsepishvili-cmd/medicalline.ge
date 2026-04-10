'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = 'medicalline2026'

type Tab = 'dashboard' | 'users' | 'prices' | 'requests'

export default function AdminPage() {
  const [auth, setAuth] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (auth) {
      loadAll()
    }
  }, [auth])

  async function loadAll() {
    const [u, p, r] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*, prices(*)').order('sort_order'),
      supabase.from('requests').select('*, profiles(full_name,clinic_name,phone), products(name)').order('created_at', { ascending: false }),
    ])
    if (u.data) setUsers(u.data)
    if (p.data) setProducts(p.data)
    if (r.data) setRequests(r.data)
  }

  async function updatePrice(productId: string, price: number) {
    await supabase.from('prices').update({ price_gel: price }).eq('product_id', productId)
    setSaved(productId)
    setTimeout(() => setSaved(null), 2000)
    loadAll()
  }

  async function updateUserStatus(id: string, status: string) {
    await supabase.from('profiles').update({ status }).eq('id', id)
    loadAll()
  }

  async function updateRequestStatus(id: string, status: string) {
    await supabase.from('requests').update({ status }).eq('id', id)
    loadAll()
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 320, border: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: '#085041', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🦷</div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#1a1a1a' }}>Medical Line Admin</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>შედი ადმინ პანელში</p>
        </div>
        <input
          type="password"
          placeholder="პაროლი"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pw === ADMIN_PASSWORD && setAuth(true)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <button
          onClick={() => pw === ADMIN_PASSWORD ? setAuth(true) : alert('პაროლი არასწორია')}
          style={{ width: '100%', background: '#085041', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
          შესვლა
        </button>
      </div>
    </div>
  )

  const newReqs = requests.filter(r => r.status === 'new').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* SIDEBAR */}
      <div style={{ width: 200, background: '#085041', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>MedLine Admin</p>
          <p style={{ color: '#9FE1CB', fontSize: 11, marginTop: 2 }}>medicalline.ge</p>
        </div>
        {([
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'users', label: '👥 მომხმარებლები' },
          { id: 'prices', label: '💰 ფასები' },
          { id: 'requests', label: `📨 მოთხოვნები${newReqs > 0 ? ` (${newReqs})` : ''}` },
        ] as { id: Tab; label: string }[]).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: tab === item.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: tab === item.id ? '#fff' : '#9FE1CB', border: 'none', borderLeft: tab === item.id ? '3px solid #5DCAA5' : '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
            {item.label}
          </button>
        ))}
        <button onClick={() => setAuth(false)}
          style={{ marginTop: 'auto', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12 }}>
          გამოსვლა
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, background: '#f5f5f0', overflow: 'auto' }}>
        <div style={{ background: '#fff', padding: '14px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
            {tab === 'dashboard' ? 'Dashboard' : tab === 'users' ? 'მომხმარებლები' : tab === 'prices' ? 'ფასების მართვა' : 'მოთხოვნები'}
          </h2>
          <span style={{ fontSize: 12, color: '#888' }}>Medical Line Pro · {new Date().toLocaleDateString('ka-GE')}</span>
        </div>

        <div style={{ padding: 20 }}>

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { val: users.length, lab: 'მომხმარებელი' },
                  { val: newReqs, lab: 'ახალი მოთხოვნა' },
                  { val: products.length, lab: 'პროდუქტი' },
                  { val: requests.filter(r => r.status === 'done').length, lab: 'დასრულებული' },
                ].map(s => (
                  <div key={s.lab} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <p style={{ fontSize: 28, fontWeight: 500, color: '#085041' }}>{s.val}</p>
                    <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.lab}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>ბოლო მოთხოვნები</span>
                  <button onClick={() => setTab('requests')} style={{ fontSize: 12, color: '#085041', background: 'none', border: 'none', cursor: 'pointer' }}>ყველა →</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f8f8f6' }}>
                    {['პროდუქტი', 'ვინ', 'კლინიკა', 'ტიპი', 'სტატუსი'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {requests.slice(0, 5).map(r => (
                      <tr key={r.id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <td style={{ padding: '9px 14px' }}>{r.products?.name || '—'}</td>
                        <td style={{ padding: '9px 14px' }}>{r.profiles?.full_name || '—'}</td>
                        <td style={{ padding: '9px 14px', color: '#888' }}>{r.profiles?.clinic_name || '—'}</td>
                        <td style={{ padding: '9px 14px' }}>{r.type === 'price' ? 'ფასი' : r.type === 'demo' ? 'დემო' : r.type}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: r.status === 'new' ? '#E6F1FB' : r.status === 'done' ? '#E1F5EE' : '#FAEEDA', color: r.status === 'new' ? '#0C447C' : r.status === 'done' ? '#085041' : '#633806' }}>
                            {r.status === 'new' ? 'ახალი' : r.status === 'done' ? 'დასრულდა' : 'მიმდინარე'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8f8f6' }}>
                  {['სახელი', 'კლინიკა', 'ქალაქი', 'ტელეფონი', 'სტატუსი', 'მოქმედება'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 12 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: '10px 14px' }}>{u.clinic_name}</td>
                      <td style={{ padding: '10px 14px', color: '#888' }}>{u.city}</td>
                      <td style={{ padding: '10px 14px', color: '#888' }}>{u.phone}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: u.status === 'active' ? '#E1F5EE' : u.status === 'blocked' ? '#FCEBEB' : '#FAEEDA', color: u.status === 'active' ? '#085041' : u.status === 'blocked' ? '#791F1F' : '#633806' }}>
                          {u.status === 'active' ? 'აქტიური' : u.status === 'blocked' ? 'დაბლოკილი' : 'მოლოდინი'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {u.status !== 'blocked' ? (
                            <button onClick={() => updateUserStatus(u.id, 'blocked')}
                              style={{ fontSize: 11, padding: '4px 8px', background: '#FCEBEB', color: '#791F1F', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                              დაბლოკვა
                            </button>
                          ) : (
                            <button onClick={() => updateUserStatus(u.id, 'active')}
                              style={{ fontSize: 11, padding: '4px 8px', background: '#E1F5EE', color: '#085041', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                              გახსნა
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>მომხმარებელი არ არის</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PRICES */}
          {tab === 'prices' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {products.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 12, color: '#085041', fontWeight: 500 }}>{p.category_slug}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '4px 0 10px' }}>{p.name}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>₾</span>
                    <input
                      type="number"
                      defaultValue={p.prices?.[0]?.price_gel || 0}
                      id={`price-${p.id}`}
                      style={{ flex: 1, padding: '6px 8px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 13 }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(`price-${p.id}`) as HTMLInputElement
                        updatePrice(p.id, parseFloat(el.value))
                      }}
                      style={{ padding: '6px 10px', background: '#085041', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                      {saved === p.id ? '✓' : 'შენახვა'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {['ყველა', 'new', 'inprogress', 'done'].map(f => (
                  <button key={f} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', cursor: 'pointer' }}>
                    {f === 'ყველა' ? 'ყველა' : f === 'new' ? 'ახალი' : f === 'inprogress' ? 'მიმდინარე' : 'დასრულებული'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {requests.map(r => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: r.status === 'new' ? '#185FA5' : r.status === 'done' ? '#1D9E75' : '#BA7517', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{r.products?.name || '—'} — {r.type === 'price' ? 'ფასის მოთხოვნა' : r.type === 'demo' ? 'დემო' : r.type}</p>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.profiles?.full_name} · {r.profiles?.clinic_name} · {r.profiles?.phone}</p>
                    </div>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(r.created_at).toLocaleDateString('ka-GE')}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.status === 'new' && (
                        <button onClick={() => updateRequestStatus(r.id, 'inprogress')}
                          style={{ fontSize: 11, padding: '4px 8px', background: '#085041', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          მიღება
                        </button>
                      )}
                      {r.status === 'inprogress' && (
                        <button onClick={() => updateRequestStatus(r.id, 'done')}
                          style={{ fontSize: 11, padding: '4px 8px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          დასრულება
                        </button>
                      )}
                      {r.status === 'done' && (
                        <span style={{ fontSize: 11, color: '#1D9E75' }}>✓ დასრულდა</span>
                      )}
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>მოთხოვნა არ არის</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
