const SESSION_COOKIE_NAME = 'tg_session'

const shouldUseSecureCookie = () => {
  if (Bun.env.COOKIE_SECURE === 'true') {
    return true
  }

  if (Bun.env.COOKIE_SECURE === 'false') {
    return false
  }

  return Bun.env.NODE_ENV === 'production'
}

const parseCookieHeader = (headerValue: string | null) => {
  if (!headerValue) {
    return {}
  }

  return headerValue.split(';').reduce<Record<string, string>>((acc, pair) => {
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex === -1) {
      return acc
    }

    const key = pair.slice(0, separatorIndex).trim()
    const value = pair.slice(separatorIndex + 1).trim()

    if (!key) {
      return acc
    }

    acc[key] = decodeURIComponent(value)
    return acc
  }, {})
}

export const getSessionTokenFromRequest = (request: Request) => {
  const cookies = parseCookieHeader(request.headers.get('cookie'))
  return cookies[SESSION_COOKIE_NAME] ?? null
}

export const buildSessionCookie = (token: string, maxAgeSeconds: number) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]

  if (shouldUseSecureCookie()) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export const buildSessionCookieClear = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
