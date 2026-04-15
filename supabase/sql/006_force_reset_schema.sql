-- Force-reset migration: Drop ALL dependent objects, then recreate cleanly
-- This handles the case where tables exist with incomplete schemas

begin;

-- Drop all policies first (they prevent table drops)
drop policy if exists "anon_can_read_teams" on public.teams;
drop policy if exists "admin_can_manage_teams" on public.teams;
drop policy if exists "anon_can_read_all_players" on public.players;
drop policy if exists "admin_can_manage_players" on public.players;
drop policy if exists "anon_can_read_auction_state" on public.auction_state;
drop policy if exists "admin_can_manage_auction_state" on public.auction_state;
drop policy if exists "anon_can_read_unassigned_players" on public.players;

-- Drop all functions that depend on these tables
drop function if exists public.update_auction_state(uuid, integer, text) cascade;
drop function if exists public.release_player_from_franchise(uuid) cascade;
drop function if exists public.lock_player_to_franchise(uuid, text, integer) cascade;
drop function if exists public.advance_auction_state() cascade;
drop function if exists public.get_next_available_player_id(uuid) cascade;
drop function if exists public.is_admin_user() cascade;

-- Drop tables (with cascade to get any triggers/constraints)
drop table if exists public.auction_state cascade;
drop table if exists public.players cascade;
drop table if exists public.teams cascade;

