import { computed, reactive } from 'vue'
import { authApi } from '../services/auth-api'
import { ApiError } from '../services/http'
import type { User } from '../types/api'

const state = reactive({
  user: null as User | null,
  isLoading: false,
  isReady: false,
})

const setUser = (user: User | null) => {
  state.user = user
}

export const initSession = async () => {
  if (state.isReady || state.isLoading) {
    return
  }

  state.isLoading = true

  try {
    const response = await authApi.me()
    setUser(response.user)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      console.error('Session restore failed:', error)
    }
    setUser(null)
  } finally {
    state.isLoading = false
    state.isReady = true
  }
}

export const login = async ({ fullName, groupName }: { fullName: string; groupName: string }) => {
  const response = await authApi.login({ fullName, groupName })
  setUser(response.user)
  return response.user
}

export const logout = async () => {
  try {
    await authApi.logout()
  } finally {
    setUser(null)
  }
}

export const useSession = () => ({
  state,
  isAuthenticated: computed(() => Boolean(state.user)),
  login,
  logout,
  initSession,
})
