create extension if not exists pgcrypto;

create table if not exists public.invoice_acceptance_acts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.invoices(id) on delete cascade,
  act_number text not null unique,
  act_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'cancelled')),
  public_token uuid not null unique default gen_random_uuid(),
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer not null default 0 check (otp_attempts between 0 and 10),
  pdf_path text,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  accepted_phone text,
  accepted_email text,
  acceptance_ip text,
  acceptance_user_agent text,
  sms_sent boolean not null default false,
  sms_provider text,
  sms_message_id text,
  email_sent boolean not null default false,
  email_provider text,
  email_message_id text,
  last_delivery_error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_acceptance_acts_public_token_idx
  on public.invoice_acceptance_acts(public_token);
create index if not exists invoice_acceptance_acts_status_idx
  on public.invoice_acceptance_acts(status, created_at desc);

alter table public.invoice_acceptance_acts enable row level security;

drop policy if exists invoice_acceptance_acts_admin on public.invoice_acceptance_acts;
create policy invoice_acceptance_acts_admin on public.invoice_acceptance_acts for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create or replace function public.set_invoice_acceptance_act_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_invoice_acceptance_act_updated_at on public.invoice_acceptance_acts;
create trigger set_invoice_acceptance_act_updated_at
before update on public.invoice_acceptance_acts
for each row execute function public.set_invoice_acceptance_act_updated_at();
