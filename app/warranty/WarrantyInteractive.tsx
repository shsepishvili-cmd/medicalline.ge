'use client'

import { useRef, useState, type FormEvent } from 'react'
import { WARRANTY_CATEGORIES, WARRANTY_PUBLIC_STATUS } from '@/app/lib/warranty-catalog'
import type { WarrantyStatus } from '@/app/lib/warranty-types'
import styles from './warranty.module.css'

// Browser locale support varies and could show 11/3/2026, so format explicitly.
function formatIsoDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${Number(day)}.${Number(month)}.${year}`
}

export function CategoryExplorer() {
  const [selected, setSelected] = useState<number | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const category = selected === null ? null : WARRANTY_CATEGORIES[selected]

  function select(index: number) {
    setSelected(index)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  return (
    <>
      <div className={styles.categories}>
        {WARRANTY_CATEGORIES.map((item, index) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={selected === index}
            className={`${styles.cat} ${selected === index ? styles.catActive : ''}`}
            onClick={() => select(index)}
          >
            <span className={styles.num}>{String(index + 1).padStart(2, '0')}</span>
            <span>
              <strong>{item.name}</strong>
              <small>{item.examples}</small>
            </span>
          </button>
        ))}
      </div>
      <div ref={detailRef} aria-live="polite">
        {category && selected !== null ? (
          <div className={styles.detail}>
            <span className={styles.pill}>კატეგორია {selected + 1}</span>
            <h3>{category.name}</h3>
            <p><b>მაგალითები:</b> {category.examples}</p>
            <p><b>ტექნიკური პირობების განსაკუთრებული საკითხები:</b> {category.technical}</p>
            <p>კონკრეტული გარანტიის ვადა და დაფარვა განისაზღვრება ინდივიდუალური საგარანტიო ბარათით.</p>
          </div>
        ) : null}
      </div>
    </>
  )
}

type LookupResult = {
  warrantyNumber: string
  category: string | null
  brand: string
  productName: string
  model: string | null
  serialNumber: string
  warrantyStart: string
  warrantyMonths: number
  warrantyEnd: string
  status: WarrantyStatus
}

export function WarrantyLookup() {
  const [warrantyNumber, setWarrantyNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/warranty/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warrantyNumber, serialNumber }),
      })
      const payload = await response.json()
      if (response.ok) {
        setResult(payload.warranty as LookupResult)
      } else if (response.status === 404) {
        setError('ამ მონაცემებით გარანტია ვერ მოიძებნა. გადაამოწმეთ სერტიფიკატის ნომერი და სერიული ნომერი.')
      } else {
        setError('შემოწმება დროებით მიუწვდომელია. გთხოვთ, დაგვიკავშირდეთ.')
      }
    } catch {
      setError('შემოწმება ვერ შესრულდა. შეამოწმეთ ინტერნეტთან კავშირი და სცადეთ თავიდან.')
    } finally {
      setBusy(false)
    }
  }

  const tone = result ? WARRANTY_PUBLIC_STATUS[result.status] : null

  return (
    <div className={styles.lookup}>
      <form className={styles.lookupForm} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="warranty-number">სერტიფიკატის ნომერი</label>
          <input id="warranty-number" required maxLength={80} autoComplete="off" value={warrantyNumber} onChange={(event) => setWarrantyNumber(event.target.value)} placeholder="WR-2026-001000" />
        </div>
        <div className={styles.field}>
          <label htmlFor="warranty-serial">სერიული ნომერი (S/N)</label>
          <input id="warranty-serial" required maxLength={160} autoComplete="off" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="მოწყობილობის სერიული ნომერი" />
        </div>
        <button className={styles.btn} type="submit" disabled={busy}>{busy ? 'მოწმდება...' : 'შემოწმება'}</button>
      </form>
      <p className={styles.lookupHint}>სერტიფიკატის ნომერი მითითებულია საგარანტიო ბარათზე; ბარათზე არსებული QR კოდი სრულ დოკუმენტს ხსნის.</p>

      {error ? <p className={styles.lookupError} role="alert">{error}</p> : null}

      {result && tone ? (
        <div className={styles.result} aria-live="polite">
          <div className={styles.resultBanner} style={{ background: tone.background, borderColor: tone.border, color: tone.color }}>
            <strong>{tone.title}</strong>
            <span>{tone.text}</span>
          </div>
          <div className={styles.resultGrid}>
            <div><span>სერტიფიკატი</span><strong>{result.warrantyNumber}</strong></div>
            <div><span>პროდუქტი</span><strong>{result.productName}</strong></div>
            <div><span>მწარმოებელი / მოდელი</span><strong>{result.brand}{result.model ? ` / ${result.model}` : ''}</strong></div>
            <div><span>სერიული ნომერი</span><strong>{result.serialNumber}</strong></div>
            <div><span>საგარანტიო ვადა</span><strong>{result.warrantyMonths} თვე</strong></div>
            <div><span>მოქმედების პერიოდი</span><strong>{formatIsoDate(result.warrantyStart)} – {formatIsoDate(result.warrantyEnd)}</strong></div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
