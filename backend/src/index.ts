import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { authModule } from './modules/auth/auth.module'
import { gameModule } from './modules/game/game.module'
import { healthModule } from './modules/health/health.module'
import { leaderboardModule } from './modules/leaderboard/leaderboard.module'
import { profileModule } from './modules/profile/profile.module'
import { authPlugin } from './plugins/auth'
import { errorHandlerPlugin } from './plugins/error-handler'
import { requestLoggerPlugin } from './plugins/request-logger'

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  .use(requestLoggerPlugin)
  .use(errorHandlerPlugin)
  .use(authPlugin)
  .use(healthModule)
  .use(authModule)
  .use(gameModule)
  .use(leaderboardModule)
  .use(profileModule)
  .listen(env.PORT)

console.log(`API running on http://localhost:${app.server?.port}`)
