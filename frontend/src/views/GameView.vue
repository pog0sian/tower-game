<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gameApi } from '../services/game-api'
import { createGameState, drawGame, placeActiveBlock, updateGameState } from '../game/stack-engine'

const router = useRouter()
const BEST_SCORE_UPDATED_EVENT = 'best-score-updated'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWrapRef = ref<HTMLDivElement | null>(null)
const errorMessage = ref('')
const isLoading = ref(true)
const isFinishing = ref(false)
const runState = ref<{ runId: string; proof: string; nextSeq: number } | null>(null)
const score = ref(0)
const perfectFx = ref(0)
const isGameOver = ref(false)
const gameEndedAt = ref<number | null>(null)
const bestScore = ref<number | null>(null)
const END_REVEAL_MS = 1300
const RESTART_GUARD_MS = 260
const BG_PARALLAX_FACTOR = 0.5
const BG_PARALLAX_LIMIT_PX = 64
const cameraAnchor = ref<number | null>(null)

let gameState: ReturnType<typeof createGameState> | null = null
let frameId = 0
let lastFrameTime = 0
let resizeObserver: ResizeObserver | null = null
let restartAllowedAt = 0
let scoreSyncQueue: Promise<void> = Promise.resolve()

const syncCanvasSize = () => {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  const isMobile = window.matchMedia('(max-width: 900px)').matches
  const dprCap = isMobile ? 1.5 : 2
  const baseDpr = Math.min(window.devicePixelRatio || 1, dprCap)
  const maxPixels = isMobile ? 2_200_000 : 3_500_000

  let pixelWidth = Math.max(1, Math.floor(rect.width * baseDpr))
  let pixelHeight = Math.max(1, Math.floor(rect.height * baseDpr))

  const totalPixels = pixelWidth * pixelHeight
  if (totalPixels > maxPixels) {
    const scale = Math.sqrt(maxPixels / totalPixels)
    pixelWidth = Math.max(1, Math.floor(pixelWidth * scale))
    pixelHeight = Math.max(1, Math.floor(pixelHeight * scale))
  }

  canvas.width = pixelWidth
  canvas.height = pixelHeight

  const ctx = canvas.getContext('2d')
  if (ctx) {
    const appliedDpr = Math.max(1, Math.min(pixelWidth / Math.max(1, rect.width), pixelHeight / Math.max(1, rect.height)))
    ctx.setTransform(appliedDpr, 0, 0, appliedDpr, 0, 0)
  }
}

const startRun = async () => {
  isLoading.value = true
  errorMessage.value = ''
  gameEndedAt.value = null
  perfectFx.value = 0
  isGameOver.value = false
  score.value = 0
  bestScore.value = null
  cameraAnchor.value = null
  restartAllowedAt = 0
  if (canvasWrapRef.value) {
    canvasWrapRef.value.style.setProperty('--bg-parallax-y', '0px')
  }

  gameState = createGameState()

  const run = await gameApi.start()
  runState.value = {
    runId: run.runId,
    proof: run.proof,
    nextSeq: 1,
  }
  scoreSyncQueue = Promise.resolve()

  isLoading.value = false
}

const queueScoreEvent = () => {
  if (!runState.value) {
    return
  }

  const currentRun = runState.value
  const seq = currentRun.nextSeq
  currentRun.nextSeq += 1

  scoreSyncQueue = scoreSyncQueue
    .catch(() => undefined)
    .then(async () => {
      await gameApi.event({
        runId: currentRun.runId,
        proof: currentRun.proof,
        seq,
      })
    })
    .catch((error) => {
      errorMessage.value =
        error instanceof Error ? error.message : 'Не удалось синхронизировать событие счёта'
    })
}

const finishAndApplyResult = async () => {
  if (!runState.value || isFinishing.value) {
    return
  }

  isFinishing.value = true

  try {
    await scoreSyncQueue.catch(() => undefined)
    const response = await gameApi.finish({
      runId: runState.value.runId,
      proof: runState.value.proof,
    })

    if (gameEndedAt.value) {
      const elapsed = Date.now() - gameEndedAt.value
      const waitMs = Math.max(0, END_REVEAL_MS - elapsed)
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
    }

    bestScore.value = response.bestScore
    if (response.acceptedToLeaderboard === false) {
      errorMessage.value = 'Забег помечен как подозрительный и не добавлен в таблицу лидеров'
    }
    window.dispatchEvent(
      new CustomEvent(BEST_SCORE_UPDATED_EVENT, {
        detail: { bestScore: response.bestScore },
      }),
    )
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось сохранить результат'
    bestScore.value = score.value
  } finally {
    runState.value = null
    isFinishing.value = false
  }
}

