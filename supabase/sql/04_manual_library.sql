alter table public.academy_items
  add column if not exists file_path text,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text,
  add column if not exists audience text not null default 'all',
  add column if not exists tags text[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'academy_items_audience_check'
  ) then
    alter table public.academy_items
      add constraint academy_items_audience_check
      check (audience in ('all', 'engineer', 'doctor', 'admin'));
  end if;
end $$;

create index if not exists academy_items_type_audience_idx
  on public.academy_items(type, audience, sort_order);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-manuals',
  'service-manuals',
  true,
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

drop policy if exists "service_manuals_public_read" on storage.objects;
create policy "service_manuals_public_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'service-manuals');

drop policy if exists "service_manuals_admin_insert" on storage.objects;
create policy "service_manuals_admin_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'service-manuals' and public.is_admin());

drop policy if exists "service_manuals_admin_update" on storage.objects;
create policy "service_manuals_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'service-manuals' and public.is_admin())
with check (bucket_id = 'service-manuals' and public.is_admin());

drop policy if exists "service_manuals_admin_delete" on storage.objects;
create policy "service_manuals_admin_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'service-manuals' and public.is_admin());
