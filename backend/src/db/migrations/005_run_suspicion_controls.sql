alter table game_runs
  add column if not exists suspicious_score integer not null default 0 check (suspicious_score >= 0),
  add column if not exists interval_samples integer not null default 0 check (interval_samples >= 0),
  add column if not exists interval_avg_ms double precision not null default 0,
  add column if not exists interval_m2 double precision not null default 0,
  add column if not exists trusted_score boolean not null default true;
