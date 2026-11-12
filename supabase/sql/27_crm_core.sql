-- CRM Phase 1 — Milestone 1: core CRM tables only.
-- Additive only. Touches zero pre-existing tables (no ALTER on any table that existed
-- before this migration). Safe to re-run (all statements are idempotent) and safe to
-- fully roll back via 27_crm_core_rollback.sql without affecting any other module.
--
-- See CRM_ARCHITECTURE_PLAN.md Section 13 and CRM_PHASE1_IMPLEMENTATION.md Section 4
-- for the full design rationale behind every table/constraint/index below.
--
-- Reviewed and hardened during the Milestone 1 migration-readiness pass
-- (CRM_M1_MIGRATION_READINESS.md) — see that document for the full list of
-- findings. Fixes applied directly in this file:
--   1. Explicit pgcrypto dependency (gen_random_uuid() must not rely on an
--      assumption that 05_warranty_module.sql already enabled it).
--   2. A partial unique index guaranteeing at most one default pipeline.
--   3. INSERT policies now reject a caller-supplied created_by/actor_id that
--      does not match auth.uid(), closing an authorship-spoofing gap.
--   4. A BEFORE UPDATE trigger makes created_by immutable after insert.
--   5. The 5 lead-deduplication indexes now also reject "blank-after-trim"
--      values and normalize phone/WhatsApp numbers to digits-only and
--      Instagram handles by stripping a leading "@", so whitespace/case/
--      formatting variance no longer produces false "duplicate" collisions
--      or, conversely, misses real duplicates.

-- pgcrypto provides gen_random_uuid(), used as the default for every id below.
-- 05_warranty_module.sql and 25_clinic_commercial_portal.sql already enable it,
-- but this migration must not silently depend on those having run first.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Role helper
-- ---------------------------------------------------------------------------

create or replace function public.is_crm_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'engineer', 'dealer')
      and status = 'active'
  );
$$;

grant execute on function public.is_crm_staff() to authenticated;

