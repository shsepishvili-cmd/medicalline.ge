'use client'

import { useEffect, useState } from 'react'
import styles from '@/app/expo2026/expo.module.css'

type Category = { slug: string; name_ka: string | null }

// Phone photos are large and may be HEIC; re-encoding through a canvas gives a
// small JPEG every browser can show. Falls back to the original file.
async function toJpeg(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob || file
  } catch {
    return file
  }
}

export function QuickAddProduct({ accessToken, categories, onAdded }: { accessToken: string; categories: Category[]; onAdded: (name: string, where: { inExpo: boolean; inCatalog: boolean }) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('სიახლე')
  const [specs, setSpecs] = useState('')
  const [inExpo, setInExpo] = useState(true)
  const [inCatalog, setInCatalog] = useState(true)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function pickPhoto(file: File | null) {
    setPhoto(file)
    setPreview(file ? URL.createObjectURL(file) : '')
  }

  function reset() {
    setName(''); setBrand(''); setCategory(''); setDescription(''); setNote('სიახლე'); setSpecs(''); setInExpo(true); setInCatalog(true); pickPhoto(null); setError('')
  }

  async function submit() {
    setError('')
    if (name.trim().length < 2) return setError('მიუთითეთ დასახელება.')
    if (!brand.trim()) return setError('მიუთითეთ ბრენდი.')
    if (!photo) return setError('დაამატეთ ფოტო.')
    if (!inExpo && !inCatalog) return setError('მონიშნეთ, სად გამოჩნდეს.')
    setBusy(true)
    const image = await toJpeg(photo)
    const form = new FormData()
    form.set('name', name); form.set('brand', brand); form.set('category', category)
    form.set('description', description); form.set('note', note); form.set('specs', specs)
    form.set('inExpo', inExpo ? '1' : '0'); form.set('inCatalog', inCatalog ? '1' : '0')
    form.set('photo', image, 'photo.jpg')
    const response = await fetch('/api/admin/expo/products', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }).catch(() => null)
    const payload = response ? await response.json().catch(() => ({})) : {}
    setBusy(false)
    if (!response?.ok) return setError(payload.error || 'ვერ დაემატა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.')
    const added = name.trim()
    reset(); setOpen(false)
    onAdded(added, { inExpo, inCatalog })
  }

  if (!open) {
    return <button type="button" className={styles.btn} style={{ width: '100%', margin: '14px 0 4px', padding: '14px 20px', fontSize: 15 }} onClick={() => setOpen(true)}>+ ახალი პროდუქტი (კატალოგი / Expo)</button>
  }

  return (
    <div className={styles.step} style={{ margin: '14px 0' }}>
      <h3 style={{ marginTop: 0 }}>ახალი პროდუქტი</h3>
      <p className={styles.muted} style={{ margin: 0 }}>საიტზე დაახლოებით 1 წუთში გამოჩნდება. ფასი აქ არ იწერება.</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
        <label className={styles.check} style={{ marginTop: 0, fontSize: 14 }}><input type="checkbox" checked={inCatalog} onChange={(event) => setInCatalog(event.target.checked)} /> მთავარ კატალოგში</label>
        <label className={styles.check} style={{ marginTop: 0, fontSize: 14 }}><input type="checkbox" checked={inExpo} onChange={(event) => setInExpo(event.target.checked)} /> Expo კატალოგში</label>
      </div>
      <label className={styles.field}>ფოტო *
        <input type="file" accept="image/*" onChange={(event) => pickPhoto(event.target.files?.[0] || null)} />
      </label>
      {preview ? <img src={preview} alt="" style={{ marginTop: 8, maxHeight: 180, maxWidth: '100%', borderRadius: 10, objectFit: 'contain', background: '#f0f4fa' }} /> : null}
      <label className={styles.field}>დასახელება *<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="მაგ.: Intraoral Scanner X5" /></label>
      <label className={styles.field}>ბრენდი *<input value={brand} maxLength={60} onChange={(event) => setBrand(event.target.value)} placeholder="მაგ.: Eighteeth" /></label>
      <label className={styles.field}>კატეგორია
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">— არ მივუთითებ —</option>
          {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name_ka || item.slug}</option>)}
        </select>
      </label>
      <label className={styles.field}>მოკლე აღწერა<textarea rows={3} value={description} maxLength={600} onChange={(event) => setDescription(event.target.value)} placeholder="რას აკეთებს, ძირითადი უპირატესობა" /></label>
      <label className={styles.field}>მახასიათებლები (თითო ხაზზე ერთი)<textarea rows={4} value={specs} maxLength={2000} onChange={(event) => setSpecs(event.target.value)} placeholder={'მაგ.: სკანირების სიჩქარე 30 fps\nწონა 150 გ'} /></label>
      <label className={styles.field}>წარწერა ბარათზე (Expo)<input value={note} maxLength={80} onChange={(event) => setNote(event.target.value)} /></label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.row}>
        <button type="button" className={`${styles.btn} ${styles.btnLight}`} disabled={busy} onClick={() => { reset(); setOpen(false) }}>გაუქმება</button>
        <button type="button" className={styles.btn} disabled={busy} onClick={submit}>{busy ? 'იტვირთება...' : 'დამატება'}</button>
      </div>
    </div>
  )
}
