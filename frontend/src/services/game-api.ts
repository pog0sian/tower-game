import { apiRequest } from './http'
import type {
  GameEventInput,
  GameEventResponse,
  GameFinishInput,
  GameFinishResponse,
  GameStartResponse,
} from '../types/api'

export const gameApi = {
  start: () =>
    apiRequest<GameStartResponse>('/games/start', {
      method: 'POST',
    }),

  event: (input: GameEventInput) =>
    apiRequest<GameEventResponse>('/games/event', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  finish: (input: GameFinishInput) =>
    apiRequest<GameFinishResponse>('/games/finish', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}
