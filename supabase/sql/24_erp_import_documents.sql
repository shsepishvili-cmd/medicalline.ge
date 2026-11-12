-- ERP import documents
-- Header + lines for foreign purchases with exchange rate and customs allocation.

create extension if not exists "uuid-ossp";

create table if not exists public.erp_import_documents (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  supplier_id uuid references public.erp_parties(id) on delete set null,
  supplier_name text,
  invoice_number text not null,
  invoice_date date not null default current_date,
  currency text not null check (currency in ('USD', 'EUR', 'GEL')),
  exchange_rate numeric(14, 6) not null default 1,
  customs_gel numeric(14, 2) not null default 0,
  goods_gel_total numeric(14, 2) not null default 0,
  landed_total numeric(14, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'posted', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create table if not exists public.erp_import_lines (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid not null references public.erp_import_documents(id) on delete cascade,
  product_id uuid references public.erp_products(id) on delete set null,
  product_code text,
  product_name text not null,
  quantity numeric(14, 3) not null default 1,
  foreign_unit_price numeric(14, 4) not null default 0,
  gel_unit_price numeric(14, 4) not null default 0,
  gel_line_total numeric(14, 2) not null default 0,
  customs_share numeric(14, 2) not null default 0,
  unit_cost numeric(14, 4) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  markup_percent numeric(8, 2) not null default 0,
  sale_price numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists erp_import_documents_company_date_idx
  on public.erp_import_documents(company_id, invoice_date desc);

create index if not exists erp_import_lines_document_idx
  on public.erp_import_lines(document_id);

alter table public.erp_import_documents enable row level security;
alter table public.erp_import_lines enable row level security;

drop policy if exists "admin_all_erp_import_documents" on public.erp_import_documents;
create policy "admin_all_erp_import_documents" on public.erp_import_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_import_lines" on public.erp_import_lines;
create policy "admin_all_erp_import_lines" on public.erp_import_lines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
