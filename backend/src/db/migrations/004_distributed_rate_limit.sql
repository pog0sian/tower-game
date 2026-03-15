create table if not exists rate_limits (
  key text primary key,
  window_start bigint not null,
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_updated_at on rate_limits (updated_at);
