-- Medical Line Doctor / Clinic Portal
-- Safe, additive migration. Existing requests and product_offers remain unchanged.

create extension if not exists pgcrypto;

create table if not exists public.special_price_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  purchase_timeline text not null check (purchase_timeline in ('now', 'within_1_month', 'within_1_3_months', 'later')),
  preferred_payment_method text not null check (preferred_payment_method in ('full', 'bank_installment', 'medical_line_installment', 'advance_and_balance')),
  note text,
  status text not null default 'received' check (status in ('received', 'reviewing', 'offer_ready', 'offer_received', 'cancelled', 'expired')),
  admin_note text,
  doctor_name_snapshot text not null default '',
  clinic_name_snapshot text not null default '',
  city_snapshot text not null default '',
  phone_snapshot text not null default '',
  email_snapshot text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.special_price_requests(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  clinic_name_snapshot text not null default '',
  offer_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'partially_paid', 'paid', 'expired', 'cancelled')),
  currency text not null default 'GEL' check (currency in ('GEL', 'USD', 'EUR')),
  subtotal_amount numeric(14,2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  advance_amount numeric(14,2) not null default 0 check (advance_amount >= 0),
  vat_included boolean not null default true,
  valid_until date,
  payment_terms text,
  delivery_terms text,
  warranty_terms text,
  notes text,
  internal_note text,
  accepted_at timestamptz,
  accepted_ip inet,
  offer_terms_accepted_at timestamptz,
  delivery_policy_accepted_at timestamptz,
  privacy_terms_accepted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= subtotal_amount),
  check (advance_amount <= total_amount)
);

alter table public.offers add column if not exists warranty_terms text;
alter table public.offers add column if not exists offer_terms_accepted_at timestamptz;
alter table public.offers add column if not exists delivery_policy_accepted_at timestamptz;
alter table public.offers add column if not exists privacy_terms_accepted_at timestamptz;

