alter table game_runs
  add column if not exists server_score integer not null default 0 check (server_score >= 0),
  add column if not exists last_seq integer not null default 0 check (last_seq >= 0),
  add column if not exists last_event_at timestamptz;

update game_runs
set server_score = coalesce(score, 0)
where server_score = 0
  and score is not null;
