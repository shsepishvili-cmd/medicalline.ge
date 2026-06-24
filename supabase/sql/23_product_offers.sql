create table if not exists public.product_offers (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  product_name text not null,
  product_category text,
  product_brand text,
  product_description text,
  product_image text,
  product_specs jsonb not null default '[]'::jsonb,
  client_name text,
  client_phone text,
  price_gel numeric(12,2),
  installment_monthly numeric(12,2),
  installment_months integer default 12,
  warranty_note text,
  delivery_note text,
  custom_note text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'expired', 'archived')),
  views_count integer not null default 0,
  last_viewed_at timestamptz,
  sms_sent_at timestamptz,
  sms_provider text,
  sms_message_id text,
  credo_order_code text,
  credo_redirect_url text,
  credo_requested_at timestamptz,
  credo_status_id integer,
  credo_status_name text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_offers_created_at_idx on public.product_offers(created_at desc);
create index if not exists product_offers_token_idx on public.product_offers(token);
create index if not exists product_offers_status_idx on public.product_offers(status);

alter table public.product_offers add column if not exists sms_sent_at timestamptz;
alter table public.product_offers add column if not exists sms_provider text;
alter table public.product_offers add column if not exists sms_message_id text;
alter table public.product_offers add column if not exists credo_order_code text;
alter table public.product_offers add column if not exists credo_redirect_url text;
alter table public.product_offers add column if not exists credo_requested_at timestamptz;
alter table public.product_offers add column if not exists credo_status_id integer;
alter table public.product_offers add column if not exists credo_status_name text;

alter table public.product_offers enable row level security;

drop policy if exists "Admins can manage product offers" on public.product_offers;
create policy "Admins can manage product offers"
on public.product_offers
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.status, 'active') = 'active'
  )
);

drop policy if exists "Public can read active product offers by token" on public.product_offers;
create policy "Public can read active product offers by token"
on public.product_offers
for select
using (
  status in ('sent', 'viewed', 'accepted')
  and (expires_at is null or expires_at > now())
);

create or replace function public.touch_product_offer_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_offers_updated_at on public.product_offers;
create trigger trg_product_offers_updated_at
before update on public.product_offers
for each row execute function public.touch_product_offer_updated_at();
