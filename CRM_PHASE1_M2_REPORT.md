# CRM Phase 1 — Milestone 2 Implementation Report

Date: 2026-07-15
Scope: implementation, review, and staging validation of **Milestone 2 only**, per `CRM_ARCHITECTURE_PLAN.md` (Sections 12–18, and "Recommended Implementation Order" item 2) and the Milestone 2 brief. Milestone 3 and Milestone 4 were **not** started. Milestone 1 behavior was not modified or regressed (verified — Section 7).

Milestone 2 delivers: Customer 360 profile, Deal detail view, Tasks CRUD, Follow-ups (as a filtered Tasks view), the Activity timeline, Deal products / product interests, real CRM dashboard metrics, and the additive ERP bridge migration.

---

## 0. Provenance note

Most of the Milestone 2 code already existed in the working tree at the start of this session (written by a prior session that stopped before validating or documenting it). This session **audited** all of it against the architecture plan, **fixed three concrete issues** found during that audit (Section 9), then **validated the whole milestone end-to-end against a real Supabase/PostgreSQL 17 database** (Sections 6–8) and wrote this report. Every file below was re-read and verified in this session regardless of who first wrote it; the three review fixes are called out explicitly in Section 9 so they are not lost.

---

## 1. Files Created

**Database:**
- `supabase/sql/28_crm_erp_bridge.sql` — the additive ERP bridge migration (Section 3).
- `supabase/sql/28_crm_erp_bridge_rollback.sql` — its companion rollback.
- `supabase/sql/29_crm_m2_schema.sql` — additive CRM-internal refinements: `crm_deals.notes`, widened `crm_activities.type` CHECK (adds `deal_created`, `product_added`).
- `supabase/sql/29_crm_m2_schema_rollback.sql` — its companion rollback (with the documented "narrowing fails while new-type rows exist" caveat).

**API routes (all under `app/api/crm/`, all gated by `requireCrmSession()`):**
- `deals/[id]/route.ts` — `GET` (aggregated deal + pipeline/stage + party + contact + owner + products + tasks + activities), `PATCH` (whitelisted general fields; `status`/`stage_id` deliberately excluded).
- `deals/[id]/products/route.ts` — `POST` (link a `public.products` row to a deal; logs `product_added`).
- `deals/[id]/products/[productLinkId]/route.ts` — `PATCH` (quantity/serial/notes), `DELETE` (unlink).
- `customers/route.ts` — `GET` (list `erp_parties` where `party_type in ('customer','both')`).
- `customers/[partyId]/route.ts` — `GET` (one account), `PATCH` (the 4 CRM bridge fields only, via the scoped RPC — Section 3/9).
- `customers/[partyId]/360/route.ts` — `GET` (single aggregated read-only Customer 360 payload).
- `contacts/route.ts` — `GET`/`POST`; `contacts/[id]/route.ts` — `PATCH` (edit/archive).
- `activities/route.ts` — `GET` (filterable), `POST` (manual `note` only; `type`/`actor_id` are always server-set, never trusted from the body).
- `tasks/route.ts` — `GET` (supports `view=due_today|overdue|upcoming|completed` for Follow-ups), `POST`.
- `tasks/[id]/route.ts` — `GET`, `PATCH` (status transitions set/clear `completed_at`; completion logs `follow_up` for follow-up tasks, else `task_completed`).
- `dashboard/route.ts` — `GET` (all 7 metrics computed from real DB queries).

**Frontend (all under `app/admin/crm/`):**
- `deals/[id]/page.tsx` — Deal detail view.
- `customers/page.tsx` — Accounts list/search.
- `customers/[partyId]/page.tsx` — Customer 360 profile.
- `tasks/page.tsx` — Tasks list/filter/create/complete.
- `follow-ups/page.tsx` — Follow-ups (4 filtered views over `crm_tasks`, explicitly labeled "no separate table").
- `_components/TaskForm.tsx` — shared task-create form.
- `_components/ActivityTimeline.tsx` — shared timeline renderer.