const placeCurrentBlock = async () => {
  if (!gameState || gameState.isOver || isLoading.value || isFinishing.value) {
    return
  }

  const result = placeActiveBlock(gameState)
  score.value = result.score
  if (result.perfect) {
    perfectFx.value = 1
  }

  if (!result.gameOver) {
    queueScoreEvent()
  }

  if (result.gameOver) {
    isGameOver.value = true
    gameEndedAt.value = Date.now()
    restartAllowedAt = Date.now() + RESTART_GUARD_MS
    await finishAndApplyResult()
  }
}

const handleKeyDown = async (event: KeyboardEvent) => {
  if (isGameOver.value && (event.code === 'Space' || event.code === 'Enter')) {
    event.preventDefault()
    if (event.repeat || Date.now() < restartAllowedAt || isFinishing.value) {
      return
    }
    await playAgain()
    return
  }

  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault()
    await placeCurrentBlock()
  }
}

const loop = (time: number) => {
  if (!gameState) {
    return
  }

  if (lastFrameTime === 0) {
    lastFrameTime = time
  }

  const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.04)
  lastFrameTime = time

  updateGameState(gameState, deltaSeconds)
  score.value = gameState.score
  isGameOver.value = gameState.isOver
  perfectFx.value = Math.max(0, perfectFx.value - deltaSeconds * 2.7)

  if (canvasWrapRef.value && typeof gameState.cameraOffset === 'number') {
    if (cameraAnchor.value === null) {
      cameraAnchor.value = gameState.cameraOffset
    }
    const deltaRaw = (gameState.cameraOffset - cameraAnchor.value) * BG_PARALLAX_FACTOR
    const delta = Math.max(-BG_PARALLAX_LIMIT_PX, Math.min(BG_PARALLAX_LIMIT_PX, deltaRaw))
    canvasWrapRef.value.style.setProperty('--bg-parallax-y', `${delta.toFixed(2)}px`)
  }

  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')

  if (canvas && ctx) {
    drawGame(ctx, gameState, canvas.clientWidth, canvas.clientHeight, { drawBackground: false })
  }

  frameId = window.requestAnimationFrame(loop)
}

const playAgain = async () => {
  if (isFinishing.value) {
    return
  }

  await startRun()
}

const backToMenu = async () => {
  await router.push('/menu')
}

const onCanvasPointerDown = async () => {
  if (isGameOver.value) {
    if (Date.now() < restartAllowedAt || isFinishing.value) {
      return
    }
    await playAgain()
    return
  }

  await placeCurrentBlock()
}

onMounted(async () => {
  try {
    syncCanvasSize()

    resizeObserver = new ResizeObserver(syncCanvasSize)
    if (canvasWrapRef.value) {
      resizeObserver.observe(canvasWrapRef.value)
    }
    if (canvasRef.value) {
      resizeObserver.observe(canvasRef.value)
    }

    window.addEventListener('orientationchange', syncCanvasSize)

    window.addEventListener('keydown', handleKeyDown)

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve())
      })
    })

    await startRun()
    frameId = window.requestAnimationFrame(loop)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось запустить игру'
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (frameId) {
    window.cancelAnimationFrame(frameId)
  }

  if (resizeObserver && canvasRef.value) {
    if (canvasWrapRef.value) {
      resizeObserver.unobserve(canvasWrapRef.value)
    }
    resizeObserver.unobserve(canvasRef.value)
    resizeObserver.disconnect()
  }

  window.removeEventListener('orientationchange', syncCanvasSize)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <section class="screen game-screen game-play-screen">
    <div class="game-shell game-shell-clean">
      <div class="game-overlay">
        <p v-if="!isGameOver" class="eyebrow">Башня Студвесны</p>
        <p v-else class="eyebrow">Игра окончена</p>
        <h1 :class="['score-title', { 'score-title-perfect': !isGameOver && perfectFx > 0 }]">
          {{ score }}
        </h1>
        <p v-if="!isGameOver" :class="['perfect-badge', { 'perfect-badge-visible': perfectFx > 0.05 }]">
          Идеально!
        </p>
        <div v-if="isGameOver" class="game-over-actions" @pointerdown.stop @click.stop>
          <button class="primary-btn" @click.stop="playAgain">Играть снова</button>
          <button class="secondary-btn" @click.stop="backToMenu">В меню</button>
        </div>
      </div>

      <div ref="canvasWrapRef" class="canvas-wrap canvas-wrap-clean" @pointerdown.prevent="onCanvasPointerDown">
        <div class="canvas-aspect-box">
          <canvas ref="canvasRef" class="game-canvas"></canvas>
          <div v-if="isLoading" class="canvas-overlay">Запускаем игру...</div>
        </div>
      </div>

      <p v-if="errorMessage" class="error-text game-error">{{ errorMessage }}</p>
    </div>
  </section>
</template>
