# CRM Phase 1 — Milestone 1 Implementation Plan

Date: 2026-07-14
Status: planning only — **no application code or migration has been written or applied yet.**
Parent document: `CRM_ARCHITECTURE_PLAN.md` (read that first — this document only details Milestone 1 of its "Recommended Implementation Order").

## 1. Milestone 1 Goal and Boundaries

Ship a working, navigable, but inert CRM skeleton: schema, auth, navigation, seed pipeline data, a basic Leads list, and a basic Deals/Kanban shell — with **zero risk to any existing table or existing feature**.

**In scope:**
- One new migration creating all 8 CRM tables (holistic schema, since altering these tables again later is more disruptive than defining them completely now) — but **zero `ALTER TABLE` statements on any pre-existing table**.
- `requireCrmSession()` server auth helper + `is_crm_staff()` SQL function.
- CRM navigation entry point (`/admin/crm`) wired into the existing admin hub.
- Seed data: one default pipeline, nine pipeline stages.
- Leads: list, create, view/edit (manual entry only — no channel intake, no conversion action).
- Deals: a Kanban board reading `crm_deals` grouped by `crm_pipeline_stages`, with drag-and-drop that persists `stage_id` only.

**Explicitly out of scope for Milestone 1** (deferred to Milestones 2–4 per `CRM_ARCHITECTURE_PLAN.md`):
- Lead → Account/Contact/Deal conversion (Section 11 of the architecture plan).
- Customer 360 page/endpoint.
- Tasks/Follow-ups UI (the `crm_tasks` table is created now, but no page reads/writes it yet).
- "Mark Won" / "Mark Lost" actions and the `won_pending_setup` status transition (Section 18).
- "Complete Sale Setup" — **no code in this milestone creates, links, or modifies any `erp_sales`, `erp_sale_items`, `erp_stock_lots`, or `warranties` row, under any condition.**
- The `28_crm_erp_bridge.sql` migration (nullable bridge columns on `erp_parties`/`offers`/`warranties`) — not applied in this milestone.
- Any external channel/webhook/AI integration.
- Dropping a Deal card into the "Won" or "Lost" Kanban column in this milestone **only moves `stage_id`** for board display — it does not touch `status`, and triggers no side effects. Real Won/Lost business logic ships in Milestone 3.

---

## 2. Exact Files to Create

**Database:**
- `supabase/sql/27_crm_core.sql`

**Server/library:**
- `app/lib/crm-server.ts`
- `app/lib/crm-types.ts`

**API routes:**
- `app/api/crm/leads/route.ts`
- `app/api/crm/leads/[id]/route.ts`
- `app/api/crm/deals/route.ts`
- `app/api/crm/deals/[id]/stage/route.ts`

**Frontend:**
- `app/admin/crm/page.tsx` — CRM Dashboard (minimal: welcome/KPI placeholder, links to Leads/Pipeline)
- `app/admin/crm/leads/page.tsx` — Leads list
- `app/admin/crm/leads/new/page.tsx` — new lead (thin wrapper around `LeadForm`)
- `app/admin/crm/leads/[id]/page.tsx` — lead detail (read-only view + edit link; **no "Convert" button wired to real logic** — may show a disabled/"coming soon" affordance at most)
- `app/admin/crm/leads/[id]/edit/page.tsx` — thin wrapper around `LeadForm`
- `app/admin/crm/pipeline/page.tsx` — Kanban board
- `app/admin/crm/_components/CrmUi.tsx` — imports `colors`/`ui`/`Field`/`EmptyState`/`InfoStat`/`LoadingView`/`AuthBlockedView` from `app/admin/warranty/_components/WarrantyUi.tsx` (same reuse precedent as `AcademyUi.tsx`); adds `useCrmAdminGate()`, `CrmAdminShell()`
- `app/admin/crm/_components/LeadForm.tsx`
- `app/admin/crm/_components/PipelineBoard.tsx`

## 3. Exact Files to Modify

- `app/admin/page.tsx` — add one sidebar tab entry / Quick Actions button pointing to `/admin/crm` (following the existing per-item hardcoded color convention, e.g. near the existing `/admin/offers`, `/admin/warranty`, `/admin/contracts`, `/admin/erp` buttons). **No other change to this file.**
- `.env.example` — no changes required for Milestone 1 (no new environment variables are needed — CRM Phase 1 introduces no external service yet).

**Nothing else is modified.** `app/admin/erp/page.tsx`, `ContractUi.tsx`, `WarrantyUi.tsx` cross-links (mentioned as later polish in the architecture plan) are deferred to Milestone 5 (navigation completeness), not required for Milestone 1 to be usable and testable.

