-- =========================================
-- 05_warranty_module.sql
-- Warranty management module schema + RLS + storage
-- Run after 01_core.sql
-- =========================================

create extension if not exists pgcrypto;

create sequence if not exists public.warranty_number_seq start 1000;
create sequence if not exists public.service_case_number_seq start 1000;

create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  warranty_number text not null unique,
  product_id uuid references public.products(id) on delete set null,
  brand text not null,
  product_category text,
  product_name text not null,
  model text,
  serial_number text not null unique,
  clinic_name text,
  customer_name text,
  phone text,
  email text,
  purchase_date date,
  installation_date date,
  warranty_start date not null,
  warranty_months integer not null check (warranty_months >= 0),
  warranty_end date not null,
  invoice_number text,
  sold_by text,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'void', 'replaced')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  pdf_path text,
  qr_url text,
  verify_token uuid not null default gen_random_uuid(),
  archived_at timestamptz
);

create table if not exists public.service_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  warranty_id uuid not null references public.warranties(id) on delete cascade,
  case_number text not null unique,
  issue_title text not null,
  issue_description text,
  reported_at timestamptz not null default now(),
  inspection_result text,
  is_mechanical_damage boolean,
  is_under_warranty boolean,
  action_taken text,
  replaced_unit text,
  sent_to_factory boolean not null default false,
  factory_sent_at timestamptz,
  factory_returned_at timestamptz,
  closed_at timestamptz,
  outcome text check (outcome in ('repaired', 'replaced', 'rejected', 'returned_from_factory', 'closed_no_fault_found') or outcome is null),
  notes text,
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.warranty_attachments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  warranty_id uuid references public.warranties(id) on delete cascade,
  service_case_id uuid references public.service_cases(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_bucket text not null default 'warranty-documents',
  file_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  constraint warranty_attachment_owner_check
    check (((warranty_id is not null)::int + (service_case_id is not null)::int) = 1)
);

create index if not exists warranties_serial_number_idx on public.warranties(serial_number);
create index if not exists warranties_clinic_name_idx on public.warranties(clinic_name);
create index if not exists warranties_customer_name_idx on public.warranties(customer_name);
create index if not exists warranties_status_idx on public.warranties(status);
create index if not exists warranties_warranty_end_idx on public.warranties(warranty_end);
create index if not exists warranties_brand_model_idx on public.warranties(brand, model);
create index if not exists warranties_verify_token_idx on public.warranties(verify_token);
create index if not exists service_cases_warranty_id_idx on public.service_cases(warranty_id);
create index if not exists service_cases_reported_at_idx on public.service_cases(reported_at desc);
create index if not exists warranty_attachments_warranty_id_idx on public.warranty_attachments(warranty_id);
create index if not exists warranty_attachments_service_case_id_idx on public.warranty_attachments(service_case_id);

alter table public.warranties enable row level security;
alter table public.service_cases enable row level security;
alter table public.warranty_attachments enable row level security;

create or replace function public.is_warranty_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'engineer', 'dealer')
      and status = 'active'
  );
$$;

grant execute on function public.is_warranty_staff() to authenticated;

create or replace function public.get_warranty_public_summary(p_verify_token uuid)
returns table (
  warranty_number text,
  brand text,
  product_name text,
  model text,
  serial_number text,
  clinic_name text,
  customer_name text,
  purchase_date date,
  installation_date date,
  warranty_start date,
  warranty_end date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.warranty_number,
    w.brand,
    w.product_name,
    w.model,
    w.serial_number,
    w.clinic_name,
    w.customer_name,
    w.purchase_date,
    w.installation_date,
    w.warranty_start,
    w.warranty_end,
    w.status
  from public.warranties w
  where w.verify_token = p_verify_token
    and w.archived_at is null
  limit 1;
$$;

grant execute on function public.get_warranty_public_summary(uuid) to anon, authenticated;

create or replace function public.generate_warranty_number()
returns text
language sql
as $$
  select 'WR-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.warranty_number_seq')::text, 6, '0');
$$;

create or replace function public.generate_service_case_number()
returns text
language sql
as $$
  select 'SC-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.service_case_number_seq')::text, 6, '0');
$$;

create or replace function public.sync_warranty_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.warranty_number, '') = '' then
    new.warranty_number := public.generate_warranty_number();
  end if;

  if new.verify_token is null then
    new.verify_token := gen_random_uuid();
  end if;

  new.warranty_end := (new.warranty_start + make_interval(months => new.warranty_months))::date;

  if new.status not in ('void', 'replaced') then
    if new.warranty_start > current_date then
      new.status := 'pending';
    elsif new.warranty_end < current_date then
      new.status := 'expired';
    else
      new.status := 'active';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_service_case_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.case_number, '') = '' then
    new.case_number := public.generate_service_case_number();
  end if;

  if new.closed_at is not null and new.outcome is null then
    new.outcome := 'repaired';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_warranties_fields on public.warranties;
