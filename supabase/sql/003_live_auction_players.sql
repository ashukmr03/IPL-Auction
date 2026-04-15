begin;

create extension if not exists pgcrypto;

create table if not exists public.teams (
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

create table if not exists public.players (
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

create table if not exists public.auction_state (
  id uuid primary key default gen_random_uuid(),
  current_player_id uuid references public.players(id) on delete set null,
  current_bid_lakhs integer not null default 0,
  current_winning_franchise_code text references public.franchises(code) on delete set null,
  current_winning_bid_lakhs integer not null default 0,
  status text not null default 'idle' check (status in ('idle', 'bidding', 'sold', 'unsold', 'stopped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.teams (franchise_code, name, city)
select code, name, city
from public.franchises
on conflict (franchise_code) do update
  set name = excluded.name,
      city = excluded.city,
      updated_at = now();

insert into public.auction_state (current_player_id, current_bid_lakhs, current_winning_franchise_code, current_winning_bid_lakhs, status)
select
  (
    select p.id
    from public.players p
    where p.assigned_franchise_code is null
    order by p.sl_no asc
    limit 1
  ),
  0,
  null,
  0,
  'idle'
where not exists (
  select 1 from public.auction_state
);

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
          status = case when v_next_player_id is null then 'stopped' else 'idle' end,
          updated_at = now()
    where id = v_state.id
    returning * into v_state;
  end if;

  return v_state;
end;
$$;

create or replace function public.lock_player_to_franchise(
  p_player_id uuid,
  p_franchise_code text,
  p_bid_lakhs integer default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_final_bid integer;
begin
  if not public.is_admin_user() then
    raise exception 'Unauthorized';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if v_player.id is null then
    raise exception 'Player not found';
  end if;

  if v_player.assigned_franchise_code is not null then
    raise exception 'Player is already assigned';
  end if;

  v_final_bid := coalesce(p_bid_lakhs, v_player.current_bid_lakhs, v_player.base_price_lakhs);

  update public.players
    set assigned_franchise_code = p_franchise_code,
        last_bidder_code = p_franchise_code,
        current_bid_lakhs = v_final_bid,
        auction_status = 'sold',
        assigned_at = now(),
        updated_at = now()
  where id = p_player_id
  returning * into v_player;

  update public.teams
    set roster_count = roster_count + 1,
        spent_lakhs = spent_lakhs + v_final_bid,
        purse_lakhs = greatest(purse_lakhs - v_final_bid, 0),
        updated_at = now()
  where franchise_code = p_franchise_code;

  update public.auction_state
    set current_player_id = public.get_next_available_player_id(p_player_id),
        current_bid_lakhs = 0,
        current_winning_franchise_code = null,
        current_winning_bid_lakhs = 0,
        status = case when public.get_next_available_player_id(p_player_id) is null then 'stopped' else 'idle' end,
        updated_at = now()
  where id = (select id from public.auction_state order by created_at asc limit 1);

  return v_player;
end;
$$;

create or replace function public.release_player_from_franchise(p_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_assigned_franchise_code text;
  v_bid integer;
begin
  if not public.is_admin_user() then
    raise exception 'Unauthorized';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if v_player.id is null then
    raise exception 'Player not found';
  end if;

  v_assigned_franchise_code := v_player.assigned_franchise_code;
  v_bid := coalesce(v_player.current_bid_lakhs, v_player.base_price_lakhs);

  if v_assigned_franchise_code is not null then
    update public.teams
      set roster_count = greatest(roster_count - 1, 0),
          spent_lakhs = greatest(spent_lakhs - v_bid, 0),
          purse_lakhs = purse_lakhs + v_bid,
          updated_at = now()
    where franchise_code = v_assigned_franchise_code;
  end if;

  update public.players
    set assigned_franchise_code = null,
        last_bidder_code = null,
        current_bid_lakhs = 0,
        auction_status = 'unsold',
        assigned_at = null,
        updated_at = now()
  where id = p_player_id
  returning * into v_player;

  return v_player;
end;
$$;

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.auction_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'admin_can_read_teams'
  ) then
    create policy "admin_can_read_teams"
      on public.teams
      for select
      to authenticated
      using (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'admin_can_manage_teams'
  ) then
    create policy "admin_can_manage_teams"
      on public.teams
      for all
      to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'players' and policyname = 'anon_can_read_all_players'
  ) then
    create policy "anon_can_read_all_players"
      on public.players
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'players' and policyname = 'admin_can_read_all_players'
  ) then
    create policy "admin_can_read_all_players"
      on public.players
      for select
      to authenticated
      using (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'players' and policyname = 'admin_can_manage_players'
  ) then
    create policy "admin_can_manage_players"
      on public.players
      for all
      to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'anon_can_read_teams'
  ) then
    create policy "anon_can_read_teams"
      on public.teams
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'auction_state' and policyname = 'public_can_read_auction_state'
  ) then
    create policy "public_can_read_auction_state"
      on public.auction_state
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'auction_state' and policyname = 'admin_can_manage_auction_state'
  ) then
    create policy "admin_can_manage_auction_state"
      on public.auction_state
      for all
      to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user());
  end if;
end
$$;

commit;
