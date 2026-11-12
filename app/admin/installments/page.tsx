'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'
import {
  buildInstallmentSchedule,
  formatInstallmentDate,
  formatMoney,
  fromTetri,
  installmentSmsText,
  isRowOverdue,
  normalizeInstallmentPhone,
  overpaidAmount,
  PAYMENT_METHOD_LABELS,
  remainingAmount,
  REMINDER_LABELS,
  summarizeContract,
  todayInTbilisi,
  toTetri,
  type InstallmentContract,
  type InstallmentPayment,
  type InstallmentScheduleRow,
  type ManualPaymentMethod,
  type ReminderKind,
} from '@/app/lib/installments'
import styles from './installments.module.css'

const MIGRATION_HINT = 'ბაზა ჯერ არ არის განახლებული: Supabase SQL Editor-ში გაუშვით supabase/sql/53_internal_installments.sql.'

function firstDueDefault() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 10)
}

function emptyForm() {
  return { number: '', name: '', taxId: '', product: '', serial: '', phone: '', price: '', deposit: '0', months: '6', date: firstDueDefault(), notes: '', reminders: true }
}

function friendlyError(message: string) {
  if (/installment_contracts|installment_schedule|create_installment_contract|schema cache/i.test(message)) return MIGRATION_HINT
  if (/duplicate key|unique/i.test(message)) return 'ამ ნომრით ხელშეკრულება უკვე არსებობს.'
  if (/exceeds the remaining/i.test(message)) return 'თანხა აღემატება ამ შენატანის დარჩენილ ნაშთს.'
  if (/Forbidden/.test(message)) return 'ეს მოქმედება მხოლოდ ადმინისთვისაა.'
  return message
}

type PayTarget = { contract: InstallmentContract; row: InstallmentScheduleRow }
type ReminderPreview = {
  smsConfigured: boolean
  remindersEnabled: boolean
  today: string
  planned: Array<{ contractNumber: string; customerName: string; kind: ReminderKind; dueDate: string; amount: number; message: string }>
}
type SmsLog = { id: string; created_at: string; kind: ReminderKind | 'manual'; status: string; message: string | null; error: string | null; installment_contracts: { contract_number: string; customer_name: string } | null }