create trigger set_warranties_fields
before insert or update on public.warranties
for each row execute procedure public.sync_warranty_fields();

drop trigger if exists set_service_cases_fields on public.service_cases;
create trigger set_service_cases_fields
before insert or update on public.service_cases
for each row execute procedure public.sync_service_case_fields();

drop policy if exists "warranty_staff_read_warranties" on public.warranties;
create policy "warranty_staff_read_warranties"
on public.warranties
for select
to authenticated
using (public.is_warranty_staff());

drop policy if exists "warranty_staff_insert_warranties" on public.warranties;
create policy "warranty_staff_insert_warranties"
on public.warranties
for insert
to authenticated
with check (
  public.is_warranty_staff()
  and (created_by is null or created_by = auth.uid() or public.is_admin())
);

drop policy if exists "warranty_staff_update_warranties" on public.warranties;
create policy "warranty_staff_update_warranties"
on public.warranties
for update
to authenticated
using (public.is_warranty_staff())
with check (
  public.is_warranty_staff()
  and (created_by is null or created_by = auth.uid() or public.is_admin())
);

drop policy if exists "warranty_admin_delete_warranties" on public.warranties;
create policy "warranty_admin_delete_warranties"
on public.warranties
for delete
to authenticated
using (public.is_admin());

drop policy if exists "warranty_staff_read_service_cases" on public.service_cases;
create policy "warranty_staff_read_service_cases"
on public.service_cases
for select
to authenticated
using (public.is_warranty_staff());

drop policy if exists "warranty_staff_insert_service_cases" on public.service_cases;
create policy "warranty_staff_insert_service_cases"
on public.service_cases
for insert
to authenticated
with check (
  public.is_warranty_staff()
  and (created_by is null or created_by = auth.uid() or public.is_admin())
);

drop policy if exists "warranty_staff_update_service_cases" on public.service_cases;
create policy "warranty_staff_update_service_cases"
on public.service_cases
for update
to authenticated
using (public.is_warranty_staff())
with check (
  public.is_warranty_staff()
  and (created_by is null or created_by = auth.uid() or public.is_admin())
);

drop policy if exists "warranty_admin_delete_service_cases" on public.service_cases;
create policy "warranty_admin_delete_service_cases"
on public.service_cases
for delete
to authenticated
using (public.is_admin());

drop policy if exists "warranty_staff_read_attachments" on public.warranty_attachments;
create policy "warranty_staff_read_attachments"
on public.warranty_attachments
for select
to authenticated
using (public.is_warranty_staff());

drop policy if exists "warranty_staff_insert_attachments" on public.warranty_attachments;
create policy "warranty_staff_insert_attachments"
on public.warranty_attachments
for insert
to authenticated
with check (
  public.is_warranty_staff()
  and (uploaded_by is null or uploaded_by = auth.uid() or public.is_admin())
);

drop policy if exists "warranty_staff_update_attachments" on public.warranty_attachments;
create policy "warranty_staff_update_attachments"
on public.warranty_attachments
for update
to authenticated
using (public.is_warranty_staff())
with check (
  public.is_warranty_staff()
  and (uploaded_by is null or uploaded_by = auth.uid() or public.is_admin())
);

drop policy if exists "warranty_admin_delete_attachments" on public.warranty_attachments;
create policy "warranty_admin_delete_attachments"
on public.warranty_attachments
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'warranty-documents',
  'warranty-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-attachments',
  'service-attachments',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "warranty_documents_staff_insert" on storage.objects;
create policy "warranty_documents_staff_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'warranty-documents'
  and public.is_warranty_staff()
);

drop policy if exists "warranty_documents_staff_select" on storage.objects;
create policy "warranty_documents_staff_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'warranty-documents'
  and public.is_warranty_staff()
);

drop policy if exists "warranty_documents_staff_update" on storage.objects;
create policy "warranty_documents_staff_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'warranty-documents'
  and public.is_warranty_staff()
)
with check (
  bucket_id = 'warranty-documents'
  and public.is_warranty_staff()
);

drop policy if exists "warranty_documents_admin_delete" on storage.objects;
create policy "warranty_documents_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'warranty-documents'
  and public.is_admin()
);

drop policy if exists "service_attachments_staff_insert" on storage.objects;
create policy "service_attachments_staff_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-attachments'
  and public.is_warranty_staff()
);

drop policy if exists "service_attachments_staff_select" on storage.objects;
create policy "service_attachments_staff_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-attachments'
  and public.is_warranty_staff()
);

drop policy if exists "service_attachments_staff_update" on storage.objects;
create policy "service_attachments_staff_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'service-attachments'
  and public.is_warranty_staff()
)
with check (
  bucket_id = 'service-attachments'
  and public.is_warranty_staff()
);

drop policy if exists "service_attachments_admin_delete" on storage.objects;
create policy "service_attachments_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-attachments'
  and public.is_admin()
);
