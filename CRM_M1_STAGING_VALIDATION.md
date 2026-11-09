# CRM Milestone 1 — Staging Deployment Validation Report

Date: 2026-07-14
Scope: staging validation of `27_crm_core.sql` / `27_crm_core_rollback.sql` only. No Milestone 2 work performed. Production (`medicalline Pro`, project ref `ijliierecnvzurdzmunp`) was never touched — no production credentials were used, and no query was ever run against that project.

## Final Status: **PASS**

Every check in the validation plan passed on first attempt except two items that needed a mechanical adjustment during setup (documented in Section 10) — neither was a defect in `27_crm_core.sql` itself.

---

## 1. Environment Used

- **No local Supabase CLI, Docker, or existing staging project was available** in this environment (confirmed: `supabase` and `docker` commands not found, no `supabase/config.toml`, and the only `.env.local` present was a Vercel-pulled **production** environment file for the `medicalline-ge` project).
- Supabase branching (the originally preferred isolated-staging mechanism) was attempted and found **unavailable**: this organization is not on a Pro-or-above plan (`PaymentRequiredException: Branching is supported only on the Pro plan or above`).
- **With explicit user confirmation at each cost-bearing step**, a brand-new, throwaway Supabase project was created instead:
  - Name: `crm-m1-staging-validation`, ref `htoyimidvmacjpqcyuvu`, region `ap-northeast-1`, Postgres 17.6.1.
  - Cost: $0/month (free tier) — confirmed via `get_cost`/`confirm_cost` before creation.
  - Since it starts empty, migrations `01_core.sql` through `05_warranty_module.sql`, `21_erp_accounting.sql`, and `25_clinic_commercial_portal.sql` were replayed first to reconstruct exactly the schema baseline `27_crm_core.sql` depends on (`profiles`, `is_admin()`, `set_updated_at()`, `pgcrypto`, `warranties`, `service_cases`, `products`, `erp_parties`, `erp_sales`, `offers`). Migrations `02`–`04` were also applied (harmless, not strictly required). `06`–`20`, `22`–`24`, `26` were deliberately **not** replayed — they add academy/contracts/invoice/analytics/import-cleanup modules that `27_crm_core.sql` has no dependency on, confirmed by direct inspection of `27_crm_core.sql`'s FK targets. `03_fix_admin_user.sql` was skipped outright (it hard-codes a lookup for a specific pre-existing production email and would fail on any fresh project by design).
  - Four synthetic test identities were created directly in `auth.users`/`auth.identities`/`public.profiles` (roles `admin`, `engineer`, `dealer`, `doctor`) to exercise RLS and the API as real authenticated sessions.
- **After validation completed**, the project was **paused** (`pause_project` — succeeded). No `delete_project` tool is exposed through this Supabase MCP connection, so full deletion could not be performed by this session. **The user should delete project `crm-m1-staging-validation` (ref `htoyimidvmacjpqcyuvu`) via the Supabase dashboard** when convenient — it is paused and costs nothing while paused, but it will still exist until deleted.

---

## 2. Migration Execution Result

`27_crm_core.sql` was applied to the reconstructed baseline via `apply_migration` and returned `{"success": true}` with **no errors, warnings, or partial failures**. It was subsequently re-applied a second time (idempotency test, Section 6) and a third time (post-rollback re-apply test, Section 9) — both also returned `{"success": true}` with no errors.

---

## 3. Schema Verification Result

All checks passed exactly as designed:

| Check | Result |
|---|---|
| All 8 tables exist (`crm_pipelines`, `crm_pipeline_stages`, `crm_leads`, `crm_contacts`, `crm_deals`, `crm_deal_products`, `crm_tasks`, `crm_activities`) | ✅ Confirmed via `information_schema.tables` |
| Primary keys | ✅ All 8 tables have a `uuid` PK (`crm_*_pkey`), confirmed via `pg_constraint` |
| Foreign keys | ✅ 33 FK constraints confirmed, every one resolving to the expected target table (`profiles`, `erp_parties`, `products`, `warranties`, `service_cases`, `offers`, `erp_sales`, and internal `crm_*` cross-references) — including `crm_leads_converted_deal_id_fkey → crm_deals`, proving the circular-reference resolution via post-hoc `ALTER TABLE` worked correctly |
| CHECK constraints | ✅ All present: `crm_leads_identifier_required`, `crm_leads_source_check`, `crm_leads_status_check`, `crm_deals_currency_check`, `crm_deals_probability_percent_check`, `crm_deals_status_check`, `crm_deal_products_quantity_check`, `crm_tasks_type_check`, `crm_tasks_status_check`, `crm_tasks_priority_check`, `crm_activities_type_check` |
| Indexes | ✅ All confirmed via `pg_indexes`, including the exact normalized expressions (`regexp_replace(phone, '\D', '', 'g')`, `lower(ltrim(trim(instagram_handle), '@'))`, etc.) |
| Partial unique indexes | ✅ All 6 present: 5 lead-dedup indexes + `crm_pipelines_single_default_uidx` |
| Triggers | ✅ 10 triggers confirmed: `set_updated_at` on 4 tables (`crm_contacts`, `crm_leads`, `crm_deals`, `crm_tasks`) + `protect_created_by` on 6 tables (those 4 plus `crm_pipelines`, `crm_pipeline_stages`) |
| RLS enabled | ✅ `relrowsecurity = true` on all 8 tables |
| Policies | ✅ Exactly 29 policies, matching the designed count precisely: 6 tables × 4 (select/insert/update/delete) = 24, + 1 (`crm_deal_products`, single ALL policy) + 4 (`crm_activities`: select/insert for staff, update/delete for admin) = 29 |
| Functions | ✅ `is_crm_staff()` and `crm_protect_created_by()` both present |
| Default pipeline | ✅ Exactly 1 row, `name='Sales Pipeline'`, `is_default=true`, `is_active=true` |
| Exactly 9 default stages | ✅ Confirmed in correct `sort_order` with correct `is_won`/`is_lost` flags: `new_lead, contacted, qualified, demo, offer_sent, financing_decision, negotiation, won(is_won), lost(is_lost)` |

---

## 4. RLS / Auth Results

All tested against **real** Postgres roles (`anon`, `authenticated`) with simulated JWT claims (`SET LOCAL ROLE` + `SET LOCAL request.jwt.claims`) — the standard, valid technique for exercising Supabase RLS policies directly, and later re-confirmed end-to-end through the real Next.js API with real signed-in sessions (Section 7).

| Test | Expected | Observed |
|---|---|---|
| **A. Anonymous** — `SELECT` on `crm_leads` (with a real row present) | 0 rows, no data leak | ✅ `0` rows returned |
| **A. Anonymous** — `INSERT` into `crm_leads` | Denied | ✅ `ERROR 42501: new row violates row-level security policy for table "crm_leads"` |
| **B. Doctor (authenticated, non-CRM)** — `SELECT` on `crm_leads` | 0 rows | ✅ `0` rows returned |
| **B. Doctor** — `INSERT` into `crm_leads` | Denied | ✅ `ERROR 42501` |
| **C. Dealer** — `SELECT`/`INSERT` on `crm_leads` | Allowed (matches permission matrix: create/view leads = all CRM staff) | ✅ Both succeeded |
| **D. Engineer** — `SELECT`/`INSERT` on `crm_leads`, `SELECT`/`INSERT` on `crm_activities`, `PATCH` deal stage | Allowed | ✅ All succeeded |
| **E. Admin** — full access including `DELETE` | Allowed | ✅ Succeeded |
| **Spoof `created_by`** — engineer inserts a lead with `created_by` = admin's UUID | Denied | ✅ `ERROR 42501: new row violates row-level security policy for table "crm_leads"` |
| **Spoof `actor_id`** — engineer inserts an activity with `actor_id` = admin's UUID | Denied | ✅ `ERROR 42501: new row violates row-level security policy for table "crm_activities"` |
| **Legitimate self-attribution** — engineer inserts an activity with `actor_id` = own UUID | Allowed | ✅ Succeeded |
| **`created_by` immutability** — engineer creates a lead (`created_by`=self), then `UPDATE ... SET created_by = <admin's UUID>` | UPDATE allowed, but `created_by` must remain unchanged | ✅ UPDATE succeeded (other fields changed), `created_by` **silently stayed as the engineer's own UUID** — the `crm_protect_created_by()` trigger worked exactly as designed |
| **Delete — engineer** | Denied (delete is admin-only) | ✅ `DELETE` affected 0 rows (RLS-filtered, not an error — standard Postgres RLS delete semantics) |
| **Delete — admin** | Allowed | ✅ Row removed |
| **Service-role bypass** | Not tested destructively, but confirmed by design: Supabase's `service_role` carries `BYPASSRLS` by default and is unaffected by anything in this migration (no explicit grant/revoke touches it) | ✅ Consistent with every other table in the database |