---

## 4. SQL Migration Plan — `supabase/sql/27_crm_core.sql`

Creation order chosen specifically to avoid forward references (see note below on the one unavoidable circular FK):

1. `crm_pipelines`
2. `crm_pipeline_stages` (→ `crm_pipelines`)
3. `crm_contacts` (→ `erp_parties`, `profiles` — both pre-existing; does **not** depend on any new table created after it)
4. `crm_leads` (→ `erp_parties`, `crm_contacts`, `profiles` — **without** `converted_deal_id` yet)
5. `crm_deals` (→ `crm_pipelines`, `crm_pipeline_stages`, `crm_leads`, `erp_parties`, `crm_contacts`, `offers`, `erp_sales`, `profiles`)
6. `ALTER TABLE crm_leads ADD COLUMN converted_deal_id …` (resolves the `crm_leads` ↔ `crm_deals` circular reference)
7. `crm_deal_products` (→ `crm_deals`, `products`)
8. `crm_tasks` (→ `crm_leads`, `crm_deals`, `erp_parties`, `crm_contacts`, `warranties`, `service_cases`, `profiles`)
9. `crm_activities` (→ `erp_parties`, `crm_contacts`, `crm_leads`, `crm_deals`, `crm_tasks`, `warranties`, `service_cases`, `offers`, `erp_sales`, `profiles`)

Full column/constraint/index specifications for every table are already fully written out in `CRM_ARCHITECTURE_PLAN.md` Section 13 (13.1 through 13.8) — this document does not repeat them verbatim, only the migration-file structure and the pieces specific to executing it safely:

```sql
-- 27_crm_core.sql
-- Additive only. Touches zero pre-existing tables. Safe to apply/rollback independently.

create or replace function public.is_crm_staff()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'engineer', 'dealer')
      and status = 'active'
  );
$$;
grant execute on function public.is_crm_staff() to authenticated;

-- 1. crm_pipelines
create table public.crm_pipelines ( ... );          -- per Section 13.1
alter table public.crm_pipelines enable row level security;
create policy crm_pipelines_staff_all on public.crm_pipelines
  for all using (public.is_crm_staff()) with check (public.is_crm_staff());

-- 2. crm_pipeline_stages
create table public.crm_pipeline_stages ( ... );     -- per Section 13.2
-- same RLS shape

-- 3. crm_contacts
create table public.crm_contacts ( ... );            -- per Section 13.4
-- same RLS shape

-- 4. crm_leads (no converted_deal_id yet)
create table public.crm_leads ( ... );                -- per Section 13.3, minus converted_deal_id
-- partial unique indexes (Section 13.3) created here
-- same RLS shape

-- 5. crm_deals
create table public.crm_deals ( ... );                -- per Section 13.5
-- same RLS shape

-- 6. resolve circular reference
alter table public.crm_leads
  add column converted_deal_id uuid references public.crm_deals(id) on delete set null;

-- 7. crm_deal_products
create table public.crm_deal_products ( ... );        -- per Section 13.6
-- same RLS shape (inherits staff-only access; no independent policy needed beyond is_crm_staff())

-- 8. crm_tasks
create table public.crm_tasks ( ... );                 -- per Section 13.7
-- same RLS shape

-- 9. crm_activities
create table public.crm_activities ( ... );            -- per Section 13.8
-- same RLS shape (insert/select only — no update/delete policy; activities are append-only,
-- enforce by simply not granting UPDATE/DELETE policies to any role except is_admin() for corrections)

-- updated_at triggers — reuse the existing public.set_updated_at() function, do not redefine it
create trigger crm_pipelines_updated_at before update on public.crm_pipelines
  for each row execute function public.set_updated_at();  -- only if crm_pipelines gets an updated_at column; see note below
create trigger crm_leads_updated_at before update on public.crm_leads
  for each row execute function public.set_updated_at();
create trigger crm_deals_updated_at before update on public.crm_deals
  for each row execute function public.set_updated_at();
create trigger crm_tasks_updated_at before update on public.crm_tasks
  for each row execute function public.set_updated_at();
create trigger crm_contacts_updated_at before update on public.crm_contacts
  for each row execute function public.set_updated_at();

-- seed: default pipeline + 9 stages
insert into public.crm_pipelines (name, is_default) values ('Sales Pipeline', true);
-- 9 insert statements into crm_pipeline_stages with key/label/sort_order/is_won/is_lost,
-- keyed to the pipeline row above via a `with` clause or a follow-up select — exact values:
--   1 new_lead            'ახალი ლიდი'
--   2 contacted            'კონტაქტი დამყარებულია'
--   3 qualified             'კვალიფიცირებული'
--   4 demo                  'დემო/კონსულტაცია'
--   5 offer_sent            'შეთავაზება გაგზავნილია'
--   6 financing_decision   'დაფინანსება/გადაწყვეტილება'
--   7 negotiation           'მოლაპარაკება'
--   8 won  (is_won=true)    'მოგებული'
--   9 lost (is_lost=true)   'წაგებული'
```

