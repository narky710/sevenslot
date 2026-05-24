-- ─────────────────────────────────────────────────────────────────────────────
--  SevenSlot — Supabase schema (v1)
--
--  Apply by pasting this whole file into the Supabase SQL editor and clicking
--  Run.  Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE /
--  DROP POLICY IF EXISTS.
--
--  Money convention: all amounts are stored in CENTS as integers (bigint where
--  totals could grow large).  1 credit = $0.01.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ─── Tables ──────────────────────────────────────────────────────────────────

-- profiles: public-facing identity (display name, admin flag).
-- auth.users is managed by Supabase; this is the 1:1 extension row.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null
              check (char_length(username) between 2 and 24
                     and username ~ '^[A-Za-z0-9_]+$'),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- wallets: one row per user, server-authoritative balance.
-- Direct writes are blocked by RLS; the only mutator is record_spin().
create table if not exists public.wallets (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  balance_cents  bigint not null default 0,
  updated_at     timestamptz not null default now()
);

-- game_events: append-only audit log.  One row per resolved spin.
create table if not exists public.game_events (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  game         text not null check (game in ('triple7','keno','diamond')),
  spin_id      text not null,   -- engine's "<game>-<spinCount>" (per-session, not unique globally)
  bet_cents    integer not null check (bet_cents >= 0),
  win_cents    integer not null check (win_cents >= 0),
  balance_after_cents bigint not null,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists game_events_user_created_idx
  on public.game_events (user_id, created_at desc);
create index if not exists game_events_game_created_idx
  on public.game_events (game, created_at desc);
create index if not exists game_events_win_idx
  on public.game_events (win_cents desc);

-- jackpot_meters: globally shared progressive jackpot pots.
-- Three fixed rows seeded below.  Only mutated by RPCs.
create table if not exists public.jackpot_meters (
  tier            text primary key check (tier in ('fever1','fever2','fever3')),
  amount_cents    bigint not null,
  seed_cents      bigint not null,
  last_updated    timestamptz not null default now(),
  last_won_at     timestamptz,
  last_won_by     uuid references auth.users(id) on delete set null
);

-- Seed the three jackpot tiers if they don't exist yet.
-- Seeds taken from JackpotService.ts (dollars → cents).
insert into public.jackpot_meters (tier, amount_cents, seed_cents)
values
  ('fever1', 100000, 100000),  -- $1000 seed
  ('fever2',  50000,  50000),  -- $500  seed
  ('fever3',  25000,  25000)   -- $250  seed
on conflict (tier) do nothing;


-- ─── Leaderboard functions ───────────────────────────────────────────────────
-- These are SECURITY DEFINER so they bypass game_events' RLS (which scopes
-- rows to the calling user).  They only expose aggregates, never raw spins.

