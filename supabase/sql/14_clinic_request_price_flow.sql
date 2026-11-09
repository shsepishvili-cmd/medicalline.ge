-- Keeps clinic product requests linked to real product rows.
-- Run after 01_core.sql in Supabase.

create or replace function public.create_clinic_product_request(
  p_product_slug text,
  p_product_name text,
  p_category_slug text,
  p_brand text,
  p_short_desc text,
  p_specs jsonb,
  p_images text[],
  p_sort_order int,
  p_type text,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product_id uuid;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_type not in ('price', 'demo', 'service', 'info') then
    raise exception 'Invalid request type';
  end if;

  if nullif(trim(coalesce(p_product_slug, '')), '') is not null
     and nullif(trim(coalesce(p_product_name, '')), '') is not null then
    insert into public.products (
      slug,
      name,
      category_slug,
      brand,
      short_desc,
      specs,
      images,
      is_active,
      sort_order
    )
    values (
      trim(p_product_slug),
      trim(p_product_name),
      coalesce(nullif(trim(p_category_slug), ''), 'other'),
      coalesce(nullif(trim(p_brand), ''), 'Eighteeth'),
      nullif(trim(p_short_desc), ''),
      coalesce(p_specs, '{}'::jsonb),
      coalesce(p_images, '{}'::text[]),
      true,
      coalesce(p_sort_order, 999)
    )
    on conflict (slug) do update
    set
      name = excluded.name,
      category_slug = excluded.category_slug,
      brand = coalesce(excluded.brand, public.products.brand),
      short_desc = coalesce(excluded.short_desc, public.products.short_desc),
      specs = case
        when excluded.specs = '{}'::jsonb then public.products.specs
        else excluded.specs
      end,
      images = case
        when array_length(excluded.images, 1) is null then public.products.images
        else excluded.images
      end,
      is_active = true,
      sort_order = coalesce(excluded.sort_order, public.products.sort_order),
      updated_at = now()
    returning id into v_product_id;
  end if;

  insert into public.requests (user_id, product_id, type, message)
  values (v_user_id, v_product_id, p_type, nullif(trim(coalesce(p_message, '')), ''))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_clinic_product_request(text, text, text, text, text, jsonb, text[], int, text, text) from public;
grant execute on function public.create_clinic_product_request(text, text, text, text, text, jsonb, text[], int, text, text) to authenticated;
