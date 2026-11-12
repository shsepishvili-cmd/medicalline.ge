create table if not exists public.cart_invoice_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  clinic_name text not null,
  city text not null,
  phone text not null,
  email text not null,
  tax_id text,
  comment text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'invoice_sent', 'closed', 'cancelled')),
  otp_verified_at timestamptz,
  ip_address text,
  user_agent text,
  source text not null default 'catalog_cart'
);

create table if not exists public.cart_invoice_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cart_invoice_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  product_slug text not null,
  product_name text not null,
  product_category text,
  product_brand text,
  product_image text,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 99),
  sort_order integer not null default 0
);

create index if not exists cart_invoice_requests_created_at_idx on public.cart_invoice_requests(created_at desc);
create index if not exists cart_invoice_requests_status_idx on public.cart_invoice_requests(status);
create index if not exists cart_invoice_requests_phone_idx on public.cart_invoice_requests(phone);
create index if not exists cart_invoice_request_items_request_id_idx on public.cart_invoice_request_items(request_id);

alter table public.cart_invoice_requests enable row level security;
alter table public.cart_invoice_request_items enable row level security;

drop policy if exists "admin_all_cart_invoice_requests" on public.cart_invoice_requests;
create policy "admin_all_cart_invoice_requests"
on public.cart_invoice_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_all_cart_invoice_request_items" on public.cart_invoice_request_items;
create policy "admin_all_cart_invoice_request_items"
on public.cart_invoice_request_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