export default function InstallmentsAdminPage() {
  const { loading, error: gateError, profile, accessToken } = useWarrantyAdminGate()
  const [tab, setTab] = useState<'contracts' | 'sms'>('contracts')
  const [contracts, setContracts] = useState<InstallmentContract[]>([])
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [products, setProducts] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [payment, setPayment] = useState({ amount: '', method: 'bank_transfer' as ManualPaymentMethod, date: '', note: '' })
  const [preview, setPreview] = useState<ReminderPreview | null>(null)
  const [smsLog, setSmsLog] = useState<SmsLog[]>([])

  const today = todayInTbilisi()
  const isAdmin = profile?.role === 'admin'

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('installment_contracts')
      .select('*, installment_schedule(*), installment_payments(*)')
      .order('created_at', { ascending: false })
    if (queryError) {
      setLoadError(friendlyError(queryError.message))
      return
    }
    setLoadError('')
    setContracts(((data || []) as InstallmentContract[]).map((contract) => ({
      ...contract,
      installment_schedule: [...contract.installment_schedule].sort((a, b) => a.installment_number - b.installment_number),
      installment_payments: [...contract.installment_payments].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    })))
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    void load()
    supabase.from('products').select('name').eq('is_active', true).order('sort_order').then(({ data }) => {
      setProducts((data || []).map((item: { name: string }) => item.name))
    })
  }, [isAdmin, load])

  const loadSmsTab = useCallback(async () => {
    if (!accessToken) return
    const [response, logs] = await Promise.all([
      fetch('/api/admin/installments/reminders', { headers: { Authorization: `Bearer ${accessToken}` } }),
      supabase.from('installment_sms_log').select('id, created_at, kind, status, message, error, installment_contracts(contract_number, customer_name)').order('created_at', { ascending: false }).limit(30),
    ])
    const payload = await response.json().catch(() => null)
    if (response.ok && payload) setPreview(payload as ReminderPreview)
    else setError(friendlyError(payload?.error || 'შეხსენებების ჩატვირთვა ვერ მოხერხდა.'))
    setSmsLog((logs.data || []) as unknown as SmsLog[])
  }, [accessToken])

  useEffect(() => {
    if (tab === 'sms' && isAdmin) void loadSmsTab()
  }, [tab, isAdmin, loadSmsTab])

  const totals = useMemo(() => {
    const live = contracts.filter((contract) => contract.status !== 'cancelled')
    return live.reduce((sum, contract) => {
      const summary = summarizeContract(contract, today)
      return { financed: sum.financed + toTetri(summary.financed), remaining: sum.remaining + toTetri(summary.remaining), overdue: sum.overdue + toTetri(summary.overdue) }
    }, { financed: 0, remaining: 0, overdue: 0 })
  }, [contracts, today])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contracts.filter((contract) => {
      if (statusFilter === 'overdue') {
        if (toTetri(summarizeContract(contract, today).overdue) === 0) return false
      } else if (statusFilter && contract.status !== statusFilter) return false
      if (!query) return true
      return [contract.contract_number, contract.customer_name, contract.phone, contract.product_name, contract.serial_number]
        .some((value) => String(value || '').toLowerCase().includes(query))
    })
  }, [contracts, search, statusFilter, today])

  // Live preview of the form; null while the numbers are not yet valid.
  const schedulePreview = useMemo(() => {
    try {
      return buildInstallmentSchedule(Number(form.price), Number(form.deposit || 0), Number(form.months), form.date)
    } catch {
      return null
    }
  }, [form.price, form.deposit, form.months, form.date])

  function setField<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function run(action: () => Promise<string | void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const message = await action()
      // Refresh first, so a success message never sits next to stale balances.
      await load()
      if (message) setNotice(message)
    } catch (cause) {
      setError(friendlyError(cause instanceof Error ? cause.message : 'მოქმედება ვერ შესრულდა.'))
    } finally {
      setBusy(false)
    }
  }

  function createContract() {
    const phone = normalizeInstallmentPhone(form.phone)
    if (!form.name.trim() || !form.product.trim()) return setError('მიუთითეთ კლიენტი და მოწყობილობა.')
    if (!phone) return setError('ტელეფონი უნდა იყოს ქართული მობილურის ნომერი: 5XXXXXXXX ან 9955XXXXXXXX.')
    if (!schedulePreview || !form.date) return setError('შეამოწმეთ თანხა, შენატანი, თვეების რაოდენობა (1–60) და პირველი გადახდის თარიღი.')

    void run(async () => {
      const { data, error: rpcError } = await supabase.rpc('create_installment_contract', {
        p_contract: {
          contract_number: form.number,
          customer_name: form.name,
          customer_tax_id: form.taxId,
          phone,
          product_name: form.product,
          serial_number: form.serial,
          total_price: Number(form.price),
          down_payment: Number(form.deposit || 0),
          months: Number(form.months),
          first_due_date: form.date,
          reminders_enabled: form.reminders,
          notes: form.notes,
        },
        p_schedule: schedulePreview,
      })
      if (rpcError) throw new Error(rpcError.message)
      setForm(emptyForm())
      setOpenId(data as string)
      return 'ხელშეკრულება შეიქმნა.'
    })
  }

  function openPayment(contract: InstallmentContract, row: InstallmentScheduleRow) {
    setPayTarget({ contract, row })
    setPayment({ amount: remainingAmount(row).toFixed(2), method: 'bank_transfer', date: today, note: '' })
    setError('')
  }

  function savePayment() {
    if (!payTarget) return
    const remaining = toTetri(remainingAmount(payTarget.row))
    const amount = toTetri(payment.amount)
    if (!(amount > 0) || amount > remaining) return setError(`თანხა უნდა იყოს 0-ზე მეტი და არაუმეტეს ${formatMoney(fromTetri(remaining))}.`)

    const target = payTarget
    setPayTarget(null)
    void run(async () => {
      const { error: rpcError } = await supabase.rpc('record_installment_payment', {
        p_schedule_id: target.row.id,
        p_amount: fromTetri(amount),
        p_method: payment.method,
        p_paid_on: payment.date || today,
        p_note: payment.note,
      })
      if (rpcError) throw new Error(rpcError.message)
      return `შენატანი №${target.row.installment_number}: გადახდა აღირიცხა.`
    })
  }

  function reversePayment(item: InstallmentPayment) {
    const reason = window.prompt(`${formatMoney(item.amount)} — რატომ უქმდება ეს ჩანაწერი?`)
    if (!reason?.trim()) return
    void run(async () => {
      const { error: rpcError } = await supabase.rpc('reverse_installment_payment', { p_payment_id: item.id, p_reason: reason })
      if (rpcError) throw new Error(rpcError.message)
      return 'გადახდის ჩანაწერი გაუქმდა და ნაშთი აღდგა.'
    })
  }

  function cancelContract(contract: InstallmentContract) {
    const reason = window.prompt(`${contract.contract_number} — გაუქმების მიზეზი (გადახდილი ჩანაწერები შენარჩუნდება):`)
    if (!reason?.trim()) return
    void run(async () => {
      const { error: rpcError } = await supabase.rpc('cancel_installment_contract', { p_contract_id: contract.id, p_reason: reason })
      if (rpcError) throw new Error(rpcError.message)
      return `${contract.contract_number} გაუქმდა.`
    })
  }

  function toggleReminders(contract: InstallmentContract) {
    void run(async () => {
      const { error: rpcError } = await supabase.rpc('set_installment_reminders', { p_contract_id: contract.id, p_enabled: !contract.reminders_enabled })
      if (rpcError) throw new Error(rpcError.message)
    })
  }

  function clientLink(contract: InstallmentContract) {
    return `${window.location.origin}/installment/${contract.public_token}`
  }

  async function copyLink(contract: InstallmentContract) {
    await navigator.clipboard?.writeText(clientLink(contract))
    setError('')
    setNotice('კლიენტის ბმული დაკოპირდა.')
  }

  function sendSms(contract: InstallmentContract) {
    if (!window.confirm(`გაეგზავნოს SMS ნომერზე ${contract.phone}?`)) return
    void run(async () => {
      const response = await fetch(`/api/admin/installments/${contract.id}/sms`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'SMS ვერ გაიგზავნა.')
      if (payload?.smsSent) return 'SMS გაიგზავნა.'
      await navigator.clipboard?.writeText(payload?.smsText || '')
      return 'SMS სერვისი არ არის ჩართული — ტექსტი დაკოპირდა ხელით გასაგზავნად.'
    })
  }

  if (loading) return <LoadingView label="განვადებები იტვირთება..." />
  if (gateError || !profile || !accessToken) return <AuthBlockedView message={gateError || 'წვდომა აკრძალულია.'} />
  if (!isAdmin) return <AuthBlockedView message="განვადებების მოდული ხელმისაწვდომია მხოლოდ ადმინისთვის." />

  const sampleContract = contracts.find((contract) => contract.status === 'active')
  const sampleRow = sampleContract?.installment_schedule.find((row) => row.status === 'pending')

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <Link href="/admin" className={styles.logo}>
            <div className={styles.logoIcon}>✚</div>
            <div>
              <b>MEDICAL LINE <span>GEORGIA</span></b>
              <small>შიდა განვადებების სისტემა</small>
            </div>
          </Link>
          <nav className={styles.menu}>
            <button type="button" className={tab === 'contracts' ? styles.active : ''} onClick={() => setTab('contracts')}>ხელშეკრულებები</button>
            <button type="button" className={tab === 'sms' ? styles.active : ''} onClick={() => setTab('sms')}>SMS</button>
            <Link href="/admin">ადმინი</Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <span className={styles.tag}>MEDICAL LINE · FINANCE CENTER</span>
          <h1>განვადებები და <em>გადახდები</em></h1>
          <p>შიდა განვადების ხელშეკრულებები, გადახდის გრაფიკი და საქართველოს ბანკით გადახდა.</p>
        </section>

        <div className={styles.stats}>
          <div className={styles.stat}><small>ხელშეკრულებები</small><b>{contracts.length}</b></div>
          <div className={styles.stat}><small>დასაფინანსებელი თანხა</small><b>{formatMoney(fromTetri(totals.financed))}</b></div>
          <div className={styles.stat}><small>დარჩენილი თანხა</small><b>{formatMoney(fromTetri(totals.remaining))}</b></div>
          <div className={`${styles.stat} ${totals.overdue > 0 ? styles.statDanger : ''}`}><small>ვადაგადაცილებული</small><b>{formatMoney(fromTetri(totals.overdue))}</b></div>
        </div>

        {loadError ? <div className={styles.error}>{loadError}</div> : null}
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {notice ? <div className={styles.ok}>{notice}</div> : null}

        {tab === 'contracts' ? (
          <div className={styles.cols}>
            <section className={styles.box}>
              <div className={styles.cardTitle}><h2>ახალი ხელშეკრულება</h2><small>01 / CREATE</small></div>
              <p className={styles.hint}>შეავსეთ კლიენტის მონაცემები და განვადების პირობები. განვადება 0%-იანია.</p>
              <div className={styles.grid}>
                <label>ხელშეკრულების ნომერი<input value={form.number} onChange={(e) => setField('number', e.target.value)} placeholder="ავტომატური (ML-2026-001)" /></label>
                <label>კლიენტი / კლინიკა *<input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="კლინიკის დასახელება" /></label>
                <label>ტელეფონი *<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="5XXXXXXXX" inputMode="tel" /></label>
                <label>საიდენტიფიკაციო ნომერი<input value={form.taxId} onChange={(e) => setField('taxId', e.target.value)} placeholder="ს/კ ან პირადი №" /></label>
                <label>მოწყობილობა *
                  <input list="installment-products" value={form.product} onChange={(e) => setField('product', e.target.value)} placeholder="აირჩიეთ ან ჩაწერეთ" />
                  <datalist id="installment-products">{products.map((name) => <option key={name} value={name} />)}</datalist>
                </label>
                <label>სერიული ნომერი<input value={form.serial} onChange={(e) => setField('serial', e.target.value)} /></label>
                <label>სრული ღირებულება ₾ *<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setField('price', e.target.value)} /></label>
                <label>საწყისი შენატანი ₾<input type="number" min="0" step="0.01" value={form.deposit} onChange={(e) => setField('deposit', e.target.value)} /></label>
                <label>თვეების რაოდენობა *<input type="number" min="1" max="60" value={form.months} onChange={(e) => setField('months', e.target.value)} /></label>
                <label>პირველი გადახდის თარიღი *<input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} /></label>
                <label className={styles.full}>შიდა შენიშვნა<textarea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></label>
                <label className={`${styles.full} ${styles.check}`}>
                  <input type="checkbox" checked={form.reminders} onChange={(e) => setField('reminders', e.target.checked)} />
                  SMS-შეხსენებები ამ კლიენტისთვის
                </label>
              </div>
              <div className={styles.summary}>
                <span>ყოველთვიური შენატანი (0%)</span>
                <b>{schedulePreview ? formatMoney(schedulePreview[0].amount) : '—'}</b>
              </div>
              {schedulePreview && schedulePreview.length > 1 && schedulePreview[schedulePreview.length - 1].amount !== schedulePreview[0].amount ? (
                <p className={styles.hint} style={{ margin: '8px 0 0' }}>ბოლო შენატანი დამრგვალების გამო: {formatMoney(schedulePreview[schedulePreview.length - 1].amount)}</p>
              ) : null}
              <button type="button" className={styles.bigBtn} disabled={busy} onClick={createContract}>{busy ? 'მუშავდება...' : 'ხელშეკრულების შექმნა →'}</button>
            </section>

            <section className={styles.box}>
              <div className={styles.cardTitle}><h2>განვადებების რეესტრი</h2><small>02 / REGISTRY</small></div>
              <div className={styles.grid} style={{ marginBottom: 14 }}>
                <input aria-label="ძებნა" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ნომერი, კლიენტი, ტელეფონი..." style={{ marginTop: 0 }} />
                <select aria-label="სტატუსი" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginTop: 0 }}>
                  <option value="">ყველა სტატუსი</option>
                  <option value="active">აქტიური</option>
                  <option value="overdue">ვადაგადაცილებული</option>
                  <option value="completed">დასრულებული</option>
                  <option value="cancelled">გაუქმებული</option>
                </select>
              </div>

              {visible.length === 0 ? <p className={styles.empty}>{contracts.length ? 'ამ ფილტრით ვერაფერი მოიძებნა.' : 'ხელშეკრულება ჯერ არ არის.'}</p> : null}

              {visible.map((contract) => {
                const summary = summarizeContract(contract, today)
                const isOpen = openId === contract.id
                const late = contract.status === 'active' && toTetri(summary.overdue) > 0
                return (
                  <div key={contract.id} className={styles.contract}>
                    <button type="button" className={styles.contractHead} aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : contract.id)}>
                      <span>
                        <b>{contract.customer_name}</b>
                        <small>{contract.contract_number} · {contract.product_name}</small>
                        <small>დარჩენილია {formatMoney(summary.remaining)} · {summary.paidCount}/{contract.months} შენატანი</small>
                      </span>
                      <span className={`${styles.pill} ${late ? styles.pillLate : contract.status === 'completed' ? styles.pillDone : contract.status === 'cancelled' ? styles.pillOff : ''}`}>
                        {late ? 'ვადაგადაცილებული' : contract.status === 'completed' ? 'დასრულებული' : contract.status === 'cancelled' ? 'გაუქმებული' : 'აქტიური'}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className={styles.contractBody}>
                        <div className={styles.facts}>
                          <span>ღირებულება: <b>{formatMoney(contract.total_price)}</b></span>
                          <span>საწყისი შენატანი: <b>{formatMoney(contract.down_payment)}</b></span>
                          <span>ტელეფონი: <b>{contract.phone}</b></span>
                          {contract.customer_tax_id ? <span>ს/კ: <b>{contract.customer_tax_id}</b></span> : null}
                          {contract.serial_number ? <span>S/N: <b>{contract.serial_number}</b></span> : null}
                          {contract.notes ? <span>შენიშვნა: <b>{contract.notes}</b></span> : null}
                          {contract.cancel_reason ? <span>გაუქმების მიზეზი: <b>{contract.cancel_reason}</b></span> : null}
                        </div>

                        {contract.installment_schedule.map((row) => {
                          const overdue = isRowOverdue(row, today)
                          const partial = row.status === 'pending' && toTetri(row.paid_amount) > 0
                          const extra = overpaidAmount(row)
                          return (
                            <div key={row.id} className={`${styles.row} ${overdue ? styles.rowLate : ''}`}>
                              <span>შენატანი №{row.installment_number}<small>{formatInstallmentDate(row.due_date)}{overdue ? ' · ვადაგადაცილებული' : ''}</small></span>
                              <span>
                                <strong>{formatMoney(row.amount)}</strong>
                                {partial ? <small>დარჩა {formatMoney(remainingAmount(row))}</small> : null}
                                {toTetri(extra) > 0 ? <small>ზედმეტად გადახდილი {formatMoney(extra)}</small> : null}
                              </span>
                              {row.status === 'paid' ? (
                                <span className={`${styles.smallBtn} ${styles.smallBtnDone}`}>გადახდილია</span>
                              ) : row.status === 'cancelled' ? (
                                <span className={`${styles.smallBtn} ${styles.smallBtnDone}`} style={{ background: '#eef0f3', color: '#5b6778' }}>გაუქმებული</span>
                              ) : (
                                <button type="button" className={styles.smallBtn} disabled={busy} onClick={() => openPayment(contract, row)}>გადახდის აღრიცხვა</button>
                              )}
                            </div>
                          )
                        })}

                        <div className={styles.actions}>
                          <button type="button" className={styles.smallBtn} onClick={() => copyLink(contract)}>კლიენტის ბმული</button>
                          <a className={styles.smallBtn} href={`/installment/${contract.public_token}`} target="_blank" rel="noreferrer">კლიენტის გვერდი ↗</a>
                          {contract.status === 'active' ? (
                            <>
                              <button type="button" className={styles.smallBtn} disabled={busy} onClick={() => sendSms(contract)}>SMS კლიენტს</button>
                              <button type="button" className={styles.smallBtn} disabled={busy} onClick={() => toggleReminders(contract)}>
                                შეხსენებები: {contract.reminders_enabled ? 'ჩართული' : 'გამორთული'}
                              </button>
                              <button type="button" className={`${styles.smallBtn} ${styles.smallBtnDanger}`} disabled={busy} onClick={() => cancelContract(contract)}>გაუქმება</button>
                            </>
                          ) : null}
                        </div>

                        {contract.installment_payments.some((item) => ['succeeded', 'reversed'].includes(item.status)) ? (
                          <div className={styles.history}>
                            <h3>გადახდების ისტორია</h3>
                            {contract.installment_payments.filter((item) => ['succeeded', 'reversed'].includes(item.status)).map((item) => (
                              <div key={item.id} className={styles.historyRow}>
                                <span className={item.status === 'reversed' ? styles.reversed : ''}>
                                  {formatMoney(item.amount)} · {PAYMENT_METHOD_LABELS[item.method]}
                                  <small>{formatInstallmentDate(item.paid_on)}{item.note ? ` · ${item.note}` : ''}{item.reversal_reason ? ` · გაუქმდა: ${item.reversal_reason}` : ''}</small>
                                </span>
                                {item.status === 'succeeded' && item.method !== 'bog_online' ? (
                                  <button type="button" className={`${styles.smallBtn} ${styles.smallBtnDanger}`} disabled={busy} onClick={() => reversePayment(item)}>გაუქმება</button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </section>
          </div>
        ) : (
          <section className={styles.box}>
            <div className={styles.cardTitle}><h2>SMS-შეხსენებების გრაფიკი</h2><small>AUTOMATION</small></div>
            {preview && !preview.remindersEnabled ? (
              <div className={styles.notice}>
                <b>ავტომატური გაგზავნა გამორთულია.</b> ქვემოთ ჩანს, რა გაიგზავნებოდა დღეს, მაგრამ კლიენტს არაფერი მიდის, სანამ Vercel-ში არ დაემატება <code>INSTALLMENT_REMINDERS_ENABLED=true</code>.
              </div>
            ) : null}
            {preview && !preview.smsConfigured ? <div className={styles.error}>SMS სერვისი (GOSMS) ამ გარემოში არ არის კონფიგურირებული.</div> : null}
            <p className={styles.hint}>შემოწმება ყოველდღე 10:00-ზე ხდება. ერთი კლიენტი დღეში მაქსიმუმ ერთ შეხსენებას იღებს, უძველეს გადაუხდელ შენატანზე.</p>
            <div>{(['before_3', 'due_day', 'overdue_3', 'overdue_7'] as const).map((kind) => <span key={kind} className={styles.chip}>{REMINDER_LABELS[kind]}</span>)}</div>

            <p style={{ fontWeight: 700, margin: '18px 0 8px' }}>შეტყობინების ნიმუში</p>
            <div className={styles.sms}>
              {installmentSmsText(sampleContract?.contract_number || 'ML-2026-001', sampleRow ? remainingAmount(sampleRow) : 1000, sampleRow?.due_date || today, 'before_3', 'https://medicalline.ge/installment/...')}
            </div>

            <p style={{ fontWeight: 700, margin: '18px 0 8px' }}>დღეს გასაგზავნი ({preview?.planned.length ?? 0})</p>
            {preview?.planned.length ? preview.planned.map((item) => (
              <div key={`${item.contractNumber}-${item.kind}`} className={styles.logRow}>
                <span>{item.customerName} · {item.contractNumber}<small>{REMINDER_LABELS[item.kind]} · {formatInstallmentDate(item.dueDate)}</small></span>
                <b>{formatMoney(item.amount)}</b>
              </div>
            )) : <p className={styles.hint}>დღეს შეხსენება არავის ეკუთვნის.</p>}

            <p style={{ fontWeight: 700, margin: '18px 0 8px' }}>გაგზავნის ისტორია</p>
            {smsLog.length ? smsLog.map((item) => (
              <div key={item.id} className={styles.logRow}>
                <span>{item.installment_contracts?.customer_name} · {item.installment_contracts?.contract_number}<small>{REMINDER_LABELS[item.kind]} · {new Date(item.created_at).toLocaleString('ka-GE')}{item.error ? ` · ${item.error}` : ''}</small></span>
                <span className={`${styles.pill} ${item.status === 'failed' ? styles.pillLate : ''}`}>{item.status === 'sent' ? 'გაიგზავნა' : item.status === 'failed' ? 'ვერ გაიგზავნა' : 'იგზავნება'}</span>
              </div>
            )) : <p className={styles.hint}>ისტორია ცარიელია.</p>}
          </section>
        )}
      </div>

      {payTarget ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="გადახდის აღრიცხვა">
          <div>
            <h2>გადახდის აღრიცხვა</h2>
            <p className={styles.hint}>{payTarget.contract.customer_name} · {payTarget.contract.contract_number} · შენატანი №{payTarget.row.installment_number}. დარჩენილია {formatMoney(remainingAmount(payTarget.row))}.</p>
            {error ? <div className={styles.error}>{error}</div> : null}
            <div className={styles.grid}>
              <label>თანხა ₾<input type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} /></label>
              <label>გადახდის თარიღი<input type="date" value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))} /></label>
              <label className={styles.full}>გადახდის მეთოდი
                <select value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value as ManualPaymentMethod }))}>
                  {(['bank_transfer', 'cash', 'card_terminal', 'other'] as const).map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
                </select>
              </label>
              <label className={styles.full}>შენიშვნა<input value={payment.note} onChange={(e) => setPayment((p) => ({ ...p, note: e.target.value }))} placeholder="მაგ.: საგადახდო დავალება №" /></label>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={() => setPayTarget(null)}>გაუქმება</button>
              <button type="button" className={styles.bigBtn} onClick={savePayment}>აღრიცხვა</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
