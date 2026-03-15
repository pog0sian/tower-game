#!/usr/bin/env sh
set -eu

echo "Waiting for database..."

attempt=0
until bun -e "import postgres from 'postgres'; const url = process.env.DATABASE_URL; if (!url) throw new Error('DATABASE_URL is required'); const sql = postgres(url, { max: 1, connect_timeout: 5, idle_timeout: 1 }); try { await sql.unsafe('select 1'); await sql.end({ timeout: 1 }); } catch (error) { await sql.end({ timeout: 1 }); throw error; }" > /dev/null 2>&1
do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Database is not ready after 30 attempts"
    exit 1
  fi

  echo "Database is unavailable, retrying... ($attempt/30)"
  sleep 2
done

echo "Database is ready, running migrations..."
bun run migrate

echo "Starting API..."
exec bun run start
