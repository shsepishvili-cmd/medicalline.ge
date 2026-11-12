-- =============================================================================
-- 21_erp_accounting.sql
-- Medical Line ERP/accounting foundation.
-- Covers MEDIQALJORJIA, VAT, inventory, sales, payments, RS.ge logs and bank imports.
-- =============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.erp_companies (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null unique,
  name text not null,
  legal_name text,
  tax_id text,
  vat_registered boolean not null default true,
  default_vat_rate numeric(5, 2) not null default 18,
  default_currency text not null default 'GEL',
  address text,
  phone text,
  email text,
  rs_username text,
  settings jsonb not null default '{}'::jsonb
);

create table if not exists public.erp_chart_accounts (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'income', 'expense', 'contra')),
  parent_code text,
  is_active boolean not null default true,
  source text,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.erp_parties (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  party_type text not null check (party_type in ('customer', 'supplier', 'both', 'bank', 'employee', 'other')),
  code text,
  name text not null,
  tax_id text,
  phone text,
  email text,
  address text,
  opening_debit numeric(14, 2) not null default 0,
  opening_credit numeric(14, 2) not null default 0,
  source text,
  unique (company_id, code)
);

create table if not exists public.erp_products (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text,
  name text not null,
  category text,
  unit text not null default 'ცალი',
  default_cost numeric(14, 4) not null default 0,
  default_price numeric(14, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 18,
  requires_serial boolean not null default false,
  is_active boolean not null default true,
  source text,
  unique (company_id, code)
);

create table if not exists public.erp_stock_lots (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  product_id uuid not null references public.erp_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  import_date date,
  supplier_id uuid references public.erp_parties(id) on delete set null,
  quantity_in numeric(14, 3) not null default 0,
  quantity_out numeric(14, 3) not null default 0,
  unit_cost numeric(14, 4) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  currency text not null default 'GEL',
  serial_numbers jsonb not null default '[]'::jsonb,
  source_doc text,
  source text
);

create table if not exists public.erp_sales (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sale_date date not null default current_date,
  invoice_number text,
  waybill_number text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'sent_rs', 'paid', 'cancelled')),
  channel text not null default 'retail' check (channel in ('retail', 'invoice', 'installment', 'transfer')),
  customer_id uuid references public.erp_parties(id) on delete set null,
  customer_name text,
  subtotal numeric(14, 2) not null default 0,
  vat_amount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  cost_total numeric(14, 2) not null default 0,
  profit numeric(14, 2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  rs_invoice_id text,
  rs_waybill_id text,
  note text,
  source text
);

create table if not exists public.erp_sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid not null references public.erp_sales(id) on delete cascade,
  product_id uuid references public.erp_products(id) on delete set null,
  product_code text,
  product_name text not null,
  serial_number text,
  quantity numeric(14, 3) not null default 1,
  unit text not null default 'ცალი',
  unit_price numeric(14, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 18,
  vat_amount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0,
  unit_cost numeric(14, 4) not null default 0,
  cost_total numeric(14, 2) not null default 0
);

create table if not exists public.erp_payments (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  sale_id uuid references public.erp_sales(id) on delete set null,
  party_id uuid references public.erp_parties(id) on delete set null,
  created_at timestamptz not null default now(),
  payment_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'card', 'installment', 'other')),
  bank_name text,
  bank_account text,
  amount numeric(14, 2) not null,
  currency text not null default 'GEL',
  external_ref text,
  note text,
  source text
);

create table if not exists public.erp_journal_entries (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  entry_date date not null default current_date,
  entry_number text,
  source_type text not null,
  source_id uuid,
  memo text,
  status text not null default 'posted' check (status in ('draft', 'posted', 'void')),
  unique (company_id, entry_number)
);

create table if not exists public.erp_journal_lines (
  id uuid default uuid_generate_v4() primary key,
  entry_id uuid not null references public.erp_journal_entries(id) on delete cascade,
  account_id uuid references public.erp_chart_accounts(id) on delete set null,
  account_code text not null,
  party_id uuid references public.erp_parties(id) on delete set null,
  debit numeric(14, 2) not null default 0,
  credit numeric(14, 2) not null default 0,
  memo text,
  check (debit >= 0 and credit >= 0 and not (debit > 0 and credit > 0))
);

create table if not exists public.erp_rs_logs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  sale_id uuid references public.erp_sales(id) on delete set null,
  created_at timestamptz not null default now(),
  action text not null,
  rs_id text,
  status text not null default 'pending' check (status in ('pending', 'success', 'error')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text
);

create table if not exists public.erp_bank_imports (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  bank_name text not null,
  account_number text,
  statement_date date,
  file_name text,
  status text not null default 'uploaded' check (status in ('uploaded', 'processed', 'failed')),
  rows jsonb not null default '[]'::jsonb,
  error_message text
);

create index if not exists erp_products_company_idx on public.erp_products(company_id, name);
create index if not exists erp_parties_company_idx on public.erp_parties(company_id, name);
create index if not exists erp_sales_company_date_idx on public.erp_sales(company_id, sale_date desc);
create index if not exists erp_payments_company_date_idx on public.erp_payments(company_id, payment_date desc);
create index if not exists erp_journal_entries_company_date_idx on public.erp_journal_entries(company_id, entry_date desc);
create index if not exists erp_rs_logs_company_idx on public.erp_rs_logs(company_id, created_at desc);

alter table public.erp_companies enable row level security;
alter table public.erp_chart_accounts enable row level security;
alter table public.erp_parties enable row level security;
alter table public.erp_products enable row level security;
alter table public.erp_stock_lots enable row level security;
alter table public.erp_sales enable row level security;
alter table public.erp_sale_items enable row level security;
alter table public.erp_payments enable row level security;
alter table public.erp_journal_entries enable row level security;
alter table public.erp_journal_lines enable row level security;
alter table public.erp_rs_logs enable row level security;
alter table public.erp_bank_imports enable row level security;

drop policy if exists "admin_all_erp_companies" on public.erp_companies;
create policy "admin_all_erp_companies" on public.erp_companies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_chart_accounts" on public.erp_chart_accounts;
create policy "admin_all_erp_chart_accounts" on public.erp_chart_accounts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_parties" on public.erp_parties;
create policy "admin_all_erp_parties" on public.erp_parties
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_products" on public.erp_products;
create policy "admin_all_erp_products" on public.erp_products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_stock_lots" on public.erp_stock_lots;
create policy "admin_all_erp_stock_lots" on public.erp_stock_lots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_sales" on public.erp_sales;
create policy "admin_all_erp_sales" on public.erp_sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_sale_items" on public.erp_sale_items;
create policy "admin_all_erp_sale_items" on public.erp_sale_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_payments" on public.erp_payments;
create policy "admin_all_erp_payments" on public.erp_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_journal_entries" on public.erp_journal_entries;
create policy "admin_all_erp_journal_entries" on public.erp_journal_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_journal_lines" on public.erp_journal_lines;
create policy "admin_all_erp_journal_lines" on public.erp_journal_lines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_rs_logs" on public.erp_rs_logs;
create policy "admin_all_erp_rs_logs" on public.erp_rs_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_bank_imports" on public.erp_bank_imports;
create policy "admin_all_erp_bank_imports" on public.erp_bank_imports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.erp_companies (code, name, legal_name, vat_registered, default_vat_rate, default_currency)
values ('MEDIQALJORJIA', 'MEDIQALJORJIA', 'MEDIQALJORJIA', true, 18, 'GEL')
on conflict (code) do update
set name = excluded.name,
    legal_name = excluded.legal_name,
    vat_registered = true,
    default_vat_rate = 18,
    updated_at = now();
