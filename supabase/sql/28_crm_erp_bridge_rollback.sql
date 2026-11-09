-- Rollback for 28_crm_erp_bridge.sql.
-- Drops only the objects that migration added: the new CRM-staff read policy
-- on erp_parties, the crm_update_party_bridge_fields() RPC, the four new
-- indexes, and the nullable columns added to erp_parties/offers/warranties.
-- Does not touch any pre-existing column, row, or the original admin-only
-- erp_parties policy. Safe to run even if some CRM data already references
-- these columns (values are simply dropped along with the columns).

drop function if exists public.crm_update_party_bridge_fields(uuid, jsonb);

drop policy if exists "crm_staff_select_erp_parties" on public.erp_parties;

drop index if exists public.erp_parties_crm_owner_idx;
drop index if exists public.erp_parties_profile_idx;
drop index if exists public.offers_crm_deal_idx;
drop index if exists public.warranties_crm_deal_idx;

alter table public.erp_parties
  drop column if exists profile_id,
  drop column if exists crm_owner_id,
  drop column if exists lead_source,
  drop column if exists city,
  drop column if exists is_individual;

alter table public.offers
  drop column if exists crm_deal_id;

alter table public.warranties
  drop column if exists crm_deal_id;