**All RLS/auth requirements pass. No non-blocking issues found.**

---

## 5. Lead Deduplication Test Matrix

| Case | Input 1 (inserted, succeeds) | Input 2 (attempted, expected outcome) | Result |
|---|---|---|---|
| Email, case-insensitive | `Test@Example.com` | `test@example.com` → expect duplicate rejection | ✅ `ERROR 23505: duplicate key value violates unique constraint "crm_leads_email_open_uidx"` |
| Instagram, with/without `@` | `@drsmith_test` | `drsmith_test` → expect duplicate rejection | ✅ `ERROR 23505: ... "crm_leads_ig_open_uidx"` |
| Phone, spaces/dashes/parens | `(599) 111-222` | `599 111 222` → expect duplicate rejection | ✅ `ERROR 23505: ... "crm_leads_phone_open_uidx"` |
| WhatsApp, formatting differences | `+995 599 222 333` | `995-599-222-333` → expect duplicate rejection | ✅ `ERROR 23505: ... "crm_leads_wa_open_uidx"` |
| Blank/NULL identifiers | — | All 6 identifier columns `null`/whitespace-only → expect CHECK rejection | ✅ `ERROR 23514: violates check constraint "crm_leads_identifier_required"` |
| Converted-lead reuse | Lead with `phone='599777888'`, then marked `status='converted'` | New lead with the same phone → expect **success** (converted leads free their identifier) | ✅ New lead created, `status='new'` |
| Disqualified-lead reuse | Lead with `email='spam@example.com'`, then marked `status='disqualified'` | New lead with the same email → expect **success** | ✅ New lead created, `status='new'` |

