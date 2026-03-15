import { hashIdentityFingerprint } from './validation'

const firstHeaderValue = (value: string | null) => {
  if (!value) {
    return null
  }

  const firstValue = value.split(',')[0]?.trim()
  return firstValue || null
}

export const getClientIp = (request: Request) => {
  const forwarded = firstHeaderValue(request.headers.get('x-forwarded-for'))
  if (forwarded) {
    return forwarded
  }

  const realIp = firstHeaderValue(request.headers.get('x-real-ip'))
  if (realIp) {
    return realIp
  }

  const cfIp = firstHeaderValue(request.headers.get('cf-connecting-ip'))
  if (cfIp) {
    return cfIp
  }

  return 'unknown'
}

export const getClientFingerprint = (request: Request) => {
  const userAgent = request.headers.get('user-agent') ?? ''
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  const acceptEncoding = request.headers.get('accept-encoding') ?? ''

  return hashIdentityFingerprint(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
}
