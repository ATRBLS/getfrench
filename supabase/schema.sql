-- GetFrench database schema
-- Run this in the Supabase SQL editor

create table if not exists users (
  id text primary key,
  email text unique not null,
  name text,
  plan text not null default 'free',
  sessions_this_month integer not null default 0,
  seconds_used integer not null default 0,
  reset_date timestamptz not null,
  memory jsonb not null default '{}',
  stripe_customer_id text,
  streak_count integer not null default 0,
  last_session_date date,
  cefr_level text,
  created_at timestamptz not null default now()
);

-- Run on existing databases to add streak columns:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS last_session_date DATE;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_started_at_idx on sessions(started_at);

-- Disable Row Level Security for server-side access via service role key
-- (the server uses the service role key, so RLS doesn't block it)
alter table users enable row level security;
alter table sessions enable row level security;

-- Allow service role full access (service role bypasses RLS automatically)
-- No policies needed for server-side service role usage
