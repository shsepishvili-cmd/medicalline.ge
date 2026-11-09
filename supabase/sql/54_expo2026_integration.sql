-- =============================================================================
-- 54_expo2026_integration.sql
-- GDDA Expo 2026 flow on top of the existing portal tables:
--   * one doctor per phone number (phone_identities) and SMS sign-in (otp_challenges)
--   * multi-product price requests (special_price_requests.group_id) + CRM lead
--   * one-time, recipient-bound offer links (offer_access_links)
--   * rate limits, audit log and a message outbox
--   * list prices readable only by admins and admin-approved (active) profiles
-- Nothing is deleted or renamed. Safe to run more than once.
-- Run in Supabase Dashboard -> SQL Editor (staging first).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Profiles: consent and verification facts
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS profession           text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_source        text;

-- Same rules as normalizeGeorgianPhone() in app/lib/phone-verification.ts.
CREATE OR REPLACE FUNCTION public.normalize_ge_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN d ~ '^995[0-9]{9}$' THEN d
    WHEN d ~ '^5[0-9]{8}$' THEN '995' || d
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') AS d) s;
$$;

-- ---------------------------------------------------------------------------
-- One phone number = one doctor. The primary key is what stops two
-- simultaneous sign-ups from creating two accounts for the same number.
-- user_id is NULL only for the few seconds while a new account is created.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_identities (
  phone      text PRIMARY KEY CHECK (phone ~ '^995[0-9]{9}$'),
  user_id    uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing doctors: link every number that belongs to exactly one profile.
INSERT INTO public.phone_identities (phone, user_id)
SELECT phone, (array_agg(id))[1]
FROM (SELECT public.normalize_ge_phone(phone) AS phone, id FROM public.profiles) p
WHERE phone IS NOT NULL
GROUP BY phone
HAVING count(*) = 1
ON CONFLICT DO NOTHING;

-- Numbers shared by several existing profiles. Those cannot use SMS sign-in
-- until an admin resolves them; they can still sign in with a password.
CREATE OR REPLACE VIEW public.phone_identity_conflicts
WITH (security_invoker = true) AS
SELECT public.normalize_ge_phone(phone) AS phone, array_agg(id) AS profile_ids, count(*) AS profiles
FROM public.profiles
WHERE public.normalize_ge_phone(phone) IS NOT NULL
GROUP BY public.normalize_ge_phone(phone)
HAVING count(*) > 1;

-- ---------------------------------------------------------------------------
-- SMS codes. Only a salted hash is stored; at most 5 guesses per code.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL CHECK (phone ~ '^995[0-9]{9}$'),
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_challenges_phone_idx ON public.otp_challenges (phone, created_at DESC);

-- Spends one guess atomically, so parallel requests cannot exceed the limit.
-- Returns the challenge only if a guess was still available.
CREATE OR REPLACE FUNCTION public.otp_spend_attempt(p_phone text, p_max_attempts integer)
RETURNS TABLE (id uuid, code_hash text, attempts integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.otp_challenges c
  SET attempts = c.attempts + 1
  WHERE c.id = (
    SELECT o.id FROM public.otp_challenges o
    WHERE o.phone = p_phone AND o.consumed_at IS NULL AND o.expires_at > now()
    ORDER BY o.created_at DESC
    LIMIT 1
  )
  AND c.attempts < p_max_attempts
  RETURNING c.id, c.code_hash, c.attempts;
$$;

-- Marks a code used; false if someone else used it first.
CREATE OR REPLACE FUNCTION public.otp_consume(p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH done AS (
    UPDATE public.otp_challenges SET consumed_at = now()
    WHERE id = p_id AND consumed_at IS NULL AND expires_at > now()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM done);
$$;

-- ---------------------------------------------------------------------------
-- Fixed-window rate limits (per IP, per phone, per account).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key          text NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE OR REPLACE FUNCTION public.rate_limit_consume(p_key text, p_window_seconds integer, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
BEGIN
  INSERT INTO public.rate_limit_buckets (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = public.rate_limit_buckets.hits + 1
  RETURNING hits INTO v_hits;

  -- Opportunistic cleanup keeps the table small without a scheduled job.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN v_hits <= p_max;
END;
$$;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,
  actor       text,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  ip          text,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON public.audit_log (target_type, target_id);

-- Every offer status change is recorded, including those made in the
-- existing admin screen, which writes to the table directly.
CREATE OR REPLACE FUNCTION public.audit_offer_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
    VALUES (
      auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'offer.created' ELSE 'offer.status_changed' END,
      'offer',
      NEW.id::text,
      jsonb_build_object('status', NEW.status, 'previous', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, 'total', NEW.total_amount, 'currency', NEW.currency)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_audit_status ON public.offers;
CREATE TRIGGER offers_audit_status
AFTER INSERT OR UPDATE OF status ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.audit_offer_status();

-- ---------------------------------------------------------------------------
-- Message outbox. The body is cleared once sent, because offer messages carry
-- a sign-in link.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_outbox (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  channel             text NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  recipient           text NOT NULL,
  body                text,
  purpose             text NOT NULL,
  related_type        text,
  related_id          text,
  status              text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts            integer NOT NULL DEFAULT 0,
  last_error          text,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  provider_message_id text
);
CREATE INDEX IF NOT EXISTS message_outbox_due_idx ON public.message_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS message_outbox_related_idx ON public.message_outbox (related_type, related_id);

-- ---------------------------------------------------------------------------
-- Multi-product price requests: one row per product, shared group_id.
-- ---------------------------------------------------------------------------
ALTER TABLE public.special_price_requests
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'PORTAL';
CREATE INDEX IF NOT EXISTS special_price_requests_group_idx ON public.special_price_requests (group_id);
DO $$ BEGIN
  ALTER TABLE public.special_price_requests
    ADD CONSTRAINT special_price_requests_source_check CHECK (source IN ('PORTAL', 'CATALOG', 'EXPO2026'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A doctor whose phone is verified may ask for prices before an admin
-- approves the account; seeing any price still needs an admin.
CREATE OR REPLACE FUNCTION public.submit_price_request_batch(
  p_items jsonb,
  p_note text,
  p_source text,
  p_purchase_timeline text,
  p_preferred_payment_method text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_group uuid := gen_random_uuid();
  v_count integer;
  v_distinct integer;
  v_recent integer;
  v_names text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND OR v_profile.status = 'blocked'
     OR (v_profile.status <> 'active' AND v_profile.phone_verified_at IS NULL) THEN
    RAISE EXCEPTION 'Verified profile required';
  END IF;
  IF p_source NOT IN ('PORTAL', 'CATALOG', 'EXPO2026') THEN RAISE EXCEPTION 'Invalid source'; END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Invalid items'; END IF;

  SELECT count(*), count(DISTINCT (item->>'product_id'))
  INTO v_count, v_distinct
  FROM jsonb_array_elements(p_items) item;
  IF v_count < 1 OR v_count > 30 THEN RAISE EXCEPTION 'Between 1 and 30 products'; END IF;
  IF v_distinct <> v_count THEN RAISE EXCEPTION 'Duplicate product'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) item
    WHERE NOT ((item->>'quantity') ~ '^[0-9]+$') OR (item->>'quantity')::integer NOT BETWEEN 1 AND 50
  ) THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF (
    SELECT count(*) FROM public.products p
    WHERE p.is_active AND p.id::text IN (SELECT item->>'product_id' FROM jsonb_array_elements(p_items) item)
  ) <> v_count THEN RAISE EXCEPTION 'Product not found'; END IF;

  SELECT count(DISTINCT coalesce(group_id, id)) INTO v_recent
  FROM public.special_price_requests
  WHERE user_id = v_user_id AND created_at > now() - interval '1 hour';
  IF v_recent >= 10 THEN RAISE EXCEPTION 'Rate limited'; END IF;

  INSERT INTO public.special_price_requests (
    user_id, product_id, quantity, purchase_timeline, preferred_payment_method, note,
    doctor_name_snapshot, clinic_name_snapshot, city_snapshot, phone_snapshot, email_snapshot,
    group_id, source
  )
  SELECT
    v_user_id, (item->>'product_id')::uuid, (item->>'quantity')::integer,
    p_purchase_timeline, p_preferred_payment_method, nullif(left(btrim(coalesce(p_note, '')), 1500), ''),
    v_profile.full_name, v_profile.clinic_name, v_profile.city, v_profile.phone,
    coalesce(auth.jwt()->>'email', ''), v_group, p_source
  FROM jsonb_array_elements(p_items) item;

  -- CRM: one open exhibition lead per doctor. Never let CRM block the request.
  IF p_source = 'EXPO2026' THEN
    BEGIN
      SELECT string_agg(p.name, ', ') INTO v_names
      FROM public.products p
      WHERE p.id::text IN (SELECT item->>'product_id' FROM jsonb_array_elements(p_items) item);
      IF NOT EXISTS (
        SELECT 1 FROM public.crm_leads
        WHERE profile_id = v_user_id AND status NOT IN ('converted', 'disqualified')
      ) THEN
        INSERT INTO public.crm_leads (source, contact_name, clinic_name, phone, city, initial_interest, notes, profile_id)
        VALUES ('exhibition', nullif(v_profile.full_name, ''), nullif(v_profile.clinic_name, ''), v_profile.phone,
                nullif(v_profile.city, ''), left(v_names, 500), 'GDDA Expo 2026 · ფასის მოთხოვნა', v_user_id)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_user_id, 'price_request.submitted', 'price_request_group', v_group::text,
          jsonb_build_object('items', v_count, 'source', p_source));

  RETURN v_group;
END;
$$;

-- ---------------------------------------------------------------------------
-- One-time offer links: 15 minutes, only for the doctor the offer is for,
-- spent on first successful open.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offer_access_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  token_hash        text NOT NULL UNIQUE,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_phone   text NOT NULL,
  expires_at        timestamptz NOT NULL,
  consumed_at       timestamptz,
  revoked_at        timestamptz,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offer_access_links_offer_idx ON public.offer_access_links (offer_id, created_at DESC);

-- A single UPDATE decides the winner, so two simultaneous opens cannot both
-- succeed. A wrong account does not spend the link. Returns an outcome rather
-- than raising, so the refusal stays in the audit log.
DROP FUNCTION IF EXISTS public.consume_offer_access_link(text);
CREATE FUNCTION public.consume_offer_access_link(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_offer uuid;
  v_link public.offer_access_links;
  v_reason text;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized'); END IF;

  UPDATE public.offer_access_links
  SET consumed_at = now()
  WHERE token_hash = p_token_hash
    AND recipient_user_id = v_user
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  RETURNING offer_id INTO v_offer;

  IF v_offer IS NULL THEN
    SELECT * INTO v_link FROM public.offer_access_links WHERE token_hash = p_token_hash;
    v_reason := CASE
      WHEN v_link.id IS NULL THEN 'unknown'
      WHEN v_link.recipient_user_id <> v_user THEN 'wrong_account'
      WHEN v_link.consumed_at IS NOT NULL THEN 'used'
      WHEN v_link.revoked_at IS NOT NULL THEN 'revoked'
      ELSE 'expired' END;
    INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
    VALUES (v_user, 'offer_link.refused', 'offer_link', coalesce(v_link.id::text, 'unknown'),
            jsonb_build_object('reason', v_reason));
    -- Someone else's link looks exactly like a missing one.
    RETURN jsonb_build_object('ok', false, 'reason',
      CASE WHEN v_reason IN ('unknown', 'wrong_account') THEN 'not_found' ELSE v_reason END);
  END IF;

  UPDATE public.offers SET status = 'viewed' WHERE id = v_offer AND status = 'sent';
  UPDATE public.special_price_requests r SET status = 'offer_received'
  WHERE r.status = 'offer_ready' AND r.id IN (
    SELECT o.request_id FROM public.offers o WHERE o.id = v_offer
    UNION
    SELECT g.id FROM public.special_price_requests g
    JOIN public.special_price_requests base ON base.group_id IS NOT NULL AND g.group_id = base.group_id
    JOIN public.offers o ON o.request_id = base.id AND o.id = v_offer
  );
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id)
  VALUES (v_user, 'offer_link.opened', 'offer', v_offer::text);
  RETURN jsonb_build_object('ok', true, 'offer_id', v_offer);
END;
$$;

-- ---------------------------------------------------------------------------
-- List prices: admins and admin-approved (active) profiles only. A phone-only
-- sign-up from the expo stays 'pending' and cannot read them.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "logged_in_read_prices" ON public.prices;
CREATE POLICY "logged_in_read_prices" ON public.prices
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
ALTER TABLE public.phone_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_access_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_phone_identities" ON public.phone_identities;
CREATE POLICY "admin_read_phone_identities" ON public.phone_identities FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin_read_audit_log" ON public.audit_log;
CREATE POLICY "admin_read_audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin_read_message_outbox" ON public.message_outbox;
CREATE POLICY "admin_read_message_outbox" ON public.message_outbox FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin_read_offer_access_links" ON public.offer_access_links;
CREATE POLICY "admin_read_offer_access_links" ON public.offer_access_links FOR SELECT TO authenticated USING (public.is_admin());
-- otp_challenges and rate_limit_buckets: no policies at all; server only.

-- Server-only tables are closed to the public API roles outright.
REVOKE ALL ON public.otp_challenges, public.rate_limit_buckets FROM anon, authenticated;
REVOKE ALL ON public.phone_identities, public.audit_log, public.message_outbox, public.offer_access_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.phone_identities, public.audit_log, public.message_outbox, public.offer_access_links FROM authenticated;

-- Message bodies hold sign-in links: admins can read every column but the text.
REVOKE SELECT ON public.message_outbox FROM authenticated;
GRANT SELECT (id, created_at, updated_at, channel, recipient, purpose, related_type, related_id, status, attempts, last_error, next_attempt_at, sent_at, provider_message_id)
  ON public.message_outbox TO authenticated;
-- Link hashes are never needed outside the server.
REVOKE SELECT ON public.offer_access_links FROM authenticated;
GRANT SELECT (id, offer_id, recipient_user_id, recipient_phone, expires_at, consumed_at, revoked_at, created_by, created_at)
  ON public.offer_access_links TO authenticated;

REVOKE ALL ON FUNCTION public.otp_spend_attempt(text, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_consume(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_consume(text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_spend_attempt(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.otp_consume(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_consume(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.submit_price_request_batch(jsonb, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_price_request_batch(jsonb, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.consume_offer_access_link(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_offer_access_link(text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
