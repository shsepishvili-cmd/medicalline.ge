'use client'

// =============================================================================
// VideoForm – reusable create / edit form for academy_videos
// Used by both /admin/academy/new and /admin/academy/[id]/edit
// =============================================================================

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { ui, colors, Field } from './AcademyUi'
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from '@/app/lib/academy-types'
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  adminGetProducts,
} from '@/app/lib/academy'
import type {
  AcademyVideoFormValues,
  AcademyProductRef,
  AcademyVideo,
  VideoType,
} from '@/app/lib/academy-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyForm(): AcademyVideoFormValues {
  return {
    product_id:      '',
    title:           '',
    description:     '',
    video_type:      'training',
    youtube_url:     '',
    youtube_video_id:'',
    thumbnail_url:   '',
    channel_title:   '',
    published_at:    '',
    duration_iso:    '',
    language_code:   'ka',
    is_featured:     false,
    is_active:       true,
    sort_order:      '0',
    added_manually:  true,
    notes:           '',
  }
}

function videoToForm(v: AcademyVideo): AcademyVideoFormValues {
  return {
    product_id:      v.product_id ?? '',
    title:           v.title,
    description:     v.description ?? '',
    video_type:      v.video_type,
    youtube_url:     v.youtube_url ?? '',
    youtube_video_id:v.youtube_video_id ?? '',
    thumbnail_url:   v.thumbnail_url ?? '',
    channel_title:   v.channel_title ?? '',
    published_at:    v.published_at ? v.published_at.split('T')[0] : '',
    duration_iso:    v.duration_iso ?? '',
    language_code:   v.language_code,
    is_featured:     v.is_featured,
    is_active:       v.is_active,
    sort_order:      String(v.sort_order ?? 0),
    added_manually:  v.added_manually,
    notes:           v.notes ?? '',
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VideoForm({
  videoId,
  initialVideo,
}: {
  videoId?: string
  initialVideo?: AcademyVideo | null
}) {
  const router = useRouter()
  const isEdit = Boolean(videoId)

  const [values, setValues] = useState<AcademyVideoFormValues>(() =>
    initialVideo ? videoToForm(initialVideo) : emptyForm(),
  )
  const [products, setProducts] = useState<AcademyProductRef[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [thumbPreview, setThumbPreview] = useState(
    initialVideo?.thumbnail_url ?? '',
  )

  // Load products dropdown once
  useEffect(() => {
    adminGetProducts().then(setProducts)
  }, [])

  // Keep thumbnail preview in sync with the video ID field
  useEffect(() => {
    if (values.youtube_video_id) {
      setThumbPreview(getYouTubeThumbnail(values.youtube_video_id))
    }
  }, [values.youtube_video_id])

  function set<K extends keyof AcademyVideoFormValues>(
    key: K,
    value: AcademyVideoFormValues[K],
  ) {
    setValues(v => ({ ...v, [key]: value }))
  }

  // Auto-extract the video ID when a YouTube URL is pasted
  function handleUrlChange(url: string) {
    set('youtube_url', url)
    const id = extractYouTubeId(url)
    if (id) {
      set('youtube_video_id', id)
      if (!values.thumbnail_url) {
        const thumb = getYouTubeThumbnail(id)
        set('thumbnail_url', thumb)
        setThumbPreview(thumb)
      }
    }
  }

  function handleIdChange(id: string) {
    set('youtube_video_id', id)
    if (id && !values.thumbnail_url) {
      const thumb = getYouTubeThumbnail(id)
      set('thumbnail_url', thumb)
      setThumbPreview(thumb)
    }
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!values.title.trim()) {
      setError('სათაური სავალდებულოა.')
      return
    }
    if (!values.youtube_video_id.trim() && !values.youtube_url.trim()) {
      setError('YouTube ბმული ან ვიდეო ID სავალდებულოა.')
      return
    }

    setSaving(true)

    const payload = {
      product_id:       values.product_id || null,
      title:            values.title.trim(),
      description:      values.description.trim() || null,
      video_type:       values.video_type,
      youtube_url:      values.youtube_url.trim() || null,
      youtube_video_id: values.youtube_video_id.trim() || null,
      thumbnail_url:    values.thumbnail_url.trim() || null,
      channel_title:    values.channel_title.trim() || null,
      published_at:     values.published_at || null,
      duration_iso:     values.duration_iso.trim() || null,
      language_code:    values.language_code.trim() || 'ka',
      is_featured:      values.is_featured,
      is_active:        values.is_active,
      sort_order:       parseInt(values.sort_order, 10) || 0,
      added_manually:   values.added_manually,
      notes:            values.notes.trim() || null,
    }

    const { error: dbError } = isEdit && videoId
      ? await supabase.from('academy_videos').update(payload).eq('id', videoId)
      : await supabase.from('academy_videos').insert(payload)

    setSaving(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/admin/academy'), 900)
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    if (!videoId) return
    setDeleting(true)
    await supabase.from('academy_videos').delete().eq('id', videoId)
    router.push('/admin/academy')
  }

  // ---------------------------------------------------------------------------
  // Styles shortcuts
  // ---------------------------------------------------------------------------
  const inp = ui.input
  const sel: React.CSSProperties = { ...ui.input, appearance: 'auto' }
  const chkRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  }
  const section: React.CSSProperties = {
    ...ui.panel,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  }
  const sectionTitle: React.CSSProperties = {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: colors.text,
    paddingBottom: 10,
    borderBottom: `1px solid ${colors.border}`,
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      {/* ── Alerts ── */}
      {error && (
        <div
          style={{
            ...ui.panel,
            background: '#FFF5F5',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: 14,
          }}
        >
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div
          style={{
            ...ui.panel,
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#15803D',
            fontSize: 14,
          }}
        >
          ✓ შენახულია! გადამისამართება...
        </div>
      )}

      {/* ── Basic info ── */}
      <div style={section}>
        <p style={sectionTitle}>ძირითადი ინფორმაცია</p>

        <Field label="პროდუქტი">
          <select
            style={sel}
            value={values.product_id}
            onChange={e => set('product_id', e.target.value)}
          >
            <option value="">— პროდუქტი არ არის მითითებული —</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.brand ? `${p.brand} · ` : ''}{p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="სათაური *">
          <input
            style={inp}
            value={values.title}
            onChange={e => set('title', e.target.value)}
            placeholder="ვიდეოს სათაური"
            required
          />
        </Field>

        <Field label="კატეგორია">
          <select
            style={sel}
            value={values.video_type}
            onChange={e => set('video_type', e.target.value as VideoType)}
          >
            {VIDEO_TYPES.map(t => (
              <option key={t} value={t}>
                {VIDEO_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="აღწერა">
          <textarea
            style={ui.textarea}
            value={values.description}
            onChange={e => set('description', e.target.value)}
            placeholder="ვიდეოს მოკლე აღწერა (სურვილისამებრ)"
          />
        </Field>
      </div>

      {/* ── YouTube info ── */}
      <div style={section}>
        <p style={sectionTitle}>YouTube ინფორმაცია</p>

        <Field label="YouTube ბმული">
          <input
            style={inp}
            value={values.youtube_url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Field>

        <Field label="YouTube ვიდეო ID">
          <input
            style={inp}
            value={values.youtube_video_id}
            onChange={e => handleIdChange(e.target.value)}
            placeholder="dQw4w9WgXcQ"
            maxLength={11}
          />
        </Field>

        <Field label="მინიატურის ბმული">
          <input
            style={inp}
            value={values.thumbnail_url}
            onChange={e => {
              set('thumbnail_url', e.target.value)
              setThumbPreview(e.target.value)
            }}
            placeholder="https://img.youtube.com/vi/.../hqdefault.jpg"
          />
        </Field>

        {thumbPreview && (
          <div>
            <span style={ui.label}>მინიატურის გადახედვა</span>
            <img
              src={thumbPreview}
              alt="Thumbnail preview"
              style={{
                width: 240,
                height: 135,
                objectFit: 'cover',
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                display: 'block',
              }}
            />
          </div>
        )}

        <Field label="არხის სახელი">
          <input
            style={inp}
            value={values.channel_title}
            onChange={e => set('channel_title', e.target.value)}
            placeholder="Medical Line Georgia"
          />
        </Field>
      </div>

      {/* ── Meta ── */}
      <div style={section}>
        <p style={sectionTitle}>მეტა ინფორმაცია</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          <Field label="გამოქვეყნების თარიღი">
            <input
              type="date"
              style={inp}
              value={values.published_at}
              onChange={e => set('published_at', e.target.value)}
            />
          </Field>

          <Field label="ხანგრძლივობა (ISO 8601)">
            <input
              style={inp}
              value={values.duration_iso}
              onChange={e => set('duration_iso', e.target.value)}
              placeholder="PT12M30S"
            />
          </Field>

          <Field label="ენის კოდი">
            <input
              style={inp}
              value={values.language_code}
              onChange={e => set('language_code', e.target.value)}
              placeholder="ka"
              maxLength={10}
            />
          </Field>

          <Field label="დალაგების რიგი">
            <input
              type="number"
              style={inp}
              value={values.sort_order}
              onChange={e => set('sort_order', e.target.value)}
              min={0}
            />
          </Field>
        </div>
      </div>

      {/* ── Status flags ── */}
      <div style={section}>
        <p style={sectionTitle}>სტატუსი და დროშები</p>

        <label style={chkRow}>
          <input
            type="checkbox"
            checked={values.is_featured}
            onChange={e => set('is_featured', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            რჩეული ვიდეო
          </span>
          <span style={{ fontSize: 12, color: colors.muted }}>
            (გამოჩნდება featured განყოფილებაში)
          </span>
        </label>

        <label style={chkRow}>
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={e => set('is_active', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            აქტიურია
          </span>
          <span style={{ fontSize: 12, color: colors.muted }}>
            (მხოლოდ აქტიური ვიდეოები ჩანს საჯარო გვერდზე)
          </span>
        </label>

        <label style={chkRow}>
          <input
            type="checkbox"
            checked={values.added_manually}
            onChange={e => set('added_manually', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            ხელით დამატებული
          </span>
        </label>
      </div>

      {/* ── Internal notes ── */}
      <div style={section}>
        <p style={sectionTitle}>შიდა შენიშვნა</p>
        <Field label="შენიშვნა (ხილული მხოლოდ ადმინებისთვის)">
          <textarea
            style={{ ...ui.textarea, minHeight: 80 }}
            value={values.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="შიდა კომენტარი ადმინ ჯგუფისთვის..."
          />
        </Field>
      </div>

      {/* ── Actions ── */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Delete (edit mode only) */}
        {isEdit && (
          <div>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#B91C1C' }}>
                  დარწმუნებული ხართ?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    ...ui.primaryButton,
                    background: '#DC2626',
                    padding: '8px 14px',
                    fontSize: 13,
                  }}
                >
                  {deleting ? 'იშლება...' : 'წაშლა'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{ ...ui.secondaryButton, padding: '8px 14px', fontSize: 13 }}
                >
                  გაუქმება
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  ...ui.secondaryButton,
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                }}
              >
                წაშლა
              </button>
            )}
          </div>
        )}

        {/* Save / Cancel */}
        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
          <Link href="/admin/academy" style={ui.secondaryButton}>
            გაუქმება
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...ui.primaryButton,
              background: '#1D4ED8',
              opacity: saving ? 0.7 : 1,
              minWidth: 110,
            }}
          >
            {saving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </div>
    </form>
  )
}
