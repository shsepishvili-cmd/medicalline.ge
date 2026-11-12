# CRM Phase 1 — Milestone 1 Implementation Report

Date: 2026-07-14
Scope: implementation of Milestone 1 only, per `CRM_ARCHITECTURE_PLAN.md` and `CRM_PHASE1_IMPLEMENTATION.md`. No later milestone was started.

---

## 1. Files Created

**Database:**
- `supabase/sql/27_crm_core.sql` — the 8 CRM tables (`crm_pipelines`, `crm_pipeline_stages`, `crm_contacts`, `crm_leads`, `crm_deals`, `crm_deal_products`, `crm_tasks`, `crm_activities`), the `is_crm_staff()` role function, all RLS policies, `updated_at` triggers, and the idempotent seed (1 default pipeline + 9 stages). Written but **not applied to any database** (see Section 6).
- `supabase/sql/27_crm_core_rollback.sql` — companion rollback script (drops exactly what the above creates, in dependency-safe order).

**Server/library:**
- `app/lib/crm-server.ts` — `requireCrmSession(accessToken)` and `getBearerToken(request)`.
- `app/lib/crm-types.ts` — TypeScript types, enums, and label/tone maps for all 8 CRM entities.

**API routes:**
- `app/api/crm/leads/route.ts` — `GET` (list, filterable by `status`/`source`/`owner_id`), `POST` (create).
- `app/api/crm/leads/[id]/route.ts` — `GET` (one), `PATCH` (edit; status limited to `new`/`contacted`/`qualified`/`disqualified`).
- `app/api/crm/deals/route.ts` — `GET` (list, filterable by `pipeline_id`), `POST` (create, defaults to the default pipeline's first stage).
- `app/api/crm/deals/[id]/stage/route.ts` — `PATCH` (moves `stage_id` only; validates the target stage belongs to the same pipeline; logs a `crm_activities` `stage_change` row).

**Frontend:**
- `app/admin/crm/page.tsx` — CRM Dashboard (lead/deal counts, pipeline value, shortcuts).
- `app/admin/crm/leads/page.tsx` — Leads list (search + status/source filters).
- `app/admin/crm/leads/new/page.tsx` — new lead.
- `app/admin/crm/leads/[id]/page.tsx` — lead detail (read-only + a disabled "Convert" button, explicitly labeled as a future milestone).
- `app/admin/crm/leads/[id]/edit/page.tsx` — edit lead.
- `app/admin/crm/pipeline/page.tsx` — Kanban board page.
- `app/admin/crm/_components/CrmUi.tsx` — imports `colors`/`ui`/`Field`/`EmptyState`/`InfoStat`/`LoadingView`/`AuthBlockedView` from `WarrantyUi.tsx` (same reuse precedent as `AcademyUi.tsx`); adds `useCrmAdminGate()`, `CrmAdminShell()`, `CrmStatusBadge()`.
- `app/admin/crm/_components/LeadForm.tsx` — single form used by both new/edit.
- `app/admin/crm/_components/PipelineBoard.tsx` — the Kanban board component.

## 2. Files Modified

- `app/admin/page.tsx` — exactly two additive changes: one sidebar button (`🧲 CRM`, next to the existing `/admin/clinic-offers` button) and one Quick Actions button (`CRM`, next to the existing ERP button), both `window.location.href = '/admin/crm'`, styled with the same per-item inline-color convention every other module button already uses. **No other line in this file was touched by this work.**

  Note: `git diff` against this file shows a much larger diff than these two additions — that is **pre-existing uncommitted work already in the working tree before this session started** (an admin-auth rework, a "Communications/SMS" tab, user-management actions). It was not created, modified, or reviewed as part of this CRM task; it is called out here only so the two actual CRM-related lines aren't mistaken for a larger change. Recommend the user commit or review that unrelated work separately.

**Nothing else was modified.** `app/admin/erp/page.tsx`, `ContractUi.tsx`, `WarrantyUi.tsx` were read for reuse but not edited, matching the Milestone 1 file list exactly.

## 3. Database Objects Created (in `27_crm_core.sql`)

- **Function:** `public.is_crm_staff()` — `role in ('admin','engineer','dealer') and status='active'`, mirroring `is_warranty_staff()`.
- **Tables (8):** `crm_pipelines`, `crm_pipeline_stages`, `crm_contacts`, `crm_leads`, `crm_deals`, `crm_deal_products`, `crm_tasks`, `crm_activities` — exact columns, FKs, CHECK constraints, and indexes as specified in `CRM_ARCHITECTURE_PLAN.md` Section 13 (13.1–13.8), including:
  - the `crm_leads` "at least one identifier" CHECK constraint,
  - the 5 partial unique indexes preventing duplicate still-open leads per channel identifier,
  - the `crm_leads` ↔ `crm_deals` circular reference resolved via `ALTER TABLE crm_leads ADD COLUMN converted_deal_id …` after `crm_deals` is created,
  - the append-only RLS shape on `crm_activities` (staff get `select`/`insert` only; `update`/`delete` are `is_admin()`-only).
- **RLS:** enabled on all 8 tables; `is_crm_staff()` for select/insert/update on 6 tables, `is_admin()`-only for delete on those same 6, a single uniform `is_crm_staff()` policy for `crm_deal_products` (a pure line-item table), and the split staff/admin policy described above for `crm_activities`.
- **Triggers:** `set_updated_at()` (the existing shared function — not redefined) attached to `crm_contacts`, `crm_leads`, `crm_deals`, `crm_tasks`. (`crm_pipelines`/`crm_pipeline_stages`/`crm_deal_products`/`crm_activities` intentionally have no `updated_at` column, per the architecture plan.)
- **Seed data:** one `crm_pipelines` row (`name = 'Sales Pipeline'`, `is_default = true`) and 9 `crm_pipeline_stages` rows (`new_lead`, `contacted`, `qualified`, `demo`, `offer_sent`, `financing_decision`, `negotiation`, `won`, `lost`), inserted only if no default pipeline already exists (idempotent).
- **Zero `ALTER TABLE`/`DROP`/`UPDATE` statements against any table that existed before this migration.** `erp_parties`, `erp_sales`, `warranties`, `offers`, `products`, `profiles`, and every other pre-existing table are referenced only as FK targets — none of their columns, constraints, or data are touched.

## 4. API Routes Added

| Route | Methods | Auth |
|---|---|---|
| `/api/crm/leads` | `GET`, `POST` | `requireCrmSession` |
| `/api/crm/leads/[id]` | `GET`, `PATCH` | `requireCrmSession` |
| `/api/crm/deals` | `GET`, `POST` | `requireCrmSession` |
| `/api/crm/deals/[id]/stage` | `PATCH` | `requireCrmSession` |

Every handler: extracts the Bearer token via `getBearerToken()`, calls `requireCrmSession(accessToken)` before touching any data, and wraps the body in `try/catch` mapping `'Unauthorized'` → 401, `'Forbidden'` → 403, else 500 — identical in shape to `requireWarrantySession`'s existing callers (`app/api/warranty/files/route.ts` was used as the direct reference). No route accepts a request without a valid Bearer token; no route falls back to a service-role client (all operate through the caller-scoped `tokenClient`, so Postgres RLS is the second, independent layer of enforcement behind the application-level check).

## 5. Frontend Routes Added

```
/admin/crm                      — Dashboard
/admin/crm/leads                — Leads list
/admin/crm/leads/new            — New lead
/admin/crm/leads/[id]           — Lead detail
/admin/crm/leads/[id]/edit      — Edit lead
/admin/crm/pipeline             — Kanban board
```

All confirmed present in the production build's route manifest (see Section 7).

## 6. Authorization Behavior

- **`requireCrmSession()`** (`app/lib/crm-server.ts`) is the single, reusable server-side gate: it validates the bearer token via `auth.getUser()`, loads the caller's `profiles` row, and requires `status === 'active'` and `role in ('admin','engineer','dealer')` — reusing the existing `isActiveProfileStatus`/`isInternalWarrantyRole` helpers from `app/lib/warranty.ts` rather than reimplementing the check.
- **Every one of the 4 new API routes calls it before doing anything else** — confirmed by direct inspection of all 4 route files; none contain a code path that reads or writes a `crm_*` table without first calling `requireCrmSession()`.
- **Client-side gating** (`useCrmAdminGate()` in `CrmUi.tsx`) mirrors `useWarrantyAdminGate()` exactly — it is a UX convenience (shows a blocked/loading view), never the security boundary. The security boundary is `requireCrmSession()` server-side plus Postgres RLS (`is_crm_staff()`), consistent with the "never rely on hidden UI elements for authorization" rule in the architecture plan.
- **No new database table is reachable by `anon` or by the `doctor` role** — all 8 tables' RLS policies gate on `is_crm_staff()` (admin/engineer/dealer + active) for read/write, and `is_admin()` for delete/activity-correction.

## 7. Tests / Checks Run

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | Pre-existing errors only, in files this task never touched (`app/admin/erp/page.tsx`, `app/admin/offers/page.tsx`, `app/admin/warranty/page.tsx`, two unrelated API routes, `contact-hub/page.tsx`, `contract-template.ts`). **Zero errors in any new CRM file or in `app/admin/page.tsx`** (confirmed by grepping the output for `crm`/`admin/page.tsx` — no matches). |
| `npx eslint app/admin/crm app/api/crm app/lib/crm-server.ts app/lib/crm-types.ts` | **Zero errors, zero warnings.** |
| `npx eslint` on the same files plus `app/admin/page.tsx` | The only findings were pre-existing `@typescript-eslint/no-explicit-any` / unused-var / `<img>` warnings already present in `app/admin/page.tsx` at line numbers far from the two lines this task added (19, 49–54, 198–206, 262, 294, 469, 753, 771, 863, 917, 1108 — none near the CRM button insertions). |
| `npm run build` (`next build`) | **Compiled successfully.** All 6 new `/admin/crm*` pages and 4 new `/api/crm/*` routes appear correctly in the route manifest (pages as static `○`, dynamic routes as `ƒ`), alongside every pre-existing route, confirming no regression to the rest of the site's build. |
| `git status` / `git diff` review | Confirmed the only files this task created are the ones listed in Section 1, and the only pre-existing file this task modified is `app/admin/page.tsx`, with a 2-button diff (isolated and verified by inspecting the full diff — everything else in that file's diff predates this session). No `supabase/sql/*` file other than the two new `27_crm_core*.sql` files was touched by this task (two other files, `05_warranty_module.sql` and `07_warranty_verify_rpc.sql`, show as modified in git, but were already modified before this session began and were never opened or edited here). |
| Database migration applied? | **No.** See Section 8. |

Manual UI/API smoke testing (e.g., actually clicking through `/admin/crm`, dragging a Kanban card, submitting the lead form against a live Supabase project) was **not performed**, because doing so requires the `27_crm_core.sql` migration to actually be applied to a real Supabase database first (see Section 8) — this is the "as far as the local environment allows" limitation flagged in `CRM_PHASE1_IMPLEMENTATION.md`. The build output confirms the routes compile and are correctly registered, but does not confirm runtime behavior against real data.

## 8. Database Migration Status — Not Applied

`27_crm_core.sql` was **written but deliberately not run against any database** (local, staging, or production). Reasons:
- This session has no Supabase project credentials or an established staging/local Postgres connection to apply it against.
- `medicalline.ge` is a live production site; applying an unreviewed migration to its database without an explicit, separate instruction to do so would exceed what was asked and risk affecting a system beyond this local environment.
- The `CRM_PHASE1_IMPLEMENTATION.md` test checklist (Section 8 of that document) — verifying the migration applies cleanly, RLS behaves as expected, the partial unique indexes correctly block/allow duplicate leads, and the rollback script cleanly reverses everything — has **not been executed against a real database** and should be the first thing done (ideally against a Supabase staging branch or local `supabase start` instance) before this code is considered verified end-to-end.

This is the single biggest gap between "implemented" and "verified" for this milestone.

## 9. Deviations from `CRM_PHASE1_IMPLEMENTATION.md`

1. **Drag-and-drop implementation uses native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) instead of `framer-motion`.** The implementation doc named `framer-motion` for this; a framer-motion-based cross-column Kanban drag (computing column drop-zone bounding boxes, reparenting on drop, etc.) is materially more complex and failure-prone than this milestone's actual requirement ("moving a card between columns updates `stage_id`, nothing else"). Native browser drag-and-drop achieves the same documented test-checklist behavior ("drag a card from one column to another → `PATCH` fires → `stage_id` persists") with zero added dependency risk and less code, which is more consistent with this milestone's explicit "no advanced drag-and-drop" instruction. `framer-motion` remains available, untouched, and unused for this milestone — a later milestone can still adopt it if a richer drag experience (animated reordering within a column, etc.) is wanted.
2. **A small inline "add deal" quick-form lives inside `PipelineBoard.tsx`** rather than a separate `DealForm.tsx` file, because `DealForm.tsx` was never in Milestone 1's file list (only `LeadForm.tsx` and `PipelineBoard.tsx` were) and the test checklist itself only calls for "a minimal inline form" to create a deal.
3. **No other deviations.** Every file in Section 2 of `CRM_PHASE1_IMPLEMENTATION.md` ("Exact Files to Create") was created; every file in Section 3 ("Exact Files to Modify") received exactly the documented change and nothing else; the SQL migration follows the documented table-creation order (including the circular-FK resolution via a post-hoc `ALTER TABLE`) exactly.

## 10. Known Limitations / Unresolved Issues

- **Not yet verified against a live database** (Section 8) — this is a "must do before relying on this in production" item, not a code defect.
- **Duplicate-lead partial unique indexes and the "at least one identifier" CHECK constraint have only been reviewed by inspection, not exercised against real Postgres** — worth explicit testing per the checklist once a database is available.
- **The CRM sidebar/Quick Actions buttons were added to a version of `app/admin/page.tsx` that already contains substantial unrelated, uncommitted changes** (Section 2) — if that unrelated work is reverted or reworked before being committed, the two CRM button additions should be re-applied against whatever the final reviewed version of that file turns out to be, since they were written as a diff against the current (pre-existing-changes-included) working copy.
- **No automated test suite exists for this code** (consistent with the rest of the codebase, which has none for admin/business logic) — verification is currently limited to typecheck/lint/build plus the manual test checklist in `CRM_PHASE1_IMPLEMENTATION.md`, which still needs to be run by hand against a running instance.

## 11. Recommended Next Milestone

Per `CRM_ARCHITECTURE_PLAN.md`'s "Recommended Implementation Order," the next step is **Milestone 2 — ERP bridge columns + lead conversion + Customer 360 (read-only)**:

1. First, close the gap from Section 8 above: apply `27_crm_core.sql` to a staging/local Supabase instance and run through the full test checklist in `CRM_PHASE1_IMPLEMENTATION.md` Section 8 before building anything further on top of it.
2. Apply `28_crm_erp_bridge.sql` (nullable bridge columns only: `erp_parties.profile_id`/`crm_owner_id`/`lead_source`/`city`/`is_individual`, `offers.crm_deal_id`, `warranties.crm_deal_id`) — still zero behavioral change to existing tables.
3. Build the Lead → Account/Contact/Deal conversion flow (`POST /api/crm/leads/[id]/convert`) with the mandatory duplicate-search-before-create step described in `CRM_ARCHITECTURE_PLAN.md` Section 11.
4. Build the read-only Customer 360 aggregation endpoint/page (`GET /api/crm/customers/[partyId]/360`), joining the new CRM tables with existing `warranties`/`service_cases`/`contracts`/`offers`/`erp_sales` — still no CRM-driven writes into any of those existing tables.

**Do not start Milestone 3 (Tasks/Follow-ups UI, "Mark Won"/"Mark Lost" actions) or Milestone 4 (Complete Sale Setup / actual ERP writes) until Milestone 2 is live and reviewed** — per the explicit two-step Won-workflow safety design (Section 18 of the architecture plan), the first ERP-writing code should be built and tested in isolation, with extra scrutiny, only after the read-side (Milestone 2) has proven the identity-bridging model works correctly against real data.
