const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const tryParseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = RequestInit & {
  headers?: Record<string, string>
}

type ErrorPayload = {
  error?: string
  message?: string
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await tryParseJson<T & ErrorPayload>(response)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error || 'UNKNOWN_ERROR',
      payload?.message || 'Ошибка запроса',
    )
  }

  return payload
}
