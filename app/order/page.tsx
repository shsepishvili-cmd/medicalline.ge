'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const ORDER_CONTACT_STORAGE_KEY = 'medicalLineOrderContact'

type SavedOrderContact = {
  customerName: string
  phone: string
  clinic: string
  city: string
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('995') && digits.length >= 12) return `+${digits.slice(0, 12)}`
  if (digits.startsWith('5') && digits.length >= 9) return `+995${digits.slice(0, 9)}`
  return value
}

export default function OrderPortalPage() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [sentOrder, setSentOrder] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [contactInfo, setContactInfo] = useState<SavedOrderContact>({
    customerName: '',
    phone: '',
    clinic: '',
    city: 'თბილისი',
  })

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ORDER_CONTACT_STORAGE_KEY)
      if (!saved) return

      const parsed = JSON.parse(saved) as Partial<SavedOrderContact>
      setContactInfo((current) => ({
        customerName: parsed.customerName || current.customerName,
        phone: parsed.phone || current.phone,
        clinic: parsed.clinic || current.clinic,
        city: parsed.city || current.city,
      }))
    } catch {
      window.localStorage.removeItem(ORDER_CONTACT_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (sentOrder || !formRef.current) return

    const form = formRef.current
    const fields: Array<keyof SavedOrderContact> = ['customerName', 'phone', 'clinic', 'city']
    fields.forEach((field) => {
      const control = form.elements.namedItem(field)
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        control.value = contactInfo[field]
      }
    })
  }, [contactInfo, sentOrder])

  function rememberContactFromForm(form: HTMLFormElement) {
    const nextContactInfo: SavedOrderContact = {
      customerName: String(new FormData(form).get('customerName') || ''),
      phone: String(new FormData(form).get('phone') || ''),
      clinic: String(new FormData(form).get('clinic') || ''),
      city: String(new FormData(form).get('city') || contactInfo.city),
    }

    window.localStorage.setItem(ORDER_CONTACT_STORAGE_KEY, JSON.stringify(nextContactInfo))
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!privacyConsent) {
      setError('გთხოვთ მონიშნოთ თანხმობა პერსონალური ინფორმაციის დამუშავებაზე.')
      return
    }

    setSaving(true)

    try {
      const form = new FormData(event.currentTarget)
      const customerName = String(form.get('customerName') || '').trim()
      const phone = normalizePhone(String(form.get('phone') || ''))
      const clinic = String(form.get('clinic') || '').trim()
      const city = String(form.get('city') || 'თბილისი').trim()
      const items = String(form.get('items') || '').trim()
      const notes = String(form.get('notes') || '').trim()

      const response = await fetch('/api/order-portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName: customerName,
          phone,
          clinicName: clinic,
          city,
          requestedProduct: items,
          quantity: '1',
          urgency: 'this_week',
          preferredContact: 'phone',
          deliveryCity: city,
          comment: notes,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'შეკვეთა ვერ გაიგზავნა.')

      const nextContactInfo = { customerName, phone, clinic, city }
      setContactInfo(nextContactInfo)
      window.localStorage.setItem(ORDER_CONTACT_STORAGE_KEY, JSON.stringify(nextContactInfo))
      setPrivacyConsent(false)
      setSentOrder(data.orderNumber)
      event.currentTarget.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'შეკვეთა ვერ გაიგზავნა.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="ml-order-page">
      <header className="ml-order-topbar">
        <Link className="ml-order-brand" href="/">
          <span className="ml-order-brandmark">M</span>
          <span>
            <strong>MEDICAL LINE</strong>
            <small>GEORGIA</small>
          </span>
        </Link>
        <nav className="ml-order-switcher">
          <button className="active" type="button">შეკვეთა</button>
          <Link href="/admin/orders">ადმინისტრაცია</Link>
        </nav>
      </header>

      <section className="ml-order-shell">
        <div className="ml-order-intro">
          <span className="ml-order-eyebrow">ონლაინ შეკვეთა</span>
          <h1>
            შეუკვეთეთ მარტივად.
            <br />
            <em>დანარჩენს ჩვენ მივხედავთ.</em>
          </h1>
          <p>შეავსეთ ფორმა და ჩვენი მენეჯერი დაგიკავშირდებათ შეკვეთის დასადასტურებლად.</p>
          <div className="ml-order-trust-row">
            <span>✓ ოფიციალური პროდუქცია</span>
            <span>✓ სწრაფი მიწოდება</span>
            <span>✓ სერვისი და გარანტია</span>
          </div>
        </div>

        <div className="ml-order-form-card">
          {sentOrder ? (
            <div className="ml-order-success">
              <div className="ml-order-success-icon">✓</div>
              <h2>შეკვეთა მიღებულია</h2>
              <p>თქვენი შეკვეთის ნომერია</p>
              <strong>{sentOrder}</strong>
              <p>დადასტურების შემდეგ მიიღებთ შეტყობინებას.</p>
              <button className="ml-order-primary" type="button" onClick={() => setSentOrder('')}>ახალი შეკვეთა</button>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={submitOrder}
              onChange={(event) => rememberContactFromForm(event.currentTarget)}
            >
              <div className="ml-order-form-title">
                <span>01</span>
                <div>
                  <h2>საკონტაქტო ინფორმაცია</h2>
                  <p>მონაცემები შეკვეთის დასადასტურებლად</p>
                </div>
              </div>

              <div className="ml-order-fields two">
                <label>
                  სახელი და გვარი
                  <input name="customerName" required placeholder="მაგ. ნინო ბერიძე" />
                </label>
                <label>
                  ტელეფონის ნომერი
                  <input name="phone" type="tel" required placeholder="5XX XX XX XX" />
                </label>
              </div>

              <div className="ml-order-fields two">
                <label>
                  კლინიკა
                  <input name="clinic" placeholder="კლინიკის დასახელება" />
                </label>
                <label>
                  ქალაქი
                  <select name="city" defaultValue="თბილისი">
                    <option>თბილისი</option>
                    <option>ბათუმი</option>
                    <option>ქუთაისი</option>
                    <option>რუსთავი</option>
                    <option>სხვა</option>
                  </select>
                </label>
              </div>

              <div className="ml-order-divider" />

              <div className="ml-order-form-title">
                <span>02</span>
                <div>
                  <h2>შეკვეთის დეტალები</h2>
                  <p>ჩამოწერეთ სასურველი პროდუქტი და რაოდენობა</p>
                </div>
              </div>

              <label>
                პროდუქტები
                <textarea
                  name="items"
                  required
                  rows={4}
                  placeholder={'მაგ. FINSCAN F350 — 1 ცალი\nUltra X აქტივატორი — 2 ცალი'}
                />
              </label>

              <label>
                დამატებითი კომენტარი
                <textarea name="notes" rows={2} placeholder="მიწოდების მისამართი ან სხვა ინფორმაცია" />
              </label>

              {error ? <p className="ml-order-error">{error}</p> : null}

              <label className="ml-order-consent">
                <input
                  name="privacyConsent"
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(event) => setPrivacyConsent(event.target.checked)}
                  required
                />
                <span>
                  ვეთანხმები, რომ Medical Line Georgia-მ დაამუშაოს ჩემი სახელი, ტელეფონი და კლინიკის ინფორმაცია შეკვეთის მიღებისა და დასადასტურებლად.
                </span>
              </label>

              <button className="ml-order-primary submit" type="submit" disabled={saving}>
                {saving ? 'იგზავნება...' : 'შეკვეთის გაგზავნა'} <span>→</span>
              </button>
              <p className="ml-order-privacy">გაგზავნით ეთანხმებით, რომ დაგიკავშირდეთ შეკვეთის დასადასტურებლად.</p>
            </form>
          )}
        </div>
      </section>

      <footer className="ml-order-footer">
        <span>© 2026 Medical Line Georgia</span>
        <span>სერვისი · ხარისხი · ნდობა</span>
      </footer>
    </main>
  )
}
