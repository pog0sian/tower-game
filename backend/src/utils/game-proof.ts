import { createHmac } from 'node:crypto'
import { env } from '../config/env'

export const createGameProof = (runId: string, userId: string) => {
  const payload = `${runId}:${userId}`
  const signature = createHmac('sha256', env.GAME_PROOF_SECRET).update(payload).digest('hex')
  return `${payload}.${signature}`
}

export const verifyGameProof = (proof: string, runId: string, userId: string) => {
  const expected = createGameProof(runId, userId)
  return expected === proof
}