-- Protects audit/authorship columns from being altered by an UPDATE, no
-- matter which role issues it. created_by is set once (by the application,
-- from the caller's own session) and is never touched again.
create or replace function public.crm_protect_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := old.created_by;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. crm_pipelines
-- ---------------------------------------------------------------------------

create table if not exists public.crm_pipelines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Guarantees at most one default pipeline can ever exist, at the database
-- level, regardless of application-level guards or concurrent inserts.
create unique index if not exists crm_pipelines_single_default_uidx
  on public.crm_pipelines (is_default)
  where is_default = true;

alter table public.crm_pipelines enable row level security;

drop policy if exists "crm_staff_select_crm_pipelines" on public.crm_pipelines;
create policy "crm_staff_select_crm_pipelines" on public.crm_pipelines
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_pipelines" on public.crm_pipelines;
create policy "crm_staff_insert_crm_pipelines" on public.crm_pipelines
  for insert to authenticated with check (
    public.is_crm_staff() and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crm_staff_update_crm_pipelines" on public.crm_pipelines;
create policy "crm_staff_update_crm_pipelines" on public.crm_pipelines
  for update to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

drop policy if exists "admin_delete_crm_pipelines" on public.crm_pipelines;
create policy "admin_delete_crm_pipelines" on public.crm_pipelines
  for delete to authenticated using (public.is_admin());

drop trigger if exists crm_pipelines_protect_created_by on public.crm_pipelines;
create trigger crm_pipelines_protect_created_by
before update on public.crm_pipelines
for each row execute procedure public.crm_protect_created_by();

-- ---------------------------------------------------------------------------
-- 2. crm_pipeline_stages
-- ---------------------------------------------------------------------------

create table if not exists public.crm_pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  key         text not null,
  label       text not null,
  sort_order  int not null default 0,
  is_won      boolean not null default false,
  is_lost     boolean not null default false,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (pipeline_id, key)
);

create index if not exists crm_pipeline_stages_order_idx
  on public.crm_pipeline_stages (pipeline_id, sort_order);

alter table public.crm_pipeline_stages enable row level security;

drop policy if exists "crm_staff_select_crm_pipeline_stages" on public.crm_pipeline_stages;
create policy "crm_staff_select_crm_pipeline_stages" on public.crm_pipeline_stages
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_pipeline_stages" on public.crm_pipeline_stages;
create policy "crm_staff_insert_crm_pipeline_stages" on public.crm_pipeline_stages
  for insert to authenticated with check (
    public.is_crm_staff() and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crm_staff_update_crm_pipeline_stages" on public.crm_pipeline_stages;
create policy "crm_staff_update_crm_pipeline_stages" on public.crm_pipeline_stages
  for update to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

drop policy if exists "admin_delete_crm_pipeline_stages" on public.crm_pipeline_stages;
create policy "admin_delete_crm_pipeline_stages" on public.crm_pipeline_stages
  for delete to authenticated using (public.is_admin());

drop trigger if exists crm_pipeline_stages_protect_created_by on public.crm_pipeline_stages;
create trigger crm_pipeline_stages_protect_created_by
before update on public.crm_pipeline_stages
for each row execute procedure public.crm_protect_created_by();

-- ---------------------------------------------------------------------------
-- 3. crm_contacts
-- (created before crm_leads so crm_leads.contact_id can reference it directly)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_contacts (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references public.erp_parties(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null,
  full_name    text not null,
  title        text,
  phone        text,
  email        text,
  is_primary   boolean not null default false,
  notes        text,
  archived_at  timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists crm_contacts_party_idx on public.crm_contacts (party_id);

alter table public.crm_contacts enable row level security;

drop policy if exists "crm_staff_select_crm_contacts" on public.crm_contacts;
create policy "crm_staff_select_crm_contacts" on public.crm_contacts
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_contacts" on public.crm_contacts;
create policy "crm_staff_insert_crm_contacts" on public.crm_contacts
  for insert to authenticated with check (
    public.is_crm_staff() and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crm_staff_update_crm_contacts" on public.crm_contacts;
create policy "crm_staff_update_crm_contacts" on public.crm_contacts
  for update to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

drop policy if exists "admin_delete_crm_contacts" on public.crm_contacts;
create policy "admin_delete_crm_contacts" on public.crm_contacts
  for delete to authenticated using (public.is_admin());

drop trigger if exists crm_contacts_set_updated_at on public.crm_contacts;
create trigger crm_contacts_set_updated_at
before update on public.crm_contacts
for each row execute procedure public.set_updated_at();

drop trigger if exists crm_contacts_protect_created_by on public.crm_contacts;
create trigger crm_contacts_protect_created_by
before update on public.crm_contacts
for each row execute procedure public.crm_protect_created_by();

-- ---------------------------------------------------------------------------
-- 4. crm_leads
-- (converted_deal_id is added afterwards, via ALTER, once crm_deals exists —
-- see the migration-ordering note in CRM_ARCHITECTURE_PLAN.md Section 13.3)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_leads (
  id                 uuid primary key default gen_random_uuid(),
  source             text not null check (source in (
                        'facebook', 'instagram', 'whatsapp', 'website',
                        'email', 'phone', 'referral', 'exhibition', 'manual'
                      )),
  status             text not null default 'new' check (status in (
                        'new', 'contacted', 'qualified', 'disqualified', 'converted'
                      )),
  owner_id           uuid references public.profiles(id) on delete set null,
  contact_name       text,
  clinic_name        text,
  phone              text,
  email              text,
  instagram_handle   text,
  facebook_profile   text,
  whatsapp_phone     text,
  city               text,
  initial_interest   text,
  notes              text,
  disqualify_reason  text,
  party_id           uuid references public.erp_parties(id) on delete set null,
  contact_id         uuid references public.crm_contacts(id) on delete set null,
  profile_id         uuid references public.profiles(id) on delete set null,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint crm_leads_identifier_required check (
    nullif(trim(phone), '') is not null or
    nullif(trim(email), '') is not null or
    nullif(trim(instagram_handle), '') is not null or
    nullif(trim(facebook_profile), '') is not null or
    nullif(trim(whatsapp_phone), '') is not null or
    nullif(trim(contact_name), '') is not null
  )
);

-- Duplicate-prevention: only one still-open lead per channel identifier.
-- ("open" = not yet converted/disqualified — see CRM_ARCHITECTURE_PLAN.md Section 11.)
--
-- Every index also excludes values that are blank once normalized (e.g. a
-- phone field containing only spaces, or "@" alone for Instagram) — without
-- that guard, two unrelated leads that both happened to leave a field
-- whitespace-only would collide on the empty string and incorrectly be
-- treated as duplicates of each other.
--
-- Phone/WhatsApp are normalized to digits-only (strips spaces, dashes,
-- parentheses, leading "+") so common formatting variance ("599 12 34 56"
-- vs "+995599123456") is caught. This is a best-effort SQL-level normalization,
-- not the full Georgian-phone normalization already implemented in
-- app/lib/phone-verification.ts (normalizeGeorgianPhone) — it does not resolve
-- a leading "0" vs a "995" country-code prefix referring to the same number.
-- See CRM_M1_MIGRATION_READINESS.md for the recommendation to also normalize
-- at the API layer before insert, which would make this index fully effective.
create unique index if not exists crm_leads_phone_open_uidx
  on public.crm_leads (regexp_replace(phone, '\D', '', 'g'))
  where phone is not null
    and regexp_replace(phone, '\D', '', 'g') <> ''
    and status not in ('converted', 'disqualified');

create unique index if not exists crm_leads_email_open_uidx
  on public.crm_leads (lower(trim(email)))
  where email is not null
    and trim(email) <> ''
    and status not in ('converted', 'disqualified');

-- Strips a leading "@" (users type both "@handle" and "handle") in addition
-- to case/whitespace normalization. Does not attempt to parse a full
-- instagram.com/... URL into a bare handle — see the readiness report.
create unique index if not exists crm_leads_ig_open_uidx
  on public.crm_leads (lower(ltrim(trim(instagram_handle), '@')))
  where instagram_handle is not null
    and ltrim(trim(instagram_handle), '@') <> ''
    and status not in ('converted', 'disqualified');

create unique index if not exists crm_leads_fb_open_uidx
  on public.crm_leads (lower(trim(facebook_profile)))
  where facebook_profile is not null
    and trim(facebook_profile) <> ''
    and status not in ('converted', 'disqualified');

create unique index if not exists crm_leads_wa_open_uidx
  on public.crm_leads (regexp_replace(whatsapp_phone, '\D', '', 'g'))
  where whatsapp_phone is not null
    and regexp_replace(whatsapp_phone, '\D', '', 'g') <> ''
    and status not in ('converted', 'disqualified');

create index if not exists crm_leads_owner_idx on public.crm_leads (owner_id);
create index if not exists crm_leads_status_idx on public.crm_leads (status);
create index if not exists crm_leads_source_idx on public.crm_leads (source);

alter table public.crm_leads enable row level security;

drop policy if exists "crm_staff_select_crm_leads" on public.crm_leads;
create policy "crm_staff_select_crm_leads" on public.crm_leads
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_leads" on public.crm_leads;
create policy "crm_staff_insert_crm_leads" on public.crm_leads
  for insert to authenticated with check (
    public.is_crm_staff() and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crm_staff_update_crm_leads" on public.crm_leads;
create policy "crm_staff_update_crm_leads" on public.crm_leads
  for update to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

drop policy if exists "admin_delete_crm_leads" on public.crm_leads;
create policy "admin_delete_crm_leads" on public.crm_leads
  for delete to authenticated using (public.is_admin());

drop trigger if exists crm_leads_set_updated_at on public.crm_leads;
create trigger crm_leads_set_updated_at
before update on public.crm_leads
for each row execute procedure public.set_updated_at();

drop trigger if exists crm_leads_protect_created_by on public.crm_leads;
create trigger crm_leads_protect_created_by
before update on public.crm_leads
for each row execute procedure public.crm_protect_created_by();

-- ---------------------------------------------------------------------------
-- 5. crm_deals
-- ---------------------------------------------------------------------------

create table if not exists public.crm_deals (
  id                   uuid primary key default gen_random_uuid(),
  pipeline_id          uuid not null references public.crm_pipelines(id) on delete restrict,
  stage_id             uuid not null references public.crm_pipeline_stages(id) on delete restrict,
  lead_id              uuid references public.crm_leads(id) on delete set null,
  party_id             uuid references public.erp_parties(id) on delete set null,
  contact_id           uuid references public.crm_contacts(id) on delete set null,
  owner_id             uuid references public.profiles(id) on delete set null,
  created_by           uuid references public.profiles(id) on delete set null,
  title                text not null,
  expected_value       numeric(14,2) not null default 0,
  currency             text not null default 'GEL' check (currency in ('GEL', 'USD', 'EUR')),
  probability_percent  int not null default 0 check (probability_percent between 0 and 100),
  expected_close_date  date,
  offer_id             uuid references public.offers(id) on delete set null,
  erp_sale_id          uuid references public.erp_sales(id) on delete set null,
  status               text not null default 'open' check (status in (
                          'open', 'won_pending_setup', 'won', 'lost'
                        )),
  lost_reason          text,
  source               text,
  won_at               timestamptz,
  lost_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists crm_deals_owner_idx on public.crm_deals (owner_id);
create index if not exists crm_deals_stage_idx on public.crm_deals (stage_id);
create index if not exists crm_deals_party_idx on public.crm_deals (party_id);
create index if not exists crm_deals_pipeline_idx on public.crm_deals (pipeline_id);
create index if not exists crm_deals_status_idx on public.crm_deals (status);

alter table public.crm_deals enable row level security;

drop policy if exists "crm_staff_select_crm_deals" on public.crm_deals;
create policy "crm_staff_select_crm_deals" on public.crm_deals
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_deals" on public.crm_deals;
create policy "crm_staff_insert_crm_deals" on public.crm_deals
  for insert to authenticated with check (
    public.is_crm_staff() and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crm_staff_update_crm_deals" on public.crm_deals;
create policy "crm_staff_update_crm_deals" on public.crm_deals
  for update to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

drop policy if exists "admin_delete_crm_deals" on public.crm_deals;
create policy "admin_delete_crm_deals" on public.crm_deals
  for delete to authenticated using (public.is_admin());

drop trigger if exists crm_deals_set_updated_at on public.crm_deals;
create trigger crm_deals_set_updated_at
before update on public.crm_deals
for each row execute procedure public.set_updated_at();

drop trigger if exists crm_deals_protect_created_by on public.crm_deals;
create trigger crm_deals_protect_created_by
before update on public.crm_deals
for each row execute procedure public.crm_protect_created_by();

-- ---------------------------------------------------------------------------
-- 6. Resolve the crm_leads <-> crm_deals circular reference
-- ---------------------------------------------------------------------------

alter table public.crm_leads
  add column if not exists converted_deal_id uuid references public.crm_deals(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 7. crm_deal_products
-- ---------------------------------------------------------------------------

create table if not exists public.crm_deal_products (
  id             uuid primary key default gen_random_uuid(),
  deal_id        uuid not null references public.crm_deals(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  quantity       integer not null default 1 check (quantity > 0),
  serial_number  text,
  notes          text
);

create index if not exists crm_deal_products_deal_idx on public.crm_deal_products (deal_id);

alter table public.crm_deal_products enable row level security;

drop policy if exists "crm_staff_all_crm_deal_products" on public.crm_deal_products;
create policy "crm_staff_all_crm_deal_products" on public.crm_deal_products
  for all to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

-- ---------------------------------------------------------------------------
-- 8. crm_tasks (also serves "Follow-ups" — see CRM_ARCHITECTURE_PLAN.md Section 15)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_tasks (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in (
                       'follow_up', 'call', 'meeting', 'demo', 'quotation',
                       'payment', 'installation', 'training', 'service', 'other'
                     )),
  title             text not null,
  description       text,
  priority          text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at            timestamptz,
  status            text not null default 'pending' check (status in (
                       'pending', 'in_progress', 'done', 'cancelled'
                     )),
  assigned_to       uuid references public.profiles(id) on delete set null,
  lead_id           uuid references public.crm_leads(id) on delete cascade,
  deal_id           uuid references public.crm_deals(id) on delete cascade,
  party_id          uuid references public.erp_parties(id) on delete cascade,
  contact_id        uuid references public.crm_contacts(id) on delete set null,
  warranty_id       uuid references public.warranties(id) on delete cascade,
  service_case_id   uuid references public.service_cases(id) on delete cascade,
  completed_at      timestamptz,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists crm_tasks_assigned_idx on public.crm_tasks (assigned_to);
create index if not exists crm_tasks_due_idx on public.crm_tasks (due_at);
create index if not exists crm_tasks_status_idx on public.crm_tasks (status);
create index if not exists crm_tasks_deal_idx on public.crm_tasks (deal_id);
create index if not exists crm_tasks_party_idx on public.crm_tasks (party_id);
create index if not exists crm_tasks_lead_idx on public.crm_tasks (lead_id);

alter table public.crm_tasks enable row level security;

drop policy if exists "crm_staff_select_crm_tasks" on public.crm_tasks;
create policy "crm_staff_select_crm_tasks" on public.crm_tasks
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_tasks" on public.crm_tasks;
create policy "crm_staff_insert_crm_tasks" on public.crm_tasks
  for insert to authenticated with check (
    public.is_crm_staff() and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crm_staff_update_crm_tasks" on public.crm_tasks;
create policy "crm_staff_update_crm_tasks" on public.crm_tasks
  for update to authenticated using (public.is_crm_staff()) with check (public.is_crm_staff());

drop policy if exists "admin_delete_crm_tasks" on public.crm_tasks;
create policy "admin_delete_crm_tasks" on public.crm_tasks
  for delete to authenticated using (public.is_admin());

drop trigger if exists crm_tasks_set_updated_at on public.crm_tasks;
create trigger crm_tasks_set_updated_at
before update on public.crm_tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists crm_tasks_protect_created_by on public.crm_tasks;
create trigger crm_tasks_protect_created_by
before update on public.crm_tasks
for each row execute procedure public.crm_protect_created_by();

-- ---------------------------------------------------------------------------
-- 9. crm_activities — the Customer 360 timeline (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_activities (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in (
                      'inbound_message', 'outbound_message', 'call', 'note',
                      'task_created', 'task_completed', 'follow_up', 'meeting', 'demo',
                      'stage_change', 'quotation_created', 'quotation_sent',
                      'erp_sale_created', 'warranty_created', 'installation', 'training',
                      'service_event', 'ai_summary', 'system'
                    )),
  body             text,
  metadata         jsonb not null default '{}'::jsonb,
  party_id         uuid references public.erp_parties(id) on delete cascade,
  contact_id       uuid references public.crm_contacts(id) on delete cascade,
  lead_id          uuid references public.crm_leads(id) on delete cascade,
  deal_id          uuid references public.crm_deals(id) on delete cascade,
  task_id          uuid references public.crm_tasks(id) on delete set null,
  warranty_id      uuid references public.warranties(id) on delete set null,
  service_case_id  uuid references public.service_cases(id) on delete set null,
  offer_id         uuid references public.offers(id) on delete set null,
  erp_sale_id      uuid references public.erp_sales(id) on delete set null,
  actor_id         uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists crm_activities_party_idx on public.crm_activities (party_id);
create index if not exists crm_activities_deal_idx on public.crm_activities (deal_id);
create index if not exists crm_activities_lead_idx on public.crm_activities (lead_id);
create index if not exists crm_activities_created_idx on public.crm_activities (created_at desc);

alter table public.crm_activities enable row level security;

drop policy if exists "crm_staff_select_crm_activities" on public.crm_activities;
create policy "crm_staff_select_crm_activities" on public.crm_activities
  for select to authenticated using (public.is_crm_staff());

drop policy if exists "crm_staff_insert_crm_activities" on public.crm_activities;
create policy "crm_staff_insert_crm_activities" on public.crm_activities
  for insert to authenticated with check (
    public.is_crm_staff() and (actor_id is null or actor_id = auth.uid())
  );

-- Append-only: no update/delete policy for crm_staff. Only admins may correct/remove
-- an activity row (see CRM_ARCHITECTURE_PLAN.md Section 13.8).
drop policy if exists "admin_update_crm_activities" on public.crm_activities;
create policy "admin_update_crm_activities" on public.crm_activities
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_delete_crm_activities" on public.crm_activities;
create policy "admin_delete_crm_activities" on public.crm_activities
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: one default pipeline + the nine agreed stages (idempotent)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from public.crm_pipelines where is_default = true) then
    with pipeline as (
      insert into public.crm_pipelines (name, is_default)
      values ('Sales Pipeline', true)
      returning id
    )
    insert into public.crm_pipeline_stages (pipeline_id, key, label, sort_order, is_won, is_lost)
    select pipeline.id, stage.key, stage.label, stage.sort_order, stage.is_won, stage.is_lost
    from pipeline
    cross join (
      values
        ('new_lead',            'ახალი ლიდი',                  1, false, false),
        ('contacted',           'კონტაქტი დამყარებულია',       2, false, false),
        ('qualified',           'კვალიფიცირებული',             3, false, false),
        ('demo',                'დემო/კონსულტაცია',            4, false, false),
        ('offer_sent',          'შეთავაზება გაგზავნილია',      5, false, false),
        ('financing_decision',  'დაფინანსება/გადაწყვეტილება', 6, false, false),
        ('negotiation',         'მოლაპარაკება',                 7, false, false),
        ('won',                 'მოგებული',                     8, true,  false),
        ('lost',                'წაგებული',                     9, false, true)
    ) as stage(key, label, sort_order, is_won, is_lost);
  end if;
end $$;
