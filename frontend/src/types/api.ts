export type User = {
  id: string
  fullName: string
  groupName: string
  bestScore: number
}

export type AuthResponse = {
  ok: true
  user: User
}

export type GameStartResponse = {
  ok: true
  runId: string
  proof: string
  startedAt: string
}

export type GameEventInput = {
  runId: string
  proof: string
  seq: number
}

export type GameEventResponse = {
  ok: true
  score: number
  acceptedSeq: number
}

export type GameFinishInput = {
  runId: string
  proof: string
}

export type GameFinishResponse = {
  ok: true
  acceptedScore: number
  bestScore: number
  isNewBest: boolean
  acceptedToLeaderboard?: boolean
  suspiciousScore?: number
  pacePerSecond?: number
  intervalAvgMs?: number
  intervalStdDev?: number
}

export type LeaderboardItem = {
  rank: number
  userId: string
  fullName: string
  groupName: string
  bestScore: number
}

export type LeaderboardResponse = {
  ok: true
  items: LeaderboardItem[]
}

export type ProfileBestResponse = {
  ok: true
  bestScore: number
}
