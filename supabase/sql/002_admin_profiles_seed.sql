insert into public.admin_profiles (id, email, full_name, role, is_active)
select
  u.id,
  u.email,
  case
    when u.email = 'superadmin@iplarena.in' then 'Super Admin'
    when u.email = 'auctioneer1@iplarena.in' then 'Auctioneer One'
    when u.email = 'auctioneer2@iplarena.in' then 'Auctioneer Two'
    when u.email = 'auctioneer3@iplarena.in' then 'Auctioneer Three'
    else 'Auction Admin'
  end as full_name,
  case
    when u.email = 'superadmin@iplarena.in' then 'super_admin'
    else 'auction_admin'
  end as role,
  true
from auth.users u
where u.email in (
  'auctioneer1@iplarena.in',
  'auctioneer2@iplarena.in',
  'auctioneer3@iplarena.in',
  'superadmin@iplarena.in'
)
on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      is_active = excluded.is_active;