**Server/library:**
- No new file; `app/lib/crm-types.ts` was extended (Section 2).

---

## 2. Files Modified

- `app/lib/crm-types.ts` — added `CrmDealProduct`, `CrmAccount`, `CrmCustomer360`, `CrmDashboardMetrics`; added `notes` to `CrmDeal`; widened `CRM_ACTIVITY_TYPES` + labels with `deal_created`/`product_added`. (No existing type removed or narrowed.)
- `app/api/crm/deals/route.ts` — `POST` now also logs a best-effort `deal_created` activity (server-set `actor_id`).
- `app/admin/crm/page.tsx` — dashboard wired to real `/api/crm/dashboard` data + `ActivityTimeline`.
- `app/admin/crm/_components/CrmUi.tsx` — shell nav extended with Customers / Tasks / Follow-ups links (gate logic unchanged from M1).
- `app/admin/crm/_components/PipelineBoard.tsx` — added a "დეტალურად →" link to the new deal detail page (drag/stage logic unchanged).
- `app/admin/crm/leads/*`, `_components/LeadForm.tsx`, `app/lib/crm-server.ts`, `app/admin/page.tsx` — **not modified in M2** (confirmed unchanged from M1).

**Review fixes applied to the above in this session** (detail in Section 9): `28_crm_erp_bridge.sql` (+rollback), `app/api/crm/customers/[partyId]/route.ts`, `app/api/crm/deals/[id]/route.ts`, `app/admin/crm/deals/[id]/page.tsx`.

---

## 3. Database Changes

All changes are **additive**. Zero `RENAME`, zero `DROP COLUMN`, zero destructive statement against any pre-existing table; no automatic backfill.

**`28_crm_erp_bridge.sql`:**
- `erp_parties` gains nullable `profile_id`, `crm_owner_id` (both FK → `profiles`, `on delete set null`), `lead_source text`, `city text`, `is_individual boolean not null default false`. Indexes on `crm_owner_id`, `profile_id`.
- `offers` gains nullable `crm_deal_id` (FK → `crm_deals`, `on delete set null`) + index. **Reserved for a later milestone — nothing in M2 writes it.**
- `warranties` gains nullable `crm_deal_id` (FK → `crm_deals`, `on delete set null`) + index. **Reserved for a later milestone — nothing in M2 writes it.**
- New RLS policy `crm_staff_select_erp_parties` (SELECT-only, `is_crm_staff()`) — additive read access for engineer/dealer; the pre-existing admin-only `admin_all_erp_parties` policy is untouched and still governs all writes.
- New function `public.crm_update_party_bridge_fields(uuid, jsonb)` — `SECURITY DEFINER`, `set search_path = public`; raises `Forbidden` unless `is_crm_staff()`; updates **only** `crm_owner_id`/`lead_source`/`city`/`is_individual` (any other key in the JSON payload is ignored). This is the fix for the authorization bug in Section 9.

**`29_crm_m2_schema.sql`:**
- `crm_deals` gains nullable `notes text` (Deal detail free-text, distinct from the activity timeline).
- `crm_activities.type` CHECK widened to also allow `deal_created` and `product_added`. Every previously-allowed value still allowed; `stage_change` (from M1) is reused for the brief's "deal_stage_changed"; `lead_converted` intentionally not added (conversion is out of M2 scope).

Migration numbering follows the repo convention (next after `27_crm_core.sql`). `28` and `29` are independent, reviewable, and reversible on their own.

---

## 4. API Routes Added

