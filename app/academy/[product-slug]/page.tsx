'use client'

// =============================================================================
// Public Product Academy page – /academy/[product-slug]
//
// Layout:
//   1. Product header
//   2. Featured video (embedded iframe, if any)
//   3. Video sections grouped by category:
//      Setup → Training → Troubleshooting → Demo → Marketing
// =============================================================================

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProductBySlug,
  getPublicVideosForProduct,
  groupVideosByType,
  getYouTubeThumbnail,
  formatDuration,
} from '@/app/lib/academy'
import { VIDEO_TYPE_ORDER, VIDEO_TYPE_LABELS } from '@/app/lib/academy-types'
import type { AcademyVideo, AcademyProductRef, VideoType } from '@/app/lib/academy-types'

// ---------------------------------------------------------------------------
// Video thumbnail card (for non-featured videos)
// ---------------------------------------------------------------------------

function VideoCard({ video }: { video: AcademyVideo }) {
  const thumb =
    video.thumbnail_url ||
    (video.youtube_video_id
      ? getYouTubeThumbnail(video.youtube_video_id)
      : null)

  const duration = formatDuration(video.duration_iso)
  const youtubeHref = video.youtube_video_id
    ? `https://youtu.be/${video.youtube_video_id}`
    : (video.youtube_url ?? '#')

  return (
    <a
      href={youtubeHref}
      target="_blank"
      rel="noreferrer"
      className="group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-50">
            <span className="text-3xl">▶</span>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-blue-600 text-xl ml-1">▶</span>
          </div>
        </div>
        {video.is_featured && (
          <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            ★ რჩეული
          </span>
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-mono px-2 py-0.5 rounded">
            {duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{video.description}</p>
        )}
        {video.channel_title && (
          <p className="mt-2 text-[11px] text-slate-400">{video.channel_title}</p>
        )}
      </div>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Featured hero video (embedded YouTube iframe)
// ---------------------------------------------------------------------------

function FeaturedVideoPlayer({ video }: { video: AcademyVideo }) {
  const youtubeHref = video.youtube_video_id
    ? `https://youtu.be/${video.youtube_video_id}`
    : (video.youtube_url ?? '#')

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Embed */}
      {video.youtube_video_id ? (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_video_id}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        // Fallback thumbnail if no video ID
        <a href={youtubeHref} target="_blank" rel="noreferrer" className="block aspect-video relative">
          <img
            src={video.thumbnail_url ?? ''}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <span className="text-blue-600 text-3xl ml-2">▶</span>
            </div>
          </div>
        </a>
      )}

      {/* Info below embed */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
              ★ რჩეული ვიდეო
            </span>
            <h2 className="mt-2 text-lg font-black text-slate-900 leading-snug">
              {video.title}
            </h2>
            {video.description && (
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {video.description}
              </p>
            )}
          </div>
          <a
            href={youtubeHref}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition"
          >
            YouTube ↗
          </a>
        </div>
        {(video.channel_title || formatDuration(video.duration_iso)) && (
          <p className="mt-3 text-xs text-slate-400">
            {video.channel_title}
            {video.channel_title && formatDuration(video.duration_iso) ? ' · ' : ''}
            {formatDuration(video.duration_iso)}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Category section
// ---------------------------------------------------------------------------

const SECTION_ICON: Record<VideoType, string> = {
  setup:          '⚙️',
  training:       '📚',
  troubleshooting:'🔧',
  demo:           '🎬',
  marketing:      '📣',
}

function CategorySection({
  type,
  videos,
}: {
  type: VideoType
  videos: AcademyVideo[]
}) {
  if (videos.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{SECTION_ICON[type]}</span>
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {VIDEO_TYPE_LABELS[type]}
          </h2>
          <p className="text-xs text-slate-400">{videos.length} ვიდეო</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map(v => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductAcademyPage() {
  const params = useParams()
  const slug =
    typeof params['product-slug'] === 'string'
      ? params['product-slug']
      : Array.isArray(params['product-slug'])
        ? params['product-slug'][0]
        : ''

  const [product, setProduct]   = useState<AcademyProductRef | null>(null)
  const [videos, setVideos]     = useState<AcademyVideo[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    getProductBySlug(slug).then(prod => {
      if (!prod) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setProduct(prod)
      getPublicVideosForProduct(prod.id).then(vids => {
        setVideos(vids)
        setLoading(false)
      })
    })
  }, [slug])

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">იტვირთება...</p>
        </div>
      </main>
    )
  }

  if (notFound || !product) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-5xl mb-4">😕</p>
          <h1 className="text-2xl font-black text-slate-800 mb-3">
            პროდუქტი ვერ მოიძებნა
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            ეს გვერდი არ არსებობს ან პროდუქტს სასწავლო ვიდეოები არ აქვს.
          </p>
          <Link
            href="/academy"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition"
          >
            ← აკადემია
          </Link>
        </div>
      </main>
    )
  }

  const grouped = groupVideosByType(videos)
  const featured = videos.filter(v => v.is_featured)
  const heroVideo = featured[0] ?? null
  const totalVideos = videos.length

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ── Product header ── */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-widest mb-6">
            <Link href="/academy" className="hover:text-white transition">
              აკადემია
            </Link>
            <span>/</span>
            <span className="text-blue-100">{product.name}</span>
          </nav>

          {product.brand && (
            <p className="text-blue-300 text-xs font-black uppercase tracking-widest mb-2">
              {product.brand}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            {product.name}
          </h1>
          <p className="text-blue-200 text-base">
            {totalVideos} სასწავლო{' '}
            {totalVideos === 1 ? 'ვიდეო' : 'ვიდეო'}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-14">

        {/* ── Featured video player ── */}
        {heroVideo && (
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-5">
              ★ რჩეული ვიდეო
            </h2>
            <div className="max-w-3xl">
              <FeaturedVideoPlayer video={heroVideo} />
            </div>
          </section>
        )}

        {/* ── No videos state ── */}
        {totalVideos === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <p className="text-4xl mb-4">🎓</p>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              ვიდეოები მალე დაემატება
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              ამ პროდუქტისთვის სასწავლო მასალები ამჟამად მზადდება.
            </p>
            <Link
              href="/academy"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
            >
              ← სხვა პროდუქტები
            </Link>
          </div>
        )}

        {/* ── Grouped category sections ── */}
        {VIDEO_TYPE_ORDER.map(type => (
          <CategorySection
            key={type}
            type={type}
            videos={grouped[type]}
          />
        ))}

        {/* ── Footer nav ── */}
        <div className="border-t border-slate-200 pt-8 flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/academy"
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition"
          >
            ← ყველა პროდუქტი
          </Link>
          <Link
            href="/catalog"
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition"
          >
            პროდუქტების კატალოგი →
          </Link>
        </div>
      </div>
    </main>
  )
}