**Note on `crm_pipelines`/`crm_pipeline_stages` "updated_at":** Section 13.1/13.2 of the architecture plan did not list an `updated_at` column for these two config tables (only `created_at`/`created_by`), since they are rarely edited after seeding. If an edit-stages UI is added later, add `updated_at` + the trigger at that time via a small follow-up migration — omitted here to avoid speculative columns.

### Down-migration (rollback script, kept alongside but not part of the numbered migration)

```sql
-- 27_crm_core_rollback.sql — run only if Milestone 1 needs to be fully reverted
drop trigger if exists crm_contacts_updated_at on public.crm_contacts;
drop trigger if exists crm_tasks_updated_at on public.crm_tasks;
drop trigger if exists crm_deals_updated_at on public.crm_deals;
drop trigger if exists crm_leads_updated_at on public.crm_leads;
drop trigger if exists crm_pipelines_updated_at on public.crm_pipelines;

drop table if exists public.crm_activities;
drop table if exists public.crm_tasks;
drop table if exists public.crm_deal_products;
alter table public.crm_leads drop column if exists converted_deal_id;
drop table if exists public.crm_deals;
drop table if exists public.crm_leads;
drop table if exists public.crm_contacts;
drop table if exists public.crm_pipeline_stages;
drop table if exists public.crm_pipelines;

drop function if exists public.is_crm_staff();
```

No pre-existing table is touched by either script, so this rollback carries **zero risk** to ERP/warranty/contracts/clinic-portal data.

---

