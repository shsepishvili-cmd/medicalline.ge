-- CRM Phase 1 — Milestone 2: ERP bridge (additive only).
--
-- Scope, exactly as approved in CRM_ARCHITECTURE_PLAN.md Section 12 and the
-- Milestone 2 brief: add nullable CRM-facing columns to public.erp_parties so
-- it can serve as the canonical Customer 360 Account without duplicating it.
-- Nothing here renames, retypes, or removes any existing column, and nothing
-- here touches erp_parties' existing accounting data (name, tax_id, code,
-- opening_debit, opening_credit, company_id, party_type all stay exactly as
-- they are, exactly as governed by the existing ERP admin screens).
--
-- offers.crm_deal_id / warranties.crm_deal_id are also added below, per
-- CRM_ARCHITECTURE_PLAN.md Section 12 ("offers Gains crm_deal_id ... this is
-- the one bridge actively used in Phase 1" / "warranties Gains crm_deal_id
-- ... for warranties created via the CRM Won workflow going forward") and
-- Section 20's file list, which names both as part of this exact migration.
-- Both are purely additive nullable FKs with no default writer in Milestone 2
-- — nothing yet sets them (the Complete Sale Setup workflow that will
-- populate warranties.crm_deal_id going forward is a later milestone) — they
-- simply reserve the column now so a later milestone is a pure application
-- change, not a further schema migration.
--
-- No backfill is performed. Every new column defaults to NULL/false and is
-- populated only going forward, by CRM actions — existing erp_parties/
-- offers/warranties rows are left completely alone, satisfying "no
-- destructive changes" and "no automatic backfill unless explicitly
-- required" (it is not required here).

alter table public.erp_parties
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists crm_owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists lead_source text,
  add column if not exists city text,
  add column if not exists is_individual boolean not null default false;

create index if not exists erp_parties_crm_owner_idx on public.erp_parties (crm_owner_id);
create index if not exists erp_parties_profile_idx on public.erp_parties (profile_id);

alter table public.offers
  add column if not exists crm_deal_id uuid references public.crm_deals(id) on delete set null;

create index if not exists offers_crm_deal_idx on public.offers (crm_deal_id);

alter table public.warranties
  add column if not exists crm_deal_id uuid references public.crm_deals(id) on delete set null;

create index if not exists warranties_crm_deal_idx on public.warranties (crm_deal_id);

-- ---------------------------------------------------------------------------
-- RLS: additive read access for CRM staff (engineer/dealer), reviewed decision
-- ---------------------------------------------------------------------------
--
-- erp_parties RLS was admin-only (see 21_erp_accounting.sql: "admin_all_erp_parties",
-- for all to authenticated using (is_admin())). Customer 360 must be usable by
-- engineer/dealer too (the approved permission matrix grants them "view"
-- access to CRM data generally), so a SECOND, PERMISSIVE, SELECT-ONLY policy is
-- added here for is_crm_staff(). Postgres RLS policies are OR'd together, so
-- this purely ADDS read access for engineer/dealer — it does not weaken,
-- replace, or remove the existing admin-only "admin_all_erp_parties" policy,
-- which still fully governs INSERT/UPDATE/DELETE (account creation, financial
-- fields, party merges, etc. all remain admin-only, unchanged).
--
-- Reviewed tradeoff (documented, not hidden): this grants engineer/dealer
-- read access to the FULL erp_parties row, including tax_id/opening_debit/
-- opening_credit, rather than a column-restricted view. Postgres GRANT is
-- per-Postgres-role, and admin/engineer/dealer/doctor all share the single
-- "authenticated" Postgres role, so a column-level grant (the pattern used
-- for payment_transactions in 25_clinic_commercial_portal.sql) cannot
-- distinguish "admin sees tax_id, engineer doesn't" within one RLS policy.
-- Doing so would require a SECURITY DEFINER view/RPC layer for reads too —
-- deliberately not built for the read side in Milestone 2 (Customer 360 is a
-- read-heavy screen and every field it surfaces is already visible to
-- engineer/dealer elsewhere in the existing warranty/ERP admin views they can
-- already reach). See CRM_PHASE1_M2_REPORT.md for the full writeup.
drop policy if exists "crm_staff_select_erp_parties" on public.erp_parties;
create policy "crm_staff_select_erp_parties" on public.erp_parties
  for select to authenticated using (public.is_crm_staff());

-- ---------------------------------------------------------------------------
-- Scoped write access for CRM staff: the 4 bridge columns only
-- ---------------------------------------------------------------------------
--
-- Bug found and fixed during Milestone 2 review (CRM_PHASE1_M2_REPORT.md):
-- app/api/crm/customers/[partyId]/route.ts lets any CRM staff role (admin/
-- engineer/dealer) PATCH crm_owner_id/lead_source/city/is_individual, but
-- "admin_all_erp_parties" is the ONLY write policy on this table and it is
-- admin-only — so an engineer/dealer PATCH would be silently rejected by RLS
-- even though the app layer (and the approved permission matrix, which grants
-- engineer/dealer general CRM edit access, not just admins) intends to allow
-- it. A plain second UPDATE policy for is_crm_staff() cannot fix this safely,
-- because Postgres RLS has no way to restrict *which columns* a policy-passing
-- UPDATE may touch — it would open every erp_parties column (tax_id, opening_
-- debit/credit, party_type, company_id, ...) to engineer/dealer writes, which
-- is exactly what the approved permission matrix reserves for admin only.
--
-- Fix: a narrow SECURITY DEFINER function that is_crm_staff() may call, which
-- updates only these 4 named columns and nothing else — no matter what keys a
-- caller passes in p_updates, only the 4 explicitly-checked keys ever reach
-- an UPDATE statement. This mirrors the SECURITY DEFINER pattern already
-- established by is_admin()/is_crm_staff() themselves, and is the same shape
-- CRM_ARCHITECTURE_PLAN.md Section 18 already prescribes for the (larger,
-- later) Complete Sale Setup RPC — a small, auditable, narrowly-scoped
-- function rather than broadening a blanket table policy.
create or replace function public.crm_update_party_bridge_fields(p_party_id uuid, p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_crm_staff() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.erp_parties set
    crm_owner_id  = case when p_updates ? 'crm_owner_id'  then nullif(p_updates->>'crm_owner_id', '')::uuid else crm_owner_id end,
    lead_source   = case when p_updates ? 'lead_source'   then p_updates->>'lead_source' else lead_source end,
    city          = case when p_updates ? 'city'          then p_updates->>'city' else city end,
    is_individual = case when p_updates ? 'is_individual' then coalesce((p_updates->>'is_individual')::boolean, false) else is_individual end,
    updated_at    = now()
  where id = p_party_id;

  if not found then
    raise exception 'Party not found' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.crm_update_party_bridge_fields(uuid, jsonb) to authenticated;
