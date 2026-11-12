-- =========================================
-- 06_warranty_rls_fix.sql
-- Relax brittle created_by/uploaded_by checks for warranty module RLS
-- Run after 05_warranty_module.sql
-- =========================================

drop policy if exists "warranty_staff_insert_warranties" on public.warranties;
create policy "warranty_staff_insert_warranties"
on public.warranties
for insert
to authenticated
with check (public.is_warranty_staff());

drop policy if exists "warranty_staff_update_warranties" on public.warranties;
create policy "warranty_staff_update_warranties"
on public.warranties
for update
to authenticated
using (public.is_warranty_staff())
with check (public.is_warranty_staff());

drop policy if exists "warranty_staff_insert_service_cases" on public.service_cases;
create policy "warranty_staff_insert_service_cases"
on public.service_cases
for insert
to authenticated
with check (public.is_warranty_staff());

drop policy if exists "warranty_staff_update_service_cases" on public.service_cases;
create policy "warranty_staff_update_service_cases"
on public.service_cases
for update
to authenticated
using (public.is_warranty_staff())
with check (public.is_warranty_staff());

drop policy if exists "warranty_staff_insert_attachments" on public.warranty_attachments;
create policy "warranty_staff_insert_attachments"
on public.warranty_attachments
for insert
to authenticated
with check (public.is_warranty_staff());

drop policy if exists "warranty_staff_update_attachments" on public.warranty_attachments;
create policy "warranty_staff_update_attachments"
on public.warranty_attachments
for update
to authenticated
using (public.is_warranty_staff())
with check (public.is_warranty_staff());
