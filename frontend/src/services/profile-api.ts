import { apiRequest } from './http'
import type { ProfileBestResponse } from '../types/api'

export const profileApi = {
  best: () => apiRequest<ProfileBestResponse>('/profile/best'),
}
