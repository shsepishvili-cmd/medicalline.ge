'use client'
import { useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../lib/supabase-admin-browser'
import { supabase as sharedSupabase } from '../lib/supabase'
import { collapseDatabaseProducts, findCatalogProductByAny, findDatabaseProductMatch, inferBrand, localCatalogProducts, mapCategoryToSlug, specsArrayToRecord } from '../lib/catalogSync'

type Tab = 'dashboard' | 'analytics' | 'users' | 'communications' | 'prices' | 'requests' | 'service' | 'engineering'

function dedupeProductList<T extends { slug?: string; name?: string }>(list: T[]) {
  const seen = new Set<string>()
  return list.filter((item) => {
    const key = (item.slug || item.name || '').toString().trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function resolveRequestPrice(request: any, productList: any[]) {
  if (request?.type !== 'price') return null
  const direct = request?.products?.prices?.[0]
  if (direct?.price_gel) return direct
  const requestName = (request?.products?.name || '').toString().trim().toLowerCase()
  const requestSlug = (request?.products?.slug || '').toString().trim().toLowerCase()
  const requestMsg = (request?.message || '').toString().trim().toLowerCase()
  const matched = productList.find((product) => {
    const productName = (product?.name || '').toString().trim().toLowerCase()
    const productSlug = (product?.slug || '').toString().trim().toLowerCase()
    return (
      (requestSlug && productSlug === requestSlug) ||
      (requestName && productName === requestName) ||
      (requestMsg && (requestMsg.includes(productName) || requestMsg.includes(productSlug)))
    )
  })
  return matched?.prices?.[0] || null
}

export default function AdminPage() {
  // Never trust a sessionStorage flag as proof of admin access. Clinic and
  // admin use the same Supabase browser session, so the active user/role must
  // be verified again whenever this page opens.
  const [auth, setAuth] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [cartInvoiceRequests, setCartInvoiceRequests] = useState<any[]>([])
  const [cartInvoicePriceDrafts, setCartInvoicePriceDrafts] = useState<Record<string, Record<string, string>>>({})
  const [cartInvoiceBusyId, setCartInvoiceBusyId] = useState<string | null>(null)
  const [cartInvoiceNotice, setCartInvoiceNotice] = useState<string | null>(null)
  const [serviceTickets, setServiceTickets] = useState<any[]>([])
  const [analyticsSummary, setAnalyticsSummary] = useState<any>({ pages: [], blogs: [], totals: {} })
  const [manualItems, setManualItems] = useState<any[]>([])
  const [manualTitle, setManualTitle] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualAudience, setManualAudience] = useState<'all' | 'engineer' | 'doctor' | 'admin'>('engineer')
  const [manualProductId, setManualProductId] = useState('')
  const [manualTags, setManualTags] = useState('')
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastPriceSaveResult, setLastPriceSaveResult] = useState<string | null>(null)
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null)
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})
  const [requestFilter, setRequestFilter] = useState<'all' | 'new' | 'inprogress' | 'done'>('all')
  const [requestSearch, setRequestSearch] = useState('')
  const [userActionId, setUserActionId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [messageAudience, setMessageAudience] = useState<'active' | 'all' | 'doctor' | 'engineer' | 'selected'>('active')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return

    const channel = supabase
      .channel('admin-service-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, () => {
        loadAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_invoice_requests' }, () => {
        loadAll()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [auth])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id) {
        void loadAdminProfile(session.user.id)
        return
      }
      // One-time migration for browsers that logged into admin before the
      // dedicated admin storage key was introduced.
      const legacySession = (await sharedSupabase.auth.getSession()).data.session
      if (legacySession?.user?.id && legacySession.refresh_token) {
        const { data: legacyProfile } = await sharedSupabase.from('profiles').select('role, status').eq('id', legacySession.user.id).single()
        if (legacyProfile?.role === 'admin' && legacyProfile.status === 'active') {
          const { data: migrated } = await supabase.auth.setSession({ access_token: legacySession.access_token, refresh_token: legacySession.refresh_token })
          if (migrated.session?.user?.id) { void loadAdminProfile(migrated.session.user.id); return }
        }
      }
      setAuth(false)
      try { sessionStorage.removeItem('ml_admin_auth') } catch {}
    })
  }, [])

  useEffect(() => {
    if (!auth) return
    try { sessionStorage.setItem('ml_admin_auth', '1') } catch {}
    loadAll()
  }, [auth])

  async function loadAdminProfile(userId: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setAuth(false)
        try { sessionStorage.removeItem('ml_admin_auth') } catch {}
        setAuthError('Admin session could not be loaded.')
        return
      }

      const response = await fetch('/api/admin/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const payload = await response.json().catch(() => null)

      if (response.ok && payload?.ok) {
        setAuthError('')
        setAuth(true)
        return
      }

      // Fallback path: try reading profile directly if API is temporarily unavailable.
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!error && data?.role === 'admin') {
        setAuthError('')
        setAuth(true)
        return
      }

      setAuth(false)
      try { sessionStorage.removeItem('ml_admin_auth') } catch {}
      setAuthError(payload?.error || error?.message || 'Admin profile could not be loaded.')
    } catch (error) {
      setAuth(false)
      try { sessionStorage.removeItem('ml_admin_auth') } catch {}
      setAuthError(error instanceof Error ? error.message : 'Admin profile could not be loaded.')
    }
  }

  async function loadAll() {
    const [u, p, r, s, a, analytics] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*, prices(*)').order('sort_order'),
      supabase.from('requests').select('*, client:profiles!requests_user_id_fkey(full_name,clinic_name,phone), assignee:profiles!requests_assigned_to_fkey(full_name,phone), products(id, slug, name, prices(price_gel, installment_monthly, installment_months))').order('created_at', { ascending: false }),
      supabase.from('service_tickets').select('*, client:profiles!service_tickets_user_id_fkey(full_name,clinic_name,phone), engineer:profiles!service_tickets_engineer_id_fkey(full_name,phone), products(name)').order('created_at', { ascending: false }),
      supabase.from('academy_items').select('id, title, description, audience, mime_type, url, created_at, products(name)').eq('type', 'manual').order('created_at', { ascending: false }),
      fetch('/api/analytics/summary', { cache: 'no-store' }).then((response) => response.json()).catch(() => null),
    ])
    if (u.data) setUsers(u.data)
    if (p.data) {
      const canonicalDbProducts = collapseDatabaseProducts(p.data)
      const matchedIds = new Set<string>()
      const mergedProducts = localCatalogProducts.map((item) => {
        const dbMatch = findDatabaseProductMatch(canonicalDbProducts, item)

        if (dbMatch?.id) matchedIds.add(dbMatch.id)

        return {
          id: dbMatch?.id || `catalog-${item.slug}`,
          dbId: dbMatch?.id || null,
          slug: dbMatch?.slug || item.slug,
          name: dbMatch?.name || item.name,
          category_slug: dbMatch?.category_slug || mapCategoryToSlug(item.cat),
          brand: dbMatch?.brand || inferBrand(item),
          short_desc: dbMatch?.short_desc || item.description,
          specs: Object.keys(dbMatch?.specs || {}).length ? dbMatch.specs : specsArrayToRecord(item.specs),
          images: dbMatch?.images?.length ? dbMatch.images : [item.img],
          prices: dbMatch?.prices || [],
          catalogSource: item,
        }
      })

      const dbOnlyProducts = canonicalDbProducts
        .filter((item: any) => !matchedIds.has(item.id))
        .map((item: any) => ({ ...item, dbId: item.id, catalogSource: findCatalogProductByAny(item) }))
        .filter((item: any) => !item.catalogSource)

      const nextProducts = dedupeProductList([...mergedProducts, ...dbOnlyProducts])
      setProducts(nextProducts)
      setPriceDrafts((prev) => {
        const next = { ...prev }
        nextProducts.forEach((product: any) => {
          const key = product.dbId || product.id
          if (next[key] === undefined) next[key] = String(product.prices?.[0]?.price_gel || '')
        })
        return next
      })
    }
    if (r.data) setRequests(r.data)
    if (s.data) setServiceTickets(s.data)
    if (a.data) setManualItems(a.data)
    if (analytics?.ok) setAnalyticsSummary(analytics)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const response = await fetch('/api/admin/cart-invoice-requests', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (response.ok && payload?.ok) setCartInvoiceRequests(payload.requests || [])
      }
    } catch {}
  }

  async function loginAsAdmin() {
    setAuthError('')
    setAuthNotice('')
    if (!adminEmail.trim() || !adminPassword) {
      setAuthError('შეიყვანეთ ადმინის ელფოსტა და პაროლი.')
      return
    }
    setAuthLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    if (error || !data.user) {
      setAuthLoading(false)
      setAuthError(error?.message === 'Invalid login credentials' ? 'ელფოსტა ან პაროლი არასწორია.' : error?.message || 'ადმინში შესვლა ვერ მოხერხდა.')
      return
    }

    await loadAdminProfile(data.user.id)
    setAuthLoading(false)
  }

  async function resetAdminPassword() {
    setAuthError('')
    setAuthNotice('')
    if (!adminEmail.trim() || !/^\S+@\S+\.\S+$/.test(adminEmail.trim())) {
      setAuthError('ჯერ მიუთითეთ სწორი ადმინის ელფოსტა.')
      return
    }
    setAuthLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(adminEmail.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthNotice('თუ ეს ანგარიში არსებობს, პაროლის აღდგენის ბმული ელფოსტაზე გაიგზავნა. შეამოწმეთ Inbox და Spam.')
  }

  async function logoutAdmin() {
    await supabase.auth.signOut()
    setAuth(false)
    try { sessionStorage.removeItem('ml_admin_auth') } catch {}
    setAdminEmail('')
    setAdminPassword('')
  }

  async function ensureProductRecord(product: any) {
    if (product.dbId) return product.dbId

    const source = product.catalogSource || findCatalogProductByAny(product)
    if (!source) return null

    const payload = {
      slug: source.slug,
      name: source.name,
      category_slug: mapCategoryToSlug(source.cat),
      brand: inferBrand(source),
      short_desc: source.description,
      specs: specsArrayToRecord(source.specs),
      images: [source.img],
      is_active: true,
      sort_order: source.id,
    }

    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'slug' })
      .select('id')
      .single()

    if (error || !data?.id) {
      setSaveError(error?.message || 'პროდუქტის ბაზაში დამატება ვერ მოხერხდა')
      return null
    }

    return data.id
  }

  async function updatePrice(product: any, price: number) {
    setSaveError(null)
    setLastPriceSaveResult(null)
    if (!Number.isFinite(price) || price < 0) {
      setSaveError('ფასი სწორად ჩაწერე.')
      return
    }

    const draftKey = product.dbId || product.id
    setSavingPriceId(draftKey)
    const baseMonthly = Math.round(price / 12)
    const note = 'განვადება Credo-ს გავლით'
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        const message = 'ადმინის სესია ვერ მოიძებნა. თავიდან შედი admin-ში.'
        setSaveError(message)
        setLastPriceSaveResult(message)
        alert(message)
        return
      }

      const response = await fetch('/api/admin/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          product: {
            id: product.id,
            dbId: product.dbId,
            slug: product.slug,
            name: product.name,
            category_slug: product.category_slug,
            brand: product.brand,
            short_desc: product.short_desc,
            specs: product.specs || {},
            images: product.images || [],
            sort_order: product.catalogSource?.id || product.sort_order || 9999,
          },
          price,
          installmentMonths: 12,
          note,
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) {
        const message = result?.error || `ფასი ვერ შეინახა. HTTP ${response.status}`
        const details = result?.code ? `${message} (${result.code})` : message
        setSaveError(details)
        setLastPriceSaveResult(`ვერ შეინახა: HTTP ${response.status} · ${details}`)
        alert(`ფასი ვერ შეინახა: ${details}`)
        return
      }

      const productId = result.productId || product.dbId || product.id
      setProducts((prev) => prev.map((item) => {
        if (item.id !== product.id && item.dbId !== productId) return item
        return {
          ...item,
          dbId: productId,
          prices: [{
            price_gel: price,
            installment_monthly: baseMonthly,
            installment_months: 12,
            note,
          }],
        }
      }))
      setPriceDrafts((prev) => ({ ...prev, [productId]: String(price), [product.id]: String(price) }))
      setLastPriceSaveResult(`შენახულია: ${product.name} · ₾${price.toLocaleString('ka-GE')}`)
      setSaved(productId)
      setTimeout(() => setSaved(null), 2000)
      loadAll()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'უცნობი ქსელის შეცდომა'
      setSaveError(message)
      setLastPriceSaveResult(`ვერ შეინახა: ${message}`)
      alert(`ფასი ვერ შეინახა: ${message}`)
    } finally {
      setSavingPriceId(null)
    }
  }

  async function updateUserStatus(id: string, status: string) {
    await supabase.from('profiles').update({ status }).eq('id', id)
    loadAll()
  }

  async function updateUserRole(id: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) {
      setSaveError(error.message)
      return
    }
    setSaveError(null)
    loadAll()
  }

  async function manageUser(id: string, action: 'reset-password' | 'delete') {
    const user = users.find((item) => item.id === id)
    const label = user?.full_name || user?.clinic_name || 'მომხმარებელი'
    if (action === 'delete' && !window.confirm(`ნამდვილად გსურთ „${label}“-ის ანგარიშის წაშლა? ეს მოქმედება შეუქცევადია.`)) return
    if (action === 'reset-password' && !window.confirm(`გაიგზავნოს პაროლის აღდგენის ბმული მომხმარებელთან „${label}“?`)) return

    setUserActionId(id)
    setSaveError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('ადმინისტრატორის სესია ვერ მოიძებნა.')
      const response = await fetch(`/api/admin/users/${id}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: action === 'delete' ? undefined : JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'მოქმედება ვერ შესრულდა.')
      alert(action === 'delete' ? 'მომხმარებლის ანგარიში წაიშალა.' : (payload?.message || 'პაროლის აღდგენის ბმული გაიგზავნა.'))
      await loadAll()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'მოქმედება ვერ შესრულდა.'
      setSaveError(message)
      alert(message)
    } finally {
      setUserActionId(null)
    }
  }

  function recipientsForAudience() {
    const withPhone = users.filter((user) => Boolean(user.phone?.trim()) && user.status !== 'blocked')
    if (messageAudience === 'selected') return withPhone.filter((user) => selectedUserIds.includes(user.id))
    if (messageAudience === 'all') return withPhone
    if (messageAudience === 'active') return withPhone.filter((user) => user.status === 'active')
    return withPhone.filter((user) => user.role === messageAudience && user.status === 'active')
  }

  async function sendUserSms(userIds?: string[]) {
    const recipients = userIds
      ? users.filter((user) => userIds.includes(user.id) && Boolean(user.phone?.trim()) && user.status !== 'blocked')
      : recipientsForAudience()
    const message = smsMessage.trim()
    if (!message) { setSaveError('შეიყვანეთ SMS შეტყობინების ტექსტი.'); return }
    if (recipients.length === 0) { setSaveError('SMS-ის მისაღებად მომხმარებელი არ არის არჩეული.'); return }
    if (!window.confirm(`გაიგზავნოს SMS ${recipients.length} მომხმარებელთან?`)) return

    setSmsSending(true)
    setSmsResult(null)
    setSaveError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('ადმინისტრატორის სესია ვერ მოიძებნა.')
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: recipients.map((user) => user.id), message }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'SMS დაგზავნა ვერ შესრულდა.')
      setSmsResult(`გაიგზავნა: ${payload.sent} · ვერ გაიგზავნა: ${payload.failed}`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'SMS დაგზავნა ვერ შესრულდა.')
    } finally {
      setSmsSending(false)
      setUserActionId(null)
    }
  }

  async function sendSmsToUser(user: any) {
    const message = window.prompt(`${user.full_name || user.clinic_name || 'მომხმარებელი'} — SMS ტექსტი:`)
    if (!message?.trim()) return
    setSmsMessage(message.trim())
    setUserActionId(user.id)
    const previousMessage = smsMessage
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('ადმინისტრატორის სესია ვერ მოიძებნა.')
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [user.id], message: message.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'SMS ვერ გაიგზავნა.')
      alert('SMS წარმატებით გაიგზავნა.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'SMS ვერ გაიგზავნა.')
    } finally {
      setSmsMessage(previousMessage)
      setUserActionId(null)
    }
  }

  async function updateRequestStatus(id: string, status: string) {
    await supabase.from('requests').update({ status }).eq('id', id)
    loadAll()
  }

  async function updateCartInvoiceRequestStatus(id: string, status: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('ადმინისტრატორის სესია ვერ მოიძებნა.')
      const response = await fetch('/api/admin/cart-invoice-requests', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'სტატუსი ვერ შეიცვალა.')
      loadAll()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'სტატუსი ვერ შეიცვალა.')
    }
  }

  function cartItemKey(item: any) {
    return String(item?.id || item?.product_slug || item?.product_name || '')
  }

  function suggestedCartItemPrice(item: any) {
    const slug = String(item?.product_slug || '').trim().toLowerCase()
    const name = String(item?.product_name || '').trim().toLowerCase()
    const matched = products.find((product: any) => {
      const productSlug = String(product?.slug || '').trim().toLowerCase()
      const productName = String(product?.name || '').trim().toLowerCase()
      return (slug && productSlug === slug) || (name && productName === name)
    })
    const price = matched?.prices?.[0]?.price_gel
    return price ? String(price) : ''
  }

  function cartInvoicePriceValue(requestId: string, item: any) {
    const key = cartItemKey(item)
    const draftValue = cartInvoicePriceDrafts[requestId]?.[key]
    return draftValue !== undefined ? draftValue : suggestedCartItemPrice(item)
  }

  function updateCartInvoicePrice(requestId: string, item: any, value: string) {
    const key = cartItemKey(item)
    setCartInvoicePriceDrafts((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || {}),
        [key]: value,
      },
    }))
  }

  function parsePrice(value: string) {
    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  function money(value: number, currency = 'GEL') {
    return `${Number(value || 0).toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  function addDaysIso(days: number) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
  }

  function cartInvoiceTotal(request: any) {
    return (request.items || []).reduce((sum: number, item: any) => {
      const quantity = Math.max(1, Number(item.quantity) || 1)
      return sum + parsePrice(cartInvoicePriceValue(request.id, item)) * quantity
    }, 0)
  }

  async function createInvoiceFromCartRequest(request: any, channel: 'email' | 'sms' | 'whatsapp' | 'link' = 'email') {
    setSaveError(null)
    setCartInvoiceNotice(null)
    const items = (request.items || []).map((item: any) => {
      const quantity = Math.max(1, Number(item.quantity) || 1)
      const unitPrice = parsePrice(cartInvoicePriceValue(request.id, item))
      return {
        item,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      }
    })

    if (!items.length) {
      setSaveError('ამ მოთხოვნაში პროდუქტი არ ჩანს.')
      return
    }
    if (items.some((row: any) => row.unitPrice <= 0)) {
      setSaveError('ჯერ ყველა პროდუქტს ჩაუწერე ფასი.')
      return
    }

    setCartInvoiceBusyId(request.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('ადმინისტრატორის სესია ვერ მოიძებნა.')

      const today = new Date().toISOString().slice(0, 10)
      const draftItems = items.map((row: any) => ({
        product_id: null,
        product_query: row.item.product_slug || row.item.product_name,
        product_name: row.item.product_name,
        description: row.item.product_category || '',
        product_code: row.item.product_slug || null,
        unit: 'ცალი',
        quantity: row.quantity,
        unit_price: row.unitPrice,
        discount: 0,
        line_total: row.lineTotal,
        standard_price: null,
        match_warning: null,
      }))

      const draft = {
        customer_id: null,
        customer_query: request.clinic_name || request.full_name,
        customer_name: request.clinic_name || request.full_name,
        customer_tax_id: request.tax_id || '',
        customer_address: request.city || '',
        customer_email: request.email || '',
        customer_phone: request.phone || '',
        invoice_date: today,
        delivery_date: null,
        due_date: addDaysIso(7),
        currency: 'GEL',
        vat_mode: 'vat_included',
        items: draftItems,
        notes: [
          `კალათის მოთხოვნა: ${request.id}`,
          request.comment ? `კომენტარი: ${request.comment}` : '',
          `კონტაქტი: ${request.full_name}, ${request.phone}, ${request.email}`,
        ].filter(Boolean).join('\n'),
        payment_terms: 'გადახდა ხორციელდება ინვოისის საფუძველზე. მიწოდების პირობები შეთანხმდება კლიენტთან.',
        requested_scanned_version: false,
        stamp_applied: true,
        signature_applied: true,
        warnings: [],
        questions: [],
      }

      const invoiceResponse = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          source_type: 'prompt',
          prompt: `კალათის ინვოისის მოთხოვნა ${request.id}`,
        }),
      })
      const invoicePayload = await invoiceResponse.json().catch(() => null)
      if (!invoiceResponse.ok || !invoicePayload?.ok) throw new Error(invoicePayload?.error || 'ინვოისი ვერ შეიქმნა.')

      const invoice = invoicePayload.invoice
      const shareResponse = await fetch(`/api/admin/invoices/${invoice.id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel === 'sms' ? 'sms' : 'link' }),
      })
      const sharePayload = await shareResponse.json().catch(() => null)
      if (!shareResponse.ok || !sharePayload?.ok) throw new Error(sharePayload?.error || 'გასაზიარებელი ლინკი ვერ შეიქმნა.')

      await fetch('/api/admin/cart-invoice-requests', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: 'invoice_sent' }),
      })

      if (sharePayload.shareUrl && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePayload.shareUrl).catch(() => undefined)
      }
      if (channel === 'email') {
        window.location.href = sharePayload.mailtoUrl
      } else if (channel === 'whatsapp') {
        window.open(sharePayload.whatsappUrl, '_blank', 'noopener,noreferrer')
      } else if (channel === 'link') {
        window.open(sharePayload.shareUrl, '_blank', 'noopener,noreferrer')
      }

      const channelLabel = channel === 'sms' ? 'SMS გაიგზავნა' : channel === 'whatsapp' ? 'WhatsApp ტექსტი გაიხსნა' : channel === 'link' ? 'ლინკი გაიხსნა და დაკოპირდა' : 'Email draft მომზადდა'
      setCartInvoiceNotice(`ინვოისი ${invoice.invoice_number} შეიქმნა. მოკლე ლინკი: ${sharePayload.shareUrl}. ${channelLabel}.`)
      await loadAll()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'ინვოისის შექმნა ვერ მოხერხდა.')
    } finally {
      setCartInvoiceBusyId(null)
    }
  }

  async function updateServiceTicket(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from('service_tickets').update(patch).eq('id', id)
    if (error) {
      setSaveError(error.message)
      return
    }
    setSaveError(null)
    loadAll()
  }

  async function uploadManual() {
    if (!manualTitle.trim() || !manualFile) {
      setSaveError('Manual title and file are required.')
      return
    }

    setSaveError(null)

    const ext = manualFile.name.includes('.') ? manualFile.name.split('.').pop() : 'pdf'
    const safeName = manualFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `manuals/${Date.now()}-${safeName || `manual.${ext}`}`

    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('service-manuals')
      .upload(path, manualFile, { upsert: true, contentType: manualFile.type || 'application/pdf' })

    if (uploadError || !uploaded?.path) {
      setSaveError(uploadError?.message || 'Manual upload failed.')
      return
    }

    const { data: publicFile } = supabase.storage.from('service-manuals').getPublicUrl(uploaded.path)

    const { error: insertError } = await supabase.from('academy_items').insert({
      type: 'manual',
      title: manualTitle.trim(),
      description: manualDescription.trim() || null,
      url: publicFile.publicUrl,
      file_path: uploaded.path,
      file_size_bytes: manualFile.size,
      mime_type: manualFile.type || 'application/pdf',
      product_id: manualProductId || null,
      audience: manualAudience,
      tags: manualTags.split(',').map(tag => tag.trim()).filter(Boolean),
      is_active: true,
      sort_order: 0,
    })

    if (insertError) {
      setSaveError(insertError.message)
      return
    }

    setManualTitle('')
    setManualDescription('')
    setManualAudience('engineer')
    setManualProductId('')
    setManualTags('')
    setManualFile(null)
    setSaved(`manual-${Date.now()}`)
    setTimeout(() => setSaved(null), 2000)
    loadAll()
  }

  const pendingUsers = users.filter(u => u.status === 'pending').length
  const blockedUsers = users.filter(u => u.status === 'blocked').length
  const newServiceTickets = serviceTickets.filter(ticket => ticket.status === 'new').length
  const newCartInvoiceRequests = cartInvoiceRequests.filter(request => request.status === 'new').length
  const engineerUsers = users.filter(user => user.role === 'engineer' || user.role === 'dealer')
  const engineeringDivision = users.filter(user => user.role === 'engineer' || user.role === 'dealer')
  const filteredRequests = requests.filter(r => {
    if (requestFilter !== 'all' && r.status !== requestFilter) return false
    if (!requestSearch.trim()) return true
    const query = requestSearch.toLowerCase()
    return [r.products?.name, r.client?.full_name, r.client?.clinic_name, r.client?.phone, r.type]
      .some(value => String(value || '').toLowerCase().includes(query))
  })

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 320, border: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: '#085041', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🦷</div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#1a1a1a' }}>Medical Line Admin</h1>
          <input
            type="email"
            placeholder="admin@medicalline.ge"
            value={adminEmail}
            onChange={e => setAdminEmail(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 14, marginTop: 12, marginBottom: 10, boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>შედი ადმინ პანელში</p>
        </div>
        <input
          type="password"
          placeholder="პაროლი"
          value={adminPassword}
          onChange={e => setAdminPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loginAsAdmin()}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <button
          onClick={loginAsAdmin}
          disabled={authLoading}
          style={{ width: '100%', background: '#085041', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
          {authLoading ? 'მოწმდება...' : 'Admin Login'}
        </button>
        <button type="button" onClick={resetAdminPassword} disabled={authLoading} style={{ width: '100%', border: 0, background: 'transparent', color: '#2563eb', padding: '11px 4px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>დაგავიწყდა პაროლი?</button>
        {authError && <p style={{ fontSize: 12, color: '#9f1239', textAlign: 'center', marginTop: 10 }}>{authError}</p>}
        {authNotice && <p style={{ fontSize: 12, lineHeight: 1.5, color: '#166534', background: '#dcfce7', borderRadius: 9, padding: 10, textAlign: 'center', marginTop: 10 }}>{authNotice}</p>}
      </div>
    </div>
  )

  const newReqs = requests.filter(r => r.status === 'new').length + newCartInvoiceRequests

  return (
    <div className="mla-shell" style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* PHONE TOP BAR: opens the menu below as a slide-out drawer */}
      <div className="mla-topbar" style={{ position: 'sticky', top: 0, zIndex: 900, alignItems: 'center', gap: 12, background: '#085041', color: '#fff', padding: 'calc(10px + env(safe-area-inset-top)) 14px 10px' }}>
        <button type="button" aria-label="მენიუ" onClick={() => setMenuOpen(true)} style={{ border: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 10, width: 42, height: 42, fontSize: 20, cursor: 'pointer' }}>☰</button>
        <strong style={{ fontSize: 15, fontWeight: 600 }}>MedLine Admin</strong>
      </div>
      <div className="mla-backdrop" data-open={menuOpen} onClick={() => setMenuOpen(false)} />
      {/* SIDEBAR */}
      <div className="mla-sidebar" data-open={menuOpen} onClickCapture={(event) => { if ((event.target as HTMLElement).closest('button')) setMenuOpen(false) }} style={{ width: 200, background: '#085041', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>MedLine Admin</p>
          <p style={{ color: '#9FE1CB', fontSize: 11, marginTop: 2 }}>medicalline.ge</p>
        </div>
        {([
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'analytics', label: '📈 Analytics' },
          { id: 'users', label: '👥 მომხმარებლები' },
          { id: 'communications', label: '💬 კომუნიკაციები' },
          { id: 'prices', label: '💰 ფასები' },
          { id: 'offers', label: '💳 განვადება' },
          { id: 'requests', label: `📨 მოთხოვნები${newReqs > 0 ? ` (${newReqs})` : ''}` },
          { id: 'service', label: `🔧 Service${newServiceTickets > 0 ? ` (${newServiceTickets})` : ''}` },
          { id: 'engineering', label: `⚙️ Engineering${engineeringDivision.length > 0 ? ` (${engineeringDivision.length})` : ''}` },
        ] as { id: Tab | 'offers'; label: string }[]).map(item => (
          <button key={item.id} onClick={() => item.id === 'offers' ? window.location.href = '/admin/offers' : setTab(item.id)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: tab === item.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: tab === item.id ? '#fff' : '#9FE1CB', border: 'none', borderLeft: tab === item.id ? '3px solid #5DCAA5' : '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
            {item.label}
          </button>
        ))}
        <button onClick={() => window.location.href = '/admin/clinic-offers'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          🏥 კლინიკის შეთავაზებები
        </button>
        <button onClick={() => window.location.href = '/admin/crm'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          🧲 CRM
        </button>
        <button onClick={() => window.location.href = '/admin/installments'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          💳 განვადებები
        </button>
        <button onClick={() => window.location.href = '/admin/expo2026'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          🎪 Expo 2026
        </button>
        <button onClick={() => window.location.href = '/admin/products'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          📦 პროდუქციის დამატება
        </button>
                <button onClick={() => window.location.href = '/admin/invoices/acceptance-acts'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          📋 მიღება-ჩაბარების აქტი
        </button>
<button onClick={() => window.location.href = '/admin/invoices/ai-generator'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          ✨ AI ინვოისები
        </button>
        <button onClick={() => window.location.href = '/admin/ai'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          🤖 AI Operator
        </button>
        <button onClick={() => window.location.href = '/admin/ai-calls'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          📞 AI ზარები
        </button>
        <button onClick={() => window.location.href = '/admin/ai-orders'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          🤖 AI Agent შეკვეთები
        </button>
        <button onClick={() => window.location.href = '/admin/ai-knowledge'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          🧠 AI ცოდნის ბაზა
        </button>
        <button onClick={() => window.location.href = '/admin/ai-corrections'}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
          ✅ AI შეცდომები
        </button>
        <button onClick={logoutAdmin}
          style={{ marginTop: 'auto', padding: '10px 16px', background: 'transparent', color: '#9FE1CB', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12 }}>
          გამოსვლა
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, background: '#f5f5f0', overflow: 'auto' }}>
        <div style={{ background: '#fff', padding: '14px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
            {tab === 'dashboard' ? 'Dashboard' : tab === 'analytics' ? 'Analytics' : tab === 'users' ? 'მომხმარებლები' : tab === 'communications' ? 'მომხმარებლებთან კომუნიკაცია' : tab === 'prices' ? 'ფასების მართვა' : tab === 'requests' ? 'მოთხოვნები' : tab === 'service' ? 'Service Dispatch' : 'Engineering Division'}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: '0 0 8px' }}>Needs Attention</p>
                  <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Pending approvals: <strong style={{ color: '#633806' }}>{pendingUsers}</strong></p>
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Blocked users: <strong style={{ color: '#791F1F' }}>{blockedUsers}</strong></p>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: '0 0 8px' }}>Quick Actions</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setTab('users')} style={{ fontSize: 12, padding: '6px 10px', background: '#FAEEDA', color: '#633806', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Users</button>
                    <button onClick={() => setTab('requests')} style={{ fontSize: 12, padding: '6px 10px', background: '#E6F1FB', color: '#0C447C', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Requests</button>
                    <button onClick={() => setTab('engineering')} style={{ fontSize: 12, padding: '6px 10px', background: '#E1F5EE', color: '#085041', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Engineering</button>
                    <button onClick={() => window.location.href = '/admin/offers'} style={{ fontSize: 12, padding: '6px 10px', background: '#ECFDF5', color: '#047857', border: '1px solid rgba(4,120,87,0.12)', borderRadius: 8, cursor: 'pointer' }}>განვადება</button>
                    <button onClick={() => window.location.href = '/admin/warranty'} style={{ fontSize: 12, padding: '6px 10px', background: '#EDF7F3', color: '#085041', border: '1px solid rgba(8,80,65,0.12)', borderRadius: 8, cursor: 'pointer' }}>გარანტიები</button>
                    <button onClick={() => window.location.href = '/admin/contracts'} style={{ fontSize: 12, padding: '6px 10px', background: '#EEF2FF', color: '#3730A3', border: '1px solid rgba(55,48,163,0.12)', borderRadius: 8, cursor: 'pointer' }}>ხელშეკრულებები</button>
                    <button onClick={() => window.location.href = '/admin/erp'} style={{ fontSize: 12, padding: '6px 10px', background: '#EAF3FB', color: '#1F5F99', border: '1px solid rgba(31,95,153,0.12)', borderRadius: 8, cursor: 'pointer' }}>ERP</button>
                    <button onClick={() => window.location.href = '/admin/imports'} style={{ fontSize: 12, padding: '6px 10px', background: '#E4F5F1', color: '#0B786D', border: '1px solid #B6E5DC', borderRadius: 8, cursor: 'pointer' }}>იმპორტები</button>
                    <button onClick={() => window.location.href = '/admin/crm'} style={{ fontSize: 12, padding: '6px 10px', background: '#FDE8EF', color: '#9D174D', border: '1px solid rgba(157,23,77,0.12)', borderRadius: 8, cursor: 'pointer' }}>CRM</button>
                    <button onClick={() => window.location.href = '/admin/installments'} style={{ fontSize: 12, padding: '6px 10px', background: '#FFEDF0', color: '#BB2E43', border: '1px solid rgba(187,46,67,0.12)', borderRadius: 8, cursor: 'pointer' }}>განვადებები</button>
                    <button onClick={() => window.location.href = '/invoice'} style={{ fontSize: 12, padding: '6px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid rgba(29,78,216,0.12)', borderRadius: 8, cursor: 'pointer' }}>ინვოისები</button>
                    <button onClick={() => window.location.href = '/admin/academy'} style={{ fontSize: 12, padding: '6px 10px', background: '#FFF7ED', color: '#9A3412', border: '1px solid rgba(154,52,18,0.12)', borderRadius: 8, cursor: 'pointer' }}>აკადემია</button>
                  </div>
                </div>
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
                        <td style={{ padding: '9px 14px' }}>{r.client?.full_name || '—'}</td>
                        <td style={{ padding: '9px 14px', color: '#888' }}>{r.client?.clinic_name || '—'}</td>
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

          {/* ANALYTICS */}
          {tab === 'analytics' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Top 20 გვერდის ნახვები', value: analyticsSummary.totals?.pageViews || 0 },
                  { label: 'Top 20 ბლოგის ნახვები', value: analyticsSummary.totals?.blogViews || 0 },
                  { label: 'დათვლილი ბლოგები', value: analyticsSummary.blogs?.length || 0 },
                ].map((item) => (
                  <div key={item.label} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <p style={{ fontSize: 26, fontWeight: 700, color: '#085041', margin: 0 }}>{Number(item.value).toLocaleString('ka-GE')}</p>
                    <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{item.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontSize: 13, fontWeight: 600 }}>ყველაზე ნანახი გვერდები</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {(analyticsSummary.pages || []).map((page: any) => (
                        <tr key={page.path} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                          <td style={{ padding: '10px 12px', color: '#1a1a1a' }}>{page.path}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#085041' }}>{Number(page.total_views || 0).toLocaleString('ka-GE')}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#888' }}>{Number(page.unique_visitors || 0).toLocaleString('ka-GE')} visitor</td>
                        </tr>
                      ))}
                      {(!analyticsSummary.pages || analyticsSummary.pages.length === 0) && (
                        <tr><td style={{ padding: 16, color: '#888' }}>მონაცემები ჯერ არ არის. SQL migration გაუშვით Supabase-ში.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontSize: 13, fontWeight: 600 }}>ყველაზე ნანახი ბლოგები</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {(analyticsSummary.blogs || []).map((blog: any) => (
                        <tr key={blog.slug} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                          <td style={{ padding: '10px 12px', color: '#1a1a1a' }}>/blog/{blog.slug}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#085041' }}>{Number(blog.total_views || 0).toLocaleString('ka-GE')}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#888' }}>{Number(blog.unique_visitors || 0).toLocaleString('ka-GE')} visitor</td>
                        </tr>
                      ))}
                      {(!analyticsSummary.blogs || analyticsSummary.blogs.length === 0) && (
                        <tr><td style={{ padding: 16, color: '#888' }}>ბლოგის ნახვები ჯერ არ დაფიქსირებულა.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {u.status === 'pending' && (
                            <button onClick={() => updateUserStatus(u.id, 'active')}
                              style={{ fontSize: 11, padding: '4px 8px', background: '#E1F5EE', color: '#085041', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                              დადასტურება
                            </button>
                          )}
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
                           <button onClick={() => manageUser(u.id, 'reset-password')} disabled={userActionId === u.id}
                             style={{ fontSize: 11, padding: '4px 8px', background: '#E6F1FB', color: '#0C447C', border: 'none', borderRadius: 6, cursor: userActionId === u.id ? 'wait' : 'pointer', opacity: userActionId === u.id ? 0.6 : 1 }}>
                             პაროლის აღდგენა
                           </button>
                           {u.role !== 'admin' && (
                             <button onClick={() => manageUser(u.id, 'delete')} disabled={userActionId === u.id}
                               style={{ fontSize: 11, padding: '4px 8px', background: '#fff', color: '#A32D2D', border: '1px solid #F3B8B8', borderRadius: 6, cursor: userActionId === u.id ? 'wait' : 'pointer', opacity: userActionId === u.id ? 0.6 : 1 }}>
                               წაშლა
                             </button>
                            )}
                            {u.phone && u.status !== 'blocked' && (
                              <button onClick={() => sendSmsToUser(u)} disabled={userActionId === u.id}
                                style={{ fontSize: 11, padding: '4px 8px', background: '#085041', color: '#fff', border: 'none', borderRadius: 6, cursor: userActionId === u.id ? 'wait' : 'pointer', opacity: userActionId === u.id ? 0.6 : 1 }}>
                                SMS
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

          {/* COMMUNICATIONS */}
          {tab === 'communications' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', padding: 18 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>SMS შეტყობინების გაგზავნა</h3>
                <p style={{ margin: '0 0 16px', color: '#667085', fontSize: 12 }}>აირჩიეთ აუდიტორია, შეიყვანეთ ტექსტი და გაგზავნამდე გადაამოწმეთ მიმღებების რაოდენობა.</p>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>აუდიტორია</label>
                <select value={messageAudience} onChange={(event) => setMessageAudience(event.target.value as any)} style={{ width: '100%', minHeight: 42, borderRadius: 8, border: '1px solid #d0d5dd', padding: '0 10px', marginBottom: 14 }}>
                  <option value="active">ყველა აქტიური მომხმარებელი</option>
                  <option value="doctor">აქტიური ექიმები</option>
                  <option value="engineer">აქტიური ინჟინრები</option>
                  <option value="selected">მხოლოდ მონიშნული მომხმარებლები</option>
                  <option value="all">ყველა დაუბლოკავი მომხმარებელი</option>
                </select>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SMS ტექსტი</label>
                <textarea value={smsMessage} onChange={(event) => setSmsMessage(event.target.value)} maxLength={480} rows={7} placeholder="მაგალითად: Medical Line Georgia გაცნობებთ ახალ პროდუქტს..." style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 8, border: '1px solid #d0d5dd', padding: 12, font: 'inherit', fontSize: 13 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, color: '#667085', fontSize: 11 }}>
                  <span>მიმღები: <strong>{recipientsForAudience().length}</strong></span>
                  <span>{smsMessage.length}/480</span>
                </div>
                {saveError && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#fff1f2', color: '#9f1239', fontSize: 12 }}>{saveError}</div>}
                {smsResult && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#ecfdf5', color: '#047857', fontSize: 12, fontWeight: 700 }}>{smsResult}</div>}
                <button onClick={() => sendUserSms()} disabled={smsSending || !smsMessage.trim() || recipientsForAudience().length === 0} style={{ marginTop: 14, minHeight: 42, border: 0, borderRadius: 8, padding: '0 16px', background: '#085041', color: '#fff', fontWeight: 700, cursor: smsSending ? 'wait' : 'pointer', opacity: smsSending || !smsMessage.trim() || recipientsForAudience().length === 0 ? 0.55 : 1 }}>
                  {smsSending ? 'იგზავნება...' : 'SMS-ის გაგზავნა'}
                </button>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', padding: 18, maxHeight: 620, overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>მომხმარებლების მონიშვნა</h3>
                  <button onClick={() => setSelectedUserIds(selectedUserIds.length === users.filter((user) => user.phone && user.status !== 'blocked').length ? [] : users.filter((user) => user.phone && user.status !== 'blocked').map((user) => user.id))} style={{ border: 0, background: 'transparent', color: '#0C447C', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>ყველას მონიშვნა</button>
                </div>
                {users.filter((user) => user.phone && user.status !== 'blocked').map((user) => (
                  <label key={user.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 0', borderTop: '1px solid #f0f1f3', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => setSelectedUserIds((current) => current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id])} />
                    <span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 12 }}>{user.full_name || user.clinic_name || 'უსახელო მომხმარებელი'}</strong><span style={{ display: 'block', color: '#667085', fontSize: 11 }}>{user.phone} · {user.role}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ENGINEERING */}
          {tab === 'engineering' && (
            <div>
              {saveError && (
                <div style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 12 }}>
                  {saveError}
                </div>
              )}
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Manual Upload Base</p>
                    <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>Upload service manuals for the engineering cabinet. Files are saved in Supabase Storage and indexed in `academy_items`.</p>
                  </div>
                  <div style={{ background: '#E1F5EE', color: '#085041', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>
                    {manualItems.length} manuals
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Manual title" style={{ padding: '9px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }} />
                  <select value={manualAudience} onChange={e => setManualAudience(e.target.value as any)} style={{ padding: '9px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }}>
                    <option value="engineer">Engineer only</option>
                    <option value="all">All users</option>
                    <option value="doctor">Doctors</option>
                    <option value="admin">Admin only</option>
                  </select>
                  <select value={manualProductId} onChange={e => setManualProductId(e.target.value)} style={{ padding: '9px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }}>
                    <option value="">General manual</option>
                    {products.filter(product => Boolean(product.dbId)).map((product) => (
                      <option key={product.dbId} value={product.dbId}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: 10, marginBottom: 12 }}>
                  <input value={manualDescription} onChange={e => setManualDescription(e.target.value)} placeholder="Short description" style={{ padding: '9px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }} />
                  <input value={manualTags} onChange={e => setManualTags(e.target.value)} placeholder="Tags: scanner, calibration" style={{ padding: '9px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }} />
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setManualFile(e.target.files?.[0] || null)} style={{ fontSize: 12 }} />
                </div>
                <button onClick={uploadManual} style={{ padding: '10px 14px', background: '#085041', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  {saved?.startsWith('manual-') ? 'Uploaded' : 'Upload manual'}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                  {manualItems.slice(0, 8).map((manual) => (
                    <div key={manual.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#fafaf8', borderRadius: 10, padding: '10px 12px', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{manual.title}</p>
                        <p style={{ fontSize: 11, color: '#777', margin: '4px 0 0' }}>{manual.products?.name || 'General'} · {manual.audience || 'all'}</p>
                      </div>
                      <a href={manual.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#085041', textDecoration: 'none', fontWeight: 600 }}>
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' }}>Engineering Division</p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Create a dedicated engineering team separate from admin. Assign service tickets only to field engineers and keep dispatch cleaner.</p>
                </div>
                <div style={{ background: '#eef7f4', borderRadius: 12, padding: '14px 16px', border: '1px solid #c7eadf' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#085041', margin: 0 }}>{engineeringDivision.length}</p>
                  <p style={{ fontSize: 12, color: '#085041', margin: '4px 0 0' }}>Active engineering members</p>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f8f8f6' }}>
                    {['Name', 'Clinic/Base', 'City', 'Phone', 'Current role', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{user.full_name}</td>
                        <td style={{ padding: '10px 14px' }}>{user.clinic_name || 'Medical Line'}</td>
                        <td style={{ padding: '10px 14px', color: '#888' }}>{user.city}</td>
                        <td style={{ padding: '10px 14px', color: '#888' }}>{user.phone}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: user.role === 'engineer' || user.role === 'dealer' ? '#E1F5EE' : '#F3F4F6', color: user.role === 'engineer' || user.role === 'dealer' ? '#085041' : '#4B5563', fontWeight: 600 }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => updateUserRole(user.id, 'engineer')} style={{ fontSize: 11, padding: '4px 8px', background: '#085041', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                              Make engineer
                            </button>
                            <button onClick={() => updateUserRole(user.id, 'dealer')} style={{ fontSize: 11, padding: '4px 8px', background: '#E6F1FB', color: '#0C447C', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                              Legacy dealer
                            </button>
                            <button onClick={() => updateUserRole(user.id, 'doctor')} style={{ fontSize: 11, padding: '4px 8px', background: '#FAEEDA', color: '#633806', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                              Doctor
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRICES */}
          {tab === 'prices' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {saveError && (
                <div style={{ gridColumn: '1 / -1', background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: 12, padding: 12, fontSize: 12 }}>
                  {saveError}
                </div>
              )}
              {lastPriceSaveResult && (
                <div style={{ gridColumn: '1 / -1', background: lastPriceSaveResult.startsWith('შენახულია') ? '#ecfdf5' : '#fff7ed', color: lastPriceSaveResult.startsWith('შენახულია') ? '#047857' : '#9a3412', border: `1px solid ${lastPriceSaveResult.startsWith('შენახულია') ? '#a7f3d0' : '#fed7aa'}`, borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 700 }}>
                  ბოლო ფასის შენახვა: {lastPriceSaveResult}
                </div>
              )}
              {products.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 12, color: '#085041', fontWeight: 500 }}>{p.category_slug}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: '4px 0 10px' }}>{p.name}</p>
                  {p.prices?.[0]?.price_gel ? (
                    <p style={{ fontSize: 11, color: '#0f766e', margin: '0 0 8px', fontWeight: 700 }}>
                      შენახული ფასი: ₾{Number(p.prices[0].price_gel).toLocaleString('ka-GE')}
                    </p>
                  ) : (
                    <p style={{ fontSize: 11, color: '#9f1239', margin: '0 0 8px', fontWeight: 700 }}>
                      ფასი ჯერ არ არის შენახული
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>₾</span>
                    <input
                      type="number"
                      value={priceDrafts[p.dbId || p.id] ?? String(p.prices?.[0]?.price_gel || '')}
                      onChange={(event) => setPriceDrafts((prev) => ({ ...prev, [p.dbId || p.id]: event.target.value }))}
                      id={`price-${p.id}`}
                      style={{ flex: 1, padding: '6px 8px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 13 }}
                    />
                    <button
                      onClick={() => {
                        const draft = priceDrafts[p.dbId || p.id] ?? String(p.prices?.[0]?.price_gel || '')
                        updatePrice(p, parseFloat(draft))
                      }}
                      disabled={savingPriceId === (p.dbId || p.id)}
                      style={{ padding: '6px 10px', background: '#085041', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                      {savingPriceId === (p.dbId || p.id) ? 'ინახება...' : saved === (p.dbId || p.id) ? '✓' : 'შენახვა'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SERVICE */}
          {tab === 'service' && (
            <div>
              {saveError && (
                <div style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 12 }}>
                  {saveError}
                </div>
              )}
              <div style={{ background: '#eef7f4', color: '#085041', border: '1px solid #c7eadf', borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 12 }}>
                Service Dispatch works as the admin console for the separate engineering division. Assign each case to an engineer profile and track visit progress here.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 24, fontWeight: 600, color: '#085041', margin: 0 }}>{serviceTickets.length}</p>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>All service tickets</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 24, fontWeight: 600, color: '#0C447C', margin: 0 }}>{serviceTickets.filter(ticket => ticket.status === 'inprogress').length}</p>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>In progress</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 24, fontWeight: 600, color: '#633806', margin: 0 }}>{newServiceTickets}</p>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Need triage</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {serviceTickets.map(ticket => (
                  <div key={ticket.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{ticket.products?.name || 'General service case'}</p>
                        <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{ticket.client?.full_name || '—'} · {ticket.client?.clinic_name || '—'} · {ticket.client?.phone || '—'}</p>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '6px 0 0' }}>{new Date(ticket.created_at).toLocaleDateString('ka-GE')}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: ticket.status === 'done' ? '#E1F5EE' : ticket.status === 'inprogress' ? '#E6F1FB' : '#FAEEDA', color: ticket.status === 'done' ? '#085041' : ticket.status === 'inprogress' ? '#0C447C' : '#633806', fontWeight: 600 }}>
                          {ticket.status}
                        </span>
                        <select defaultValue={ticket.status} onChange={e => updateServiceTicket(ticket.id, { status: e.target.value })} style={{ padding: '7px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }}>
                          <option value="new">new</option>
                          <option value="assigned">assigned</option>
                          <option value="inprogress">inprogress</option>
                          <option value="done">done</option>
                        </select>
                      </div>
                    </div>
                    {ticket.serial_number && <p style={{ fontSize: 12, color: '#444', margin: '10px 0 0' }}>Serial: {ticket.serial_number}</p>}
                    <p style={{ fontSize: 13, color: '#444', lineHeight: 1.5, margin: '10px 0 0' }}>{ticket.problem_desc}</p>
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {ticket.attachments.map((url: string, i: number) => {
                          const isVideo = url.match(/\.(mp4|mov|webm|avi)(\?|$)/i)
                          return isVideo ? (
                            <video key={i} src={url} controls style={{ width: 120, height: 90, borderRadius: 10, objectFit: 'cover', background: '#000' }} />
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`att-${i}`} style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '0.5px solid #ddd', cursor: 'pointer' }} />
                            </a>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 180px 1fr auto', gap: 8, marginTop: 12, alignItems: 'center' }}>
                      <select
                        defaultValue={ticket.engineer_id || ''}
                        id={`engineer-${ticket.id}`}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }}
                      >
                        <option value="">Assign engineering division</option>
                        {engineerUsers.map(engineer => (
                          <option key={engineer.id} value={engineer.id}>
                            {engineer.full_name} · {engineer.role}
                          </option>
                        ))}
                      </select>
                      <input type="date" defaultValue={ticket.visit_date ? String(ticket.visit_date).slice(0, 10) : ''} id={`visit-${ticket.id}`} style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }} />
                      <input type="text" defaultValue={ticket.resolution || ''} id={`resolution-${ticket.id}`} placeholder="Engineer update / next step" style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }} />
                      <button
                        onClick={() => {
                          const engineerInput = document.getElementById(`engineer-${ticket.id}`) as HTMLSelectElement | null
                          const visitInput = document.getElementById(`visit-${ticket.id}`) as HTMLInputElement | null
                          const resolutionInput = document.getElementById(`resolution-${ticket.id}`) as HTMLInputElement | null
                          updateServiceTicket(ticket.id, {
                            engineer_id: engineerInput?.value || null,
                            visit_date: visitInput?.value || null,
                            resolution: resolutionInput?.value || null,
                            status: engineerInput?.value && ticket.status === 'new' ? 'assigned' : ticket.status,
                          })
                        }}
                        style={{ padding: '8px 12px', background: '#085041', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
                {serviceTickets.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>Service tickets not found</p>
                )}
              </div>
            </div>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setRequestFilter('all')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: requestFilter === 'all' ? '#085041' : '#fff', color: requestFilter === 'all' ? '#fff' : '#333', cursor: 'pointer' }}>All</button>
                <button onClick={() => setRequestFilter('new')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: requestFilter === 'new' ? '#085041' : '#fff', color: requestFilter === 'new' ? '#fff' : '#333', cursor: 'pointer' }}>New</button>
                <button onClick={() => setRequestFilter('inprogress')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: requestFilter === 'inprogress' ? '#085041' : '#fff', color: requestFilter === 'inprogress' ? '#fff' : '#333', cursor: 'pointer' }}>In Progress</button>
                <button onClick={() => setRequestFilter('done')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: requestFilter === 'done' ? '#085041' : '#fff', color: requestFilter === 'done' ? '#fff' : '#333', cursor: 'pointer' }}>Done</button>
                <input value={requestSearch} onChange={e => setRequestSearch(e.target.value)} placeholder="Search request..." style={{ marginLeft: 'auto', minWidth: 220, padding: '7px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 12 }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, margin: 0, color: '#1a1a1a' }}>კალათიდან მოთხოვნილი ინვოისები</h3>
                  <span style={{ fontSize: 11, color: '#888' }}>{cartInvoiceRequests.length} მოთხოვნა</span>
                </div>
                {cartInvoiceNotice && (
                  <p style={{ fontSize: 12, color: '#166534', background: '#dcfce7', borderRadius: 10, padding: '9px 11px', margin: '0 0 8px' }}>{cartInvoiceNotice}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cartInvoiceRequests.map((request) => (
                    <div key={request.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 9, height: 9, borderRadius: 5, background: request.status === 'new' ? '#185FA5' : request.status === 'closed' ? '#1D9E75' : '#BA7517', marginTop: 5, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{request.full_name} — {request.clinic_name}</p>
                          <p style={{ fontSize: 12, color: '#666', margin: '3px 0 0' }}>{request.phone} · {request.email} · {request.city}{request.tax_id ? ` · ს/კ ${request.tax_id}` : ''}</p>
                          <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
                            {(request.items || []).map((item: any) => {
                              const quantity = Math.max(1, Number(item.quantity) || 1)
                              const unitPrice = parsePrice(cartInvoicePriceValue(request.id, item))
                              return (
                                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 72px 120px 120px', gap: 8, alignItems: 'center', background: '#F8FAFC', border: '0.5px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{item.product_name}</span>
                                  <span style={{ fontSize: 11, color: '#64748b' }}>x {quantity}</span>
                                  <input
                                    inputMode="decimal"
                                    value={cartInvoicePriceValue(request.id, item)}
                                    onChange={(event) => updateCartInvoicePrice(request.id, item, event.target.value)}
                                    placeholder="ფასი GEL"
                                    style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, borderRadius: 8, border: '0.5px solid rgba(15,23,42,0.18)', padding: '7px 8px', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: 12, fontWeight: 800, color: '#085041', textAlign: 'right' }}>{money(unitPrice * quantity)}</span>
                                </div>
                              )
                            })}
                          </div>
                          {request.comment && <p style={{ fontSize: 12, color: '#555', margin: '9px 0 0' }}>{request.comment}</p>}
                          <p style={{ fontSize: 11, color: '#999', margin: '8px 0 0' }}>OTP: {request.otp_verified_at ? 'დადასტურებულია' : 'არა'} · IP: {request.ip_address || '—'} · {new Date(request.created_at).toLocaleString('ka-GE')}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginTop: 10, paddingTop: 9, borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <strong style={{ fontSize: 13, color: '#111827' }}>სულ: {money(cartInvoiceTotal(request))}</strong>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => createInvoiceFromCartRequest(request, 'email')}
                                disabled={cartInvoiceBusyId === request.id}
                                style={{ fontSize: 12, padding: '8px 10px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', opacity: cartInvoiceBusyId === request.id ? 0.7 : 1, fontWeight: 800 }}
                              >
                                {cartInvoiceBusyId === request.id ? '...' : 'Email'}
                              </button>
                              <button
                                type="button"
                                onClick={() => createInvoiceFromCartRequest(request, 'sms')}
                                disabled={cartInvoiceBusyId === request.id}
                                style={{ fontSize: 12, padding: '8px 10px', background: '#085041', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', opacity: cartInvoiceBusyId === request.id ? 0.7 : 1, fontWeight: 800 }}
                              >
                                SMS
                              </button>
                              <button
                                type="button"
                                onClick={() => createInvoiceFromCartRequest(request, 'whatsapp')}
                                disabled={cartInvoiceBusyId === request.id}
                                style={{ fontSize: 12, padding: '8px 10px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', opacity: cartInvoiceBusyId === request.id ? 0.7 : 1, fontWeight: 800 }}
                              >
                                WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => createInvoiceFromCartRequest(request, 'link')}
                                disabled={cartInvoiceBusyId === request.id}
                                style={{ fontSize: 12, padding: '8px 10px', background: '#fff', color: '#0C447C', border: '1px solid #CFE1F2', borderRadius: 9, cursor: 'pointer', opacity: cartInvoiceBusyId === request.id ? 0.7 : 1, fontWeight: 800 }}
                              >
                                ლინკი
                              </button>
                            </div>
                          </div>
                        </div>
                        <select value={request.status} onChange={(event) => updateCartInvoiceRequestStatus(request.id, event.target.value)} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)' }}>
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="invoice_sent">Invoice Sent</option>
                          <option value="closed">Closed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {cartInvoiceRequests.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#aaa', padding: 18, background: '#fff', borderRadius: 12 }}>კალათის ინვოისის მოთხოვნა ჯერ არ არის</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredRequests.map(r => {
                  const requestPrice = resolveRequestPrice(r, products)
                  return (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: r.status === 'new' ? '#185FA5' : r.status === 'done' ? '#1D9E75' : '#BA7517', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{r.products?.name || '—'} — {r.type === 'price' ? 'ფასის მოთხოვნა' : r.type === 'demo' ? 'დემო' : r.type}</p>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.client?.full_name} · {r.client?.clinic_name} · {r.client?.phone}</p>
                    </div>
                    {requestPrice && (
                      <span style={{ fontSize: 12, color: '#085041', fontWeight: 700 }}>₾{Number(requestPrice.price_gel).toLocaleString('ka-GE')}</span>
                    )}
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
                  )
                })}
                {filteredRequests.length === 0 && (
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
