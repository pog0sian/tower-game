import { Elysia } from 'elysia'
import { sql } from '../../db/client'

export const healthModule = new Elysia({ prefix: '/api' }).get('/health', async () => {
  await sql`select 1`

  return {
    ok: true,
    service: 'tower-game-api',
    timestamp: new Date().toISOString(),
  }
})