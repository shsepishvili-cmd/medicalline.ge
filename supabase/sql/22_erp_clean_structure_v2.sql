-- ERP clean structure V2
-- Goal: keep messy ORIS/Claude/Excel imports in staging, expose clean canonical views,
-- and review duplicates before they pollute operational ERP tables.

create extension if not exists "uuid-ossp";

create table if not exists public.erp_import_batches (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.erp_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  source text not null,
  file_name text,
  status text not null default 'loaded' check (status in ('loaded', 'reviewing', 'approved', 'archived', 'failed')),
  notes text
);

create table if not exists public.erp_product_import_map (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  product_id uuid references public.erp_products(id) on delete cascade,
  source text not null,
  source_code text,
  source_name text,
  decision text not null default 'auto' check (decision in ('auto', 'linked', 'new', 'ignored', 'review')),
  confidence numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, source, source_code)
);

create table if not exists public.erp_party_import_map (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  party_id uuid references public.erp_parties(id) on delete cascade,
  source text not null,
  source_code text,
  source_tax_id text,
  source_name text,
  decision text not null default 'auto' check (decision in ('auto', 'linked', 'new', 'ignored', 'review')),
  confidence numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, source, source_code)
);

create or replace view public.erp_products_duplicate_review as
with normalized as (
  select
    p.*,
    lower(regexp_replace(coalesce(p.code, ''), '\s+', '', 'g')) as norm_code,
    lower(regexp_replace(coalesce(p.name, ''), '[^[:alnum:]]+', '', 'g')) as norm_name
  from public.erp_products p
),
groups as (
  select
    company_id,
    nullif(norm_code, '') as norm_code,
    nullif(norm_name, '') as norm_name,
    count(*) as duplicate_count
  from normalized
  group by company_id, nullif(norm_code, ''), nullif(norm_name, '')
  having count(*) > 1
)
select
  n.company_id,
  n.id,
  n.code,
  n.name,
  n.category,
  n.default_cost,
  n.default_price,
  n.source,
  n.created_at,
  g.duplicate_count,
  coalesce(g.norm_code, g.norm_name) as duplicate_key
from normalized n
join groups g
  on g.company_id = n.company_id
 and ((g.norm_code is not null and g.norm_code = n.norm_code)
   or (g.norm_code is null and g.norm_name is not null and g.norm_name = n.norm_name));

create or replace view public.erp_parties_duplicate_review as
with normalized as (
  select
    p.*,
    lower(regexp_replace(coalesce(p.tax_id, ''), '\s+', '', 'g')) as norm_tax,
    lower(regexp_replace(coalesce(p.name, ''), '[^[:alnum:]]+', '', 'g')) as norm_name
  from public.erp_parties p
),
groups as (
  select
    company_id,
    nullif(norm_tax, '') as norm_tax,
    nullif(norm_name, '') as norm_name,
    count(*) as duplicate_count
  from normalized
  group by company_id, nullif(norm_tax, ''), nullif(norm_name, '')
  having count(*) > 1
)
select
  n.company_id,
  n.id,
  n.code,
  n.name,
  n.tax_id,
  n.phone,
  n.party_type,
  n.source,
  n.created_at,
  g.duplicate_count,
  coalesce(g.norm_tax, g.norm_name) as duplicate_key
from normalized n
join groups g
  on g.company_id = n.company_id
 and ((g.norm_tax is not null and g.norm_tax = n.norm_tax)
   or (g.norm_tax is null and g.norm_name is not null and g.norm_name = n.norm_name));

create or replace view public.erp_products_clean as
select distinct on (
  p.company_id,
  coalesce(nullif(lower(regexp_replace(coalesce(p.code, ''), '\s+', '', 'g')), ''), lower(regexp_replace(coalesce(p.name, ''), '[^[:alnum:]]+', '', 'g')))
)
  p.*
from public.erp_products p
where p.is_active = true
order by
  p.company_id,
  coalesce(nullif(lower(regexp_replace(coalesce(p.code, ''), '\s+', '', 'g')), ''), lower(regexp_replace(coalesce(p.name, ''), '[^[:alnum:]]+', '', 'g'))),
  case
    when p.source = 'ORIS_PRODUCTS_XLSX' then 1
    when p.source like 'ORIS%' then 2
    when p.source = 'CLAUDE_ORIS_EXPORT' then 3
    else 4
  end,
  p.created_at asc,
  p.id asc;

create or replace view public.erp_parties_clean as
select distinct on (
  p.company_id,
  coalesce(nullif(lower(regexp_replace(coalesce(p.tax_id, ''), '\s+', '', 'g')), ''), nullif(lower(regexp_replace(coalesce(p.code, ''), '\s+', '', 'g')), ''), lower(regexp_replace(coalesce(p.name, ''), '[^[:alnum:]]+', '', 'g')))
)
  p.*
from public.erp_parties p
order by
  p.company_id,
  coalesce(nullif(lower(regexp_replace(coalesce(p.tax_id, ''), '\s+', '', 'g')), ''), nullif(lower(regexp_replace(coalesce(p.code, ''), '\s+', '', 'g')), ''), lower(regexp_replace(coalesce(p.name, ''), '[^[:alnum:]]+', '', 'g'))),
  case
    when p.source like 'ORIS%' then 1
    when p.source = 'CLAUDE_ORIS_EXPORT' then 3
    else 4
  end,
  p.created_at asc,
  p.id asc;

create or replace view public.erp_clean_summary as
select
  c.id as company_id,
  c.code as company_code,
  (select count(*) from public.erp_products where company_id = c.id) as raw_products,
  (select count(*) from public.erp_products_clean where company_id = c.id) as clean_products,
  (select count(*) from public.erp_products_duplicate_review where company_id = c.id) as duplicate_product_rows,
  (select count(*) from public.erp_parties where company_id = c.id) as raw_parties,
  (select count(*) from public.erp_parties_clean where company_id = c.id) as clean_parties,
  (select count(*) from public.erp_parties_duplicate_review where company_id = c.id) as duplicate_party_rows
from public.erp_companies c;

alter table public.erp_import_batches enable row level security;
alter table public.erp_product_import_map enable row level security;
alter table public.erp_party_import_map enable row level security;

drop policy if exists "admin_all_erp_import_batches" on public.erp_import_batches;
create policy "admin_all_erp_import_batches" on public.erp_import_batches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_product_import_map" on public.erp_product_import_map;
create policy "admin_all_erp_product_import_map" on public.erp_product_import_map
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_erp_party_import_map" on public.erp_party_import_map;
create policy "admin_all_erp_party_import_map" on public.erp_party_import_map
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

select * from public.erp_clean_summary;