create table if not exists public.offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text,
  product_image_snapshot text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  total_price numeric(14,2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  title text not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'available', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, installment_number)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete restrict,
  payment_schedule_id uuid not null references public.payment_schedules(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'GEL',
  provider text not null,
  provider_order_id text,
  provider_transaction_id text,
  status text not null default 'initiated' check (status in ('initiated', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists special_price_requests_user_idx on public.special_price_requests(user_id, created_at desc);
create index if not exists special_price_requests_admin_idx on public.special_price_requests(status, created_at desc);
create index if not exists special_price_requests_product_idx on public.special_price_requests(product_id);
create index if not exists offers_user_idx on public.offers(user_id, created_at desc);
create index if not exists offers_status_idx on public.offers(status, valid_until);
create index if not exists offers_request_idx on public.offers(request_id);
create index if not exists offer_items_offer_idx on public.offer_items(offer_id);
create index if not exists payment_schedules_offer_idx on public.payment_schedules(offer_id, installment_number);
create index if not exists payment_schedules_due_idx on public.payment_schedules(status, due_date);
create index if not exists payment_transactions_user_idx on public.payment_transactions(user_id, created_at desc);
create index if not exists payment_transactions_offer_idx on public.payment_transactions(offer_id, created_at desc);
create unique index if not exists payment_transactions_provider_order_uidx
  on public.payment_transactions(provider, provider_order_id)
  where provider_order_id is not null;
create unique index if not exists payment_transactions_provider_tx_uidx
  on public.payment_transactions(provider, provider_transaction_id)
  where provider_transaction_id is not null;
create unique index if not exists payment_transactions_one_active_per_schedule
  on public.payment_transactions(payment_schedule_id)
  where status in ('initiated', 'pending', 'succeeded');

create or replace function public.clinic_portal_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_special_price_requests_updated on public.special_price_requests;
create trigger trg_special_price_requests_updated before update on public.special_price_requests
for each row execute function public.clinic_portal_touch_updated_at();
drop trigger if exists trg_offers_updated on public.offers;
create trigger trg_offers_updated before update on public.offers
for each row execute function public.clinic_portal_touch_updated_at();
drop trigger if exists trg_payment_schedules_updated on public.payment_schedules;
create trigger trg_payment_schedules_updated before update on public.payment_schedules
for each row execute function public.clinic_portal_touch_updated_at();
drop trigger if exists trg_payment_transactions_updated on public.payment_transactions;
create trigger trg_payment_transactions_updated before update on public.payment_transactions
for each row execute function public.clinic_portal_touch_updated_at();

alter table public.special_price_requests enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.payment_schedules enable row level security;
alter table public.payment_transactions enable row level security;

-- Provider payloads may contain operational metadata. Doctors can read transaction
-- status fields, but never the raw provider response directly from PostgREST.
revoke select on table public.payment_transactions from authenticated;
grant select (
  id, offer_id, payment_schedule_id, user_id, amount, currency, provider,
  provider_order_id, provider_transaction_id, status, created_at, updated_at
) on public.payment_transactions to authenticated;
grant select on table public.payment_transactions to service_role;

drop policy if exists "clinic users read own special requests" on public.special_price_requests;
create policy "clinic users read own special requests" on public.special_price_requests
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "clinic users create own special requests" on public.special_price_requests;
create policy "clinic users create own special requests" on public.special_price_requests
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admins manage special requests" on public.special_price_requests;
create policy "admins manage special requests" on public.special_price_requests
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clinic users read own offers" on public.offers;
create policy "clinic users read own offers" on public.offers
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admins manage clinic offers" on public.offers;
create policy "admins manage clinic offers" on public.offers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clinic users read own offer items" on public.offer_items;
create policy "clinic users read own offer items" on public.offer_items
for select to authenticated using (
  exists (select 1 from public.offers o where o.id = offer_id and (o.user_id = auth.uid() or public.is_admin()))
);
drop policy if exists "admins manage offer items" on public.offer_items;
create policy "admins manage offer items" on public.offer_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clinic users read own schedules" on public.payment_schedules;
create policy "clinic users read own schedules" on public.payment_schedules
for select to authenticated using (
  exists (select 1 from public.offers o where o.id = offer_id and (o.user_id = auth.uid() or public.is_admin()))
);
drop policy if exists "admins manage schedules" on public.payment_schedules;
create policy "admins manage schedules" on public.payment_schedules
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clinic users read own transactions" on public.payment_transactions;
create policy "clinic users read own transactions" on public.payment_transactions
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "clinic users initiate own transactions" on public.payment_transactions;
create policy "clinic users initiate own transactions" on public.payment_transactions
for insert to authenticated with check (user_id = auth.uid() and status = 'initiated');
drop policy if exists "admins manage transactions" on public.payment_transactions;
create policy "admins manage transactions" on public.payment_transactions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_special_price_request(
  p_product_id uuid,
  p_quantity integer,
  p_purchase_timeline text,
  p_preferred_payment_method text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Invalid quantity'; end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or coalesce(v_profile.status, 'pending') <> 'active' then
    raise exception 'Active clinic profile required';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active = true) then
    raise exception 'Product not found';
  end if;

  insert into public.special_price_requests (
    user_id, product_id, quantity, purchase_timeline, preferred_payment_method, note,
    doctor_name_snapshot, clinic_name_snapshot, city_snapshot, phone_snapshot, email_snapshot
  ) values (
    v_user_id, p_product_id, p_quantity, p_purchase_timeline, p_preferred_payment_method,
    nullif(trim(coalesce(p_note, '')), ''), v_profile.full_name, v_profile.clinic_name,
    v_profile.city, v_profile.phone, coalesce(auth.jwt()->>'email', '')
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;
revoke all on function public.submit_special_price_request(uuid, integer, text, text, text) from public;
grant execute on function public.submit_special_price_request(uuid, integer, text, text, text) to authenticated;

create or replace function public.mark_clinic_offer_viewed(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.offers set status = 'viewed'
  where id = p_offer_id and user_id = auth.uid() and status = 'sent'
    and (valid_until is null or valid_until >= current_date);
  update public.special_price_requests set status = 'offer_received'
  where id = (select request_id from public.offers where id = p_offer_id and user_id = auth.uid())
    and status = 'offer_ready';
end;
$$;
revoke all on function public.mark_clinic_offer_viewed(uuid) from public;
grant execute on function public.mark_clinic_offer_viewed(uuid) to authenticated;

drop function if exists public.accept_clinic_offer(uuid);
create or replace function public.accept_clinic_offer(
  p_offer_id uuid,
  p_offer_terms boolean,
  p_delivery_policy boolean,
  p_privacy_terms boolean
)
returns public.offers
language plpgsql security definer set search_path = public as $$
declare v_offer public.offers;
begin
  if not coalesce(p_offer_terms, false) or not coalesce(p_delivery_policy, false) or not coalesce(p_privacy_terms, false) then
    raise exception 'All required terms must be accepted';
  end if;
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or v_offer.user_id <> auth.uid() then raise exception 'Offer not found'; end if;
  if v_offer.status not in ('sent', 'viewed') then raise exception 'Offer cannot be accepted'; end if;
  if v_offer.valid_until is not null and v_offer.valid_until < current_date then
    update public.offers set status = 'expired' where id = p_offer_id;
    raise exception 'Offer expired';
  end if;

  update public.offers set
    status = 'accepted',
    accepted_at = now(),
    offer_terms_accepted_at = now(),
    delivery_policy_accepted_at = now(),
    privacy_terms_accepted_at = now()
  where id = p_offer_id returning * into v_offer;
  update public.payment_schedules set status = 'available'
    where offer_id = p_offer_id and installment_number = 1 and status = 'pending';
  return v_offer;
end;
$$;
revoke all on function public.accept_clinic_offer(uuid, boolean, boolean, boolean) from public;
grant execute on function public.accept_clinic_offer(uuid, boolean, boolean, boolean) to authenticated;

create or replace function public.refresh_my_clinic_portal_statuses()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.offers set status = 'expired'
  where user_id = auth.uid() and status in ('sent', 'viewed') and valid_until < current_date;
  update public.special_price_requests r set status = 'expired'
  where r.user_id = auth.uid() and r.status in ('offer_ready', 'offer_received')
    and exists (select 1 from public.offers o where o.request_id = r.id and o.status = 'expired');
  update public.payment_schedules ps set status = 'overdue'
  from public.offers o
  where ps.offer_id = o.id and o.user_id = auth.uid()
    and ps.status = 'available' and ps.due_date < current_date;
end;
$$;
revoke all on function public.refresh_my_clinic_portal_statuses() from public;
grant execute on function public.refresh_my_clinic_portal_statuses() to authenticated;

create or replace function public.complete_clinic_payment(
  p_transaction_id uuid,
  p_provider_transaction_id text,
  p_raw_response jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_transaction public.payment_transactions;
  v_remaining integer;
begin
  select * into v_transaction from public.payment_transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_transaction.status = 'succeeded' then return; end if;
  if exists (
    select 1 from public.payment_transactions
    where provider = v_transaction.provider
      and provider_transaction_id = p_provider_transaction_id
      and id <> p_transaction_id
  ) then raise exception 'Duplicate provider transaction'; end if;

  update public.payment_transactions
    set status = 'succeeded', provider_transaction_id = p_provider_transaction_id, raw_response = coalesce(p_raw_response, '{}'::jsonb)
    where id = p_transaction_id;
  update public.payment_schedules
    set status = 'paid', paid_at = now(), payment_reference = p_provider_transaction_id
    where id = v_transaction.payment_schedule_id and status <> 'paid';

  select count(*) into v_remaining from public.payment_schedules
    where offer_id = v_transaction.offer_id and status not in ('paid', 'cancelled');
  update public.offers set status = case when v_remaining = 0 then 'paid' else 'partially_paid' end
    where id = v_transaction.offer_id;
  update public.payment_schedules set status = 'available'
    where id = (
      select id from public.payment_schedules
      where offer_id = v_transaction.offer_id and status = 'pending'
      order by installment_number limit 1
    );
end;
$$;
revoke all on function public.complete_clinic_payment(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_clinic_payment(uuid, text, jsonb) to service_role;
