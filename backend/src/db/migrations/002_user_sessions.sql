create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_user_sessions_user_id on user_sessions (user_id);
create index if not exists idx_user_sessions_expires_at on user_sessions (expires_at);
