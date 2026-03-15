import { join, normalize } from 'node:path'

const PORT = Number(Bun.env.PORT ?? '80')
const API_ORIGIN = Bun.env.API_ORIGIN ?? 'http://backend:3001'
const DIST_DIR = '/app/dist'
const INDEX_FILE = Bun.file(join(DIST_DIR, 'index.html'))

const sanitizePath = (pathname: string) => {
  const decoded = decodeURIComponent(pathname)
  const relative = decoded === '/' ? '/index.html' : decoded
  const normalized = normalize(join(DIST_DIR, relative))

  if (!normalized.startsWith(DIST_DIR)) {
    return null
  }

  return normalized
}

const copyProxyHeaders = (request: Request) => {
  const headers = new Headers(request.headers)
  headers.delete('host')

  const host = request.headers.get('host') ?? ''
  headers.set('x-forwarded-host', host)
  headers.set('x-forwarded-proto', 'http')

  return headers
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ ok: true })
    }

    if (url.pathname.startsWith('/api/')) {
      const target = new URL(url.pathname + url.search, API_ORIGIN)
      const response = await fetch(target, {
        method: request.method,
        headers: copyProxyHeaders(request),
        body: request.body,
        redirect: 'manual',
      })

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }

    const filePath = sanitizePath(url.pathname)
    if (!filePath) {
      return new Response('Not Found', { status: 404 })
    }

    const file = Bun.file(filePath)
    if (await file.exists()) {
      return new Response(file)
    }

    return new Response(INDEX_FILE)
  },
})

console.log(`Frontend is running on http://0.0.0.0:${PORT}`)
