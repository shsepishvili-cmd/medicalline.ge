'use client'

// =============================================================================
// Public Academy landing page – /academy
//
// Sections:
//   1. Hero with search bar
//   2. Product cards (products that have at least one active video)
//   3. Featured videos
//   4. Latest videos
// =============================================================================

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  getAllPublicVideos,
  getProductsWithVideos,
  getFeaturedVideos,
  getLatestVideos,
  getYouTubeThumbnail,
  formatDuration,
} from '@/app/lib/academy'
import { VIDEO_TYPE_LABELS } from '@/app/lib/academy-types'
import type { AcademyVideo, AcademyProductRef } from '@/app/lib/academy-types'

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------

function VideoCard({ video }: { video: AcademyVideo }) {
  const thumb =
    video.thumbnail_url ||
    (video.youtube_video_id
      ? getYouTubeThumbnail(video.youtube_video_id)
      : null)

  const product = (video as any).products as AcademyProductRef | null
  const duration = formatDuration(video.duration_iso)
  const youtubeHref = video.youtube_video_id
    ? `https://youtu.be/${video.youtube_video_id}`
    : video.youtube_url ?? '#'

  return (
    <a
      href={youtubeHref}
      target="_blank"
      rel="noreferrer"
      className="group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
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
            <span className="text-4xl">▶</span>
          </div>
        )}
        {video.is_featured && (
          <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
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
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {VIDEO_TYPE_LABELS[video.video_type] ?? video.video_type}
          </span>
          {product && (
            <span className="text-[11px] text-slate-400 truncate">
              {product.name}
            </span>
          )}
        </div>
        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {video.title}
        </h3>
        {video.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {video.description}
          </p>
        )}
      </div>
    </a>
  )
}

function ProductCard({
  product,
  videoCount,
}: {
  product: AcademyProductRef
  videoCount: number
}) {
  return (
    <Link
      href={`/academy/${product.slug}`}
      className="group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
        <span className="text-lg">🎓</span>
      </div>
      {product.brand && (
        <p className="text-[11px] font-black uppercase tracking-widest text-blue-500 mb-1">
          {product.brand}
        </p>
      )}
      <h3 className="font-black text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">
        {product.name}
      </h3>
      <p className="mt-2 text-[11px] text-slate-400">
        {videoCount} {videoCount === 1 ? 'ვიდეო' : 'ვიდეო'}
      </p>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AcademyPage() {
  const [products, setProducts]   = useState<AcademyProductRef[]>([])
  const [featured, setFeatured]   = useState<AcademyVideo[]>([])
  const [latest, setLatest]       = useState<AcademyVideo[]>([])
  const [allVideos, setAllVideos] = useState<AcademyVideo[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    Promise.all([
      getProductsWithVideos(),
      getFeaturedVideos(6),
      getLatestVideos(8),
      getAllPublicVideos(),
    ]).then(([prods, feat, lat, all]) => {
      setProducts(prods)
      setFeatured(feat)
      setLatest(lat)
      setAllVideos(all)
      setLoading(false)
    })
  }, [])

  // Videos per product (for card counts)
  const videosPerProduct = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of allVideos) {
      if (v.product_id) counts[v.product_id] = (counts[v.product_id] ?? 0) + 1
    }
    return counts
  }, [allVideos])

  // Search: filter both products and latest videos
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q),
    )
  }, [products, search])

  const filteredLatest = useMemo(() => {
    if (!search.trim()) return latest
    const q = search.toLowerCase()
    return latest.filter(
      v =>
        v.title.toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q),
    )
  }, [latest, search])

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white pt-32 pb-20 px-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-4">
            Medical Line Georgia
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            აკადემია
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            სასწავლო რესურსები თქვენი პროდუქტებისთვის
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="მოძებნეთ პროდუქტი ან ვიდეო..."
              className="w-full bg-white/95 backdrop-blur text-slate-900 placeholder-slate-400 rounded-2xl px-5 py-4 pr-12 text-sm font-medium shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
              🔍
            </span>
          </div>

          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-blue-200 text-xs underline hover:text-white transition"
            >
              ფილტრის გასუფთავება
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">იტვირთება...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Product cards ── */}
          {filteredProducts.length > 0 && (
            <section className="max-w-7xl mx-auto px-6 py-16">
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                პროდუქტები
              </h2>
              <p className="text-slate-500 text-sm mb-8">
                აირჩიეთ პროდუქტი სასწავლო მასალების სანახავად
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    videoCount={videosPerProduct[product.id] ?? 0}
                  />
                ))}
              </div>
              {filteredProducts.length === 0 && search && (
                <p className="text-slate-400 text-sm py-8 text-center">
                  პროდუქტი ვერ მოიძებნა — სცადეთ სხვა საძიებო სიტყვა.
                </p>
              )}
            </section>
          )}

          {/* ── Featured videos ── */}
          {!search && featured.length > 0 && (
            <section className="max-w-7xl mx-auto px-6 py-4 pb-16">
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                ★ რჩეული ვიდეოები
              </h2>
              <p className="text-slate-500 text-sm mb-8">
                ჩვენი გუნდის მიერ გამოყოფილი საუკეთესო სასწავლო მასალები
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map(v => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </section>
          )}

          {/* ── Latest / search results ── */}
          <section className="max-w-7xl mx-auto px-6 pb-20">
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {search ? 'ძიების შედეგები' : 'ბოლოს დამატებული მასალები'}
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              {search
                ? `"${search}" — ${filteredLatest.length} ვიდეო`
                : 'ახლახანს დამატებული სასწავლო ვიდეოები'}
            </p>

            {filteredLatest.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <p className="text-3xl mb-4">🎓</p>
                <p className="text-slate-700 font-bold mb-2">ვიდეო ვერ მოიძებნა</p>
                <p className="text-slate-400 text-sm">
                  სცადეთ სხვა საძიებო სიტყვა ან{' '}
                  <button
                    onClick={() => setSearch('')}
                    className="text-blue-600 underline"
                  >
                    გაასუფთავეთ ფილტრი
                  </button>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredLatest.map(v => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            )}
          </section>

          {/* ── Empty state (no videos at all) ── */}
          {products.length === 0 && featured.length === 0 && latest.length === 0 && (
            <div className="max-w-lg mx-auto px-6 py-24 text-center">
              <p className="text-5xl mb-6">🎓</p>
              <h2 className="text-2xl font-black text-slate-800 mb-3">
                სასწავლო მასალები მალე დაემატება
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Medical Line Georgia-ს Academy განყოფილება ამჟამად ივსება.
                მალე აქ გამოჩნდება სასწავლო ვიდეოები და სახელმძღვანელოები.
              </p>
              <Link
                href="/catalog"
                className="mt-8 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition"
              >
                პროდუქტების კატალოგი
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  )
}
