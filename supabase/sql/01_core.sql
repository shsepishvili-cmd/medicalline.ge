-- =========================================
-- 01_core.sql
-- Core schema + RLS + triggers/functions
-- Run first in Supabase SQL Editor
-- =========================================

create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  clinic_name text not null default '',
  city text not null default '',
  phone text not null default '',
  role text not null default 'doctor' check (role in ('doctor', 'dealer', 'engineer', 'admin')),
  status text not null default 'active' check (status in ('active', 'pending', 'blocked')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CATEGORIES
create table if not exists public.categories (
  id serial primary key,
  slug text unique not null,
  name_ka text not null,
  sort_order int default 0
);

insert into public.categories (slug, name_ka, sort_order) values
  ('endo', 'ენდოდონტია', 1),
  ('scan', 'ციფრული სკანერები', 2),
  ('radio', 'რადიოლოგია', 3),
  ('optics', 'ოპტიკა', 4),
  ('hygiene', 'ჰიგიენა', 5),
  ('surgery', 'ქირურგია', 6),
  ('other', 'სხვა', 7),
  ('partner', 'პარტნიორი ბრენდები', 8)
on conflict (slug) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

-- PRODUCTS
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  category_slug text references public.categories(slug),
  brand text not null default 'Eighteeth',
  short_desc text,
  specs jsonb default '{}'::jsonb,
  images text[] default '{}'::text[],
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PRICES
create table if not exists public.prices (
  id serial primary key,
  product_id uuid references public.products(id) on delete cascade unique,
  price_gel numeric(10,2) not null,
  price_usd numeric(10,2),
  installment_monthly numeric(10,2),
  installment_months int default 12,
  discount_pct int default 0,
  note text,
  updated_at timestamptz default now()
);

-- REQUESTS
create table if not exists public.requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  type text not null check (type in ('price', 'demo', 'service', 'info')),
  status text not null default 'new' check (status in ('new', 'inprogress', 'done', 'cancelled')),
  message text,
  admin_note text,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- USER DEVICES
create table if not exists public.user_devices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id),
  serial_number text,
  purchase_date date,
  warranty_expires date,
  notes text,
  created_at timestamptz default now()
);

-- SERVICE TICKETS
create table if not exists public.service_tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  device_id uuid references public.user_devices(id) on delete set null,
  product_id uuid references public.products(id),
  serial_number text,
  problem_desc text not null,
  photos text[] default '{}'::text[],
  status text not null default 'new' check (status in ('new', 'assigned', 'inprogress', 'done')),
  engineer_id uuid references public.profiles(id),
  visit_date date,
  resolution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  body text not null,
  target_city text,
  target_role text,
  sent_by uuid references public.profiles(id),
  sent_at timestamptz default now(),
  read_by uuid[] default '{}'::uuid[]
);

-- ACADEMY
create table if not exists public.academy_items (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('video', 'webinar', 'manual')),
  title text not null,
  description text,
  url text,
  thumbnail_url text,
  duration_sec int,
  product_id uuid references public.products(id),
  webinar_date timestamptz,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;
alter table public.requests enable row level security;
alter table public.user_devices enable row level security;
alter table public.service_tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.academy_items enable row level security;

-- DROP OLD POLICIES
drop policy if exists "user_own_profile" on public.profiles;
drop policy if exists "user_insert_own_profile" on public.profiles;
drop policy if exists "user_update_own" on public.profiles;
drop policy if exists "logged_in_read_products" on public.products;
drop policy if exists "admin_manage_products" on public.products;
drop policy if exists "logged_in_read_prices" on public.prices;
drop policy if exists "admin_manage_prices" on public.prices;
drop policy if exists "user_own_requests" on public.requests;
drop policy if exists "user_insert_requests" on public.requests;
drop policy if exists "admin_all_requests" on public.requests;
drop policy if exists "user_own_devices" on public.user_devices;
drop policy if exists "admin_all_devices" on public.user_devices;
drop policy if exists "user_own_tickets" on public.service_tickets;
drop policy if exists "admin_all_tickets" on public.service_tickets;
drop policy if exists "read_notifications" on public.notifications;
drop policy if exists "admin_send_notifications" on public.notifications;
drop policy if exists "read_academy" on public.academy_items;
drop policy if exists "admin_manage_academy" on public.academy_items;

-- ROLE HELPERS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_engineer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('engineer', 'admin')
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_engineer() to authenticated;

-- PROFILES POLICIES
create policy "user_own_profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy "user_insert_own_profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id or public.is_admin());

create policy "user_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- PRODUCTS/PRICES POLICIES
create policy "logged_in_read_products"
on public.products
for select
to authenticated
using (auth.uid() is not null and is_active = true);

create policy "admin_manage_products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "logged_in_read_prices"
on public.prices
for select
to authenticated
using (auth.uid() is not null);

create policy "admin_manage_prices"
on public.prices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- REQUESTS POLICIES
create policy "user_own_requests"
on public.requests
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "user_insert_requests"
on public.requests
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy "admin_all_requests"
on public.requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- DEVICES POLICIES
create policy "user_own_devices"
on public.user_devices
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "admin_all_devices"
on public.user_devices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- TICKETS POLICIES
create policy "user_own_tickets"
on public.service_tickets
for all
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or (public.is_engineer() and engineer_id = auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_admin()
  or (public.is_engineer() and engineer_id = auth.uid())
);

create policy "admin_all_tickets"
on public.service_tickets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- NOTIFICATIONS/ACADEMY POLICIES
create policy "read_notifications"
on public.notifications
for select
to authenticated
using (auth.uid() is not null);

create policy "admin_send_notifications"
on public.notifications
for insert
to authenticated
with check (public.is_admin());

create policy "read_academy"
on public.academy_items
for select
to authenticated
using (auth.uid() is not null and is_active = true);

create policy "admin_manage_academy"
on public.academy_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- TRIGGERS/FUNCTIONS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    clinic_name,
    city,
    phone,
    role,
    status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'clinic_name', ''),
    coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case
      when coalesce(new.raw_user_meta_data->>'role', '') in ('doctor', 'dealer', 'engineer', 'admin')
        then new.raw_user_meta_data->>'role'
      else 'doctor'
    end,
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
drop trigger if exists set_products_updated_at on public.products;
drop trigger if exists set_requests_updated_at on public.requests;
drop trigger if exists set_tickets_updated_at on public.service_tickets;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

create trigger set_requests_updated_at
before update on public.requests
for each row execute procedure public.set_updated_at();

create trigger set_tickets_updated_at
before update on public.service_tickets
for each row execute procedure public.set_updated_at();
