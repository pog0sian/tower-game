import { randomUUID } from 'node:crypto'
import { Elysia, t } from 'elysia'
import { sql } from '../../db/client'
import { hashToken } from '../../utils/crypto'
import { createGameProof, verifyGameProof } from '../../utils/game-proof'
import { isRateLimited } from '../../utils/rate-limit'
import { getCurrentUserFromRequest } from '../auth/session'

const SCORE_LIMIT = 1_000_000
const MIN_EVENT_INTERVAL_MS = 120
const MAX_RUN_DURATION_MS = 20 * 60 * 1000
const FAST_EVENT_INTERVAL_MS = 180
const VERY_FAST_EVENT_INTERVAL_MS = 150
const SUSPICION_LIMIT = 45
const START_RATE_LIMIT = { max: 30, windowMs: 60_000 }
const EVENT_RATE_LIMIT = { max: 240, windowMs: 60_000 }
const FINISH_RATE_LIMIT = { max: 60, windowMs: 60_000 }

type RunRow = {
  id: string
  user_id: string
  status: 'started' | 'finished'
  proof_hash: string
  server_score: number
  last_seq: number
  started_at: string
  last_event_at: string | null
  suspicious_score: number
  interval_samples: number
  interval_avg_ms: number
  interval_m2: number
  trusted_score: boolean
}

type BestScoreRow = {
  best_score: number
}

type FinishRow = {
  final_score: number
  trusted_score: boolean
  suspicious_score: number
  duration_ms: number
  interval_samples: number
  interval_avg_ms: number
  interval_m2: number
}

const updateIntervalStats = (samples: number, avg: number, m2: number, value: number) => {
  const nextSamples = samples + 1
  const delta = value - avg
  const nextAvg = avg + delta / nextSamples
  const delta2 = value - nextAvg
  const nextM2 = m2 + delta * delta2

  return {
    samples: nextSamples,
    avg: nextAvg,
    m2: nextM2,
  }
}

const getStdDev = (samples: number, m2: number) => {
  if (samples < 2) {
    return 0
  }

  return Math.sqrt(Math.max(0, m2 / (samples - 1)))
}

const getSuspicionDelta = (intervalMs: number, nextSamples: number, nextStdDev: number) => {
  let delta = 0

  if (intervalMs <= VERY_FAST_EVENT_INTERVAL_MS) {
    delta += 3
  } else if (intervalMs <= FAST_EVENT_INTERVAL_MS) {
    delta += 2
  } else if (intervalMs <= 210) {
    delta += 1
  }

  if (nextSamples >= 8 && nextStdDev < 8) {
    delta += 4
  } else if (nextSamples >= 12 && nextStdDev < 14) {
    delta += 2
  }

  if (intervalMs <= 220) {
    delta += 2
  } else if (intervalMs <= 260) {
    delta += 1
  }

  return delta
}

const rejectUnauthorized = (set: { status?: number | string }) => {
  set.status = 401
  return {
    ok: false,
    error: 'UNAUTHORIZED',
    message: 'Authentication required',
  }
}

const rejectForbidden = (set: { status?: number | string }) => {
  set.status = 403
  return {
    ok: false,
    error: 'FORBIDDEN',
    message: 'Action is not allowed',
  }
}

const rejectRateLimited = (set: { status?: number | string }) => {
  set.status = 429
  return {
    ok: false,
    error: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
  }
}

const rejectConflict = (set: { status?: number | string }) => {
  set.status = 409
  return {
    ok: false,
    error: 'RUN_ALREADY_FINISHED',
    message: 'Run was already finished',
  }
}

const rejectOutOfOrder = (set: { status?: number | string }) => {
  set.status = 409
  return {
    ok: false,
    error: 'OUT_OF_ORDER_EVENT',
    message: 'Event sequence mismatch',
  }
}

const rejectTooFast = (set: { status?: number | string }) => {
  set.status = 403
  return {
    ok: false,
    error: 'EVENT_RATE_TOO_HIGH',
    message: 'Events are sent too fast',
  }
}

const rejectRunExpired = (set: { status?: number | string }) => {
  set.status = 403
  return {
    ok: false,
    error: 'RUN_EXPIRED',
    message: 'Run exceeded maximum duration',
  }
}

