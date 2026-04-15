begin;

create extension if not exists pgcrypto;

create table if not exists public.franchises (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  city text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (code in ('CSK','MI','RCB','KKR','SRH','RR','PBKS','DC','LSG','GT'))
);

create table if not exists public.franchise_accounts (
  id uuid primary key default gen_random_uuid(),
  franchise_id bigint not null references public.franchises(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'auction_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.franchises (code, name, city) values
  ('CSK','Chennai Super Kings','Chennai'),
  ('MI','Mumbai Indians','Mumbai'),
  ('RCB','Royal Challengers Bengaluru','Bengaluru'),
  ('KKR','Kolkata Knight Riders','Kolkata'),
  ('SRH','Sunrisers Hyderabad','Hyderabad'),
  ('RR','Rajasthan Royals','Jaipur'),
  ('PBKS','Punjab Kings','Mullanpur'),
  ('DC','Delhi Capitals','Delhi'),
  ('LSG','Lucknow Super Giants','Lucknow'),
  ('GT','Gujarat Titans','Ahmedabad')
on conflict (code) do update
  set name = excluded.name,
      city = excluded.city,
      is_active = true;

insert into public.franchise_accounts (franchise_id, username, password_hash)
select f.id, v.username, crypt(v.password_plain, gen_salt('bf'))
from (
  values
    ('CSK','csk.team','CSK@2026'),
    ('MI','mi.team','MI@2026'),
    ('RCB','rcb.team','RCB@2026'),
    ('KKR','kkr.team','KKR@2026'),
    ('SRH','srh.team','SRH@2026'),
    ('RR','rr.team','RR@2026'),
    ('PBKS','pbks.team','PBKS@2026'),
    ('DC','dc.team','DC@2026'),
    ('LSG','lsg.team','LSG@2026'),
    ('GT','gt.team','GT@2026')
) as v(code, username, password_plain)
join public.franchises f on f.code = v.code
on conflict (username) do update
  set password_hash = excluded.password_hash,
      is_active = true;

create or replace function public.verify_franchise_login(
  p_team_code text,
  p_username text,
  p_password text
)
returns table (
  success boolean,
  franchise_code text,
  franchise_name text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select
    f.code as code,
    f.name as name,
    fa.password_hash as password_hash
  into v_row
  from public.franchise_accounts fa
  join public.franchises f on f.id = fa.franchise_id
  where upper(f.code) = upper(p_team_code)
    and fa.username = p_username
    and fa.is_active = true
    and f.is_active = true;

  if not found then
    return query select false, null::text, null::text, 'Invalid team or username';
    return;
  end if;

  if v_row.password_hash = crypt(p_password, v_row.password_hash) then
    return query select true, v_row.code, v_row.name, 'Login successful';
  else
    return query select false, null::text, null::text, 'Incorrect password';
  end if;
end;
$$;

alter table public.franchises enable row level security;
alter table public.franchise_accounts enable row level security;
alter table public.admin_profiles enable row level security;

revoke all on public.franchises from anon, authenticated;
revoke all on public.franchise_accounts from anon, authenticated;

grant execute on function public.verify_franchise_login(text, text, text) to anon, authenticated;

commit;
