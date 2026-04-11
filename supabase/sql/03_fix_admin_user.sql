-- =========================================
-- 03_fix_admin_user.sql
-- Promote existing user to admin
-- Run after 01_core.sql (and after user registers)
-- =========================================

-- Replace with your real admin email
do $$
declare
  v_user_id uuid;
begin
  select id
  into v_user_id
  from auth.users
  where email = 'admin@medicalline.ge'
  limit 1;

  if v_user_id is null then
    raise exception 'User with email % not found in auth.users', 'admin@medicalline.ge';
  end if;

  insert into public.profiles (
    id, full_name, clinic_name, city, phone, role, status
  )
  values (
    v_user_id, 'Admin', 'Medical Line', 'Tbilisi', '-', 'admin', 'active'
  )
  on conflict (id) do update
  set role = 'admin',
      status = 'active',
      updated_at = now();
end $$;

-- Optional check
select u.email, p.id, p.role, p.status
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'admin@medicalline.ge';