export const gameModule = new Elysia({ prefix: '/api/games' })
  .post('/start', async ({ request, set }) => {
    const user = await getCurrentUserFromRequest(request)

    if (!user) {
      return rejectUnauthorized(set)
    }

    if (await isRateLimited(`games:start:${user.id}`, START_RATE_LIMIT.max, START_RATE_LIMIT.windowMs)) {
      return rejectRateLimited(set)
    }

    const runId = randomUUID()
    const proof = createGameProof(runId, user.id)

    await sql`
      insert into game_runs (id, user_id, status, proof_hash)
      values (${runId}, ${user.id}, 'started', ${hashToken(proof)})
    `

    return {
      ok: true,
      runId,
      proof,
      startedAt: new Date().toISOString(),
    }
  })
  .post(
    '/event',
    async ({ request, body, set }) => {
      const user = await getCurrentUserFromRequest(request)

      if (!user) {
        return rejectUnauthorized(set)
      }

      if (await isRateLimited(`games:event:${user.id}`, EVENT_RATE_LIMIT.max, EVENT_RATE_LIMIT.windowMs)) {
        return rejectRateLimited(set)
      }

      if (!verifyGameProof(body.proof, body.runId, user.id)) {
        return rejectForbidden(set)
      }

      const runs = await sql<RunRow[]>`
        select id, user_id, status, proof_hash, server_score, last_seq, started_at, last_event_at,
               suspicious_score, interval_samples, interval_avg_ms, interval_m2, trusted_score
        from game_runs
        where id = ${body.runId}
        limit 1
      `

      const run = runs[0]

      if (!run || run.user_id !== user.id) {
        return rejectForbidden(set)
      }

      if (run.status !== 'started') {
        return rejectConflict(set)
      }

      if (run.proof_hash !== hashToken(body.proof)) {
        return rejectForbidden(set)
      }

      if (Date.now() - new Date(run.started_at).getTime() > MAX_RUN_DURATION_MS) {
        return rejectRunExpired(set)
      }

      if (body.seq !== run.last_seq + 1) {
        return rejectOutOfOrder(set)
      }

      const updatedRows = await sql.unsafe<{ server_score: number; last_seq: number }[]>(
        `
        update game_runs
        set server_score = server_score + 1,
            last_seq = $3,
            last_event_at = now()
        where id = $1
          and user_id = $2
          and status = 'started'
          and proof_hash = $4
          and server_score < $7
          and last_seq = $5
          and (
            last_event_at is null
            or extract(epoch from (now() - last_event_at)) * 1000 >= $6
          )
        returning server_score, last_seq
        `,
        [body.runId, user.id, body.seq, hashToken(body.proof), body.seq - 1, MIN_EVENT_INTERVAL_MS, SCORE_LIMIT],
      )

      const updatedRun = updatedRows[0]

      if (!updatedRun) {
        if (run.server_score >= SCORE_LIMIT) {
          return rejectForbidden(set)
        }

        return rejectTooFast(set)
      }

      const nowMs = Date.now()
      const baselineEventAtMs = run.last_event_at
        ? new Date(run.last_event_at).getTime()
        : new Date(run.started_at).getTime()
      const intervalMs = Math.max(0, nowMs - baselineEventAtMs)
      const nextStats = updateIntervalStats(
        run.interval_samples,
        run.interval_avg_ms,
        run.interval_m2,
        intervalMs,
      )
      const nextStdDev = getStdDev(nextStats.samples, nextStats.m2)
      const suspicionDelta = getSuspicionDelta(intervalMs, nextStats.samples, nextStdDev)
      const nextSuspicion = Math.max(0, run.suspicious_score + suspicionDelta)
      const nextTrusted = run.trusted_score && nextSuspicion < SUSPICION_LIMIT

      await sql.unsafe(
        `
        update game_runs
        set interval_samples = $2,
            interval_avg_ms = $3,
            interval_m2 = $4,
            suspicious_score = $5,
            trusted_score = $6
        where id = $1
        `,
        [body.runId, nextStats.samples, nextStats.avg, nextStats.m2, nextSuspicion, nextTrusted],
      )

      return {
        ok: true,
        score: updatedRun.server_score,
        acceptedSeq: updatedRun.last_seq,
      }
    },
    {
      body: t.Object({
        runId: t.String({ format: 'uuid' }),
        proof: t.String({ minLength: 32, maxLength: 256 }),
        seq: t.Integer({ minimum: 1, maximum: SCORE_LIMIT }),
      }),
    },
  )
  .post(
    '/finish',
    async ({ request, body, set }) => {
      const user = await getCurrentUserFromRequest(request)

      if (!user) {
        return rejectUnauthorized(set)
      }

      if (await isRateLimited(`games:finish:${user.id}`, FINISH_RATE_LIMIT.max, FINISH_RATE_LIMIT.windowMs)) {
        return rejectRateLimited(set)
      }

      if (!verifyGameProof(body.proof, body.runId, user.id)) {
        return rejectForbidden(set)
      }

      const runs = await sql<RunRow[]>`
        select id, user_id, status, proof_hash, server_score, last_seq, started_at, last_event_at,
               suspicious_score, interval_samples, interval_avg_ms, interval_m2, trusted_score
        from game_runs
        where id = ${body.runId}
        limit 1
      `

      const run = runs[0]

      if (!run || run.user_id !== user.id) {
        return rejectForbidden(set)
      }

      if (run.status !== 'started') {
        return rejectConflict(set)
      }

      if (run.proof_hash !== hashToken(body.proof)) {
        return rejectForbidden(set)
      }

      try {
        const result = await sql.begin(async (tx) => {
          const finishRows = await tx.unsafe<FinishRow[]>(
            `
            update game_runs
            set status = 'finished',
                finished_at = now(),
                score = server_score,
                duration_ms = greatest(0, floor(extract(epoch from (now() - started_at)) * 1000)::integer)
            where id = $1
              and status = 'started'
            returning score as final_score, trusted_score, suspicious_score, duration_ms,
                      interval_samples, interval_avg_ms, interval_m2
            `,
            [body.runId],
          )

          if (finishRows.length === 0) {
            throw new Error('RUN_ALREADY_FINISHED')
          }

          const finalScore = finishRows[0].final_score
          const suspiciousScore = finishRows[0].suspicious_score
          const durationMs = Math.max(1, finishRows[0].duration_ms)
          const intervalSamples = finishRows[0].interval_samples
          const intervalAvgMs = finishRows[0].interval_avg_ms
          const intervalStdDev = getStdDev(intervalSamples, finishRows[0].interval_m2)
          const pacePerSecond = finalScore / (durationMs / 1000)

          const paceTooHigh = finalScore >= 35 && pacePerSecond > 1.45
          const intervalTooFast = intervalSamples >= 20 && intervalAvgMs < 520
          const highScoreTooFast = finalScore >= 80 && intervalAvgMs < 650
          const roboticConsistency = intervalSamples >= 30 && intervalStdDev < 28
          const extraSuspicious = suspiciousScore >= SUSPICION_LIMIT

          const isTrustedRun =
            finishRows[0].trusted_score &&
            !extraSuspicious &&
            !paceTooHigh &&
            !intervalTooFast &&
            !highScoreTooFast &&
            !roboticConsistency

          if (finalScore > SCORE_LIMIT) {
            throw new Error('INVALID_SCORE')
          }

          const previousBestRows = await tx.unsafe<BestScoreRow[]>(
            `select best_score from users where id = $1 for update`,
            [user.id],
          )

          const previousBestScore = previousBestRows[0]?.best_score ?? 0

          if (isTrustedRun) {
            await tx.unsafe(
              `
              update users
              set best_score = greatest(best_score, $2),
                  updated_at = now()
              where id = $1
              `,
              [user.id, finalScore],
            )
          }

          const currentBestRows = await tx.unsafe<BestScoreRow[]>(
            `select best_score from users where id = $1 limit 1`,
            [user.id],
          )

          const bestScore = currentBestRows[0]?.best_score ?? finalScore

          return {
            acceptedScore: finalScore,
            bestScore,
            isNewBest: isTrustedRun && finalScore > previousBestScore,
            acceptedToLeaderboard: isTrustedRun,
            suspiciousScore,
            pacePerSecond,
            intervalAvgMs,
            intervalStdDev,
          }
        })

        return {
          ok: true,
          acceptedScore: result.acceptedScore,
          bestScore: result.bestScore,
          isNewBest: result.isNewBest,
          acceptedToLeaderboard: result.acceptedToLeaderboard,
          suspiciousScore: result.suspiciousScore,
          pacePerSecond: result.pacePerSecond,
          intervalAvgMs: result.intervalAvgMs,
          intervalStdDev: result.intervalStdDev,
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'RUN_ALREADY_FINISHED') {
          return rejectConflict(set)
        }

        if (error instanceof Error && error.message === 'INVALID_SCORE') {
          return rejectForbidden(set)
        }

        throw error
      }
    },
    {
      body: t.Object({
        runId: t.String({ format: 'uuid' }),
        proof: t.String({ minLength: 32, maxLength: 256 }),
      }),
    },
  )