| Route | Methods | Auth |
|---|---|---|
| `/api/crm/deals/[id]` | `GET`, `PATCH` | `requireCrmSession` |
| `/api/crm/deals/[id]/products` | `POST` | `requireCrmSession` |
| `/api/crm/deals/[id]/products/[productLinkId]` | `PATCH`, `DELETE` | `requireCrmSession` |
| `/api/crm/customers` | `GET` | `requireCrmSession` |
| `/api/crm/customers/[partyId]` | `GET`, `PATCH` | `requireCrmSession` (+ scoped RPC) |
| `/api/crm/customers/[partyId]/360` | `GET` | `requireCrmSession` |
| `/api/crm/contacts` | `GET`, `POST` | `requireCrmSession` |
| `/api/crm/contacts/[id]` | `PATCH` | `requireCrmSession` |
| `/api/crm/activities` | `GET`, `POST` | `requireCrmSession` |
| `/api/crm/tasks` | `GET`, `POST` | `requireCrmSession` |
| `/api/crm/tasks/[id]` | `GET`, `PATCH` | `requireCrmSession` |
| `/api/crm/dashboard` | `GET` | `requireCrmSession` |

Every handler extracts the Bearer token, calls `requireCrmSession()` **before touching any data**, and maps `Unauthorized→401` / `Forbidden→403` / else `500`, matching the existing warranty/M1 convention. No route uses a service-role client — all data access is through the caller-scoped token client, so Postgres RLS is the second, independent enforcement layer.

---

## 5. Frontend Routes Added

```
/admin/crm/deals/[id]           — Deal detail view
/admin/crm/customers            — Accounts list/search
/admin/crm/customers/[partyId]  — Customer 360 profile
/admin/crm/tasks                — Tasks list/filter/create/complete
/admin/crm/follow-ups           — Follow-ups (filtered Tasks views)
```

All are `'use client'`, reuse `useCrmAdminGate()` / `CrmAdminShell` from M1, and are thin `fetch()` wrappers around the protected APIs above. (`/admin/crm` dashboard and `/admin/crm/pipeline` are M1 routes, updated in place.) All confirmed present in the `next build` route manifest (Section 7).

---

## 6. Authorization Behavior

- **`requireCrmSession()` on every route** (all 12 route files inspected — none reads/writes a `crm_*` or `erp_parties` row before calling it). Verified live: no token → 401, `doctor` token → 403, `admin`/`engineer`/`dealer` active → 200 (Section 7).
- **No client-side gate is a security boundary** — `useCrmAdminGate()` is UX only; the boundary is `requireCrmSession()` + Postgres RLS (`is_crm_staff()`).
- **No actor/author spoofing** — `POST /api/crm/activities` hardcodes `type:'note'` and sets `actor_id` from the session, ignoring any client `type`/`actor_id`; every server-generated activity (`deal_created`, `product_added`, `task_created`, `task_completed`/`follow_up`) sets `actor_id` server-side. Verified live: an engineer posting `{type:'erp_sale_created', actor_id:<admin uuid>}` was stored as `note` with `actor_id` = the engineer (Section 7); at the RLS level, inserting an activity with a spoofed `actor_id` is rejected (proven in M1 validation, unchanged in M2).
- **`erp_parties` bridge-field edits are correctly scoped** — engineer/dealer can edit `crm_owner_id`/`lead_source`/`city`/`is_individual` only, only via the SECURITY DEFINER RPC; a direct engineer/dealer `UPDATE` on `erp_parties` is RLS-blocked (0 rows), and financial/identity fields (`tax_id`, `opening_debit`, `opening_credit`, `party_type`, `company_id`) cannot be changed even by sneaking them into the RPC payload (Section 8). Account **creation** and all financial-field writes remain admin-only, matching the architecture plan's permission matrix (Section 17).

---

## 7. Test Results — static checks + live API

**Static (local):**
| Check | Result |
|---|---|
| `npx tsc --noEmit` | Zero errors in any CRM file. Only pre-existing errors in unrelated files (`app/admin/erp/page.tsx`, `app/admin/offers/page.tsx`, `app/admin/warranty/page.tsx`, two contract/warranty PDF routes, `contact-hub/page.tsx`, `contract-template.ts`) — the same set documented in the M1 report, none touched by M2. |
| `npx eslint` on all CRM files | **0 errors, 0 warnings** (the one `react-hooks/exhaustive-deps` warning found during review was fixed). |
| `npm run build` (`next build`) | **Compiled successfully.** All 5 new `/admin/crm/*` pages and 12 new `/api/crm/*` route entries present in the manifest; no regression to any pre-existing route. |

