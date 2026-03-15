import { Elysia, t } from 'elysia'
import { sql } from '../../db/client'
import type { User } from '../../types/user'
import { hashToken, generateSessionToken } from '../../utils/crypto'
import { isRateLimited } from '../../utils/rate-limit'
import { sanitizeIdentityInput, isSafeFullName, isSafeGroupName } from '../../utils/validation'
import { getClientIp, getClientFingerprint } from '../../utils/request-meta'
import {
  buildSessionCookie,
  buildSessionCookieClear,
  getSessionTokenFromRequest,
} from '../../utils/cookies'
import { getCurrentUserFromRequest } from './session'

const SESSION_TTL_DAYS = 30
const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60
const LOGIN_RATE_LIMIT = { max: 40, windowMs: 10 * 60 * 1000 }
const LOGIN_FINGERPRINT_RATE_LIMIT = { max: 30, windowMs: 10 * 60 * 1000 }
const ACCOUNT_CREATE_RATE_LIMIT = { max: 50, windowMs: 60 * 60 * 1000 }

type UserRow = {
  id: string
  full_name: string
  group_name: string
  best_score: number
}

const mapUser = (row: UserRow): User => ({
  id: row.id,
  fullName: row.full_name,
  groupName: row.group_name,
  bestScore: row.best_score,
})

export const authModule = new Elysia({ prefix: '/api/auth' })
  .post(
    '/login',
    async ({ body, set, request }) => {
      const fullName = sanitizeIdentityInput(body.fullName)
      const groupName = sanitizeIdentityInput(body.groupName)

      if (!isSafeFullName(fullName) || !isSafeGroupName(groupName)) {
        set.status = 400
        return {
          ok: false,
          error: 'VALIDATION_ERROR',
          message: 'Name or group contains forbidden characters',
        }
      }

      const clientIp = getClientIp(request)
      const clientFingerprint = getClientFingerprint(request)

      if (await isRateLimited(`auth:login:ip:${clientIp}`, LOGIN_RATE_LIMIT.max, LOGIN_RATE_LIMIT.windowMs)) {
        set.status = 429
        return {
          ok: false,
          error: 'RATE_LIMITED',
          message: 'Too many login attempts from this IP',
        }
      }

      if (
        await isRateLimited(
          `auth:login:fingerprint:${clientFingerprint}`,
          LOGIN_FINGERPRINT_RATE_LIMIT.max,
          LOGIN_FINGERPRINT_RATE_LIMIT.windowMs,
        )
      ) {
        set.status = 429
        return {
          ok: false,
          error: 'RATE_LIMITED',
          message: 'Too many login attempts from this device',
        }
      }

      const existingUsers = await sql<UserRow[]>`
        select id, full_name, group_name, best_score
        from users
        where full_name = ${fullName}
          and group_name = ${groupName}
        limit 1
      `

      let user = existingUsers[0]

      if (!user) {
        if (
          await isRateLimited(
            `auth:create:ip:${clientIp}`,
            ACCOUNT_CREATE_RATE_LIMIT.max,
            ACCOUNT_CREATE_RATE_LIMIT.windowMs,
          )
        ) {
          set.status = 429
          return {
            ok: false,
            error: 'RATE_LIMITED',
            message: 'Too many account creations from this IP',
          }
        }

        const createdUsers = await sql<UserRow[]>`
          insert into users (full_name, group_name)
          values (${fullName}, ${groupName})
          returning id, full_name, group_name, best_score
        `

        user = createdUsers[0]
      } else {
        await sql`
          update users
          set updated_at = now()
          where id = ${user.id}
        `
      }

      const sessionToken = generateSessionToken()
      const tokenHash = hashToken(sessionToken)

      await sql`
        insert into user_sessions (user_id, token_hash, expires_at)
        values (
          ${user.id},
          ${tokenHash},
          now() + (${SESSION_TTL_SECONDS} || ' seconds')::interval
        )
      `

      set.headers['set-cookie'] = buildSessionCookie(sessionToken, SESSION_TTL_SECONDS)

      return {
        ok: true,
        user: mapUser(user),
      }
    },
    {
      body: t.Object({
        fullName: t.String({ minLength: 3, maxLength: 100 }),
        groupName: t.String({ minLength: 1, maxLength: 30 }),
      }),
    },
  )
  .get('/me', async ({ request, set }) => {
    const currentUser = await getCurrentUserFromRequest(request)

    if (!currentUser) {
      set.status = 401
      return {
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      }
    }

    return {
      ok: true,
      user: currentUser,
    }
  })
  .post('/logout', async ({ request, set }) => {
    const sessionToken = getSessionTokenFromRequest(request)

    if (sessionToken) {
      await sql`
        update user_sessions
        set revoked_at = now()
        where token_hash = ${hashToken(sessionToken)}
          and revoked_at is null
      `
    }

    set.headers['set-cookie'] = buildSessionCookieClear()

    return {
      ok: true,
    }
  })
