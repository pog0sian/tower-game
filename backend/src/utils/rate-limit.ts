import { sql } from '../db/client'

export const isRateLimited = async (key: string, maxHits: number, windowMs: number) => {
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs

  const rows = await sql.unsafe<{ hits: number }[]>(
    `
    insert into rate_limits (key, window_start, hits, updated_at)
    values ($1, $2, 1, now())
    on conflict (key)
    do update set
      hits = case
        when rate_limits.window_start = excluded.window_start then rate_limits.hits + 1
        else 1
      end,
      window_start = excluded.window_start,
      updated_at = now()
    returning hits
    `,
    [key, windowStart],
  )

  const hits = rows[0]?.hits ?? 1
  return hits > maxHits
}
