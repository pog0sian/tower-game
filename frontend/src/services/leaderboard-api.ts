import { apiRequest } from './http'
import type { LeaderboardResponse } from '../types/api'

export const leaderboardApi = {
  top: (limit = 20) => apiRequest<LeaderboardResponse>(`/leaderboard?limit=${limit}`),
}
