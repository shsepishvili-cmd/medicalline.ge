-- Incremental patch for environments where migration 25 was applied before
-- warranty and legal-consent fields were added.

alter table public.offers add column if not exists warranty_terms text;
alter table public.offers add column if not exists offer_terms_accepted_at timestamptz;
alter table public.offers add column if not exists delivery_policy_accepted_at timestamptz;
alter table public.offers add column if not exists privacy_terms_accepted_at timestamptz;

-- Move legacy quick price requests into the new admin workflow. Reusing the
-- legacy UUID makes this safe to run repeatedly.
insert into public.special_price_requests (
  id, user_id, product_id, quantity, purchase_timeline,
  preferred_payment_method, note, status, admin_note,
  doctor_name_snapshot, clinic_name_snapshot, city_snapshot,
  phone_snapshot, email_snapshot, created_at, updated_at
)
select
  r.id, r.user_id, r.product_id, 1, 'now',
  'advance_and_balance', r.message,
  case r.status
    when 'new' then 'received'
    when 'inprogress' then 'reviewing'
    when 'done' then 'offer_received'
    else 'cancelled'
  end,
  r.admin_note,
  coalesce(p.full_name, ''), coalesce(p.clinic_name, ''), coalesce(p.city, ''),
  coalesce(p.phone, ''), coalesce(u.email, ''),
  coalesce(r.created_at, now()), coalesce(r.updated_at, now())
from public.requests r
join public.profiles p on p.id = r.user_id
left join auth.users u on u.id = r.user_id
where r.type = 'price' and r.user_id is not null and r.product_id is not null
on conflict (id) do nothing;

create unique index if not exists payment_transactions_one_active_per_schedule
  on public.payment_transactions(payment_schedule_id)
  where status in ('initiated', 'pending', 'succeeded');

drop function if exists public.accept_clinic_offer(uuid);
drop function if exists public.accept_clinic_offer(uuid, boolean, boolean, boolean);

create function public.accept_clinic_offer(
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
    status = 'accepted', accepted_at = now(),
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
