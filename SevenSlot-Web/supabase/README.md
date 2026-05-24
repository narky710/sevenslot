# Supabase setup

One-time steps to stand up the backend.

## 1. Create the project

1. Go to <https://supabase.com> → **New project** (free tier is fine).
2. Pick a name (e.g. `sevenslot`), a strong DB password (save it — you'll rarely need it), and the region closest to your players.
3. Wait ~2 min for it to provision.

## 2. Apply the schema

1. In the Supabase dashboard sidebar, open **SQL Editor** → **+ New query**.
2. Paste the entire contents of [`schema.sql`](./schema.sql).
3. Click **Run**. You should see `Success. No rows returned.` and three rows in `jackpot_meters` (fever1/2/3 seeded).
4. Safe to re-run if you make changes — every statement is idempotent.

## 3. Grab credentials

In the dashboard: **Settings → API**, copy:

- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **anon / public key** (this is the publishable one — safe to ship in the browser bundle, RLS protects the data)

Create `.env.local` at the web app root (copy from `.env.example`):

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

Add the same two env vars in **Vercel → Project Settings → Environment Variables** so production deploys can read them.

## 4. Auth providers (optional, later)

Email/password is enabled by default. To add Google/Apple/Discord OAuth:
**Authentication → Providers** in the dashboard → toggle on, paste client ID/secret from the provider.

## What's in the schema

- **profiles** — display name + `is_admin` flag, 1:1 with `auth.users`
- **wallets** — server-authoritative balance (cents). Read-only from the client.
- **game_events** — append-only audit log of every resolved spin
- **jackpot_meters** — three globally-shared progressive pots (fever1/2/3)
- **record_spin(...)** RPC — the only way the client writes to wallets/events/meters. One atomic transaction per spin.
- **claim_jackpot(tier)** RPC — locks a meter, reads its value, resets to seed, credits the winner.
- **leaderboard_alltime() / leaderboard_today()** — `SECURITY DEFINER` functions that expose cross-user aggregates (RLS scopes raw game_events to the owner, so we expose only the aggregate via a function).
- Trigger **on_auth_user_created** — auto-creates a `profiles` + `wallets` row on signup.

## Making yourself an admin

After signing up, run this in SQL Editor (replace with your email):

```sql
update public.profiles set is_admin = true
  where id = (select id from auth.users where email = 'you@example.com');
```
