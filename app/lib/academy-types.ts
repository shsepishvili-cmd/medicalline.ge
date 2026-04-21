// =============================================================================
// Academy module – TypeScript types
// Keep DB column names in English; user-facing labels are in Georgian.
// =============================================================================

export const VIDEO_TYPES = [
  'training',
  'setup',
  'troubleshooting',
  'demo',
  'marketing',
] as const

export type VideoType = (typeof VIDEO_TYPES)[number]

/** Georgian display labels for each video_type value */
export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  training:       'ტრენინგი',
  setup:          'გამართვა',
  troubleshooting:'პრობლემის გადაჭრა',
  demo:           'დემო',
  marketing:      'მარკეტინგი',
}

/** Logical display order for grouped product pages */
export const VIDEO_TYPE_ORDER: VideoType[] = [
  'setup',
  'training',
  'troubleshooting',
  'demo',
  'marketing',
]

// ---------------------------------------------------------------------------
// Core record types
// ---------------------------------------------------------------------------

export type AcademyProductRef = {
  id: string
  name: string
  brand: string | null
  category_slug: string | null
  slug: string
}

export type AcademyVideo = {
  id: string
  created_at: string
  updated_at: string
  product_id: string | null
  title: string
  description: string | null
  video_type: VideoType
  youtube_video_id: string | null
  youtube_url: string | null
  thumbnail_url: string | null
  channel_title: string | null
  published_at: string | null
  duration_iso: string | null
  language_code: string
  is_featured: boolean
  is_active: boolean
  sort_order: number
  added_manually: boolean
  notes: string | null
  created_by: string | null
  /** Joined from products table when selected with a join */
  products?: AcademyProductRef | null
}

export type AcademyVideoQuery = {
  id: string
  created_at: string
  product_id: string | null
  query: string
  language_code: string
  max_results: number
  is_active: boolean
}

// ---------------------------------------------------------------------------
// Form values (all string/boolean for controlled inputs)
// ---------------------------------------------------------------------------

export type AcademyVideoFormValues = {
  product_id: string
  title: string
  description: string
  video_type: VideoType
  youtube_url: string
  youtube_video_id: string
  thumbnail_url: string
  channel_title: string
  published_at: string       // YYYY-MM-DD
  duration_iso: string       // e.g. PT12M30S
  language_code: string
  is_featured: boolean
  is_active: boolean
  sort_order: string         // string for <input type="number">
  added_manually: boolean
  notes: string
}
