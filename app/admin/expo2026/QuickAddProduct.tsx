'use client'

import { useEffect, useState } from 'react'
import styles from '@/app/expo2026/expo.module.css'

type Category = { slug: string; name_ka: string | null }

// Phone photos are large and may be HEIC; re-encoding through a canvas gives a
// small JPEG every browser can show, turned by the chosen quarter turns.
// Falls back to the original file (unrotated) if the browser cannot decode it.
export async function toJpeg(file: File, quarterTurns = 0): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const turns = ((quarterTurns % 4) + 4) % 4
    const canvas = document.createElement('canvas')
    canvas.width = turns % 2 ? height : width
    canvas.height = turns % 2 ? width : height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((turns * Math.PI) / 2)
    context.drawImage(bitmap, -width / 2, -height / 2, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob || file
  } catch {
    return file
  }
}

// File picker with a preview that can be turned in quarter steps.
export function PhotoField({ file, turns, onFile, onTurn, label = 'ფოტო *' }: { file: File | null; turns: number; onFile: (file: File | null) => void; onTurn: (turns: number) => void; label?: string }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <>
      <label className={styles.field}>{label}
        <input type="file" accept="image/*" onChange={(event) => { onFile(event.target.files?.[0] || null); onTurn(0) }} />
      </label>
      {preview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 180, height: 180, borderRadius: 10, background: '#f0f4fa', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <img src={preview} alt="" style={{ maxWidth: 170, maxHeight: 170, objectFit: 'contain', transform: `rotate(${turns * 90}deg)`, transition: 'transform .2s' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" className={`${styles.btn} ${styles.btnLight}`} style={{ padding: '8px 12px' }} onClick={() => onTurn(turns - 1)}>↺ მარცხნივ</button>
            <button type="button" className={`${styles.btn} ${styles.btnLight}`} style={{ padding: '8px 12px' }} onClick={() => onTurn(turns + 1)}>↻ მარჯვნივ</button>
          </div>
        </div>
      ) : null}
    </>
  )
}

// Replaces the main photo of a product (by id for admin-added, by slug for
// built-in catalogue products).
export function PhotoReplace({ accessToken, target, onDone, onCancel }: { accessToken: string; target: { productId?: string; slug?: string }; onDone: () => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [turns, setTurns] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    if (!file) { setError('აირჩიეთ ფოტო.'); return }
    setBusy(true); setError('')
    const form = new FormData()
    if (target.productId) form.set('productId', target.productId)
    if (target.slug) form.set('slug', target.slug)
    form.set('photo', await toJpeg(file, turns), 'photo.jpg')
    const response = await fetch('/api/admin/products/photo', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }).catch(() => null)
    const payload = response ? await response.json().catch(() => ({})) : {}
    setBusy(false)
    if (!response?.ok) { setError(payload.error || 'ფოტო ვერ შეიცვალა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.'); return }
    onDone()
  }
  return (
    <div style={{ marginTop: 10 }}>
      <PhotoField file={file} turns={turns} onFile={setFile} onTurn={setTurns} label="ახალი ფოტო" />
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.row}>
        <button type="button" className={`${styles.btn} ${styles.btnLight}`} disabled={busy} onClick={onCancel}>გაუქმება</button>
        <button type="button" className={styles.btn} disabled={busy || !file} onClick={save}>{busy ? 'იტვირთება...' : 'ფოტოს შენახვა'}</button>
      </div>
    </div>
  )
}

type Defaults = { inExpo: boolean; inCatalog: boolean; note: string }
const EXPO_DEFAULTS: Defaults = { inExpo: true, inCatalog: true, note: 'სიახლე' }

export function QuickAddProduct({ accessToken, categories, onAdded, defaults = EXPO_DEFAULTS }: { accessToken: string; categories: Category[]; onAdded: (name: string, where: { inExpo: boolean; inCatalog: boolean }) => void; defaults?: Defaults }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState(defaults.note)
  const [specs, setSpecs] = useState('')
  const [inExpo, setInExpo] = useState(defaults.inExpo)
  const [inCatalog, setInCatalog] = useState(defaults.inCatalog)
  const [photo, setPhoto] = useState<File | null>(null)
  const [turns, setTurns] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function pickPhoto(file: File | null) {
    setPhoto(file)
    setTurns(0)
  }

  function reset() {
    setName(''); setBrand(''); setCategory(''); setDescription(''); setNote(defaults.note); setSpecs(''); setInExpo(defaults.inExpo); setInCatalog(defaults.inCatalog); pickPhoto(null); setError('')
  }

  async function submit() {
    setError('')
    if (name.trim().length < 2) return setError('მიუთითეთ დასახელება.')
    if (!brand.trim()) return setError('მიუთითეთ ბრენდი.')
    if (!photo) return setError('დაამატეთ ფოტო.')
    if (!inExpo && !inCatalog) return setError('მონიშნეთ, სად გამოჩნდეს.')
    setBusy(true)
    const image = await toJpeg(photo, turns)
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
      <PhotoField file={photo} turns={turns} onFile={pickPhoto} onTurn={setTurns} />
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
