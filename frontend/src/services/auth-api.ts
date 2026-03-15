import { apiRequest } from './http'
import type { AuthResponse } from '../types/api'

type LoginInput = {
  fullName: string
  groupName: string
}

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => apiRequest<AuthResponse>('/auth/me'),

  logout: () =>
    apiRequest<{ ok: true }>('/auth/logout', {
      method: 'POST',
    }),
}
