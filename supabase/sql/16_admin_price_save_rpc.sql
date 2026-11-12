create or replace function public.admin_set_product_price(
  p_product_id uuid,
  p_price_gel numeric,
  p_installment_months int default 12,
  p_note text default 'განვადება Credo-ს გავლით'
)
returns public.prices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price public.prices;
  v_months int := greatest(coalesce(p_installment_months, 12), 1);
begin
  if not public.is_admin() then
    raise exception 'Only admin can update product prices.';
  end if;

  if p_product_id is null then
    raise exception 'Product id is required.';
  end if;

  if p_price_gel is null or p_price_gel < 0 then
    raise exception 'Price must be a positive number.';
  end if;

  insert into public.prices (
    product_id,
    price_gel,
    installment_monthly,
    installment_months,
    note,
    updated_at
  )
  values (
    p_product_id,
    p_price_gel,
    round(p_price_gel / v_months, 2),
    v_months,
    p_note,
    now()
  )
  on conflict (product_id)
  do update set
    price_gel = excluded.price_gel,
    installment_monthly = excluded.installment_monthly,
    installment_months = excluded.installment_months,
    note = excluded.note,
    updated_at = now()
  returning * into v_price;

  update public.requests
  set status = 'done'
  where product_id = p_product_id
    and type = 'price'
    and status in ('new', 'inprogress');

  return v_price;
end;
$$;

grant execute on function public.admin_set_product_price(uuid, numeric, int, text) to authenticated;
