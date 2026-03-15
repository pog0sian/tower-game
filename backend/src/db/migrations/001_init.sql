create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  group_name text not null,
  best_score integer not null default 0 check (best_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (full_name, group_name)
);

create table if not exists game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('started', 'finished')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer check (score is null or score >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  proof_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_runs_user_id on game_runs (user_id);
create index if not exists idx_game_runs_started_at_desc on game_runs (started_at desc);
