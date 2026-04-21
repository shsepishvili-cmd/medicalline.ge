// =============================================================================
// Academy module – Supabase queries & utility helpers
// =============================================================================

import { supabase } from './supabase'
import {
  VIDEO_TYPES,
  type AcademyVideo,
  type AcademyProductRef,
  type VideoType,
} from './academy-types'

// ---------------------------------------------------------------------------
// Public queries (RLS already limits to is_active = true, but we also filter
// explicitly so the intent is clear to future readers)
// ---------------------------------------------------------------------------

/** All active videos for one product, sorted by featured → sort_order → date */
export async function getPublicVideosForProduct(
  productId: string,
): Promise<AcademyVideo[]> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order',  { ascending: true })
    .order('published_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AcademyVideo[]
}

/** All active videos across all products (with joined product ref) */
export async function getAllPublicVideos(): Promise<AcademyVideo[]> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('*, products(id, name, brand, category_slug, slug)')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order',  { ascending: true })
    .order('published_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AcademyVideo[]
}

/** Featured active videos (for landing page hero) */
export async function getFeaturedVideos(limit = 6): Promise<AcademyVideo[]> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('*, products(id, name, brand, category_slug, slug)')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order',  { ascending: true })
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AcademyVideo[]
}

/** Latest active videos (for landing page recent section) */
export async function getLatestVideos(limit = 8): Promise<AcademyVideo[]> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('*, products(id, name, brand, category_slug, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AcademyVideo[]
}

/**
 * Returns de-duplicated products that have at least one active video.
 * Used on the Academy landing page to show product cards.
 */
export async function getProductsWithVideos(): Promise<AcademyProductRef[]> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('products(id, name, brand, category_slug, slug)')
    .eq('is_active', true)
    .not('product_id', 'is', null)

  if (error) throw error

  const seen = new Set<string>()
  const products: AcademyProductRef[] = []
  for (const row of data ?? []) {
    const p = (row as any).products as AcademyProductRef | null
    if (p && !seen.has(p.id)) {
      seen.add(p.id)
      products.push(p)
    }
  }
  return products
}

/** Look up a product by slug (used on the public product academy page) */
export async function getProductBySlug(
  slug: string,
): Promise<AcademyProductRef | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, category_slug, slug')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as AcademyProductRef
}

// ---------------------------------------------------------------------------
// Admin queries (no is_active filter – admins see everything)
// ---------------------------------------------------------------------------

export async function adminGetAllVideos(): Promise<AcademyVideo[]> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('*, products(id, name, brand, category_slug, slug)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AcademyVideo[]
}

export async function adminGetVideoById(id: string): Promise<AcademyVideo | null> {
  const { data, error } = await supabase
    .from('academy_videos')
    .select('*, products(id, name, brand, category_slug, slug)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as AcademyVideo
}

/** Products dropdown for the admin form */
export async function adminGetProducts(): Promise<AcademyProductRef[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, category_slug, slug')
    .order('name')

  if (error) return []
  return (data ?? []) as AcademyProductRef[]
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Group a flat list of videos by video_type.
 * Returns all types as keys (even if the array is empty).
 */
export function groupVideosByType(
  videos: AcademyVideo[],
): Record<VideoType, AcademyVideo[]> {
  const groups = {} as Record<VideoType, AcademyVideo[]>
  for (const t of VIDEO_TYPES) groups[t] = []
  for (const v of videos) {
    if (groups[v.video_type]) groups[v.video_type].push(v)
  }
  return groups
}

/** Build a YouTube thumbnail URL from a video ID */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'hq' | 'maxres' = 'hq',
): string {
  const q = quality === 'hq' ? 'hqdefault' : quality === 'maxres' ? 'maxresdefault' : 'default'
  return `https://img.youtube.com/vi/${videoId}/${q}.jpg`
}

/**
 * Extract the 11-character YouTube video ID from various URL formats,
 * or return the raw value if it already looks like a bare ID.
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null
  const s = input.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^#&?]*&)*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const m = s.match(pattern)
    if (m) return m[1]
  }
  return null
}

/**
 * Convert an ISO 8601 duration (PT12M30S) to a human-readable string (12:30).
 * Returns empty string when duration is null or unparseable.
 */
export function formatDuration(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return iso
  const h = parseInt(m[1] || '0')
  const min = parseInt(m[2] || '0')
  const sec = parseInt(m[3] || '0')
  if (h > 0) {
    return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${min}:${String(sec).padStart(2, '0')}`
}
