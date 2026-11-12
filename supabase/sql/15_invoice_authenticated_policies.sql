-- Allows the logged-in clinic/admin UI to save and read invoices.
-- The legacy invoice module already allowed anon access; authenticated users need explicit RLS policies too.

drop policy if exists "invoice_authenticated_all_clients" on public.inv_clients;
create policy "invoice_authenticated_all_clients" on public.inv_clients
  for all to authenticated using (true) with check (true);

drop policy if exists "invoice_authenticated_all_products" on public.inv_products;
create policy "invoice_authenticated_all_products" on public.inv_products
  for all to authenticated using (true) with check (true);

drop policy if exists "invoice_authenticated_all_invoices" on public.inv_invoices;
create policy "invoice_authenticated_all_invoices" on public.inv_invoices
  for all to authenticated using (true) with check (true);

drop policy if exists "invoice_authenticated_all_settings" on public.inv_settings;
create policy "invoice_authenticated_all_settings" on public.inv_settings
  for all to authenticated using (true) with check (true);
