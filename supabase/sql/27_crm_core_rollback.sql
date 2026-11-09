-- Rollback for 27_crm_core.sql — CRM Phase 1 Milestone 1.
-- Run only if Milestone 1 needs to be fully reverted. This script drops exactly the
-- 8 tables and 2 functions created by 27_crm_core.sql (is_crm_staff() and
-- crm_protect_created_by(), the latter added during the migration-readiness
-- hardening pass — see CRM_M1_MIGRATION_READINESS.md). It does not touch any
-- table that existed before that migration, so it carries zero risk to
-- ERP/warranty/contracts/clinic-portal data, and it does not touch the
-- pgcrypto extension (safe to leave enabled even after rollback — it may
-- already have been required by 05_warranty_module.sql regardless of CRM).
-- Not part of the numbered migration sequence — this is a companion rollback
-- script, not applied automatically.
--
-- Explicit DROP TRIGGER/DROP POLICY statements are not required before
-- DROP TABLE — dropping a table automatically drops everything that depends
-- on it (its triggers, indexes, and RLS policies). They are still listed
-- below only where a trigger's target table survives past that point in the
-- script (none currently do), for clarity.

drop trigger if exists crm_tasks_set_updated_at on public.crm_tasks;
drop trigger if exists crm_tasks_protect_created_by on public.crm_tasks;
drop trigger if exists crm_deals_set_updated_at on public.crm_deals;
drop trigger if exists crm_deals_protect_created_by on public.crm_deals;
drop trigger if exists crm_leads_set_updated_at on public.crm_leads;
drop trigger if exists crm_leads_protect_created_by on public.crm_leads;
drop trigger if exists crm_contacts_set_updated_at on public.crm_contacts;
drop trigger if exists crm_contacts_protect_created_by on public.crm_contacts;
drop trigger if exists crm_pipeline_stages_protect_created_by on public.crm_pipeline_stages;
drop trigger if exists crm_pipelines_protect_created_by on public.crm_pipelines;

drop table if exists public.crm_activities;
drop table if exists public.crm_tasks;
drop table if exists public.crm_deal_products;

alter table if exists public.crm_leads drop column if exists converted_deal_id;

drop table if exists public.crm_deals;
drop table if exists public.crm_leads;
drop table if exists public.crm_contacts;
drop table if exists public.crm_pipeline_stages;
drop table if exists public.crm_pipelines;

drop function if exists public.is_crm_staff();
drop function if exists public.crm_protect_created_by();
