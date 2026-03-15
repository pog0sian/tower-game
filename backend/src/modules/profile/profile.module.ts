import { Elysia } from 'elysia'
import { getCurrentUserFromRequest } from '../auth/session'

export const profileModule = new Elysia({ prefix: '/api/profile' }).get(
  '/best',
  async ({ request, set }) => {
    const user = await getCurrentUserFromRequest(request)

    if (!user) {
      set.status = 401
      return {
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      }
    }

    return {
      ok: true,
      bestScore: user.bestScore,
    }
  },
)
