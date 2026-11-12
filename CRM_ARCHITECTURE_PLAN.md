# Medical Line Georgia — CRM Architecture Plan

Audit/plan date: 2026-07-14. Revised (architecture validation pass): 2026-07-14.
Scope: analysis and architecture only. No production code, schema, or UI changed by this document.
Companion document: `ERP_AUDIT.md` (2026-06-12). Companion document (new): `CRM_PHASE1_IMPLEMENTATION.md` — the first coding milestone only.

**Changelog (validation pass):** corrected the new-table count (8, not 7 — Section 11); resolved the Lead-vs-Deal modeling question in favor of keeping `crm_leads` as a distinct pre-qualification entity (Section 11); defined the long-term canonical identity model and clarified how a private individual is represented without a separate company (Section 12); redesigned `crm_activities` as a first-class Customer-360 timeline entity using typed nullable FKs (Section 13); expanded `crm_tasks` to the requested type/priority list and confirmed no separate follow-up table (Section 13); added full per-table constraint/index specifications (Section 13); added an explicit admin/engineer/dealer permission matrix (Section 17); redesigned "Mark Deal Won" into a safe two-step flow with no automatic ERP writes (Section 18); reconfirmed Phase 1 scope exclusions (Section 19); Milestone 1 detail moved into its own document, `CRM_PHASE1_IMPLEMENTATION.md`.

---

## 1. Existing Project Stack

