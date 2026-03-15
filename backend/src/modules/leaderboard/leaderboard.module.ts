import { Elysia, t } from 'elysia'
import { sql } from '../../db/client'

type LeaderboardRow = {
  id: string
  full_name: string
  group_name: string
  best_score: number
}

export const leaderboardModule = new Elysia({ prefix: '/api' }).get(
  '/leaderboard',
  async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 20

    const rows = await sql.unsafe<LeaderboardRow[]>(
      `
      select id, full_name, group_name, best_score
      from users
      order by best_score desc, updated_at asc
      limit $1
      `,
      [limit],
    )

    return {
      ok: true,
      items: rows.map((row: LeaderboardRow, index: number) => ({
        rank: index + 1,
        userId: row.id,
        fullName: row.full_name,
        groupName: row.group_name,
        bestScore: row.best_score,
      })),
    }
  },
  {
    query: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
    }),
  },
)
