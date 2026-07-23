-- Supplier invoice database, safely namespaced to coexist with sales and legacy invoices.
create extension if not exists pgcrypto;

create table if not exists public.supplier_manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aliases text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references public.supplier_manufacturers(id) on delete set null,
  manufacturer_name text not null,
  invoice_number text,
  invoice_date date not null,
  currency text not null default 'USD' check (currency in ('USD','EUR','GEL','CNY')),
  total numeric(18,2) not null default 0,
  storage_path text,
  original_filename text,
  notes text,
  parsed_payload jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_invoice_items (
  id uuid primary key default gen_random_uuid(),
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete cascade,
  erp_product_id uuid references public.erp_products(id) on delete set null,
  product_name text not null,
  sku text,
  unit text not null default 'pcs',
  quantity numeric(18,3) not null check (quantity > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  currency text not null check (currency in ('USD','EUR','GEL','CNY')),
  line_total numeric(18,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references public.supplier_manufacturers(id) on delete set null,
  manufacturer_name text not null,
  status text not null default 'draft' check (status in ('draft','submitted','ordered','received','cancelled')),
  currency text not null default 'USD' check (currency in ('USD','EUR','GEL','CNY')),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  supplier_order_id uuid not null references public.supplier_orders(id) on delete cascade,
  erp_product_id uuid references public.erp_products(id) on delete set null,
  product_name text not null,
  sku text,
  quantity numeric(18,3) not null check (quantity > 0),
  last_price numeric(18,2) not null default 0,
  currency text not null check (currency in ('USD','EUR','GEL','CNY')),
  created_at timestamptz not null default now()
);

create index if not exists supplier_invoice_date_idx on public.supplier_invoices(invoice_date desc);
create index if not exists supplier_invoice_manufacturer_idx on public.supplier_invoices(manufacturer_id, invoice_date desc);
create index if not exists supplier_invoice_items_invoice_idx on public.supplier_invoice_items(supplier_invoice_id);
create index if not exists supplier_invoice_items_product_idx on public.supplier_invoice_items(erp_product_id);
create index if not exists supplier_orders_created_idx on public.supplier_orders(created_at desc);

alter table public.supplier_manufacturers enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.supplier_invoice_items enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_order_items enable row level security;

drop policy if exists supplier_manufacturers_admin on public.supplier_manufacturers;
create policy supplier_manufacturers_admin on public.supplier_manufacturers for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists supplier_invoices_admin on public.supplier_invoices;
create policy supplier_invoices_admin on public.supplier_invoices for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists supplier_invoice_items_admin on public.supplier_invoice_items;
create policy supplier_invoice_items_admin on public.supplier_invoice_items for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists supplier_orders_admin on public.supplier_orders;
create policy supplier_orders_admin on public.supplier_orders for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists supplier_order_items_admin on public.supplier_order_items;
create policy supplier_order_items_admin on public.supplier_order_items for all
  to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

insert into public.supplier_manufacturers (name, aliases)
values
  ('Eighteeth', array['eighteeth medical']),
  ('Philden', array['shenzhen philden']),
  ('Soga', '{}'),
  ('JDentalCare', array['j dental care']),
  ('Hager', array['hager medical']),
  ('Beyke', array['beyke ai']),
  ('LargeV', array['large v']),
  ('MediWorks', '{}'),
  ('Other', array['unknown'])
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-invoices', 'supplier-invoices', false, 52428800,
  array['application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists supplier_invoice_files_admin on storage.objects;
create policy supplier_invoice_files_admin on storage.objects for all to authenticated
  using (bucket_id = 'supplier-invoices' and public.is_active_admin())
  with check (bucket_id = 'supplier-invoices' and public.is_active_admin());

create or replace view public.invoice_unified_history as
select
  'sales'::text as invoice_kind, id::text as source_id, invoice_number as number,
  customer_name as counterparty, invoice_date, currency, grand_total as total,
  status, created_at
from public.invoices
union all
select
  'legacy_sales', i.id::text, i.number, coalesce(c.company, c.name, 'უცნობი კლიენტი'),
  case when i.date ~ '^\d{4}-\d{2}-\d{2}$' then i.date::date else null end,
  i.currency, i.total, i.status, i.created_at
from public.inv_invoices i
left join public.inv_clients c on c.id = i.client_id
union all
select
  'supplier', id::text, invoice_number, manufacturer_name, invoice_date,
  currency, total, 'received', created_at
from public.supplier_invoices;

grant select on public.invoice_unified_history to authenticated;