- **Framework:** Next.js 16.1.6, App Router, React 19.2.4, TypeScript 5. `proxy.ts` (Next 16's renamed `middleware.ts`) at the project root.
- **Hosting/build:** Vercel, Turbopack. `next.config.ts` currently sets `typescript.ignoreBuildErrors: true` (pre-existing risk, documented in `ERP_AUDIT.md`).
- **Database/auth/storage:** Supabase (PostgreSQL + Auth + Storage). No ORM — all data access is via `@supabase/supabase-js` (`^2.95.3`), either directly from browser client components (RLS-protected) or from Next.js Route Handlers using a per-request token client plus, where needed, a service-role client.
- **Styling:** inline `style={{}}` objects are the dominant convention in every admin module (contracts, warranty, ERP, academy). Tailwind and `styled-components` are installed in `package.json` but effectively unused in the admin/ERP area (confirmed: zero `styled-components` imports repo-wide; only one admin file uses Tailwind classes).
- **Icons:** `lucide-react`, used inline (`<Icon size={n} />`), inconsistently — ERP and the offers module use it, contracts/warranty/academy use emoji characters instead, the main admin hub mixes both.
- **Other libraries relevant to CRM:** `framer-motion` (available for Kanban drag animations), `qrcode`/`jspdf`/`html2canvas` (used for warranty/contract PDFs — reusable for quotation PDFs), `@emailjs/browser` (client-side email, no real transactional email pipeline exists).
- **No dedicated backend framework/queue/job runner** — everything is either a Next.js Route Handler or a Postgres function (RPC) called via `supabase.rpc(...)`.
- **No test suite for admin/business logic** — only `scripts/cbct-qa-*.test.mjs` exist, for an unrelated feature. CRM Phase 1 should not assume any existing regression safety net.

---

## 2. Existing Folder Structure Relevant to ERP / Admin

```
app/
  admin/
    page.tsx                    — main admin hub (1204 lines, single-file, own in-page sidebar/tabs)
    erp/page.tsx                — ERP suite (1557 lines, single-file, own in-page sidebar/"modules")
    contracts/                  — MODULAR reference pattern (list/new/[id]/[id]/edit + _components/)
    warranty/                   — MODULAR reference pattern, plus nested service-cases sub-resource
    academy/                    — modular, reuses WarrantyUi tokens by import (best current precedent for reuse)
    offers/                     — SMS-sent product_offers admin screen
    clinic-offers/              — admin screen for the clinic-commercial-portal offers/requests
    special-price-requests/     — thin page
    reset-password/
  api/
    erp/nbg-rate/route.ts       — only ERP-dedicated API route; ERP mostly writes directly from the browser client
    admin/{profile,prices,users,offers,notifications}/route.ts
    auth/{register,phone-otp}/route.ts
    contracts/, contact-contracts/, public-contracts/, acceptance-acts/, public-acceptance-acts/
    warranty/, clinic/payments/, payments/bog/
  clinic/                       — external clinic-facing portal ("Doctor Portal"), own auth provider/shell
  lib/
    supabase.ts                 — shared browser client
    supabase-admin-browser.ts   — admin-scoped browser client (separate storage key)
    supabase-server.ts          — requireWarrantySession(), createSupabaseTokenClient(), createSignedStorageUrl()
    clinic-portal-server.ts     — requireClinicUser(), createClinicServiceClient(), getBearerToken()
    warranty.ts, warranty-types.ts, contract-types.ts, acceptance-act-types.ts, acceptance-act.ts
    catalogSync.ts              — product/catalog normalization shared by admin UI and admin/offers API
    phone-verification.ts, sms-provider.ts, contact-contract-server.ts, clinic-payment-provider.ts
  components/                  — PUBLIC-SITE components only (SiteHeader, HeroSlider, etc.) — no admin UI kit
supabase/sql/                  — numbered migrations, 01_core.sql … 26_clinic_offer_bank_review_patch.sql
```

Key structural fact: **there is no `app/admin/layout.tsx`** and no shared cross-module navigation component. Every module either hand-rolls its own sidebar (hub, ERP) or a single-page "hero shell" with manual cross-links (contracts, warranty, academy).

---

## 3. Existing Authentication Architecture

- **Single identity table:** `public.profiles` (FK to `auth.users`, cascade delete), `role in ('doctor','dealer','engineer','admin')`, `status in ('active','pending','blocked')`. No separate staff/user table.
- **No middleware/proxy protection for any admin or API route.** `proxy.ts` protects only `/invoice` and `/invoice.html` via a static cookie secret unrelated to Supabase auth. `/admin`, `/admin/erp`, `/clinic`, and every `/api/*` route are open at the routing layer; all protection is client-side (session/profile re-check on page mount) plus server-side (Bearer token + `profiles` check inside each API route) plus Postgres RLS.
- **Two separate browser Supabase clients**, distinguished only by `storageKey`: `app/lib/supabase.ts` (shared/clinic) and `app/lib/supabase-admin-browser.ts` (admin-scoped, `storageKey: 'medical-line-admin-auth'`).
- **Client-side gate pattern**: on mount, `supabase.auth.getSession()` → fetch `profiles` row → require `role === 'admin' && status === 'active'`. No redirect — the page renders an error/login view in place if the gate fails.
- **Server-side "require session" helper pattern**, two variants, both worth reusing:
  - `requireWarrantySession(accessToken)` in `app/lib/supabase-server.ts` — requires `isActiveProfileStatus(status) && isInternalWarrantyRole(role)` (role in `admin`/`engineer`/`dealer`), throws `Error('Unauthorized')`/`Error('Forbidden')`.
  - `requireClinicUser(request)` in `app/lib/clinic-portal-server.ts` — only requires `status === 'active'` (any role).
  - Several `app/api/admin/*` routes instead re-inline their own bearer-token logic — a duplication, not a pattern to copy into CRM.
- **Role helper SQL functions** (SECURITY DEFINER): `public.is_admin()`, `public.is_engineer()`, `public.is_warranty_staff()`. One later migration (`20_contract_acceptance_acts.sql`) inlines `role in ('admin','manager','technician')` — values that **do not exist** in the `profiles.role` check constraint, a pre-existing bug not to replicate.
- **Roles in practice:** `doctor` = external clinic customer (self-registers, always created as `role: 'doctor'`); `dealer`/`engineer` = internal "Engineering Division" staff; `admin` = full internal staff.

---

## 4. Existing Database Schema (Summary)

30 SQL files, `01_core.sql` → `26_clinic_offer_bank_review_patch.sql`, naming convention `NN_description.sql`. **Next available number for CRM: `27`.**

| Domain | Tables/views |
|---|---|
| Auth/Identity | `profiles` |
| Legacy contact/lead | `requests` |
| Warranty/service | `warranties`, `service_cases`, `warranty_attachments`, `service_tickets` |
| Contracts (e-signature) | `contracts`, `contract_audit_logs`, `contract_acceptance_acts` |
| ERP/accounting | `erp_companies`, `erp_chart_accounts`, `erp_parties`, `erp_products`, `erp_stock_lots`, `erp_sales`, `erp_sale_items`, `erp_payments`, `erp_journal_entries`, `erp_journal_lines`, `erp_rs_logs`, `erp_bank_imports`, `erp_import_documents`, `erp_import_lines`, plus dedup helper tables/views |
| Legacy invoicing tool | `inv_clients`, `inv_products`, `inv_invoices`, `inv_settings` (open RLS to `anon` — not a CRM reuse candidate) |
| Clinic commercial portal (newest, most mature) | `special_price_requests`, `offers`, `offer_items`, `payment_schedules`, `payment_transactions` |
| SMS product quote (older) | `product_offers` |
| Site catalog | `categories`, `products`, `prices`, `user_devices` |
| Academy/content | `academy_items`, `academy_videos`, `academy_video_queries`, `academy_video_likes` |
| Analytics | `analytics_pages`, `analytics_page_visitors`, `blog_views`, `blog_viewers` |
| Notifications | `notifications` |

Cross-cutting schema notes: two ID strategies coexist (`uuid_generate_v4()` vs `gen_random_uuid()` — newer migrations use the latter, CRM follows suit); `public.set_updated_at()` trigger already exists and should be reused; multi-tenancy (`company_id`) exists only inside the ERP subsystem (single seeded company `MEDIQALJORJIA`); **no generic/polymorphic activity-log table exists anywhere** — `contract_audit_logs` is the only audit trail and is hard-scoped to `contract_id`.

---

## 5. Existing Customer-Related Tables

At least seven different "this represents a customer" shapes exist today, mostly disconnected:

| Table | Identity storage | FK → `profiles`? | FK → `erp_parties`? | Has `tax_id`? |
|---|---|---|---|---|
| `profiles` | is the user | — | no | no |
| `requests` (legacy lead/inquiry) | `user_id` FK | yes | no | no |
| `warranties` | free text | no | no | `customer_id_number` (free text) |
| `contracts` | free text | no | no | `customer_id_number` (free text) |
| `special_price_requests` (real lead table) | `user_id` FK + snapshot | yes | no | no |
| `offers` (real quote table) | `user_id` FK + snapshot | yes | no | no |
| `inv_clients` (legacy invoice tool) | own PK, flat | no | no | `id_num` (free text) |
| `erp_parties` (ERP master) | own PK, typed party | no | is the target | `tax_id` (real) |

`erp_parties` (`21_erp_accounting.sql`) is the closest thing to a real "Account" master: `party_type in ('customer','supplier','both','bank','employee','other')`, `code`, `name`, `tax_id`, `phone`, `email`, `address`, opening balances, `company_id` scope. RLS is admin-only today. `special_price_requests → offers → offer_items/payment_schedules/payment_transactions` is the newest and most complete "lead → quote → order → payment" pipeline, fully keyed to `profiles.id`, using a strong snapshot pattern. **The ERP world (`erp_parties`/`erp_sales`) and the clinic-portal world (`profiles`/`offers`) are entirely disconnected** — this is the central problem CRM must bridge (Sections 11–12).

---

## 6. Existing Product and Inventory Tables

Three independent, unconnected product catalogs: **`public.products`** (site/catalog/clinic-portal, the customer-facing identity — CBCT/scanners/microscopes/etc.), **`public.erp_products`** (accounting/inventory master, `company_id`-scoped, no FK to `products`), **`public.inv_products`** (legacy invoice tool, dead-end). Inventory: **`erp_stock_lots`** is the only real stock ledger (mixes purchase lots and sale stock-outs); **`erp_import_documents`/`erp_import_lines`** handle landed-cost foreign purchases; **no warehouse table exists** (confirmed absent — flagged as a pre-existing ERP gap in `ERP_AUDIT.md`, directly relevant to Section 18's "Complete Sale Setup" design). `public.user_devices` is an under-used "installed base" table, disconnected from `warranties.serial_number`.

**CRM implication:** product interest on Leads/Deals references `public.products` (matching `special_price_requests`/`offer_items`); the eventual Won→ERP-sale step is what bridges to `erp_products`/`erp_sale_items`.

---

## 7. Existing Sales and Service-Related Tables

Two disconnected sales/quotation pipelines: (1) `erp_sales`/`erp_sale_items` (accounting truth, keyed to `erp_parties`/`erp_products`, non-atomic writes today — documented risk); (2) `offers`/`offer_items`/`payment_schedules`/`payment_transactions` (clinic-portal truth, keyed to `profiles`/`products`, status changes only via SECURITY DEFINER RPCs, never direct `UPDATE`). Service/warranty: `warranties` (full registry, auto-numbered, auto-computed dates/status), `service_cases` (repair workflow linked to a warranty), `warranty_attachments` (files, XOR of two nullable FKs — the one existing precedent for the "typed nullable FK over polymorphic" pattern used in Section 13), `contract_acceptance_acts` (already has `installation_completed`/`training_completed` booleans), `service_tickets` (older, simpler, disconnected ticket table).

**CRM implication:** the ERP-integration workflow in the brief maps onto **existing tables** (`erp_sales`/`erp_sale_items` for the sale, `warranties` for the warranty record, `service_cases` for service history) — CRM orchestrates creation of rows in these existing tables plus its own new Task/Activity rows.

---

## 8. Existing API Architecture

39 `route.ts` files under `app/api/`; only one is ERP-dedicated. Handler shape: plain async exports, `context.params` always awaited. Auth boilerplate is mostly repeated per-route (bearer token → scoped anon client → `auth.getUser()` → `profiles` lookup → role/status branch); `requireWarrantySession()`/`requireClinicUser()` are the two centralized exceptions. Error idiom: `try/catch`, throw `Error('Unauthorized'|'Forbidden')`, map to 401/403/500 in the catch block; admin routes add a `{ ok, code, error }` envelope. No shared validation library, no shared response formatter. `.env.example` convention: `NEXT_PUBLIC_*` reserved for browser-safe values, bare-named secrets, provider-prefixed groups (`BOG_*`, `OPAY_*`), `*_ENABLED` flags defaulting `false`, a generic `PAYMENT_PROVIDER`-style switch where multiple providers can be swapped.

---

## 9. Existing UI Component System

No shared admin component library exists — every module reimplements its own primitives inline, scoped to a `_components/<Module>Ui.tsx` file. Reference template: contracts/warranty follow `page.tsx` (list) / `new/page.tsx` / `[id]/page.tsx` (detail) / `[id]/edit/page.tsx` / `_components/<Module>Ui.tsx` (tokens+shell+gate) / `_components/<Module>Form.tsx` (one form for both create and edit). Well-modularized files stay 200–570 lines; `app/admin/page.tsx` (1204) and `app/admin/erp/page.tsx` (1557) are the anti-pattern to avoid. **`app/admin/academy/_components/AcademyUi.tsx` already imports and re-exports `WarrantyUi.tsx`'s tokens/primitives instead of copy-pasting** — CRM should follow this exact precedent. No shared nav/sidebar component exists; cross-module navigation is always a manual `<Link>` or `window.location.href` button, hand-added per module.

---

## 10. Which Existing Entities Can Be Reused for CRM

| CRM need | Reuse this existing entity | Notes |
|---|---|---|
| Staff identity/roles/auth | `public.profiles` + `is_admin()`/`is_warranty_staff()` | No new user/role table. |
| Product catalog for lead/deal interest | `public.products` | Matches `special_price_requests`/`offer_items` convention. |
| Account/Company master ("Customer") | `public.erp_parties` | Extended (Section 12), not duplicated. |
| Registered clinic self-service identity | `public.profiles` (role `doctor`) | Bridged via new nullable FKs (Section 12), not a new table. |
| Quotation / commercial offer document | `public.offers` + `offer_items` + `payment_schedules` + `payment_transactions` | CRM Deals link to an `offers` row rather than re-modeling quotes. |
| Sale / order (Won outcome) | `public.erp_sales` + `erp_sale_items` | Created via an explicit, reviewed step (Section 18), not automatically. |
| Warranty record | `public.warranties` | Same — created via the explicit review step. |
| Service/installation history | `public.service_cases`, `contract_acceptance_acts` | CRM Customer 360 reads from here; no parallel service table. |

**Conclusion (reconfirmed): no new Customer, Product, Sale, or User model is required.**

---

## 11. Lead vs. Deal Model — Decision

### Table-count correction

The plan proposes **8 new tables**, not 7: `crm_pipelines`, `crm_pipeline_stages`, `crm_leads`, `crm_contacts`, `crm_deals`, `crm_deal_products`, `crm_tasks`, `crm_activities`. Every reference to "7 new tables" elsewhere in the original draft was a miscount and has been corrected throughout this document.

### Model comparison

**Model A:** `crm_lead` → qualification/conversion → `erp_party` → `crm_contact` → `crm_deal`.
**Model B:** `erp_party`/`crm_contact` → `crm_deal` with initial stage "New Lead" (no separate lead entity).

**Decision: Model A — keep `crm_leads` as a distinct, lightweight, pre-qualification entity.**

Reasons this fits the existing Medical Line schema specifically (not a generic CRM-textbook argument):

1. **`erp_parties` is already suffering from import-pollution/duplicate problems** (`erp_parties_duplicate_review`/`erp_parties_clean` views exist specifically to clean up dirty ORIS/Excel/Claude-import data — see Section 5/`ERP_AUDIT.md`). Model B would create a new `erp_parties` row for every unqualified inbound message (a Facebook comment, a wrong-number call, a curiosity DM), reintroducing exactly the kind of low-quality-row pollution the existing dedup infrastructure was built to fight. Model A keeps the accounting-grade Account master clean by only writing to it at the point a human confirms the inquiry is a real prospect.
2. **The brief requires handling inquiries where only a channel identifier is known** — an Instagram username, a Facebook profile, a WhatsApp phone number, a bare phone number, or an email, often with no name and no company at all. `erp_parties` is not a good home for this: it is `company_id`-scoped accounting data (opening balances, `tax_id`) designed for confirmed parties, not a scratch pad for "someone messaged us." A dedicated, minimal `crm_leads` row can be created from a single channel identifier with everything else null.
3. **A pipeline "Deal" implies a real opportunity** (expected value, product interest, a person actively working it toward Won/Lost). Treating every raw inbound message as a Deal from stage "New Lead" would clutter the Kanban board and skew pipeline-value reporting with noise that never had real buying intent — exactly the kind of "garbage in the pipeline" problem sales teams already complain about elsewhere, and one this schema doesn't need to import.
4. The pipeline's own first stage is still called **"New Lead"** (per the brief) — that stage name describes the *deal's* earliest state once a real opportunity exists, not the raw inbound message. Keeping `crm_leads` separate does not conflict with that stage name; a `crm_deal` still starts its life in the `new_lead` stage.

### What constitutes a Lead?

A `crm_leads` row is a raw, unqualified inbound inquiry captured with as little information as necessary — potentially only one channel identifier (Instagram handle, Facebook profile, WhatsApp phone, phone, or email) plus a `source` and an optional free-text note about what they're asking about. It does **not** require a name, clinic name, or product interest, and it is **not** yet a confirmed sales opportunity.

### When is an `erp_party` created?

Only at lead qualification/conversion — when staff confirms the lead represents a real prospective Account (a clinic, or a private individual, see Section 12) worth tracking. Disqualified/spam leads never produce an `erp_parties` row, keeping that table clean.

### When is a `crm_contact` created?

Only when the Account genuinely has (or will have) more than one distinguishable person worth tracking separately (e.g., a clinic with both a lead doctor and a purchasing officer). For a solo private individual, no `crm_contacts` row is required at all — see Section 12 for how that case is represented directly on the `erp_parties` row.

### When is a `crm_deal` created?

At conversion — once there is a real opportunity (at least a clear buying intent, ideally a specific product interest), a `crm_deals` row is created in the default pipeline, in the `new_lead` or `contacted` stage depending on how far the conversation has already progressed, linked to the `erp_parties`/`crm_contacts` rows and to the originating `crm_leads` row (`lead_id`, retained permanently for provenance — never deleted). A single Account can later produce further `crm_deals` directly (e.g., a repeat customer interested in a second product) without needing a new Lead.

### What exactly happens during Lead conversion?

1. Staff reviews the `crm_leads` row (channel identifiers, notes, any linked activity).
2. **Duplicate search is mandatory before creating a new Account** (see below) — staff searches existing `erp_parties`/`crm_contacts` by normalized phone/email/name; if a match is found, the lead links to it (`crm_leads.party_id`/`contact_id`); if not, a new `erp_parties` row is created with whatever fields are known (partial data — nulls allowed).
3. A `crm_contacts` row is created/linked only if the Account needs distinguishable per-person tracking (skipped for solo individuals).
4. A `crm_deals` row is created, `lead_id` = the source lead, `party_id`/`contact_id` = the linked entities; any known product interest copies into `crm_deal_products`.
5. `crm_leads.status` is set to `'converted'`, `converted_deal_id` is set. The lead row is retained permanently (never hard-deleted). A `crm_activities` row of type `system` logs the conversion event, linked to both the lead and the new deal.

### How duplicate people/companies are prevented

- **At conversion time (the higher-stakes case, writing to `erp_parties`):** the conversion API must perform a **search-before-create** step — normalized-phone match (reusing the Georgian-phone normalization already implemented in `app/lib/phone-verification.ts`), normalized-email match, and fuzzy-name match (reusing the exact normalization approach already built for `erp_parties_duplicate_review`/`erp_parties_clean`) — and return candidate matches to the user, requiring an explicit "create new anyway" confirmation if they override. This is a **soft, reviewable** check (matching the codebase's own existing dedup-review convention), not a hard database uniqueness constraint, since phone/email can legitimately be blank, shared, or ambiguous.
- **Before conversion (the lower-stakes case, preventing duplicate `crm_leads` rows for the same still-open inquiry):** partial unique indexes on each channel-identifier column, scoped to leads that are still open (`status not in ('converted','disqualified')`) — see Section 13. A second inbound message from the same still-unconverted Instagram user reuses the existing lead row (and appends a `crm_activities` entry) instead of creating a duplicate lead. This becomes directly useful once Phase 2's channel webhooks exist, without needing a schema change then.

---

## 12. Customer Identity Strategy

`erp_parties` remains the **primary, canonical Account/Organization entity** — the audit found no technical reason to introduce a parallel Account table; the opposite is true, since `erp_parties` is already the only party table with real `tax_id`/`company_id` structure and is already the FK target for `erp_sales`.

### Long-term canonical model

| Canonical role | Backing table |
|---|---|
| **Account / Organization** | `public.erp_parties` (extended, Section 12 below) |
| **Contact / Person** | `public.crm_contacts` (new) — optional; see individual-representation rule below |
| **Deal / Opportunity** | `public.crm_deals` (new) |
| **Activity** | `public.crm_activities` (new) — the Customer 360 timeline (Section 13) |
| **Task** | `public.crm_tasks` (new) — also covers Follow-ups (Section 13) |

### How each existing fragmented table relates to this model

| Existing table | Relationship to the canonical model |
|---|---|
| `profiles` | Maps to **Contact/Person** when self-registered. Bridged two ways: `crm_contacts.profile_id` (this specific person, within a multi-contact Account) and `erp_parties.profile_id` (this Account *is* this profile — the individual/solo case, see below). Both are nullable and independently optional. |
| `requests` (legacy) | Historical/read-only reference only. No new FK added; if `user_id` resolves to a linked `profiles`/`crm_contacts` row, Customer 360 can surface it as historical context, but no automatic migration into CRM tables is performed. |
| `warranties` | Gains `crm_deal_id` (nullable, Section 12 extension list) for warranties created via the CRM Won workflow going forward. Pre-existing free-text warranties are **not** auto-linked — Customer 360 may show them as "possible matches" by name/phone, never as a silent automatic FK, to avoid mis-linking historical data. |
| `contracts` | No bridge column added in Phase 1 — contracts are not part of the Phase 1 ERP-integration scope (Section 19). Left as a documented future extension point, not built now, to avoid scope creep. |
| `special_price_requests` | No new FK added — already resolvable via `user_id → profiles → crm_contacts.profile_id → party_id` for Customer 360 joins; adding a redundant direct FK is unnecessary. |
| `offers` | Gains `crm_deal_id` (nullable) — this is the one bridge actively used in Phase 1, since a Deal's "Offer Sent" stage points here directly. |
| `erp_parties` | Is the canonical Account itself; gains `profile_id`, `crm_owner_id`, `lead_source`, `city`, `is_individual` (all nullable/defaulted, Section 12 extension list). |

### Can a private individual exist without a company?

**Yes.** A solo private buyer (e.g., an independent dentist with no separate clinic legal entity) is represented as a **single `erp_parties` row** with `party_type = 'customer'` and the new `is_individual = true` flag (nullable boolean, default `false`, added in Section 12's extension list) — the Account row's own `name`/`phone`/`email` fields serve directly as the contact information. **No `crm_contacts` row is created or required** for this case; forcing one would just duplicate the same phone/email/name a second time for no benefit. `crm_contacts` is reserved for the genuine multi-person case (a clinic where more than one person needs to be tracked separately — e.g., the doctor who evaluates equipment and a separate office manager who handles payment). `is_individual` is an explicit flag rather than an inferred one (e.g., "no contacts exist yet") specifically because an empty contact list is a weak, ambiguous signal — a real clinic Account might simply not have had contacts entered yet even though it is not an individual.

---

## 13. Proposed CRM Database Schema (Phase 1)

Proposed migration: **`supabase/sql/27_crm_core.sql`** — new tables only, zero `ALTER TABLE` statements on any pre-existing table (kept in a separate, later migration, **`28_crm_erp_bridge.sql`**, so the higher-risk edits to live tables are reviewable/revertible independently — see `CRM_PHASE1_IMPLEMENTATION.md` for exactly which migration ships in which milestone). All new tables use `gen_random_uuid()`, `created_at`/`updated_at timestamptz default now()` with the existing shared `public.set_updated_at()` trigger, and RLS gated by a new `public.is_crm_staff()` function (Section 17).

### 13.1 `public.crm_pipelines`

Configuration/lookup table (Section 16 explains why this is a table, not an enum).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `default gen_random_uuid()` |
| `name` | text not null | e.g. "Sales Pipeline" |
| `is_default` | boolean not null default false | |
| `is_active` | boolean not null default true | soft "archive" — deactivate without deleting |
| `created_by` | uuid → `profiles(id)` on delete set null | |
| `created_at` | timestamptz not null default now() | |

No unique constraint needed beyond PK. Index: none required beyond PK (tiny table).

### 13.2 `public.crm_pipeline_stages`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `pipeline_id` | uuid not null → `crm_pipelines(id)` on delete cascade | |
| `key` | text not null | `'new_lead' \| 'contacted' \| 'qualified' \| 'demo' \| 'offer_sent' \| 'financing_decision' \| 'negotiation' \| 'won' \| 'lost'` |
| `label` | text not null | display label (editable without a migration) |
| `sort_order` | int not null default 0 | |
| `is_won` | boolean not null default false | |
| `is_lost` | boolean not null default false | |
| `is_active` | boolean not null default true | |
| `created_by` | uuid → `profiles(id)` on delete set null | |

**Unique:** `(pipeline_id, key)`. **Index:** `(pipeline_id, sort_order)` for ordered Kanban-column rendering.

### 13.3 `public.crm_leads`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source` | text not null check in `('facebook','instagram','whatsapp','website','email','phone','referral','exhibition','manual')` | |
| `status` | text not null default `'new'` check in `('new','contacted','qualified','disqualified','converted')` | |
| `owner_id` | uuid → `profiles(id)` on delete set null | assigned staff member |
| `contact_name` | text nullable | |
| `clinic_name` | text nullable | |
| `phone` | text nullable | |
| `email` | text nullable | |
| `instagram_handle` | text nullable | |
| `facebook_profile` | text nullable | |
| `whatsapp_phone` | text nullable | |
| `city` | text nullable | |
| `initial_interest` | text nullable | free-text capture of what they're asking about, before any `crm_deal_products` row exists |
| `notes` | text nullable | |
| `disqualify_reason` | text nullable | |
| `party_id` | uuid → `erp_parties(id)` on delete set null | set at conversion |
| `contact_id` | uuid → `crm_contacts(id)` on delete set null | set at conversion, if applicable |
| `profile_id` | uuid → `profiles(id)` on delete set null | set if the lead turns out to be an existing registered clinic user |
| `converted_deal_id` | uuid → `crm_deals(id)` on delete set null | **added via `ALTER TABLE` after `crm_deals` is created** (see migration-ordering note below) |
| `created_by` | uuid → `profiles(id)` on delete set null | |
| `created_at` / `updated_at` | timestamptz | |
| **Check** | | at least one of `phone, email, instagram_handle, facebook_profile, whatsapp_phone, contact_name` must be non-null |

**Migration-ordering note:** `crm_leads.converted_deal_id` references `crm_deals`, which references `crm_leads.id` — a circular dependency. Resolution: `CREATE TABLE crm_leads` first *without* `converted_deal_id`; then `CREATE TABLE crm_deals` (which can reference `crm_leads.id` freely); then `ALTER TABLE crm_leads ADD COLUMN converted_deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL` at the end of the same migration file. This avoids a forward-reference error while keeping both FKs real (not deferred/polymorphic).

**Unique (duplicate prevention, partial, scoped to still-open leads):**
```sql
create unique index crm_leads_phone_open_uidx on public.crm_leads (lower(trim(phone)))
  where phone is not null and status not in ('converted','disqualified');
create unique index crm_leads_email_open_uidx on public.crm_leads (lower(trim(email)))
  where email is not null and status not in ('converted','disqualified');
create unique index crm_leads_ig_open_uidx on public.crm_leads (lower(trim(instagram_handle)))
  where instagram_handle is not null and status not in ('converted','disqualified');
create unique index crm_leads_fb_open_uidx on public.crm_leads (lower(trim(facebook_profile)))
  where facebook_profile is not null and status not in ('converted','disqualified');
create unique index crm_leads_wa_open_uidx on public.crm_leads (lower(trim(whatsapp_phone)))
  where whatsapp_phone is not null and status not in ('converted','disqualified');
```
**Other indexes:** `owner_id`, `status`, `source`.
**Soft delete/archive:** none needed — `status in ('disqualified','converted')` are the terminal states; rows are never hard-deleted (permanent provenance).

### 13.4 `public.crm_contacts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `party_id` | uuid not null → `erp_parties(id)` on delete cascade | a contact always belongs to an Account |
| `profile_id` | uuid → `profiles(id)` on delete set null | this person is also a registered clinic-portal user |
| `full_name` | text not null | |
| `title` | text nullable | e.g. "Chief Dentist", "Purchasing Manager" |
| `phone` | text nullable | |
| `email` | text nullable | |
| `is_primary` | boolean not null default false | |
| `notes` | text nullable | |
| `archived_at` | timestamptz nullable | soft-archive (person left the clinic) — mirrors `warranties.archived_at` precedent |
| `created_by` | uuid → `profiles(id)` on delete set null | |
| `created_at` / `updated_at` | timestamptz | |

**Index:** `party_id`. No hard unique constraint on phone/email (a shared office line is a legitimate edge case) — dedup is a soft, reviewable UI concern, same as Section 11.

### 13.5 `public.crm_deals`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `pipeline_id` | uuid not null → `crm_pipelines(id)` on delete restrict | |
| `stage_id` | uuid not null → `crm_pipeline_stages(id)` on delete restrict | current Kanban column |
| `lead_id` | uuid → `crm_leads(id)` on delete set null | |
| `party_id` | uuid → `erp_parties(id)` on delete set null | |
| `contact_id` | uuid → `crm_contacts(id)` on delete set null | |
| `owner_id` | uuid → `profiles(id)` on delete set null | assigned rep |
| `created_by` | uuid → `profiles(id)` on delete set null | who entered it (may differ from `owner_id`) |
| `title` | text not null | |
| `expected_value` | numeric(14,2) default 0 | |
| `currency` | text not null default `'GEL'` check in `('GEL','USD','EUR')` | |
| `probability_percent` | int default 0 check between 0 and 100 | |
| `expected_close_date` | date nullable | |
| `offer_id` | uuid → `offers(id)` on delete set null | |
| `erp_sale_id` | uuid → `erp_sales(id)` on delete set null | |
| `status` | text not null default `'open'` check in `('open','won_pending_setup','won','lost')` | see Section 18 for the two-step Won flow this enables |
| `lost_reason` | text nullable | |
| `source` | text nullable | denormalized copy of the originating lead's source, for reporting even after the lead's own fields change |
| `won_at` / `lost_at` | timestamptz nullable | |
| `created_at` / `updated_at` | timestamptz | |

**Note on `stage_id` vs `status`:** these are deliberately independent. `stage_id` is always one of the pipeline's Kanban columns (including a `won`/`lost` stage). `status` is a coarser business/workflow state: a deal can sit in the `won` *stage* while its `status` is still `won_pending_setup` (Mark Won clicked, ERP sale/warranty/tasks not yet created) until the "Complete Sale Setup" step finishes and flips `status` to `won` (Section 18). `Lost` has no such intermediate step — clicking Lost sets both `stage_id` (to the `is_lost` stage) and `status='lost'` in one action, since Lost has no ERP side effects to review.

**Indexes:** `owner_id`, `stage_id`, `party_id`, `pipeline_id`, `status`.

### 13.6 `public.crm_deal_products`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `deal_id` | uuid not null → `crm_deals(id)` on delete cascade | |
| `product_id` | uuid → `public.products(id)` on delete set null | catalog product, not `erp_products` (Section 6) |
| `quantity` | integer not null default 1 check > 0 | |
| `serial_number` | text nullable | staging field for the "Complete Sale Setup" review (Section 18) — copied into `erp_sale_items.serial_number` only when the sale is actually created |
| `notes` | text nullable | |

**Index:** `deal_id`. No archive (pure line item, cascades with its parent deal).

### 13.7 `public.crm_tasks`

Serves both "Tasks" and "Follow-ups" (Section 14 explains why no separate follow-up table is used).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | text not null check in `('follow_up','call','meeting','demo','quotation','payment','installation','training','service','other')` | |
| `title` | text not null | |
| `description` | text nullable | |
| `priority` | text not null default `'normal'` check in `('low','normal','high','urgent')` | |
| `due_at` | timestamptz nullable | |
| `status` | text not null default `'pending'` check in `('pending','in_progress','done','cancelled')` | |
| `assigned_to` | uuid → `profiles(id)` on delete set null | |
| `lead_id` | uuid → `crm_leads(id)` on delete cascade | |
| `deal_id` | uuid → `crm_deals(id)` on delete cascade | |
| `party_id` | uuid → `erp_parties(id)` on delete cascade | |
| `contact_id` | uuid → `crm_contacts(id)` on delete set null | |
| `warranty_id` | uuid → `warranties(id)` on delete cascade | |
| `service_case_id` | uuid → `service_cases(id)` on delete cascade | |
| `completed_at` | timestamptz nullable | |
| `created_by` | uuid → `profiles(id)` on delete set null | |
| `created_at` / `updated_at` | timestamptz | |

**Reminder strategy for Phase 1:** no push/email/SMS reminder automation exists or is built now (no generic reminder infrastructure exists anywhere in the codebase — `sms-provider.ts` is narrowly used for OTP/offer SMS only). Phase 1 surfaces due/overdue tasks passively in the Dashboard and the Follow-ups view (`due_at <= now()` query). Active reminder delivery (push notification, SMS, email) is explicitly deferred to a later phase alongside the channel integrations.

**Indexes:** `assigned_to`, `due_at`, `status`, `deal_id`, `party_id`, `lead_id`. **Soft delete/archive:** none — `status in ('done','cancelled')` are the terminal states.

### 13.8 `public.crm_activities` — the Customer 360 timeline

Designed as a first-class CRM entity (not merely an audit log), covering every event type the brief lists, using **typed nullable foreign keys** rather than a polymorphic `entity_type`/`entity_id` pair (rationale in Section 14).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | text not null check in `('inbound_message','outbound_message','call','note','task_created','task_completed','follow_up','meeting','demo','stage_change','quotation_created','quotation_sent','erp_sale_created','warranty_created','installation','training','service_event','ai_summary','system')` | |
| `body` | text nullable | human-readable summary/note text |
| `metadata` | jsonb not null default `'{}'` | structured payload (e.g. old/new stage for `stage_change`) |
| `party_id` | uuid → `erp_parties(id)` on delete cascade | |
| `contact_id` | uuid → `crm_contacts(id)` on delete cascade | |
| `lead_id` | uuid → `crm_leads(id)` on delete cascade | |
| `deal_id` | uuid → `crm_deals(id)` on delete cascade | |
| `task_id` | uuid → `crm_tasks(id)` on delete set null | |
| `warranty_id` | uuid → `warranties(id)` on delete set null | populated once the ERP-integration milestone ships |
| `service_case_id` | uuid → `service_cases(id)` on delete set null | reserved, not populated until service-history features exist |
| `offer_id` | uuid → `offers(id)` on delete set null | |
| `erp_sale_id` | uuid → `erp_sales(id)` on delete set null | |
| `actor_id` | uuid → `profiles(id)` on delete set null | null = system-generated event |
| `created_at` | timestamptz not null default now() | |

Append-only: no `updated_at`, no soft delete — activities are an immutable log by design.

**Indexes:** `party_id`, `deal_id`, `lead_id`, `created_at desc`.

**Phase 2 extensibility (documented now, not built now):** adding Unified-Inbox support later is just one more additive nullable FK column (`conversation_id`, `message_id`) plus widening the `type` check constraint — not a schema rewrite, because the typed-FK shape is already established.

---

## 14. Activity Model: Typed Nullable FKs vs. Polymorphic — Decision

**Decision: typed nullable foreign keys** (as specified in Section 13.8), not a polymorphic `entity_type text + entity_id uuid` pair.

Reasoning specific to this stack:
- **This is the only association-modeling precedent already in the codebase** — `warranty_attachments` links to *either* a warranty *or* a service case via two nullable FK columns with an XOR check constraint, not a polymorphic type+id pair. There is **zero existing use of polymorphic association anywhere** in the 30 audited migration files. Matching existing convention outweighs a marginal flexibility gain.
- **Postgres/Supabase RLS policies are written as real FK-aware `EXISTS` subqueries** against a single target table; a polymorphic `entity_id` cannot be validated by a foreign key constraint (the target table varies), which would silently allow orphaned/garbage references and complicates RLS `USING`/`WITH CHECK` clauses that need to join to a specific table.
- **The cost of "one more nullable column per new referenceable type" is low and matches this codebase's existing migration style** — small, additive, reviewable `ALTER TABLE ADD COLUMN` changes (see `warranty_attachments`, and every `crm_*_bridge` column in Section 12) are already how this project evolves its schema, rather than large one-time schema rewrites.
- The widened `type` check constraint (Section 13.8) already anticipates every event type the brief lists, including ones not implemented until later phases (`inbound_message`, `ai_summary`, etc.) — so Phase 2 only needs to add columns/enum values, never restructure the table.

---

## 15. Tasks and Follow-Ups — No Separate Table

**Decision: no `crm_followups` table.** A follow-up is simply a `crm_tasks` row with `type = 'follow_up'`. This was evaluated against introducing a dedicated follow-up entity and rejected because a separate table would either (a) duplicate every field `crm_tasks` already has (assignee, due date, status, related party/deal) or (b) require constant switching logic in the UI/API between "is this a task or a follow-up" — both of which are avoided by treating "Follow-ups" purely as **a filtered view** of `crm_tasks` (`type = 'follow_up'`, or more broadly anything due soon regardless of type). The "Tasks" screen and "Follow-ups" screen in the navigation (Section 16) are two different queries against the same table, not two different tables.

Full field definitions (status/priority/due date/completion/assignee/related entities/reminder strategy) are specified in Section 13.7.

---

## 16. Proposed API Structure

```
app/api/crm/leads/route.ts                    GET (list), POST (create — also the future entry point for Phase 2 channel webhooks)
app/api/crm/leads/[id]/route.ts                GET, PATCH
app/api/crm/leads/[id]/convert/route.ts        POST — duplicate search + link/create erp_parties + crm_contacts + crm_deals (atomic)
app/api/crm/deals/[id]/stage/route.ts          PATCH — Kanban drag-and-drop backend; writes a crm_activities 'stage_change' row
app/api/crm/deals/[id]/won/route.ts            POST — Step 1 only: status → 'won_pending_setup', stage → won stage. NO ERP writes (Section 18)
app/api/crm/deals/[id]/complete-sale-setup/route.ts  POST — Step 2: the reviewed, explicit, transactional ERP-write endpoint (Section 18). Not built in Milestone 1.
app/api/crm/deals/[id]/lost/route.ts           POST — single-step: status='lost' + lost_reason
app/api/crm/tasks/route.ts                     GET, POST
app/api/crm/tasks/[id]/route.ts                PATCH (status/complete)
app/api/crm/customers/[partyId]/360/route.ts   GET — aggregated Customer 360 payload (single round trip, single auth check)
```

Every route uses a new `requireCrmSession(accessToken)` helper (Section 17), following `requireWarrantySession`'s exact shape. Response envelope: `{ ok, error, code? }`, matching every existing route.

**Service-layer isolation** (unchanged from the original plan): `app/lib/crm/leads.ts`, `deals.ts`, `pipeline.ts` hold pure domain logic; `app/lib/crm/channels/{whatsapp,messenger,instagram,email}.ts` and `app/lib/crm/ai/assistant.ts` are **empty interface stubs only**, not implemented in Phase 1.

---

## 17. Authorization, Security, and Roles

- **New reusable server-side helper: `requireCrmSession(accessToken)`** in `app/lib/crm-server.ts`, copying `requireWarrantySession()`'s exact shape (token client → `auth.getUser()` → `profiles` lookup → `isActiveProfileStatus && isInternalWarrantyRole` check → throw `Unauthorized`/`Forbidden`). **Every CRM API route must call this before doing anything else** — there is no CRM route that relies on RLS alone or on the calling page having already checked the client-side gate.
- **New SQL function `public.is_crm_staff()`** (SECURITY DEFINER, mirrors `is_warranty_staff()`: `role in ('admin','engineer','dealer') and status='active'`), used for all `crm_*` table RLS. A dedicated function (rather than literally reusing `is_warranty_staff()`) is for naming clarity in the RLS policy list; behavior is intentionally identical today and can diverge later.
- **Never rely on hidden UI elements for authorization** — every mutating action (convert, stage change, won, complete-sale-setup, lost, task CRUD) is re-checked server-side regardless of what the UI shows or hides. This is a non-negotiable rule for every CRM route, stated explicitly here so it is not silently dropped during implementation.

### Role permission matrix (Phase 1)

| Action | admin | engineer | dealer |
|---|---|---|---|
| View leads / deals / tasks / activities | yes | yes | yes |
| Create/edit leads | yes | yes | yes |
| Convert lead → Account/Contact/Deal | yes | yes | yes |
| Advance deal stage (Kanban drag-drop) | yes | yes | yes |
| Create/edit/complete tasks | yes | yes | yes |
| Mark Deal Won (Step 1 only — flips status, no ERP writes) | yes | yes | yes |
| **Complete Sale Setup (Step 2 — creates `erp_sales`/`warranties`/tasks)** | **yes** | **no** | **no** |
| Mark Deal Lost | yes | yes | yes |
| Delete a lead/deal/task | yes | no | no |
| Edit `erp_parties` financial fields (`opening_debit`/`opening_credit`, `tax_id`) | yes | no | no |

Rationale: `engineer`/`dealer` are described elsewhere in the codebase as the "Engineering Division" (service-oriented internal staff), not accounting-authorized users — restricting the one step that actually writes into ERP/accounting data (Section 18) to `admin` matches how the rest of the app already treats ERP write access (`erp_*` RLS is currently admin-only everywhere). This matrix is a Phase 1 recommendation and can be revisited once real usage patterns are observed.

### Explicitly deferred: broader `/admin` security hardening

The audit confirmed no middleware/proxy protects `/admin`, `/admin/erp`, or any `/api/*` route today (Section 3) — this is a pre-existing, cross-cutting gap already logged in `ERP_AUDIT.md`, not something introduced by or unique to CRM. **CRM Phase 1 deliberately does not attempt to fix this site-wide** — doing so is a separate, higher-risk milestone (adding real `proxy.ts`/middleware-level route protection across all of `/admin/**`, consolidating the duplicated bearer-token boilerplate scattered across `app/api/admin/*` into one shared helper, resolving the `contract_acceptance_acts` invalid-role-list RLS bug). CRM's own gate is built to be **no weaker** than the existing ERP/warranty gates, but bringing the rest of the admin area up to a stronger standard is out of scope here and should be scheduled as its own dedicated security-hardening milestone.

---

## 18. Deal Won Workflow Safety — Two-Step Design

**"Mark Deal Won" never, by itself, creates an ERP sale, deducts inventory, creates a warranty, or creates installation/training tasks.** It is split into two explicit, separately authorized steps:

### Step 1 — Mark Won (`POST /api/crm/deals/[id]/won`, any internal staff role)

Sets `crm_deals.status = 'won_pending_setup'`, moves `stage_id` to the pipeline's `is_won` stage, sets `won_at = now()`, and writes a `crm_activities` row (`type='stage_change'`, body noting "marked won, pending sale setup"). **No other table is touched.** The deal now visually sits in the Won column, but nothing in ERP has happened yet — this state can be safely left indefinitely (e.g., waiting for a purchase order or advance payment) without any inventory/accounting consequence.

### Step 2 — Complete Sale Setup (`POST /api/crm/deals/[id]/complete-sale-setup`, **admin only**)

A dedicated review screen (not built until a later milestone, after Step 1 has been live and tested) lets an admin explicitly confirm, per `crm_deal_products` line:
- link to an existing `erp_sales` row **or** create a new one,
- confirm/edit product and quantity,
- enter the **serial number** per unit (staged in `crm_deal_products.serial_number`, copied into `erp_sale_items.serial_number` only on submit),
- **warehouse:** the ERP schema has **no warehouse table today** (confirmed absent — `ERP_AUDIT.md`'s own "Missing Functionality" list). This field is therefore **not implemented as a real selector in Phase 1** — it is either omitted entirely or captured as a free-text note, and the plan explicitly does not invent warehouse modeling on the CRM side to compensate for a gap that belongs to the ERP subsystem itself,
- confirm warranty creation (checkbox, defaulted on for serialized products),
- confirm installation task creation (checkbox, defaulted on),
- confirm training task creation (checkbox, defaulted on).

On submit, a single SECURITY DEFINER Postgres function (e.g. `crm_complete_deal_sale_setup(p_deal_id, p_lines jsonb, ...)`) performs, **in one transaction**: create/link `erp_sales` + `erp_sale_items` (with `crm_deal_id` set), create `warranties` rows as confirmed (with `crm_deal_id` set), create the confirmed `crm_tasks` rows (`installation`, `training`, and a default `follow_up`), and finally set `crm_deals.status = 'won'`. A `crm_activities` row (`type='erp_sale_created'`, then `'warranty_created'` as applicable) logs each outcome.

**This step is explicitly not built in Milestone 1** (see `CRM_PHASE1_IMPLEMENTATION.md`) — it is only implemented once the existing ERP transaction model (`erp_sales`/`erp_sale_items`/`erp_stock_lots` writes, currently non-atomic per `ERP_AUDIT.md`) is fully understood and a transaction-safe RPC pattern has been validated against it in a staging environment, per the explicit caution in this milestone's brief.

**Mark Deal Lost** remains single-step (any internal staff role) since it has no ERP side effects to review: `status='lost'`, `lost_reason` recorded, `stage_id` set to the `is_lost` stage, one `crm_activities` row.

---

## 19. Phase 1 Scope — Reconfirmed

**Included in Phase 1:**
- CRM navigation (sidebar/quick-action entry points into `/admin/crm`)
- CRM Dashboard
- Leads
- Sales Pipeline (Kanban, drag-and-drop)
- Customer 360
- Tasks
- Follow-ups (a view over Tasks, Section 15)
- ERP product integration — meaning: Deals reference `public.products`, and the Complete Sale Setup step (Section 18) explicitly links to `erp_sales`/`erp_sale_items`/`erp_products`/`warranties` — **as a manual, reviewed, admin-confirmed action**, never automatic.

**Explicitly excluded from Phase 1:**
- Unified Inbox
- WhatsApp integration
- Facebook Messenger integration
- Instagram integration
- TikTok (not previously scoped at all; explicitly excluded here too, since the brief's future-channel language could otherwise be read to include it)
- Email sync (transactional/marketing email sending or inbound parsing)
- AI automation / AI assistant
- Campaigns
- Review management
- **Automatic ERP sale creation** — "Mark Won" alone never creates an ERP sale (Section 18); only the separate, admin-only, explicitly reviewed "Complete Sale Setup" step does, and that step itself is deferred past Milestone 1.

---

## 20. Exact Files Expected to Be Created or Modified (Phase 1, Full)

This is the full Phase 1 file list; `CRM_PHASE1_IMPLEMENTATION.md` narrows this down to exactly what ships in Milestone 1.

**New — database:**
- `supabase/sql/27_crm_core.sql` — all 8 new tables + `is_crm_staff()` + seed pipeline/stages (Milestone 1)
- `supabase/sql/28_crm_erp_bridge.sql` — nullable bridge columns on `erp_parties`, `offers`, `warranties` (Section 12) (Milestone 2+)
- `supabase/sql/29_crm_sale_setup.sql` — `crm_complete_deal_sale_setup()` RPC + any supporting constraints (only once Section 18's Step 2 is built)

**New — server/library:**
- `app/lib/crm-server.ts` — `requireCrmSession()`
- `app/lib/crm-types.ts` — shared TS types + status/type label/tone maps mirroring every CHECK constraint (Section 21)
- `app/lib/crm/leads.ts`, `deals.ts`, `pipeline.ts`
- `app/lib/crm/channels/whatsapp.ts`, `messenger.ts`, `instagram.ts`, `email.ts` — empty stubs, Phase 2+
- `app/lib/crm/ai/assistant.ts` — empty stub, Phase 2+

**New — API routes:** listed in full in Section 16.

**New — frontend:**
```
app/admin/crm/page.tsx
app/admin/crm/leads/page.tsx, leads/new/page.tsx, leads/[id]/page.tsx, leads/[id]/edit/page.tsx
app/admin/crm/pipeline/page.tsx
app/admin/crm/deals/[id]/page.tsx, deals/[id]/edit/page.tsx
app/admin/crm/customers/page.tsx, customers/[partyId]/page.tsx
app/admin/crm/tasks/page.tsx
app/admin/crm/follow-ups/page.tsx
app/admin/crm/_components/CrmUi.tsx, LeadForm.tsx, DealForm.tsx, PipelineBoard.tsx, TaskForm.tsx, CustomerProfile.tsx, SaleSetupWizard.tsx (later milestone)
```

**Modified — existing files:**
- `app/admin/page.tsx` — CRM sidebar tab + Quick Actions button
- `app/admin/erp/page.tsx` — CRM entry in the sidebar `modules` array
- `app/admin/contracts/_components/ContractUi.tsx`, `app/admin/warranty/_components/WarrantyUi.tsx` — CRM cross-link in each shell header
- `.env.example` — commented, `_ENABLED=false` placeholders reserving names for future channel/AI credentials (no real secrets, no code reads them yet)

**Explicitly not modified in Phase 1:** `erp_sales`/`erp_sale_items`/`warranties`/`offers` business logic itself beyond the additive nullable bridge columns; any existing admin module's core behavior; RLS on any table other than the new `crm_*` tables and the deliberate, separately-milestoned `erp_parties`/`offers`/`warranties` bridge columns.

---

## 21. Status Enums — Strategy

Consistent with the fact that **every existing status/type field in this schema is a database `CHECK` constraint** (role, profile status, party_type, sale status, payment_status, contract status, offer status, service_case outcome, etc. — confirmed across all 30 audited migrations, with zero precedent for a lookup table backing a simple status enum):

| Enum | Strategy | Why |
|---|---|---|
| Lead status, Deal status, Task status, Task type, Activity type, Lead source | **Database `CHECK` constraint** | Matches 100% of existing precedent; widening one later is a routine one-line migration (already done for `contracts.status` in migrations 11/12) — no added friction. |
| Pipeline stages | **Lookup table** (`crm_pipeline_stages`) | The one deliberate exception — stages need admin-editable ordering (`sort_order`), relabeling without a migration (`label`), `is_won`/`is_lost` flags, and support for multiple pipelines (`crm_pipelines` is already plural) — a materially different requirement from a fixed status enum. |
| Display labels/colors for every enum above | **TypeScript constants** in `app/lib/crm-types.ts` | Mirrors the existing `*_STATUS_LABELS`/`*_STATUS_TONES` convention in `contract-types.ts`/`warranty-types.ts`. No codegen tool exists in this repo — keeping the TS union types in sync with each SQL `CHECK` constraint is a manual-discipline convention, exactly as it already is for every other domain in this codebase, not a gap unique to CRM. |

`lead_source` was specifically considered for a lookup table (since the brief's language about future channels implies the list might grow), but rejected for the same reason as every other enum here: introducing a lookup table for this one field alone would be an inconsistent one-off, and a new channel already requires new code (a new `app/lib/crm/channels/*` adapter) — adding one migration line alongside that code is not meaningful extra friction.

---

## Recommended Implementation Order (Small, Safe Milestones)

1. **Milestone 1 — schema, auth helper, nav shell, Leads, Deals/Kanban shell.** Fully detailed in `CRM_PHASE1_IMPLEMENTATION.md`. Zero touches to any pre-existing table; zero ERP writes.
2. **Milestone 2 — ERP bridge columns + conversion + Customer 360 (read-only).** Apply `28_crm_erp_bridge.sql` (nullable columns only). Build the Lead→Account/Contact/Deal conversion flow with duplicate search (Section 11). Build the Customer 360 aggregation endpoint/page, reading existing `warranties`/`service_cases`/`contracts`/`offers`/`erp_sales` alongside the new CRM tables — still no CRM-driven writes into those existing tables.
3. **Milestone 3 — Tasks & Follow-ups UI**, plus the "Mark Won" Step 1 action (status flip only, Section 18) and "Mark Lost". Still zero ERP writes.
4. **Milestone 4 — Complete Sale Setup (Step 2).** Only after Milestones 1–3 are live and the existing `erp_sales`/`erp_sale_items`/`erp_stock_lots` transaction model has been independently verified in staging. This is the first milestone that writes into ERP/warranty tables and should receive the most scrutiny and testing of the whole plan.
5. **Milestone 5 — Dashboard + full navigation wiring** into `app/admin/page.tsx`, ERP, contracts, warranty shells (Section 16 cross-links), once the module is feature-complete.
6. **Milestone 6+ (post-Phase-1, not scoped here)** — Account backfill/dedup tooling, then Unified Inbox / WhatsApp / Messenger / Instagram / Email sync / Campaigns / Reviews / AI, each behind its own `_ENABLED` flag and its own `app/lib/crm/channels/*` implementation.
7. **Separate, parallel-track milestone (not part of the CRM sequence) — `/admin` security hardening**: real middleware/proxy-level protection for `/admin/**`, consolidating duplicated bearer-token boilerplate across `app/api/admin/*`, fixing the `contract_acceptance_acts` invalid-role RLS policy. Scheduled independently since it is a pre-existing, site-wide gap, not a CRM-specific one (Section 17).
