-- CRM Phase 1 — Milestone 2: CRM-internal schema refinements (additive only).
--
-- Both changes below touch only tables created in Milestone 1 (27_crm_core.sql)
-- — not any pre-existing ERP/warranty/offers table — so neither is an "ERP
-- bridge" change; they simply extend the CRM's own tables to match fields the
-- Milestone 2 brief explicitly asks for (Deal Detail "notes"; the widened
-- activity-timeline type list). Nothing existing is renamed or removed, so
-- Milestone 1 behavior (including everything already proven in
-- CRM_M1_STAGING_VALIDATION.md) is unaffected.

-- 1. Deal Detail's free-text "notes" field (distinct from the crm_activities
--    timeline — see CRM_PHASE1_M2_REPORT.md for the rationale).
alter table public.crm_deals
  add column if not exists notes text;

-- 2. Widen crm_activities.type to add the two event types Milestone 2 needs
--    that Milestone 1 did not yet define: a deal being created, and a product
--    being added to a deal. This is a pure addition to the allowed value list
--    — every value accepted before remains accepted; no existing row's `type`
--    value ever needs to change. ('deal_stage_changed' from the Milestone 2
--    brief maps onto the existing 'stage_change' value already introduced and
--    proven in Milestone 1 — not renamed, to avoid touching already-validated
--    M1 behavior. 'lead_converted' is intentionally not added yet, since lead
--    conversion itself is not in Milestone 2's scope.)
alter table public.crm_activities
  drop constraint if exists crm_activities_type_check;

alter table public.crm_activities
  add constraint crm_activities_type_check check (type in (
    'inbound_message', 'outbound_message', 'call', 'note',
    'task_created', 'task_completed', 'follow_up', 'meeting', 'demo',
    'stage_change', 'quotation_created', 'quotation_sent',
    'erp_sale_created', 'warranty_created', 'installation', 'training',
    'service_event', 'ai_summary', 'system',
    'deal_created', 'product_added'
  ));
