import { sql } from '../../db/client'
import type { User } from '../../types/user'
import { hashToken } from '../../utils/crypto'
import { getSessionTokenFromRequest } from '../../utils/cookies'

type SessionUserRow = {
  id: string
  full_name: string
  group_name: string
  best_score: number
}

const mapUser = (row: SessionUserRow): User => ({
  id: row.id,
  fullName: row.full_name,
  groupName: row.group_name,
  bestScore: row.best_score,
})

export const getCurrentUserFromRequest = async (request: Request): Promise<User | null> => {
  const sessionToken = getSessionTokenFromRequest(request)

  if (!sessionToken) {
    return null
  }

  const tokenHash = hashToken(sessionToken)

  const rows = await sql<SessionUserRow[]>`
    select u.id, u.full_name, u.group_name, u.best_score
    from user_sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
      and s.revoked_at is null
      and s.expires_at > now()
    limit 1
  `

  if (rows.length === 0) {
    return null
  }

  return mapUser(rows[0])
}