## 5. API Routes (Milestone 1 only)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `app/api/crm/leads/route.ts` | `GET` | list leads (filter by `status`, `source`, `owner_id` query params) | `requireCrmSession` |
| | `POST` | create a lead (manual entry) | `requireCrmSession` |
| `app/api/crm/leads/[id]/route.ts` | `GET` | fetch one lead | `requireCrmSession` |
| | `PATCH` | edit a lead's fields (not status transitions beyond `new`/`contacted`/`qualified`; `disqualified`/`converted` are reserved for later milestones' dedicated actions) | `requireCrmSession` |
| `app/api/crm/deals/route.ts` | `GET` | list deals for the default pipeline (grouped client-side by `stage_id`) | `requireCrmSession` |
| | `POST` | create a deal manually (title, `party_id`/`contact_id` optional — nullable, since conversion isn't built yet, so a Milestone-1 deal may have no linked Account) | `requireCrmSession` |
| `app/api/crm/deals/[id]/stage/route.ts` | `PATCH` | update `stage_id` only (drag-and-drop) — validates the target stage belongs to the same `pipeline_id`, writes a `crm_activities` `stage_change` row | `requireCrmSession` |

All five/six handlers follow the codebase's existing envelope/error convention: `{ ok, error?, code? }`, `try/catch` around a call to `requireCrmSession()`, mapping `'Unauthorized'` → 401, `'Forbidden'` → 403, else 500 — identical in shape to `requireWarrantySession`'s callers.

---

## 6. Frontend Routes (Milestone 1 only)

```
app/admin/crm/page.tsx                — Dashboard placeholder: counts of open leads / open deals by stage, links out
app/admin/crm/leads/page.tsx          — Leads list: table with status/source filters, "+ New Lead" button
app/admin/crm/leads/new/page.tsx      — renders <LeadForm /> with no lead prop
app/admin/crm/leads/[id]/page.tsx     — read-only detail view + "Edit" link (no Convert button with real behavior yet)
app/admin/crm/leads/[id]/edit/page.tsx — renders <LeadForm lead={lead} />
app/admin/crm/pipeline/page.tsx       — <PipelineBoard /> — 9 columns from crm_pipeline_stages, cards from crm_deals,
                                          drag-and-drop (framer-motion) calling PATCH /api/crm/deals/[id]/stage
```

All pages are client components (`'use client'`), matching 100% of the existing admin area. `CrmUi.tsx` provides `useCrmAdminGate()` (identical shape to `useWarrantyAdminGate()`: `{ loading, error, profile, accessToken }`, re-verifying session + `profiles.role in ('admin','engineer','dealer') && status==='active'` on every mount) and `CrmAdminShell()` (page chrome, matching `WarrantyAdminShell`'s look, with a link row back to `/admin`).

---

## 7. TypeScript Types (`app/lib/crm-types.ts`)

Defined now for all 8 tables (even though Tasks/Activities have no UI yet in Milestone 1), so later milestones import from one already-established file rather than each inventing its own ad hoc shape — mirroring how `contract-types.ts`/`warranty-types.ts` are each a single shared file per domain.

```ts
export type CrmLeadSource =
  | 'facebook' | 'instagram' | 'whatsapp' | 'website'
  | 'email' | 'phone' | 'referral' | 'exhibition' | 'manual'

export type CrmLeadStatus = 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted'

export interface CrmLead {
  id: string
  source: CrmLeadSource
  status: CrmLeadStatus
  owner_id: string | null
  contact_name: string | null
  clinic_name: string | null
  phone: string | null
  email: string | null
  instagram_handle: string | null
  facebook_profile: string | null
  whatsapp_phone: string | null
  city: string | null
  initial_interest: string | null
  notes: string | null
  disqualify_reason: string | null
  party_id: string | null
  contact_id: string | null
  profile_id: string | null
  converted_deal_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CrmDealStatus = 'open' | 'won_pending_setup' | 'won' | 'lost'
export type CrmDealCurrency = 'GEL' | 'USD' | 'EUR'

export interface CrmDeal {
  id: string
  pipeline_id: string
  stage_id: string
  lead_id: string | null
  party_id: string | null
  contact_id: string | null
  owner_id: string | null
  created_by: string | null
  title: string
  expected_value: number
  currency: CrmDealCurrency
  probability_percent: number
  expected_close_date: string | null
  offer_id: string | null
  erp_sale_id: string | null
  status: CrmDealStatus
  lost_reason: string | null
  source: string | null
  won_at: string | null
  lost_at: string | null
  created_at: string
  updated_at: string
}

export interface CrmPipeline { id: string; name: string; is_default: boolean; is_active: boolean }

export interface CrmPipelineStage {
  id: string
  pipeline_id: string
  key: string
  label: string
  sort_order: number
  is_won: boolean
  is_lost: boolean
  is_active: boolean
}

export type CrmTaskType =
  | 'follow_up' | 'call' | 'meeting' | 'demo' | 'quotation'
  | 'payment' | 'installation' | 'training' | 'service' | 'other'
export type CrmTaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type CrmTaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CrmTask {
  id: string
  type: CrmTaskType
  title: string
  description: string | null
  priority: CrmTaskPriority
  due_at: string | null
  status: CrmTaskStatus
  assigned_to: string | null
  lead_id: string | null
  deal_id: string | null
  party_id: string | null
  contact_id: string | null
  warranty_id: string | null
  service_case_id: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CrmActivityType =
  | 'inbound_message' | 'outbound_message' | 'call' | 'note'
  | 'task_created' | 'task_completed' | 'follow_up' | 'meeting' | 'demo'
  | 'stage_change' | 'quotation_created' | 'quotation_sent'
  | 'erp_sale_created' | 'warranty_created' | 'installation' | 'training'
  | 'service_event' | 'ai_summary' | 'system'

export interface CrmActivity {
  id: string
  type: CrmActivityType
  body: string | null
  metadata: Record<string, unknown>
  party_id: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  task_id: string | null
  warranty_id: string | null
  service_case_id: string | null
  offer_id: string | null
  erp_sale_id: string | null
  actor_id: string | null
  created_at: string
}

export interface CrmContact {
  id: string
  party_id: string
  profile_id: string | null
  full_name: string
  title: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
  notes: string | null
  archived_at: string | null
}

export const CRM_LEAD_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new: 'ახალი', contacted: 'კონტაქტი დამყარებულია', qualified: 'კვალიფიცირებული',
  disqualified: 'დისკვალიფიცირებული', converted: 'კონვერტირებული',
}
// CRM_DEAL_STATUS_LABELS / CRM_TASK_STATUS_LABELS / CRM_TASK_TYPE_LABELS / tone maps follow
// the same *_LABELS / *_TONES shape already established in contract-types.ts / warranty-types.ts.
```

---

## 8. Test Checklist (Milestone 1)

**Database:**
- [ ] `27_crm_core.sql` applies cleanly on a staging Supabase project with no errors.
- [ ] All 8 tables exist with the exact columns/constraints specified in `CRM_ARCHITECTURE_PLAN.md` Section 13.
- [ ] Seed data present: 1 row in `crm_pipelines` (`is_default = true`), 9 rows in `crm_pipeline_stages` with correct `key`/`sort_order`/`is_won`/`is_lost`.
- [ ] `crm_leads` check constraint rejects an insert where all of `phone`/`email`/`instagram_handle`/`facebook_profile`/`whatsapp_phone`/`contact_name` are null.
- [ ] Partial unique index works: inserting a second `status='new'` lead with the same `phone` as an existing open lead fails; inserting a lead with the same `phone` as an existing lead whose `status='converted'` succeeds.
- [ ] `is_crm_staff()` returns `true` for an `admin`/`engineer`/`dealer` with `status='active'`, `false` for `doctor` or any `status != 'active'`.
- [ ] RLS: a `doctor`-role session cannot `select`/`insert` on any `crm_*` table; an `admin` session can.
- [ ] Rollback script (`27_crm_core_rollback.sql`) drops all 8 tables and `is_crm_staff()` cleanly, in an order that doesn't hit FK-dependency errors.

**Auth:**
- [ ] `POST /api/crm/leads` with no `Authorization` header → `401`.
- [ ] `POST /api/crm/leads` with a valid `doctor`-role token → `403`.
- [ ] `POST /api/crm/leads` with a valid `admin`-role token but `status='blocked'` profile → `403`.
- [ ] `POST /api/crm/leads` with a valid `admin`/`engineer`/`dealer`, `status='active'` token → `200`/`201`.

**Frontend — Leads:**
- [ ] `/admin/crm` loads for an admin session without console errors; redirects/blocks correctly for a non-staff session (same gate behavior as `/admin/erp`).
- [ ] Leads list renders, filters by status/source work.
- [ ] Create a lead with only `whatsapp_phone` filled in (no name) — succeeds, appears in the list.
- [ ] Create a lead with no identifying field at all — client-side and server-side both reject it (matching the DB check constraint).
- [ ] Edit an existing lead, confirm changes persist after reload.

**Frontend — Pipeline:**
- [ ] `/admin/crm/pipeline` renders all 9 columns in the correct `sort_order`, correct Georgian labels.
- [ ] Manually create a deal (via `POST /api/crm/deals` or a minimal inline form) — appears in the `new_lead` column.
- [ ] Drag a card from one column to another — `PATCH /api/crm/deals/[id]/stage` fires, reload confirms the new `stage_id` persisted.
- [ ] Drag a card into the "Won" or "Lost" column — confirm **no** row appears in `erp_sales`, `erp_sale_items`, `warranties`, or `crm_tasks` as a result (this is the explicit non-goal of Milestone 1 — verify it stays that way).
- [ ] Attempt to `PATCH` a deal's `stage_id` to a stage belonging to a *different* pipeline — server rejects it.

**Regression (existing features unaffected):**
- [ ] `/admin`, `/admin/erp`, `/admin/contracts`, `/admin/warranty`, `/admin/offers`, `/admin/academy`, `/clinic/*` all still load and function exactly as before (smoke test only — no schema or shared-file change should have touched their behavior beyond the one new nav button in `app/admin/page.tsx`).
- [ ] The new nav button/tab in `app/admin/page.tsx` does not visually break the existing sidebar layout.

---

## 9. Rollback Plan

Milestone 1 is deliberately structured so rollback is low-risk and fully reversible:

1. **Application code:** revert/remove all files listed in Section 2 ("Exact Files to Create") and revert the single diff in `app/admin/page.tsx` (Section 3) — a plain git revert of the Milestone 1 commit(s) accomplishes this in one step if the work was committed as its own changeset (recommended: keep Milestone 1 in its own branch/PR, separate from any other in-flight work, per the "Risks and Migration Considerations" note in `CRM_ARCHITECTURE_PLAN.md` about the working tree's existing uncommitted changes across other modules).
2. **Database:** run `27_crm_core_rollback.sql` (Section 4) against the same environment `27_crm_core.sql` was applied to. This drops exactly the 8 new tables and the `is_crm_staff()` function — **no pre-existing table's schema or data is touched**, since Milestone 1 performs zero `ALTER TABLE` statements against any table that existed before this migration.
3. **Verification after rollback:** reload `/admin`, `/admin/erp`, `/admin/contracts`, `/admin/warranty` and confirm they behave exactly as they did before Milestone 1 was applied (they should be completely unaffected, since nothing they read/write was touched).
4. No data migration/backfill occurred in Milestone 1 (that's Milestone 2+), so there is nothing to "un-migrate" — rollback is purely a matter of removing what was added.
