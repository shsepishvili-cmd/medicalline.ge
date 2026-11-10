-- Communications bridge for Medical Line Georgia.
-- Run only after reviewing the deployment and taking a database backup.
-- The tables are separate from existing contracts, offers and warranty data.

create table if not exists public.communication_contacts (
  id uuid primary key default gen_random_uuid(),
  chatwoot_contact_id bigint not null unique,
  full_name text not null default '',
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  chatwoot_conversation_id bigint,
  chatwoot_message_id bigint,
  contact_id uuid references public.communication_contacts(id) on delete set null,
  content text,
  channel text,
  received_at timestamptz not null default now()
);

create index if not exists communication_contacts_phone_idx
  on public.communication_contacts(phone) where phone is not null;
create index if not exists communication_events_conversation_idx
  on public.communication_events(chatwoot_conversation_id, received_at desc);
create index if not exists communication_events_contact_idx
  on public.communication_events(contact_id, received_at desc);

alter table public.communication_contacts enable row level security;
alter table public.communication_events enable row level security;

-- No public access, no direct client writes. Webhook ingestion uses the server-side service role.
revoke all on public.communication_contacts from anon, authenticated;
revoke all on public.communication_events from anon, authenticated;
grant select on public.communication_contacts to authenticated;
grant select on public.communication_events to authenticated;

drop policy if exists "Communication contacts: active admins read" on public.communication_contacts;
create policy "Communication contacts: active admins read"
on public.communication_contacts for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
  )
);

drop policy if exists "Communication events: active admins read" on public.communication_events;
create policy "Communication events: active admins read"
on public.communication_events for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'active'
  )
);

comment on table public.communication_contacts is 'CRM contacts imported from signed Chatwoot webhooks';
comment on table public.communication_events is 'Deduplicated communication activity imported from signed Chatwoot webhooks';