-- Now create fresh tables
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  franchise_code text not null unique references public.franchises(code) on delete cascade,
  name text not null,
  city text not null,
  purse_lakhs integer not null default 1000,
  spent_lakhs integer not null default 0,
  roster_count integer not null default 0,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  sl_no integer not null unique,
  name text not null,
  role text not null,
  category text not null,
  country text not null,
  teams text not null default '',
  image_url text not null default '',
  base_price_lakhs integer not null default 0,
  credit_points integer not null default 0,
  matches_played integer not null default 0,
  total_runs integer not null default 0,
  batting_average numeric(10, 2) not null default 0,
  strike_rate numeric(10, 2) not null default 0,
  best_bowling text not null default '0',
  bowling_average numeric(10, 2) not null default 0,
  wickets_taken integer not null default 0,
  economy numeric(10, 2) not null default 0,
  current_bid_lakhs integer not null default 0,
  last_bidder_code text references public.franchises(code) on delete set null,
  assigned_franchise_code text references public.franchises(code) on delete set null,
  auction_status text not null default 'unsold' check (auction_status in ('unsold', 'bidding', 'sold')),
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.auction_state (
  id uuid primary key default gen_random_uuid(),
  current_player_id uuid references public.players(id) on delete set null,
  current_bid_lakhs integer not null default 0,
  current_winning_franchise_code text references public.franchises(code) on delete set null,
  current_winning_bid_lakhs integer not null default 0,
  status text not null default 'idle' check (status in ('idle', 'bidding', 'sold', 'unsold', 'stopped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed teams from franchises
insert into public.teams (franchise_code, name, city)
select code, name, city
from public.franchises
on conflict (franchise_code) do update
  set name = excluded.name,
      city = excluded.city,
      updated_at = now();

-- Initialize auction_state (single row)
insert into public.auction_state (current_player_id, current_bid_lakhs, current_winning_franchise_code, current_winning_bid_lakhs, status)
select null, 0, null, 0, 'idle'
where not exists (select 1 from public.auction_state);

-- Create helper functions
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.id = auth.uid()
      and ap.is_active = true
  );
$$;

create or replace function public.get_next_available_player_id(p_after_player_id uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with current_player as (
    select coalesce(
      (select sl_no from public.players where id = p_after_player_id),
      0
    ) as current_sl_no
  )
  select p.id
  from public.players p, current_player cp
  where p.assigned_franchise_code is null
    and p.sl_no > cp.current_sl_no
  order by p.sl_no asc
  limit 1;
$$;

create or replace function public.advance_auction_state()
returns public.auction_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.auction_state;
  v_next_player_id uuid;
begin
  select * into v_state from public.auction_state order by created_at asc limit 1;

  v_next_player_id := public.get_next_available_player_id(v_state.current_player_id);

  if v_next_player_id is null then
    v_next_player_id := (
      select p.id
      from public.players p
      where p.assigned_franchise_code is null
      order by p.sl_no asc
      limit 1
    );
  end if;

  if v_state.id is null then
    insert into public.auction_state (current_player_id, current_bid_lakhs, current_winning_franchise_code, current_winning_bid_lakhs, status)
    values (v_next_player_id, 0, null, 0, 'idle')
    returning * into v_state;
  else
    update public.auction_state
      set current_player_id = v_next_player_id,
          current_bid_lakhs = 0,
          current_winning_franchise_code = null,
          current_winning_bid_lakhs = 0,
          updated_at = now()
      returning * into v_state;
  end if;

  return v_state;
end;
$$;

create or replace function public.lock_player_to_franchise(
  p_player_id uuid,
  p_franchise_code text,
  p_bid_lakhs integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_current_spent integer;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can lock players';
  end if;

  update public.players
    set assigned_franchise_code = p_franchise_code,
        auction_status = 'sold',
        current_bid_lakhs = p_bid_lakhs,
        assigned_at = now(),
        updated_at = now()
    where id = p_player_id;

  select id, spent_lakhs into v_team_id, v_current_spent
    from public.teams
    where franchise_code = p_franchise_code;

  if v_team_id is null then
    raise exception 'Franchise not found: %', p_franchise_code;
  end if;

  update public.teams
    set spent_lakhs = v_current_spent + p_bid_lakhs,
        roster_count = roster_count + 1,
        updated_at = now()
    where franchise_code = p_franchise_code;

  perform public.advance_auction_state();

  return true;
end;
$$;

create or replace function public.release_player_from_franchise(p_player_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_franchise_code text;
  v_bid_amount integer;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can release players';
  end if;

  select assigned_franchise_code, current_bid_lakhs
    into v_franchise_code, v_bid_amount
    from public.players
    where id = p_player_id;

  if v_franchise_code is null then
    raise exception 'Player not assigned to any franchise';
  end if;

  update public.players
    set assigned_franchise_code = null,
        auction_status = 'unsold',
        current_bid_lakhs = 0,
        assigned_at = null,
        updated_at = now()
    where id = p_player_id;

  update public.teams
    set spent_lakhs = spent_lakhs - v_bid_amount,
        roster_count = roster_count - 1,
        updated_at = now()
    where franchise_code = v_franchise_code;

  return true;
end;
$$;

create or replace function public.update_auction_state(
  p_player_id uuid default null,
  p_bid_lakhs integer default 0,
  p_status text default null
)
returns public.auction_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.auction_state;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can update auction state';
  end if;

  select * into v_state from public.auction_state limit 1;

  if v_state.id is null then
    insert into public.auction_state (current_player_id, current_bid_lakhs, status)
    values (p_player_id, p_bid_lakhs, coalesce(p_status, 'idle'))
    returning * into v_state;
  else
    update public.auction_state
      set current_player_id = coalesce(p_player_id, current_player_id),
          current_bid_lakhs = coalesce(p_bid_lakhs, current_bid_lakhs),
          status = coalesce(p_status, status),
          updated_at = now()
      returning * into v_state;
  end if;

  return v_state;
end;
$$;

-- Enable RLS on tables
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.auction_state enable row level security;

-- RLS Policies for teams table
create policy "anon_can_read_teams"
  on public.teams
  for select
  to anon, authenticated
  using (true);

create policy "admin_can_manage_teams"
  on public.teams
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- RLS Policies for players table
create policy "anon_can_read_all_players"
  on public.players
  for select
  to anon, authenticated
  using (true);

create policy "admin_can_manage_players"
  on public.players
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- RLS Policies for auction_state table
create policy "anon_can_read_auction_state"
  on public.auction_state
  for select
  to anon, authenticated
  using (true);

create policy "admin_can_manage_auction_state"
  on public.auction_state
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

commit;
