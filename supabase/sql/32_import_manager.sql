-- Medical Line Georgia / ORIS Import Manager
-- Apply in Supabase SQL editor AFTER the existing admin profile/RLS migrations.
-- Stores structured documents and calculations; NEVER writes to the legacy ORIS database.
create extension if not exists pgcrypto;

create table if not exists public.oris_import_cards (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  supplier_name text not null,
  status text not null default 'draft' check (status in ('draft','review','approved')),
  payload jsonb not null,
  calculation jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oris_import_attachments (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.oris_import_cards(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  document_kind text not null default 'other',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.oris_import_audit (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.oris_import_cards(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  old_version integer,
  new_version integer,
  event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oris_import_cards_updated_idx on public.oris_import_cards(updated_at desc);
create index if not exists oris_import_attach_import_idx on public.oris_import_attachments(import_id);
create index if not exists oris_import_audit_import_idx on public.oris_import_audit(import_id,created_at desc);

alter table public.oris_import_cards enable row level security;
alter table public.oris_import_attachments enable row level security;
alter table public.oris_import_audit enable row level security;

drop policy if exists oris_import_cards_admin on public.oris_import_cards;
create policy oris_import_cards_admin on public.oris_import_cards for all to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists oris_import_attach_admin on public.oris_import_attachments;
create policy oris_import_attach_admin on public.oris_import_attachments for all to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists oris_import_audit_admin on public.oris_import_audit;
create policy oris_import_audit_admin on public.oris_import_audit for select to authenticated
  using (public.is_active_admin());
-- Audit writes only from authenticated admin API through session-backed client.
drop policy if exists oris_import_audit_insert on public.oris_import_audit;
create policy oris_import_audit_insert on public.oris_import_audit for insert to authenticated
  with check (public.is_active_admin() and actor_id=auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('oris-import-documents','oris-import-documents',false,20971520,
  array['application/pdf','image/png','image/jpeg','text/csv','application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists oris_import_storage_admin on storage.objects;
create policy oris_import_storage_admin on storage.objects for all to authenticated
 using (bucket_id='oris-import-documents' and public.is_active_admin())
 with check (bucket_id='oris-import-documents' and public.is_active_admin());

create table if not exists public.oris_import_accounts (
  account text primary key,
  name text not null,
  kind text not null check (kind in ('product','supplier')),
  unit text,
  gross_weight_kg numeric(18,4),
  source text not null default 'oris',
  updated_at timestamptz not null default now()
);
alter table public.oris_import_accounts enable row level security;
drop policy if exists oris_import_accounts_admin on public.oris_import_accounts;
create policy oris_import_accounts_admin on public.oris_import_accounts for all to authenticated
 using (public.is_active_admin()) with check (public.is_active_admin());
create index if not exists oris_import_account_kind_idx on public.oris_import_accounts(kind);

-- Explicit Data API privileges. Anonymous users get no table access; RLS then
-- limits every authenticated operation to active administrators.
revoke all on table public.oris_import_cards from anon;
revoke all on table public.oris_import_attachments from anon;
revoke all on table public.oris_import_audit from anon;
revoke all on table public.oris_import_accounts from anon;

grant select,insert,update on table public.oris_import_cards to authenticated;
grant select,insert on table public.oris_import_attachments to authenticated;
grant select,insert on table public.oris_import_audit to authenticated;
grant select,insert,update on table public.oris_import_accounts to authenticated;
grant usage,select on sequence public.oris_import_audit_id_seq to authenticated;

notify pgrst, 'reload schema';