**All 7 deduplication behaviors match the documented design exactly.** No data-model changes were made — this run only *confirmed* the fixes already applied during the migration-readiness review (`CRM_M1_MIGRATION_READINESS.md` Finding #5).

---

## 6. Seed Idempotency Result

1. Manually customized an existing stage's label (`demo` → `"CUSTOM LABEL BY USER"`) to simulate a user edit.
2. Re-ran the **entire** `27_crm_core.sql` migration verbatim a second time.
3. Verified:
   - `crm_pipelines` count: **1** (no duplicate default pipeline created) ✅
   - `crm_pipeline_stages` count: **9** (no duplicate stages created) ✅
   - The customized label **`"CUSTOM LABEL BY USER"`** on the `demo` stage **survived the re-run untouched** ✅ (the seed's `if not exists (select 1 from crm_pipelines where is_default = true)` guard correctly skipped re-seeding once a default pipeline existed)

**All three seed-idempotency requirements pass.**

---

## 7. API Smoke Test Result

Ran the actual Next.js dev server (`npm run dev`) against the staging project via a temporary `.env.development.local` override (Next.js precedence: `.env.development.local` > `.env.local`; **production `.env.local` was never read, modified, or touched** — confirmed before and after). Real access tokens were obtained for all four test identities via Supabase's password-grant endpoint (no email sent, no rate-limit exposure).

| # | Request | Expected | Observed |
|---|---|---|---|
| 1 | `GET /api/crm/leads`, no auth | 401 | ✅ `401` |
| 2 | `GET /api/crm/leads`, doctor token | 403 | ✅ `403 {"ok":false,"error":"Forbidden"}` |
| 3 | `GET /api/crm/leads`, admin token | 200, list of leads | ✅ `200`, full list returned |
| 4 | `POST /api/crm/leads`, admin, valid payload | 201 | ✅ `201`, lead created |
| 5 | `POST /api/crm/leads`, admin, no identifier | 400 | ✅ `400 {"code":"missing_identifier"}` |
| 6 | `POST /api/crm/leads`, admin, invalid `source` | 400 | ✅ `400 {"code":"invalid_source"}` |
| 7 | `GET /api/crm/leads/[id]`, admin | 200 | ✅ `200` |
| 8 | `PATCH /api/crm/leads/[id]`, `status: "qualified"` | 200 | ✅ `200`, status updated |
| 9 | `PATCH /api/crm/leads/[id]`, `status: "converted"` (direct) | 400 (reserved for the not-yet-built conversion endpoint) | ✅ `400` |
| 10 | `GET /api/crm/leads/[id]`, no auth | 401 | ✅ `401` |
| 11 | `GET /api/crm/deals`, no auth | 401 | ✅ `401` |
| 12 | `POST /api/crm/deals`, admin, valid | 201, deal created in the pipeline's first stage (`new_lead`) by default | ✅ `201`, `stage_id` = the confirmed `new_lead` stage |
| 13 | `POST /api/crm/deals`, admin, missing `title` | 400 | ✅ `400` |
| 14 | `PATCH /api/crm/deals/[id]/stage` → `qualified` | 200, only `stage_id` changes | ✅ `200`; `status` stayed `"open"` |
| 15 | `PATCH /api/crm/deals/[id]/stage` → **Won stage** (the safety-critical case) | 200; **no** ERP/warranty/task side effects | ✅ `200`; `status` stayed `"open"`, `won_at`/`erp_sale_id` stayed `null` |
| 16 | `PATCH /api/crm/deals/[id]/stage`, non-existent `stage_id` | 404 | ✅ `404` |
| 17 | `PATCH /api/crm/deals/[id]/stage`, engineer token | 200 (matches permission matrix) | ✅ `200` |
| 18 | `GET /api/crm/deals`, engineer token | 200 | ✅ `200` |

**Explicit no-side-effects verification for check #15 (the single most safety-critical test in this milestone):** queried `erp_sales`, `warranties`, and `crm_tasks` row counts immediately before and after moving the deal into the "Won" stage via the live API — **all three remained at 0** both before and after. `crm_activities` gained exactly 2 rows, both correctly typed `stage_change` with no other activity type ever created. This directly confirms, end-to-end through the real API and a real database, the Milestone 1 design guarantee: moving a deal into any stage — including Won — updates `crm_deals.stage_id` only, with zero ERP/warranty/task writes.

**All 18 API checks pass. No invalid payload was ever accepted; no unauthenticated or under-privileged request ever succeeded.**

---

## 8. UI Smoke Test Result

**Partial — with an honest, explicitly-flagged limitation.** No browser-automation tool (Playwright/Puppeteer/computer-use) is available in this environment to interactively click, fill forms, or drag Kanban cards. What was actually verified:

- All 6 CRM pages (`/admin/crm`, `/admin/crm/leads`, `/admin/crm/leads/new`, `/admin/crm/leads/[id]`, `/admin/crm/leads/[id]/edit`, `/admin/crm/pipeline`) return **HTTP 200** against the live dev server pointed at the staging project — confirming every route compiles and server-renders without crashing.
- The Leads list page's server-rendered shell contains the expected Georgian label text (`ლიდები`).
- The Dashboard/Pipeline pages render their `LoadingView` shell server-side (expected: these are `'use client'` components that fetch data via `useEffect` after hydration, which a plain HTTP fetch cannot execute — there is no JavaScript engine in `curl`).
- The two new nav buttons in `app/admin/page.tsx` were already confirmed present by direct source-code inspection during Milestone 1 implementation; the authenticated view they live in cannot be reached via a raw HTTP request without a real browser session (matches this project's existing client-side-only auth-gate pattern everywhere else).

**What substitutes for the missing interactive click-through:** every actual data operation the UI performs (create lead, edit lead, list leads/deals, move a deal between stages including into Won) was independently verified end-to-end through the real API in Section 7, against the same live server and database. The UI components are thin `fetch()` wrappers around those exact endpoints (confirmed by source-code reading during implementation) — so the business-logic risk is covered, even though pixel-level/interactive confirmation is not. Recommend a follow-up manual click-through in an actual browser (by the user, or a future session with browser-automation access) before considering the UI itself fully sight-verified — this is a genuine gap, not glossed over.

---

## 9. Rollback Result

1. Recorded a baseline of pre-existing table row counts (`profiles=4, products=2, erp_parties=0, erp_sales=0, offers=0, warranties=0, service_cases=0`) and the full 29-table list of `public` schema tables immediately before rollback.
2. Applied `27_crm_core_rollback.sql`. Result: `{"success": true}`, no errors.
3. Verified:
   - `information_schema.tables` query for `crm_%`: **0 rows** — all 8 tables gone.
   - `is_crm_staff`/`crm_protect_created_by` functions: **0 rows** — both gone.
   - Pre-existing table row counts: **identical** to the pre-rollback baseline, exactly (`profiles=4, products=2`, all others `0`, unchanged).
   - Full `public` schema table list after rollback: **byte-for-byte identical, table name for table name**, to the snapshot taken before `27_crm_core.sql` was ever applied (29 tables, same names, same set).

**Rollback is complete, correct, and verified to leave zero trace in the schema or in any pre-existing table's data.**

## Re-Apply Result

Applied `27_crm_core.sql` a third time (identical content) immediately after the rollback. Result: `{"success": true}`, no errors. Verified: all 8 tables present again, `crm_pipelines` count = 1, `crm_pipeline_stages` count = 9 (correct seed reconstructed from scratch, since the rollback had removed the previous seed rows along with the tables).

**Clean reversibility is proven: apply → verify → roll back → verify clean → re-apply → verify clean, all without any error or residue.**

---

## 10. Bugs Found / Fixes Made During This Session

**None in `27_crm_core.sql` or `27_crm_core_rollback.sql` themselves** — every finding from the prior `CRM_M1_MIGRATION_READINESS.md` review was already fixed before this staging run, and this run confirms those fixes work correctly against a real database (not just by inspection).

Two setup-only mechanical issues were hit and resolved, neither indicating a defect in the CRM migration:

1. **Directly inserting synthetic test users into `auth.users` without a matching `auth.identities` row caused password-grant sign-in to fail** (`"Database error querying schema"`). Fixed by also inserting the corresponding `auth.identities` row (a modern Supabase Auth requirement for email/password login) — a test-environment setup detail, unrelated to the CRM schema.
2. **The public `/auth/v1/signup` endpoint rejected/rate-limited `@example.com` addresses** on this project's free-tier email settings. Bypassed by using direct SQL insertion (`auth.users` + `auth.identities`) instead of the signup flow, since password-grant login (used for all subsequent testing) does not send email and is not subject to the same limits.

---

## 11. Final Status

# PASS

`27_crm_core.sql` and `27_crm_core_rollback.sql` are validated end-to-end against a real Supabase/PostgreSQL 17 environment: schema, RLS/authorization (including the anti-spoofing and immutability hardening), lead deduplication, seed idempotency, the live API layer, and full rollback/re-apply reversibility all behave exactly as designed, with zero defects found in the migration files themselves during this pass.

**Two follow-ups recommended before/alongside Milestone 2** (neither blocks Milestone 1 sign-off):
- Delete the paused throwaway project `crm-m1-staging-validation` (ref `htoyimidvmacjpqcyuvu`) via the Supabase dashboard — no deletion tool was available to this session.
- Perform one real interactive browser click-through of `/admin/crm`, `/admin/crm/leads` (create/edit), and `/admin/crm/pipeline` (drag a card) against a disposable environment, to close the UI-layer verification gap noted in Section 8 — the underlying data operations are already fully proven via the API tests, so this is a lower-risk, presentation-layer-only gap.

**Milestone 2 was not started.**