**Live API smoke tests** (Next.js dev server against a real Supabase staging project — Section 10 — with real signed-in `admin`/`engineer`/`dealer`/`doctor` sessions): **27/27 passed.** Coverage:
- Unauthorized access: `GET /api/crm/dashboard` no token → **401**; `GET /api/crm/tasks` and `/api/crm/customers` with `doctor` token → **403**.
- Dashboard: 200 with all 7 real metric fields (numeric `newLeads`/`openDeals`/`pipelineValue`/`tasksDueToday`/`overdueFollowUps`/`wonDealsThisPeriod` + `recentActivities` array).
- Deals: create → 201 (+`deal_created` activity with server-set actor); `GET` detail returns `owner` + products/tasks/activities arrays; `PATCH` general fields by **engineer** → 200; `PATCH status` rejected (not in whitelist) → 400.
- Deal products: add real `public.products` id → 201 (joined product name present); `PATCH` quantity by **dealer** → 200; `DELETE` by **dealer** → 200; `product_added` activity logged.
- Tasks/Follow-ups: create overdue `follow_up` by **engineer** → 201; appears in `view=overdue`, absent from `view=due_today`; complete → 200 with `completed_at` set; appears in `view=completed`; completion logs a `follow_up` activity (not generic `task_completed`).
- Activities: client `type`/`actor_id` override ignored → stored as `note`, actor = caller.
- Customer 360 + bridge edit: `PATCH` bridge fields by **engineer** → 200 (the bug fix — was a 500 before); by **dealer** → 200; `GET .../360` returns account + contacts + deals + tasks + activities + productInterests.

**Live RLS / security tests (direct SQL with per-role JWT claims):**
- `engineer` direct `UPDATE erp_parties` → **0 rows** (RLS-blocked); `admin` → **1 row** (allowed).
- `doctor` `SELECT crm_deals` → **0**; `engineer` → **1**.
- `doctor` calling the bridge RPC → **Forbidden**.
- Bridge RPC with malicious payload `{city, tax_id, opening_debit, party_type, company_id}` by engineer → only `city` changed; `tax_id`/`opening_debit`/`party_type`/`company_id` **unchanged**.

**Rollback reversibility:** the documented `29` caveat (narrowing the activity CHECK fails while `deal_created`/`product_added` rows exist) was confirmed to fire correctly; a full simulated `29`+`28` rollback drops **every** M2-added object (5 bridge columns, the RPC, both `crm_deal_id` columns, `crm_deals.notes`) while leaving `erp_parties` and all 8 M1 CRM tables intact, then restores cleanly.

