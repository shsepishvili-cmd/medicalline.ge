-- Rollback for 29_crm_m2_schema.sql.
--
-- CAUTION: reverting crm_activities.type back to the Milestone-1-only list
-- will FAIL if any row already has type = 'deal_created' or 'product_added'
-- (Postgres validates all existing rows when a CHECK constraint is added,
-- unless declared NOT VALID). If this rollback is needed after Milestone 2
-- has been in real use, delete or re-type those rows first, e.g.:
--   delete from public.crm_activities where type in ('deal_created', 'product_added');
-- This mirrors the same category of caveat already documented for rolling
-- back 27_crm_core.sql's circular-FK resolution — not a new class of risk.

alter table public.crm_activities
  drop constraint if exists crm_activities_type_check;

alter table public.crm_activities
  add constraint crm_activities_type_check check (type in (
    'inbound_message', 'outbound_message', 'call', 'note',
    'task_created', 'task_completed', 'follow_up', 'meeting', 'demo',
    'stage_change', 'quotation_created', 'quotation_sent',
    'erp_sale_created', 'warranty_created', 'installation', 'training',
    'service_event', 'ai_summary', 'system'
  ));

alter table public.crm_deals
  drop column if exists notes;