create or replace function public.leaderboard_alltime(p_limit int default 50)
returns table (
  user_id            uuid,
  username           text,
  total_won_cents    bigint,
  total_bet_cents    bigint,
  spin_count         bigint,
  biggest_win_cents  integer
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    sum(e.win_cents)::bigint,
    sum(e.bet_cents)::bigint,
    count(*)::bigint,
    max(e.win_cents)
  from public.game_events e
  join public.profiles p on p.id = e.user_id
  group by p.id, p.username
  order by sum(e.win_cents) desc
  limit p_limit;
$$;

create or replace function public.leaderboard_today(p_limit int default 50)
returns table (
  user_id            uuid,
  username           text,
  total_won_cents    bigint,
  spin_count         bigint,
  biggest_win_cents  integer
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    sum(e.win_cents)::bigint,
    count(*)::bigint,
    max(e.win_cents)
  from public.game_events e
  join public.profiles p on p.id = e.user_id
  where e.created_at >= date_trunc('day', now() at time zone 'utc')
  group by p.id, p.username
  order by sum(e.win_cents) desc
  limit p_limit;
$$;

grant execute on function public.leaderboard_alltime(int) to anon, authenticated;
grant execute on function public.leaderboard_today(int)   to anon, authenticated;


-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.wallets         enable row level security;
alter table public.game_events     enable row level security;
alter table public.jackpot_meters  enable row level security;

-- profiles: anyone can SELECT (so leaderboards can show usernames).
-- User can INSERT/UPDATE only their own row.
drop policy if exists profiles_select_all      on public.profiles;
drop policy if exists profiles_insert_self     on public.profiles;
drop policy if exists profiles_update_self     on public.profiles;
create policy profiles_select_all  on public.profiles for select using (true);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id);

-- wallets: user can SELECT only their own row.  No client writes (RPC only).
drop policy if exists wallets_select_self on public.wallets;
create policy wallets_select_self on public.wallets for select using (auth.uid() = user_id);

-- game_events: user can SELECT only their own rows.  No client writes.
drop policy if exists game_events_select_self on public.game_events;
create policy game_events_select_self on public.game_events for select using (auth.uid() = user_id);

-- jackpot_meters: anyone can SELECT.  No client writes.
drop policy if exists jackpot_meters_select_all on public.jackpot_meters;
create policy jackpot_meters_select_all on public.jackpot_meters for select using (true);


-- ─── RPCs (the only mutators) ────────────────────────────────────────────────

-- record_spin: single atomic transaction per resolved spin.
--   1. Verifies caller is authenticated.
--   2. Inserts a game_events row.
--   3. Deducts bet, credits win, updates wallet balance + timestamp.
--   4. Bumps the three jackpot meters by the supplied per-tier contributions.
-- Returns the new wallet balance and new jackpot meter snapshot.
--
-- contribution_cents_* are computed client-side (the engines already know the
-- per-game contribution rates).  Move them server-side if you ever care about
-- anti-cheat — for entertainment-only play this is fine.
create or replace function public.record_spin(
  p_game                   text,
  p_spin_id                text,
  p_bet_cents              integer,
  p_win_cents              integer,
  p_contrib_fever1_cents   integer default 0,
  p_contrib_fever2_cents   integer default 0,
  p_contrib_fever3_cents   integer default 0,
  p_meta                   jsonb   default null
)
returns table (
  new_balance_cents bigint,
  fever1_cents      bigint,
  fever2_cents      bigint,
  fever3_cents      bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_new_balance bigint;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_game not in ('triple7','keno','diamond') then
    raise exception 'invalid game tag: %', p_game;
  end if;
  if p_bet_cents < 0 or p_win_cents < 0 then
    raise exception 'bet/win must be non-negative';
  end if;

  -- Ensure wallet row exists, then atomically apply the delta.
  insert into public.wallets (user_id, balance_cents)
    values (v_user, 0)
    on conflict (user_id) do nothing;

  update public.wallets
    set balance_cents = balance_cents - p_bet_cents + p_win_cents,
        updated_at    = now()
    where user_id = v_user
    returning balance_cents into v_new_balance;

  -- Append audit row.
  insert into public.game_events
    (user_id, game, spin_id, bet_cents, win_cents, balance_after_cents, meta)
    values (v_user, p_game, p_spin_id, p_bet_cents, p_win_cents, v_new_balance, p_meta);

  -- Bump jackpot meters.  Update each tier in one statement; ignore if zero.
  if p_contrib_fever1_cents > 0 then
    update public.jackpot_meters
      set amount_cents = amount_cents + p_contrib_fever1_cents,
          last_updated = now()
      where tier = 'fever1';
  end if;
  if p_contrib_fever2_cents > 0 then
    update public.jackpot_meters
      set amount_cents = amount_cents + p_contrib_fever2_cents,
          last_updated = now()
      where tier = 'fever2';
  end if;
  if p_contrib_fever3_cents > 0 then
    update public.jackpot_meters
      set amount_cents = amount_cents + p_contrib_fever3_cents,
          last_updated = now()
      where tier = 'fever3';
  end if;

  return query
    select
      v_new_balance,
      (select amount_cents from public.jackpot_meters where tier = 'fever1'),
      (select amount_cents from public.jackpot_meters where tier = 'fever2'),
      (select amount_cents from public.jackpot_meters where tier = 'fever3');
end;
$$;

revoke all on function public.record_spin(text,text,integer,integer,integer,integer,integer,jsonb) from public;
grant execute on function public.record_spin(text,text,integer,integer,integer,integer,integer,jsonb) to authenticated;


-- claim_jackpot: atomically claim a tier — locks the meter row, reads its
-- current value, resets it to seed, credits the winnings to the caller's
-- wallet, and writes an audit row.
create or replace function public.claim_jackpot(p_tier text)
returns table (
  amount_won_cents  bigint,
  new_balance_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_amount bigint;
  v_seed   bigint;
  v_new_balance bigint;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_tier not in ('fever1','fever2','fever3') then
    raise exception 'invalid tier: %', p_tier;
  end if;

  -- Lock the meter row and read its value before resetting.
  select amount_cents, seed_cents
    into v_amount, v_seed
    from public.jackpot_meters
    where tier = p_tier
    for update;

  update public.jackpot_meters
    set amount_cents = v_seed,
        last_updated = now(),
        last_won_at  = now(),
        last_won_by  = v_user
    where tier = p_tier;

  -- Credit winnings to the player's wallet.
  insert into public.wallets (user_id, balance_cents)
    values (v_user, 0)
    on conflict (user_id) do nothing;

  update public.wallets
    set balance_cents = balance_cents + v_amount,
        updated_at    = now()
    where user_id = v_user
    returning balance_cents into v_new_balance;

  -- Also record this as a game_event so it shows up in the audit log.
  insert into public.game_events
    (user_id, game, spin_id, bet_cents, win_cents, balance_after_cents, meta)
    values (v_user, 'diamond', 'jackpot-' || p_tier, 0, v_amount, v_new_balance,
            jsonb_build_object('jackpot', p_tier));

  return query select v_amount, v_new_balance;
end;
$$;

revoke all on function public.claim_jackpot(text) from public;
grant execute on function public.claim_jackpot(text) to authenticated;


-- ─── Auto-create profile + wallet on signup ──────────────────────────────────
-- When a new auth.users row appears, create the matching profile + wallet so
-- the client doesn't have to.  Username defaults to "player_<short uuid>"; the
-- user can rename it later via UPDATE.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
    values (new.id, 'player_' || substr(new.id::text, 1, 8))
    on conflict (id) do nothing;
  insert into public.wallets (user_id, balance_cents)
    values (new.id, 0)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