**No-ERP-side-effects verification (the milestone's key safety guarantee):** row counts of `erp_sales`, `erp_sale_items`, `erp_stock_lots`, `warranties`, and `service_cases` were **0 before and 0 after** exercising every M2 flow (deal create/edit, stage moves, product add/remove, task create/complete, notes, contacts, Customer 360, bridge edits). `erp_parties` count was unchanged (CRM edited bridge fields but created no new party). See Section 8.

**UI click-through:** the dev server serves all CRM pages with **HTTP 200** and the underlying data operations are fully proven via the API tests above; a manual interactive browser click-through was made available to the user against the staging environment but pixel-level confirmation is theirs to sign off (same lower-risk gap noted in the M1 validation).

---

## 8. No ERP / Warranty / Inventory Side Effects — explicit confirmation

Baseline (before any M2 flow) and final (after all M2 flows) counts on staging:

| Table | Before | After |
|---|---|---|
| `erp_sales` | 0 | **0** |
| `erp_sale_items` | 0 | **0** |
| `erp_stock_lots` | 0 | **0** |
| `warranties` | 0 | **0** |
| `service_cases` | 0 | **0** |
| `erp_parties` | 1 | **1** (bridge fields edited, no new row) |

CRM tables changed as expected only (`crm_deals` +1, `crm_tasks` +1, `crm_activities` +5, `crm_deal_products` net 0 after add+delete). A repo-wide search of all M2 code confirms **no `insert`/`update` against `erp_sales`, `erp_sale_items`, `erp_stock_lots`, `warranties`, or `service_cases` exists anywhere** — `crm_deal_products` references `public.products` (the catalog), never `erp_products`; marking/moving a deal into the Won stage moves `stage_id` only and never sets `status='won'` or writes any ERP row. This upholds the two-step Won-workflow safety design (architecture plan Section 18); the actual ERP-writing "Complete Sale Setup" step remains a later milestone and is not present here.

**Excluded features confirmed absent:** a targeted search across all M2 code found zero WhatsApp / Messenger / Instagram / TikTok / email-sync / campaign / review / AI-automation code, and no modification to any unrelated ERP module.

---

## 9. Deviations & Review Fixes

Three concrete issues were found while auditing the pre-existing M2 code against the architecture plan, and fixed in this session:

1. **`erp_parties` bridge-field PATCH was silently RLS-rejected for `engineer`/`dealer`.** `app/api/crm/customers/[partyId]/route.ts` intended to let all CRM staff edit the 4 bridge fields, but `erp_parties`' only write policy (`admin_all_erp_parties`, from `21_erp_accounting.sql`) is admin-only, and a plain second UPDATE policy for `is_crm_staff()` cannot restrict *which columns* are writable — it would expose `tax_id`/`opening_debit`/… to non-admins. **Fix:** added the SECURITY DEFINER `crm_update_party_bridge_fields()` RPC (scoped to exactly the 4 columns) in `28_crm_erp_bridge.sql`, and changed the route's `PATCH` to call it. Verified live (Sections 6–8).

2. **`offers.crm_deal_id` / `warranties.crm_deal_id` were missing.** The pre-existing `28` migration deliberately omitted these; the architecture plan (Section 12 "offers **Gains** `crm_deal_id`", "warranties **Gains** `crm_deal_id`") and the Milestone 2 brief's goal 8 both list them. **Fix:** added both as additive nullable FKs in `28_crm_erp_bridge.sql`. They are reserved (no M2 code writes them) so a later milestone becomes a pure application change, not another schema migration.

3. **Deal detail dead code + missing owner display.** `deals/[id]/page.tsx` imported an unused `CrmContact` type and declared unused `AccountOption`/`partyId`/`contactId` form state; the "owner" field the brief asks for was not surfaced. **Fix:** removed the dead code, added `owner` to the `GET /api/crm/deals/[id]` payload and rendered "პასუხისმგებელი" on the page, and resolved the one ESLint `exhaustive-deps` warning.

**Intentional/documented deviations (not defects):**
- **Lead conversion is not implemented.** The architecture plan's own "Recommended Order" listed conversion under Milestone 2, but this session's brief lists 8 M2 goals that do **not** include it. It is genuinely absent (the lead detail page still shows a disabled "convert — coming soon" affordance from M1). Reported here so the divergence between the plan's ordering and the brief is explicit; recommended for M3 (Section 10).
- **Deal detail shows party/contact read-only.** Re-linking a deal to a different Account/Contact from the detail screen is not built (the `PATCH` route supports `party_id`/`contact_id`, but no UI exposes it). Low priority; noted as a limitation.
- **`erp_parties` read exposure for engineer/dealer is full-row** (including `tax_id`/opening balances), not column-restricted — a documented tradeoff (a column-restricted read would need a SECURITY DEFINER view layer, out of M2 scope; these fields are already visible to those roles in existing warranty/ERP admin views). Written up in `28_crm_erp_bridge.sql`.
- **The `app/admin/page.tsx` main hub was not extended** with links to the new M2 pages — they are reachable via the CRM shell's own nav bar. Full hub/cross-module nav wiring is deferred to Milestone 5 per the architecture plan.
- **`app/lib/crm/` service-layer split** (suggested in plan Section 20) was not created; logic stays inline in route handlers, same as M1. Not an M2 regression.

---

## 10. Known Limitations

- **Dashboard "won deals this period" reads 0 until the Won workflow ships.** It counts `crm_deals.status='won'`, which nothing sets in M2 by design (moving into the Won *stage* only changes `stage_id`). Expected, not a bug.
- **Staging validation used a throwaway free-tier Supabase project**, `crm-m1-staging-validation` (ref `htoyimidvmacjpqcyuvu`), reused from the M1 validation. Migrations `28`/`29` are applied there but have **not** been applied to production (`medicalline Pro`, ref `ijliierecnvzurdzmunp`) — that is a deliberate, separate, human-gated step. **Please delete the throwaway project via the Supabase dashboard when finished** (no delete tool is exposed to this session; it can be paused but not removed here).
- **No automated regression suite** exists for this code (consistent with the rest of the repo). Verification is the static checks + the 27-case live API script + the direct RLS/SQL checks in this report.
- **All CRM files (M1 + M2) remain untracked in git** — nothing has been committed. Recommend committing M1 and M2 as separate, reviewable changesets, and keeping the `28`/`29` migration application to production as its own gated step.
- **`.env.development.local`** was created to point the dev server at staging; it must not be committed and must be removed before any production dev run (production `.env.local` was never touched).
- Phone/Facebook-URL lead-dedup normalization limitations carried over from M1 are unchanged (out of M2 scope).

---

## 11. Exact Recommended Milestone 3 Scope

Per the architecture plan's Won-workflow safety design (Section 18) and staged ordering, **Milestone 3 should be the remaining CRM-only workflow layer, still writing zero ERP/warranty/inventory rows**:

1. **Lead → Account/Contact/Deal conversion** (`POST /api/crm/leads/[id]/convert`) with the mandatory **duplicate-search-before-create** step (architecture plan Section 11): normalized phone/email/name match against `erp_parties`/`crm_contacts`, returning candidates and requiring explicit "create new anyway" confirmation. On convert: create/link `erp_parties` (+ optional `crm_contacts`), create the `crm_deals` row, copy any product interest, set `crm_leads.status='converted'` + `converted_deal_id`, and log a `lead_converted`/`system` activity. (This adds `lead_converted` to the `crm_activities` CHECK — a one-line additive migration.)
2. **"Mark Won" — Step 1 only** (`POST /api/crm/deals/[id]/won`): set `status='won_pending_setup'`, move `stage_id` to the `is_won` stage, set `won_at`, log a `stage_change` activity. **No ERP/warranty/task writes.**
3. **"Mark Lost"** (`POST /api/crm/deals/[id]/lost`): single-step `status='lost'` + `lost_reason` + `is_lost` stage + one activity.
4. **Tasks/Follow-ups UI polish** (optional): inline edit/reassign, per-user "my tasks" filter — the data layer already supports it.
5. Restrict the new deal-outcome actions per the permission matrix (all internal staff may Mark Won Step-1 / Mark Lost; the ERP-writing Step 2 stays admin-only and is **Milestone 4**, not 3).

**Do not** begin **Milestone 4 — "Complete Sale Setup"** (the first and only step that writes `erp_sales`/`erp_sale_items`/`warranties`/installation+training tasks) until Milestone 3 is live and reviewed and the existing non-atomic ERP sale-write model has been independently validated in staging — it should receive the most scrutiny of the whole plan. Milestone 3 must not be started here; this milestone stops at Milestone 2 as delivered, tested, and documented above.
