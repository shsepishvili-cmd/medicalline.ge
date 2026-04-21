'use client'

// =============================================================================
// Admin > Academy > Videos list
// Features: search, filter by product/category/featured/active, inline toggle,
// stats bar, thumbnail previews, edit / delete actions.
// =============================================================================

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  useAcademyAdminGate,
  AcademyAdminShell,
  VideoTypeBadge,
  ActiveBadge,
  colors,
  ui,
  InfoStat,
  EmptyState,
  LoadingView,
  AuthBlockedView,
} from './_components/AcademyUi'
import { adminGetAllVideos, adminGetProducts, getYouTubeThumbnail } from '@/app/lib/academy'
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from '@/app/lib/academy-types'
import type { AcademyVideo, AcademyProductRef } from '@/app/lib/academy-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ka-GE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AcademyAdminPage() {
  const { loading, error, profile } = useAcademyAdminGate()

  const [videos, setVideos] = useState<AcademyVideo[]>([])
  const [products, setProducts] = useState<AcademyProductRef[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFeatured, setFilterFeatured] = useState<'' | 'yes' | 'no'>('')
  const [filterActive, setFilterActive] = useState<'' | 'yes' | 'no'>('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    if (loading || error) return
    Promise.all([adminGetAllVideos(), adminGetProducts()]).then(
      ([vids, prods]) => {
        setVideos(vids)
        setProducts(prods)
        setDataLoading(false)
      },
    )
  }, [loading, error])

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return videos.filter(v => {
      if (q && !v.title.toLowerCase().includes(q) &&
          !(v.products as any)?.name?.toLowerCase().includes(q)) return false
      if (filterProduct && v.product_id !== filterProduct) return false
      if (filterType && v.video_type !== filterType) return false
      if (filterFeatured === 'yes' && !v.is_featured) return false
      if (filterFeatured === 'no' && v.is_featured) return false
      if (filterActive === 'yes' && !v.is_active) return false
      if (filterActive === 'no' && v.is_active) return false
      return true
    })
  }, [videos, search, filterProduct, filterType, filterFeatured, filterActive])

  // Stats
  const total    = videos.length
  const active   = videos.filter(v => v.is_active).length
  const featured = videos.filter(v => v.is_featured).length

  // Inline active toggle
  async function toggleActive(video: AcademyVideo) {
    setTogglingId(video.id)
    const { error: err } = await supabase
      .from('academy_videos')
      .update({ is_active: !video.is_active })
      .eq('id', video.id)
    if (!err) {
      setVideos(vs =>
        vs.map(v => (v.id === video.id ? { ...v, is_active: !v.is_active } : v)),
      )
    }
    setTogglingId(null)
  }

  // Inline featured toggle
  async function toggleFeatured(video: AcademyVideo) {
    setTogglingId(video.id)
    const { error: err } = await supabase
      .from('academy_videos')
      .update({ is_featured: !video.is_featured })
      .eq('id', video.id)
    if (!err) {
      setVideos(vs =>
        vs.map(v => (v.id === video.id ? { ...v, is_featured: !v.is_featured } : v)),
      )
    }
    setTogglingId(null)
  }

  // Delete
  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('academy_videos').delete().eq('id', id)
    setVideos(vs => vs.filter(v => v.id !== id))
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  // ---------------------------------------------------------------------------
  // Gate guards
  // ---------------------------------------------------------------------------
  if (loading) return <LoadingView label="მოდული იტვირთება..." />
  if (error)   return <AuthBlockedView message={error} />
  if (!profile) return null

  return (
    <AcademyAdminShell
      title="აკადემია — ვიდეოები"
      subtitle="სასწავლო YouTube ვიდეოების მართვა პროდუქტების მიხედვით."
      profile={profile}
    >
      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <InfoStat value={total}    label="სულ ვიდეო" />
        <InfoStat value={active}   label="აქტიური" />
        <InfoStat value={featured} label="რჩეული" />
      </div>

      {/* ── Filters ── */}
      <div style={{ ...ui.panel }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {/* Search */}
          <input
            style={ui.input}
            placeholder="ძებნა სათაურით..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Product filter */}
          <select
            style={{ ...ui.input, appearance: 'auto' } as React.CSSProperties}
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
          >
            <option value="">ყველა პროდუქტი</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.brand ? `${p.brand} · ` : ''}{p.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            style={{ ...ui.input, appearance: 'auto' } as React.CSSProperties}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">ყველა კატეგორია</option>
            {VIDEO_TYPES.map(t => (
              <option key={t} value={t}>{VIDEO_TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Featured filter */}
          <select
            style={{ ...ui.input, appearance: 'auto' } as React.CSSProperties}
            value={filterFeatured}
            onChange={e => setFilterFeatured(e.target.value as '' | 'yes' | 'no')}
          >
            <option value="">ყველა (featured)</option>
            <option value="yes">მხოლოდ რჩეული</option>
            <option value="no">არ არის რჩეული</option>
          </select>

          {/* Active filter */}
          <select
            style={{ ...ui.input, appearance: 'auto' } as React.CSSProperties}
            value={filterActive}
            onChange={e => setFilterActive(e.target.value as '' | 'yes' | 'no')}
          >
            <option value="">ყველა (სტატუსი)</option>
            <option value="yes">მხოლოდ აქტიური</option>
            <option value="no">არააქტიური</option>
          </select>

          {/* Reset */}
          {(search || filterProduct || filterType || filterFeatured || filterActive) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setFilterProduct('')
                setFilterType('')
                setFilterFeatured('')
                setFilterActive('')
              }}
              style={{ ...ui.secondaryButton, fontSize: 13 }}
            >
              ფილტრის გასუფთავება
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {dataLoading ? (
        <div style={{ ...ui.panel, textAlign: 'center', padding: 28 }}>
          <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>ვიდეოები იტვირთება...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ვიდეო ვერ მოიძებნა"
          description="შეცვალეთ ფილტრი ან დაამატეთ ახალი ვიდეო."
          action={
            <Link href="/admin/academy/new" style={ui.primaryButton}>
              + ვიდეოს დამატება
            </Link>
          }
        />
      ) : (
        <div style={{ ...ui.card, overflow: 'hidden' }}>
          {/* Count row */}
          <div
            style={{
              padding: '10px 18px',
              background: '#F8FAFF',
              borderBottom: `1px solid ${colors.border}`,
              fontSize: 13,
              color: colors.muted,
            }}
          >
            ნაჩვენებია {filtered.length} / {total} ვიდეო
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#F8FAFF',
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {[
                    '',
                    'სათაური',
                    'პროდუქტი',
                    'კატეგორია',
                    'სტატუსი',
                    'რჩეული',
                    'რიგი',
                    'თარიღი',
                    'მოქმედება',
                  ].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: colors.muted,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(video => {
                  const thumb =
                    video.thumbnail_url ||
                    (video.youtube_video_id
                      ? getYouTubeThumbnail(video.youtube_video_id)
                      : null)
                  const product = (video as any).products as AcademyProductRef | null
                  const isToggling = togglingId === video.id
                  const isConfirmingDelete = confirmDeleteId === video.id

                  return (
                    <tr
                      key={video.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        background: video.is_active ? '#fff' : '#FAFAFA',
                      }}
                    >
                      {/* Thumbnail */}
                      <td style={{ padding: '8px 14px' }}>
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={video.title}
                            style={{
                              width: 80,
                              height: 45,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: `1px solid ${colors.border}`,
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 80,
                              height: 45,
                              borderRadius: 6,
                              background: '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                            }}
                          >
                            ▶
                          </div>
                        )}
                      </td>

                      {/* Title */}
                      <td style={{ padding: '8px 14px', maxWidth: 260 }}>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: colors.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                          }}
                        >
                          {video.title}
                        </p>
                        {video.channel_title && (
                          <p style={{ margin: '3px 0 0', fontSize: 11, color: colors.muted }}>
                            {video.channel_title}
                          </p>
                        )}
                        {video.youtube_video_id && (
                          <a
                            href={`https://youtu.be/${video.youtube_video_id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11,
                              color: '#1D4ED8',
                              textDecoration: 'none',
                            }}
                          >
                            YouTube ↗
                          </a>
                        )}
                      </td>

                      {/* Product */}
                      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        {product ? (
                          <span style={{ fontSize: 12, color: colors.text }}>
                            {product.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: colors.muted }}>—</span>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '8px 14px' }}>
                        <VideoTypeBadge type={video.video_type} />
                      </td>

                      {/* Active toggle */}
                      <td style={{ padding: '8px 14px' }}>
                        <button
                          type="button"
                          onClick={() => toggleActive(video)}
                          disabled={isToggling}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            opacity: isToggling ? 0.5 : 1,
                          }}
                          title={video.is_active ? 'გამორთვა' : 'ჩართვა'}
                        >
                          <ActiveBadge active={video.is_active} />
                        </button>
                      </td>

                      {/* Featured toggle */}
                      <td style={{ padding: '8px 14px' }}>
                        <button
                          type="button"
                          onClick={() => toggleFeatured(video)}
                          disabled={isToggling}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 18,
                            opacity: isToggling ? 0.5 : 1,
                          }}
                          title={video.is_featured ? 'featured-დან ამოშლა' : 'featured-ში დამატება'}
                        >
                          {video.is_featured ? '★' : '☆'}
                        </button>
                      </td>

                      {/* Sort order */}
                      <td
                        style={{
                          padding: '8px 14px',
                          textAlign: 'center',
                          color: colors.muted,
                        }}
                      >
                        {video.sort_order}
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          padding: '8px 14px',
                          whiteSpace: 'nowrap',
                          color: colors.muted,
                          fontSize: 12,
                        }}
                      >
                        {formatDate(video.created_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        {isConfirmingDelete ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#B91C1C' }}>
                              დარწმუნებული?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(video.id)}
                              disabled={deletingId === video.id}
                              style={{
                                ...ui.primaryButton,
                                background: '#DC2626',
                                padding: '5px 10px',
                                fontSize: 11,
                              }}
                            >
                              {deletingId === video.id ? '...' : 'წაშლა'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                ...ui.secondaryButton,
                                padding: '5px 10px',
                                fontSize: 11,
                              }}
                            >
                              არა
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Link
                              href={`/admin/academy/${video.id}/edit`}
                              style={{
                                ...ui.secondaryButton,
                                padding: '5px 12px',
                                fontSize: 12,
                              }}
                            >
                              რედაქტირება
                            </Link>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(video.id)}
                              style={{
                                ...ui.secondaryButton,
                                padding: '5px 12px',
                                fontSize: 12,
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                              }}
                            >
                              წაშლა
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AcademyAdminShell>
  )
}
