import { Elysia } from 'elysia'

export const requestLoggerPlugin = new Elysia({ name: 'request-logger' }).onRequest(
  ({ request }) => {
    const method = request.method
    const url = new URL(request.url)
    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`)
  },
)
