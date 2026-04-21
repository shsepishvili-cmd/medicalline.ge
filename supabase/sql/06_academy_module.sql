-- =============================================================================
-- 06_academy_module.sql
-- Academy module: educational YouTube videos organized by product
-- =============================================================================

-- ---------------------------------------------------------------------------
-- academy_videos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,

  title           TEXT NOT NULL,
  description     TEXT,

  -- category: training | setup | troubleshooting | demo | marketing
  video_type      TEXT NOT NULL DEFAULT 'training'
                    CHECK (video_type IN ('training', 'setup', 'troubleshooting', 'demo', 'marketing')),

  youtube_video_id TEXT,
  youtube_url      TEXT,
  thumbnail_url    TEXT,
  channel_title    TEXT,
  published_at     TIMESTAMPTZ,
  duration_iso     TEXT,           -- ISO 8601 duration e.g. PT12M30S
  language_code    TEXT NOT NULL DEFAULT 'ka',

  is_featured      BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  added_manually   BOOLEAN NOT NULL DEFAULT true,

  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS academy_videos_updated_at ON academy_videos;
CREATE TRIGGER academy_videos_updated_at
  BEFORE UPDATE ON academy_videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- academy_video_queries
-- Future: seed queries for the YouTube fetch helper
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy_video_queries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,

  query         TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'ka',
  max_results   INTEGER NOT NULL DEFAULT 10,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_academy_videos_product_id  ON academy_videos (product_id);
CREATE INDEX IF NOT EXISTS idx_academy_videos_is_active   ON academy_videos (is_active);
CREATE INDEX IF NOT EXISTS idx_academy_videos_is_featured ON academy_videos (is_featured);
CREATE INDEX IF NOT EXISTS idx_academy_videos_video_type  ON academy_videos (video_type);
CREATE INDEX IF NOT EXISTS idx_academy_video_queries_pid  ON academy_video_queries (product_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE academy_videos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_video_queries ENABLE ROW LEVEL SECURITY;

-- Public: read active videos only
DROP POLICY IF EXISTS "academy_videos_public_read" ON academy_videos;
CREATE POLICY "academy_videos_public_read"
  ON academy_videos FOR SELECT
  USING (is_active = true);

-- Admin: full access to all videos
DROP POLICY IF EXISTS "academy_videos_admin_all" ON academy_videos;
CREATE POLICY "academy_videos_admin_all"
  ON academy_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'active'
    )
  );

-- Admin: full access to video queries
DROP POLICY IF EXISTS "academy_video_queries_admin_all" ON academy_video_queries;
CREATE POLICY "academy_video_queries_admin_all"
  ON academy_video_queries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'active'
    )
  );
