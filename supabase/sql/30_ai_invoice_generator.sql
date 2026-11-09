-- AI invoice generator (additive; legacy inv_* tables remain untouched).
create extension if not exists pgcrypto;

create table if not exists public.invoice_company_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null,
  tax_id text not null,
  bank_account text not null,
  address text not null,
  director text not null,
  logo_path text,
  stamp_path text,
  signature_path text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.invoice_company_settings
  (id, company_name, tax_id, bank_account, address, director)
values
  (1, 'შპს მედიქალ ლაინ ჯორჯია', '417893569', 'GE50BG0000000103262327GEL',
   'თბილისი, ჯაბიძის ქუჩა 8', 'შოთა სეფიშვილი')
on conflict (id) do nothing;

create table if not exists public.invoice_number_sequences (
  year integer primary key,
  last_value integer not null default 0
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'sent', 'paid', 'cancelled', 'archived')),
  customer_id uuid,
  customer_name text not null,
  customer_tax_id text,
  customer_address text,
  customer_email text,
  customer_phone text,
  invoice_date date not null,
  due_date date,
  delivery_date date,
  currency text not null check (currency in ('GEL', 'USD', 'EUR')),
  vat_mode text not null check (vat_mode in ('without_vat', 'vat_included', 'vat_excluded_add_vat')),
  subtotal numeric(18,2) not null default 0,
  discount_total numeric(18,2) not null default 0,
  vat_total numeric(18,2) not null default 0,
  grand_total numeric(18,2) not null default 0,
  amount_in_words text not null default '',
  payment_terms text,
  notes text,
  clean_pdf_path text,
  scanned_pdf_path text,
  stamp_applied boolean not null default false,
  signature_applied boolean not null default false,
  source_type text not null default 'prompt' check (source_type in ('prompt', 'file', 'manual', 'duplicate')),
  source_file_path text,
  ai_prompt text,
  parsed_payload jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid,
  product_name text not null,
  product_code text,
  unit text not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  discount numeric(18,2) not null default 0 check (discount >= 0),
  line_total numeric(18,2) not null check (line_total >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_audit_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  user_id uuid not null references auth.users(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoices_created_at_idx on public.invoices(created_at desc);
create index if not exists invoices_customer_idx on public.invoices(customer_id);
create index if not exists invoices_number_idx on public.invoices(invoice_number);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_date_idx on public.invoices(invoice_date desc);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id, sort_order);
create index if not exists invoice_items_product_idx on public.invoice_items(product_id);
create index if not exists invoice_audit_invoice_idx on public.invoice_audit_logs(invoice_id, created_at desc);

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and coalesce(status, 'active') = 'active'
  );
$$;

create or replace function public.next_invoice_number(p_year integer default extract(year from now())::integer)
returns text language plpgsql security definer set search_path = public
as $$
declare v_next integer;
begin
  if not public.is_active_admin() then raise exception 'Forbidden'; end if;
  insert into public.invoice_number_sequences(year, last_value) values (p_year, 1)
  on conflict (year) do update set last_value = public.invoice_number_sequences.last_value + 1
  returning last_value into v_next;
  return 'INV-' || p_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

alter table public.invoice_company_settings enable row level security;
alter table public.invoice_number_sequences enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_audit_logs enable row level security;

drop policy if exists invoice_settings_admin on public.invoice_company_settings;
create policy invoice_settings_admin on public.invoice_company_settings for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists invoices_admin on public.invoices;
create policy invoices_admin on public.invoices for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists invoice_items_admin on public.invoice_items;
create policy invoice_items_admin on public.invoice_items for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists invoice_audit_admin on public.invoice_audit_logs;
create policy invoice_audit_admin on public.invoice_audit_logs for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

insert into storage.buckets (id, name, public)
values ('invoice-documents', 'invoice-documents', false)
on conflict (id) do update set public = false;

drop policy if exists invoice_documents_admin on storage.objects;
create policy invoice_documents_admin on storage.objects for all to authenticated
  using (bucket_id = 'invoice-documents' and public.is_active_admin())
  with check (bucket_id = 'invoice-documents' and public.is_active_admin());
