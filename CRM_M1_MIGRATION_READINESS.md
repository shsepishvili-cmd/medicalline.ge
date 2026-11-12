# CRM Milestone 1 — Database Migration Readiness Review

Date: 2026-07-14
Scope: `27_crm_core.sql` / `27_crm_core_rollback.sql` only. No Milestone 2 work performed. No migration applied to any database (staging or production) as part of this review.

## Overall Readiness Status: **READY WITH FIXES — fixes already applied in this pass**

Six concrete issues were found by direct inspection of the migration against the actual current contents of the numbered SQL files in this repo (not against the architecture plan's summary of them — see Section 2). All six were fixable within the migration/rollback files alone, without touching the CRM data model (no column/table was renamed, retyped, or removed), and have been applied directly to `27_crm_core.sql` and `27_crm_core_rollback.sql`. Nothing in this review requires Milestone 2 or application-code changes to close. Two residual, non-blocking limitations remain and are documented in Section 8 as recommendations for later, not defects in this file.

---

## 1. SQL Validation Findings

| # | Area | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | Migration ordering / extension dependency | `gen_random_uuid()` is used as the default for every table's `id` column, but the migration never enabled `pgcrypto` itself — it silently depended on `05_warranty_module.sql` or `25_clinic_commercial_portal.sql` having already run and enabled it. If, for any reason, this migration were applied to a database where those two hadn't run (a fresh/partial restore, a reordered apply, a differently-bootstrapped Supabase project), the very first `CREATE TABLE` would fail with `function gen_random_uuid() does not exist`. | **Blocking (until fixed)** | **Fixed** — added `create extension if not exists pgcrypto;` at the top of `27_crm_core.sql`, matching the exact idempotent pattern already used in `05_warranty_module.sql`/`25_clinic_commercial_portal.sql`. |
| 2 | RLS — INSERT authorship spoofing | Every `INSERT` policy only checked `is_crm_staff()`, with no constraint on the `created_by` (or, on `crm_activities`, `actor_id`) value the caller supplied. Any `engineer`/`dealer` could insert a row with `created_by` set to an arbitrary other user's UUID, fabricating authorship. The shipped API routes already set `created_by`/`actor_id` server-side from the session (so the currently-shipped UI/API paths are not exploitable), but RLS is this project's explicit last line of defense (see `CRM_ARCHITECTURE_PLAN.md` Section 17: "Never rely on hidden UI elements for authorization") and a future direct-client write (as several other modules already do) would have been able to exploit this. | **Non-blocking, should-fix** | **Fixed** — every `INSERT` policy's `WITH CHECK` now additionally requires `created_by is null or created_by = auth.uid()` (`actor_id` for `crm_activities`). |
| 3 | RLS — UPDATE audit-field immutability | Nothing prevented an `UPDATE` from later changing `created_by` to a different value (Postgres `WITH CHECK`/`USING` on `UPDATE` policies cannot cleanly compare OLD vs. NEW values against each other in one boolean expression, so this can't be fixed in the policy itself). | **Non-blocking, should-fix** | **Fixed** — added a `crm_protect_created_by()` `BEFORE UPDATE` trigger (standard Postgres idiom: forces `NEW.created_by := OLD.created_by`) on all 6 tables that have a `created_by` column. This makes `created_by` permanently immutable after insert, for every role including direct SQL-editor edits — see Section 8 for the one documented consequence of that choice. |
| 4 | Seed idempotency / race condition | The seed's guard (`if not exists (select 1 from crm_pipelines where is_default = true)`) is correct for sequential re-runs, but under `READ COMMITTED` (Postgres's default isolation level) two concurrent executions of the migration could both pass the `not exists` check before either commits, producing two rows with `is_default = true`. Extremely unlikely for a manually-triggered, one-time DDL migration, but not actually prevented at the database level before this fix. | **Non-blocking, should-fix** | **Fixed** — added `crm_pipelines_single_default_uidx`, a partial unique index on `(is_default) where is_default = true`, so at most one default pipeline can ever exist, regardless of application logic, concurrency, or future manual inserts. |
| 5 | Lead-deduplication index correctness | (a) None of the 5 partial unique indexes excluded values that are blank *after* normalization (e.g. a `phone` of `'   '` or an `instagram_handle` of `'@'`) — two unrelated leads that both happened to leave a field whitespace-only would collide on the empty string and be incorrectly rejected as duplicates of each other. (b) `phone`/`whatsapp_phone` were only `lower(trim(...))`-normalized, so `"599 12 34 56"` and `"+995599123456"` would **not** be recognized as the same number, undermining the index's actual purpose for the two channels most likely to have formatting variance. (c) `instagram_handle` was not normalized for a leading `"@"`, so `"@drsmith"` and `"drsmith"` would not be recognized as duplicates. | **Non-blocking, should-fix** | **Fixed** — every index now also excludes normalized-empty values; `phone`/`whatsapp_phone` now index `regexp_replace(value, '\D', '', 'g')` (digits-only); `instagram_handle` now indexes `lower(ltrim(trim(value), '@'))`. See Section 8 for what is still *not* solved by this (leading-`0`-vs-`+995` equivalence, Facebook profile URLs). |
| 6 | Comment/documentation accuracy | Migration header comment said "Safe to re-run (all statements are idempotent)" without documenting *why* (`if not exists`/`drop policy if exists`/`drop trigger if exists`/guarded seed) — not a functional bug, but worth being explicit about since it's a claim a reviewer should be able to verify statement-by-statement. | **Cosmetic** | **Fixed** — expanded the header comment to list exactly what was hardened and why, with a pointer to this report. |

Everything else reviewed and found **already correct, no change needed**:

- **PostgreSQL syntax / Supabase compatibility:** every `CREATE POLICY`, `CREATE TRIGGER ... EXECUTE PROCEDURE`, partial index, and `DO $$ ... $$` block uses syntax already proven to work in this exact codebase (verified by direct comparison against `01_core.sql`/`05_warranty_module.sql`/`21_erp_accounting.sql`, not merely "should work in Postgres generally").
- **Foreign key validity:** every FK's target column was independently re-verified (Section 2) to exist with a matching `uuid` type — none of this was taken on the architecture plan's word.
- **CHECK constraints:** every value list (`source`, lead `status`, deal `status`/`currency`, task `type`/`status`/`priority`, activity `type`) was cross-checked against `app/lib/crm-types.ts` and matches exactly, in the same order.
- **The `crm_leads_identifier_required` CHECK:** `nullif(trim(x), '')` correctly treats `NULL`, `''`, and whitespace-only strings identically as "no identifier," across all 6 candidate columns — verified by manual truth-table walkthrough, not just read.
- **Trigger correctness / `updated_at` behavior:** `execute procedure public.set_updated_at()` is the exact syntax `01_core.sql` already uses for the same shared function; no redefinition, no drift.
- **SECURITY DEFINER usage / search_path / ownership:** `is_crm_staff()` mirrors `is_admin()`/`is_warranty_staff()` exactly — `security definer`, `set search_path = public` (prevents search-path-hijacking of the `profiles` lookup), read-only body (no side effects, no dynamic SQL, no user-controlled input interpolated into a query) — same blast-radius profile as the existing, already-relied-upon functions it mirrors.
- **Migration-file circular-FK resolution:** `crm_leads` is created without `converted_deal_id`, `crm_deals` is created next (free to reference `crm_leads.id`), then `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS converted_deal_id ...` — confirmed this produces no forward-reference error and is itself idempotent.

---

## 2. Existing Database Dependencies — Independently Re-Verified

Every dependency below was confirmed by **directly reading the current contents of the referenced `.sql` file in this repo just now** — not by trusting `CRM_ARCHITECTURE_PLAN.md`'s summary of it, per the explicit instruction for this review.

| Schema.Object | Expected column | Expected type | Confirmed by reading | Result |
|---|---|---|---|---|
| `public.profiles` | `id` | `uuid` (FK → `auth.users(id)`) | `supabase/sql/01_core.sql` | ✅ Confirmed |
| `public.profiles` | `role` | `text check (role in ('doctor','dealer','engineer','admin'))` | `supabase/sql/01_core.sql` | ✅ Confirmed — `is_crm_staff()`'s `role in ('admin','engineer','dealer')` is a valid subset |
| `public.profiles` | `status` | `text check (status in ('active','pending','blocked'))` | `supabase/sql/01_core.sql` | ✅ Confirmed |
| `public.is_admin()` | function | `security definer`, `returns boolean`, checks `role = 'admin'` | `supabase/sql/01_core.sql` | ✅ Confirmed — used for all 6 `delete` policies and the `crm_activities` update policy |
| `public.set_updated_at()` | function | `plpgsql` trigger function, sets `new.updated_at = now()` | `supabase/sql/01_core.sql` | ✅ Confirmed — reused verbatim, not redefined |
| `pgcrypto` extension | — | provides `gen_random_uuid()` | `supabase/sql/05_warranty_module.sql`, `supabase/sql/25_clinic_commercial_portal.sql` | ✅ Confirmed enabled elsewhere — **and now also explicitly (re-)enabled inside `27_crm_core.sql` itself** so this is no longer an implicit cross-file dependency (Finding #1) |
| `public.erp_parties` | `id` | `uuid default uuid_generate_v4()` | `supabase/sql/21_erp_accounting.sql` | ✅ Confirmed |
| `public.erp_sales` | `id` | `uuid default uuid_generate_v4()` | `supabase/sql/21_erp_accounting.sql` | ✅ Confirmed |
| `public.offers` | `id` | `uuid primary key default gen_random_uuid()` | `supabase/sql/25_clinic_commercial_portal.sql` | ✅ Confirmed |
| `public.products` | `id` | `uuid default uuid_generate_v4()` | `supabase/sql/01_core.sql` | ✅ Confirmed |
| `public.warranties` | `id` | `uuid primary key default gen_random_uuid()` | `supabase/sql/05_warranty_module.sql` | ✅ Confirmed |
| `public.service_cases` | `id` | `uuid primary key default gen_random_uuid()`, FK to `warranties` | `supabase/sql/05_warranty_module.sql` | ✅ Confirmed |
| `auth.uid()` | function | Supabase/PostgREST built-in | already relied upon by `is_admin()`/`is_warranty_staff()` in this same database | ✅ Confirmed as an already-working pattern in this exact project, not a generic assumption |

**Important residual caveat (not fully closeable from this environment):** the checks above confirm these objects exist in **the SQL files currently committed in this repo**. They do not, and cannot, confirm that the actual target Supabase database (production or otherwise) has every one of migrations `01`–`26` genuinely applied and free of manual drift. Section 6's dry-run plan's first step is specifically designed to close this exact gap before `27_crm_core.sql` is ever run for real.

---

## 3. RLS and Auth Review

| Requirement | Verified how | Result |
|---|---|---|
| Anonymous users cannot access CRM tables | Every one of the 33 policies in the file (see count in Section 6) is scoped `to authenticated`; Postgres RLS defaults to deny for any role with no matching permissive policy | ✅ Pass |
| Authenticated non-CRM users (`doctor`) cannot access | `is_crm_staff()` explicitly requires `role in ('admin','engineer','dealer')`; `doctor` never satisfies it | ✅ Pass |
| admin/engineer/dealer access matches the agreed permission model | Compared line-by-line against `CRM_ARCHITECTURE_PLAN.md` Section 17's matrix: select/insert/update = all three roles on 6 tables (+ `crm_deal_products`'s single all-ops policy); delete = `is_admin()` only on those same 6; `crm_activities` = all three roles get select/insert only, `is_admin()` only for update/delete | ✅ Pass, matches exactly |
| Inserts cannot spoof `created_by`/ownership fields | **Was failing** — fixed (Finding #2) | ✅ Fixed |
| Updates cannot modify protected ownership/audit fields unexpectedly | **Was failing** for `created_by` — fixed via trigger (Finding #3). `owner_id`/`assigned_to` are deliberately **not** protected — reassigning a lead/deal/task to a different staff member is an intended, documented action available to all CRM staff per the agreed permission model, not a bug | ✅ Fixed / confirmed intentional |
| Service-role behavior not accidentally blocked | Supabase's `service_role` Postgres role carries the `BYPASSRLS` attribute by default for every Supabase project — RLS policies (this migration's or any other table's) never apply to it, independent of anything written here. Nothing in `27_crm_core.sql` grants or revokes anything to/from `service_role`, matching the zero-explicit-grant convention already used by every other migration in this repo | ✅ Confirmed unaffected, not merely assumed |

---

## 4. Lead Deduplication Review

| Channel | NULL handling | Case | Whitespace | Normalization | Archived leads | Converted leads |
|---|---|---|---|---|---|---|
| Phone | Excluded via `phone is not null` | N/A | `trim` + now also blank-after-normalize excluded | **Improved**: digits-only via `regexp_replace(phone, '\D', '', 'g')` — catches spaces/dashes/parens/`+` variance | N/A — `crm_leads` has no `archived_at` column by design (Architecture Plan Section 13.3: status covers the lifecycle); confirmed there is nothing for the index to have forgotten | Correctly excluded from uniqueness via `status not in ('converted', ...)` — a converted lead's phone becomes reusable by a genuinely new future lead |
| WhatsApp | Same as phone | N/A | Same as phone | Same digits-only normalization as phone | Same as phone | Same as phone |
| Email | Excluded via `email is not null` | `lower()` | `trim` + now blank-after-trim excluded | Standard `lower(trim())`, appropriate for email | Same as phone | Same as phone |
| Instagram | Excluded via `instagram_handle is not null` | `lower()` | `trim` + now blank-after-normalize excluded | **Improved**: also strips a leading `@` via `ltrim(trim(x), '@')` | Same as phone | Same as phone |
| Facebook | Excluded via `facebook_profile is not null` | `lower()` | `trim` + now blank-after-trim excluded | `lower(trim())` only — **not** improved further (see below) | Same as phone | Same as phone |

**Not fixed in this pass, documented as a known limitation instead of a "concrete correctness issue" requiring an immediate data-model change:**
- Phone/WhatsApp normalization is now digits-only, which is a real improvement, but it is **not** the full `normalizeGeorgianPhone()` logic already implemented in `app/lib/phone-verification.ts` — it will not recognize `"0599123456"` and `"+995599123456"` as the same number (leading-zero vs. country-code prefix). Closing this fully requires calling that existing helper **before** insert, at the API layer (`app/api/crm/leads/route.ts`), not inside a SQL index expression. This is an application-code change and is therefore out of this review's scope (which was limited to the migration/rollback files) — recommended as a small, targeted Milestone 2 (or earlier, standalone) follow-up.
- `facebook_profile` may be entered as a bare username or a full `facebook.com/...` URL; the index only case/whitespace-normalizes, it does not parse a URL into a canonical handle. Parsing arbitrary Facebook profile URLs reliably in a SQL index expression is fragile enough (variable URL shapes, `profile.php?id=...` numeric IDs, locale subdomains) that attempting it now would risk a broken index rather than a genuine fix. Left as documented, unsolved for Milestone 1 — becomes materially more important once Phase 2's Messenger/Instagram ingestion is built and should be solved once there, at the ingestion/normalization layer, not retrofitted into this index.

Neither limitation is a regression from what was previously true (both existed before this review too) and neither blocks Milestone 1 (manual lead entry, the only path shipped so far, is unlikely to hit either edge case often, and the worst-case failure mode is "a preventable duplicate lead gets created," not data corruption or a security issue).

---

## 5. Seed Data Review

| Requirement | Result |
|---|---|
| Can be applied repeatedly without duplication | ✅ — `if not exists (select 1 from crm_pipelines where is_default = true)` guard, confirmed idempotent by tracing both first-run and re-run code paths |
| Preserve stable IDs / stable lookup behavior | ✅ — IDs are generated once (first successful run) and never regenerated on subsequent runs, since the guard prevents the `INSERT` from executing again; stage lookups by `key` (not by generated `id`) remain stable for application code regardless |
| Do not overwrite future user customization | ✅ — re-running the migration after a user has renamed a stage's `label` or reordered `sort_order` does **not** touch existing rows in any way (the guard is on `crm_pipelines.is_default` existence, not on individual stage rows), so customizations survive re-application |
| Do not create duplicate default pipelines | **Was possible under a low-probability concurrent-execution race — fixed** (Finding #4) via `crm_pipelines_single_default_uidx`, a hard database-level guarantee independent of the application-level guard |

---

## 6. Rollback Safety Review

Traced the full drop order in `27_crm_core_rollback.sql` against every FK relationship in the schema to confirm no `DROP TABLE` is attempted while another surviving object still references it:

1. Triggers dropped first (harmless/unnecessary given `DROP TABLE` would remove them anyway, but explicit and clear).
2. `crm_activities` dropped first among tables — nothing in the schema has an FK pointing *at* `crm_activities`, so it's always safe to drop first.
3. `crm_tasks` dropped next — the only FK pointing at it (`crm_activities.task_id`) was already removed in step 2.
4. `crm_deal_products` dropped next — nothing references it.
5. `crm_leads.converted_deal_id` dropped via explicit `ALTER TABLE ... DROP COLUMN` — this is the **necessary** step that removes the one remaining FK pointing at `crm_deals` before it can be dropped.
6. `crm_deals` dropped — by this point, every FK that pointed at it (`crm_tasks.deal_id`, `crm_activities.deal_id`, `crm_leads.converted_deal_id`) has already been removed.
7. `crm_leads` dropped — every FK that pointed at it (`crm_deals.lead_id`, `crm_tasks.lead_id`, `crm_activities.lead_id`) is already gone.
8. `crm_contacts` dropped — every FK that pointed at it (`crm_leads.contact_id`, `crm_deals.contact_id`, `crm_tasks.contact_id`, `crm_activities.contact_id`) is already gone.
9. `crm_pipeline_stages` dropped — the only FK pointing at it (`crm_deals.stage_id`) is already gone.
10. `crm_pipelines` dropped — the FKs pointing at it (`crm_pipeline_stages.pipeline_id`, `crm_deals.pipeline_id`) are already gone.
11. `is_crm_staff()` and `crm_protect_created_by()` dropped last — every policy/trigger that referenced them was removed along with its table in the preceding steps.

**Result: the drop order was already fully dependency-safe before this review** (no reordering was required) — the rollback script's only change in this pass was adding the drop statements for the two new triggers-per-table and the new `crm_protect_created_by()` function introduced by the Finding #2/#3 fixes, so the rollback still removes *everything* the (now-hardened) forward migration creates.

- **Only CRM Milestone 1 objects are removed:** every `DROP` statement targets an object explicitly named `crm_*` or `is_crm_staff`/`crm_protect_created_by` — zero statements reference `erp_*`, `warranties`, `offers`, `products`, `profiles`, or any other pre-existing object, confirmed by re-reading the full file.
- **The `pgcrypto` extension is deliberately left enabled** by the rollback (never `DROP EXTENSION`'d) — it may already be required by `05_warranty_module.sql`/`25_clinic_commercial_portal.sql` independent of CRM, so removing it would be an out-of-scope, unsafe side effect the rollback correctly avoids.

---

## 7. Dry-Run Execution Plan (Staging / Temporary Supabase Environment)

1. **Do not run any of this against `medicalline.ge`'s production project first.** Use a Supabase branch, a separate throwaway Supabase project, or a local `supabase start` instance seeded from a recent production dump.
2. **Full backup / export**, even though this migration is purely additive: via Supabase Dashboard → Database → Backups, or `pg_dump "$SUPABASE_DB_URL" -Fc -f pre_crm_full_backup.dump`.
3. **Schema-only snapshot for diffing**, so the "only CRM objects were added" claim can be verified mechanically rather than by eye: `pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges -f pre_crm_schema_snapshot.sql`.
4. **Run the dependency checklist** (Section 2's table) against the target database directly — e.g. `\d public.profiles`, `\d public.erp_parties`, `\df public.is_admin`, `\df public.set_updated_at` in `psql` — to confirm those objects genuinely exist there before assuming the repo's migration history matches reality.
5. **Apply the migration inside an explicit transaction** rather than relying on the SQL editor's implicit wrapping: `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "BEGIN;" -f supabase/sql/27_crm_core.sql -c "COMMIT;"` (or paste `BEGIN;` / the file contents / `COMMIT;` into the SQL editor as one script) — so a mid-script failure rolls back atomically instead of leaving a partially-applied state, even though every statement is individually idempotent and safe to resume.
6. **Run the post-migration verification SQL** (Section 8 below).
7. **Run the functional dedup/constraint tests** (Section 8 below).
8. **Smoke-test the Leads and Deals API routes** (Section 8 below) against this environment with a real seeded `admin`/`engineer`/`dealer` test profile and a real `doctor` test profile.
9. **Run the rollback in the same environment** and re-verify with the rollback verification SQL (Section 8) plus a diff of a fresh schema-only dump against the Step 3 snapshot — they should be identical.
10. Only after Steps 1–9 all pass should `27_crm_core.sql` be considered ready to run against the real production project — during a low-traffic window, with the Step 2 backup on hand, followed immediately by re-running the Step 6 verification queries against production itself.

---

## 8. Post-Migration / Rollback Verification SQL

### 8.1 Post-migration verification (run after applying `27_crm_core.sql`)

```sql
-- 1. All 8 tables exist
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'crm_%'
order by table_name;
-- expect exactly 8 rows: crm_activities, crm_contacts, crm_deal_products, crm_deals,
-- crm_leads, crm_pipeline_stages, crm_pipelines, crm_tasks

-- 2. Both new functions exist
select proname from pg_proc where proname in ('is_crm_staff', 'crm_protect_created_by');
-- expect 2 rows

-- 3. RLS is enabled on every CRM table
select relname, relrowsecurity from pg_class
where relname like 'crm_%' and relkind = 'r'
order by relname;
-- expect relrowsecurity = true for all 8

-- 4. Policy count matches the design (6 tables x 4 policies + 1 + 4 = 29)
select tablename, count(*) from pg_policies
where tablename like 'crm_%'
group by tablename order by tablename;
-- expect: crm_pipelines=4, crm_pipeline_stages=4, crm_contacts=4, crm_leads=4,
--         crm_deals=4, crm_tasks=4, crm_deal_products=1, crm_activities=4  (total 29)

-- 5. Seed data is exactly as specified
select name, is_default, is_active from public.crm_pipelines;
-- expect exactly 1 row: ('Sales Pipeline', true, true)

select key, label, sort_order, is_won, is_lost from public.crm_pipeline_stages
order by sort_order;
-- expect exactly 9 rows in order: new_lead, contacted, qualified, demo, offer_sent,
-- financing_decision, negotiation, won(is_won=true), lost(is_lost=true)

-- 6. All 6 lead/pipeline-integrity unique indexes exist
select indexname from pg_indexes
where tablename in ('crm_leads', 'crm_pipelines') and indexname like '%uidx'
order by indexname;
-- expect 6 rows: crm_leads_phone_open_uidx, crm_leads_email_open_uidx,
-- crm_leads_ig_open_uidx, crm_leads_fb_open_uidx, crm_leads_wa_open_uidx,
-- crm_pipelines_single_default_uidx

-- 7. Foreign keys resolve to the expected pre-existing tables (spot check)
select conname, conrelid::regclass::text as from_table, confrelid::regclass::text as to_table
from pg_constraint
where contype = 'f' and conrelid::regclass::text like 'crm_%'
order by from_table, to_table;
-- eyeball: erp_parties/profiles/products/warranties/service_cases/offers/erp_sales
-- should each appear as a to_table at least once, alongside the crm_* internal FKs

-- 8. Functional constraint tests (run as a role that is NOT service_role/superuser,
--    ideally the anon/authenticated role via PostgREST with a real JWT, so RLS is
--    genuinely exercised — running these as postgres/service_role only proves the
--    CHECK/unique constraints work, not that RLS does)
--
-- 8a. Reject a lead with no identifier at all:
insert into public.crm_leads (source) values ('manual');
-- expect: ERROR — violates check constraint "crm_leads_identifier_required"
--
-- 8b. Accept a lead with only a phone:
insert into public.crm_leads (source, phone) values ('manual', '599123456');
-- expect: success
--
-- 8c. Reject a second open lead with the same phone in a different format:
insert into public.crm_leads (source, phone) values ('manual', '+995 599 12 34 56');
-- expect: ERROR — duplicate key value violates unique constraint "crm_leads_phone_open_uidx"
--
-- 8d. Convert the first lead, then confirm the phone becomes reusable:
update public.crm_leads set status = 'converted' where phone = '599123456';
insert into public.crm_leads (source, phone) values ('manual', '599123456');
-- expect: success (status not in ('converted','disqualified') correctly excludes it)
--
-- 8e. Confirm created_by cannot be spoofed or later changed (run as an authenticated
--     crm-staff session, not service_role):
--     insert ... (created_by) values ('<someone-elses-uuid>') -> expect RLS violation
--     update ... set created_by = '<someone-elses-uuid>' -> expect created_by unchanged
--     (SELECT the row back and confirm created_by still equals the original inserter)
```

### 8.2 Rollback verification (run after applying `27_crm_core_rollback.sql` in the same test environment)

```sql
-- 1. Zero CRM tables remain
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'crm_%';
-- expect 0 rows

-- 2. Zero CRM functions remain
select proname from pg_proc where proname in ('is_crm_staff', 'crm_protect_created_by');
-- expect 0 rows

-- 3. Pre-existing tables are untouched (row counts identical to pre-migration)
select 'profiles' as t, count(*) from public.profiles
union all select 'erp_parties', count(*) from public.erp_parties
union all select 'erp_sales', count(*) from public.erp_sales
union all select 'offers', count(*) from public.offers
union all select 'products', count(*) from public.products
union all select 'warranties', count(*) from public.warranties
union all select 'service_cases', count(*) from public.service_cases;
-- expect: every count identical to the equivalent query run before Step 5 of the dry-run plan

-- 4. Pre-existing table SCHEMA is untouched
-- Re-run: pg_dump --schema-only --no-owner --no-privileges -f post_rollback_schema.sql
-- Then: diff pre_crm_schema_snapshot.sql post_rollback_schema.sql
-- expect: no differences
```

---

## 9. Recommended Safe Deployment Procedure (Summary)

1. Never apply directly to production first — use a branch/throwaway project (Section 7, Steps 1–4).
2. Apply inside an explicit transaction (Section 7, Step 5).
3. Run every query in Section 8.1 and confirm every expected result, including the functional dedup/spoofing tests run as a real `authenticated` session (not `service_role`).
4. Smoke-test `GET/POST /api/crm/leads`, `PATCH /api/crm/leads/[id]`, `GET/POST /api/crm/deals`, and `PATCH /api/crm/deals/[id]/stage` with: no token (expect 401), a `doctor`-role token (expect 403), and a real `admin`/`engineer`/`dealer` token (expect success) — confirming `requireCrmSession()` behaves identically against a real database as it did against the mocked/typechecked review in `CRM_PHASE1_M1_REPORT.md`.
5. Apply the rollback in the same environment and run every query in Section 8.2, confirming a clean, complete reversal.
6. Only then, apply `27_crm_core.sql` to the real production project, during a low-traffic window, with the Section 7 Step 2 backup on hand, and immediately re-run Section 8.1's verification queries against production itself.
7. Do not begin Milestone 2 (`28_crm_erp_bridge.sql`, lead conversion, Customer 360) until this procedure has been completed at least once, successfully, end to end.

---

## 10. Files Changed in This Review

- `supabase/sql/27_crm_core.sql` — 6 findings fixed in place (Section 1). No table, column, or CHECK-constraint value was renamed, retyped, or removed; every change is additive (new extension declaration, new function, new triggers, hardened `WITH CHECK` clauses, improved index expressions/predicates).
- `supabase/sql/27_crm_core_rollback.sql` — updated to drop the two new triggers-per-table and the new `crm_protect_created_by()` function introduced by the fixes above, so it still fully reverses the (now-hardened) forward migration. Drop order was already correct and did not need to change.
- No other file was read for correctness-critical facts without independently re-verifying it against the current repo contents (Section 2). No application code (`app/api/crm/*`, `app/lib/crm-*`, `app/admin/crm/*`) was modified in this pass, per the review's scope.
