<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { createGameState, drawGame, placeActiveBlock, updateGameState } from '../game/stack-engine'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const PLACE_INTERVAL_SECONDS = 0.9
const RESET_SCORE = 14

let gameState = createGameState()
let frameId = 0
let lastFrameTime = 0
let placeTimer = 0
let resizeObserver: ResizeObserver | null = null

const syncCanvasSize = () => {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}

const placePerfect = () => {
  if (!gameState.active || gameState.isOver) {
    return
  }

  const top = gameState.blocks[gameState.blocks.length - 1]
  const axis = gameState.active.axis
  gameState.active[axis] = top[axis]

  const result = placeActiveBlock(gameState)
  if (result.gameOver || gameState.score >= RESET_SCORE) {
    gameState = createGameState()
  }
}

const loop = (time: number) => {
  if (lastFrameTime === 0) {
    lastFrameTime = time
  }

  const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.05)
  lastFrameTime = time

  placeTimer += deltaSeconds
  if (placeTimer >= PLACE_INTERVAL_SECONDS) {
    placeTimer = 0
    placePerfect()
  }

  updateGameState(gameState, deltaSeconds)

  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (canvas && ctx) {
    drawGame(ctx, gameState, canvas.clientWidth, canvas.clientHeight, { drawBackground: false })
  }

  frameId = window.requestAnimationFrame(loop)
}

onMounted(() => {
  syncCanvasSize()

  resizeObserver = new ResizeObserver(syncCanvasSize)
  if (canvasRef.value) {
    resizeObserver.observe(canvasRef.value)
  }

  frameId = window.requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (frameId) {
    window.cancelAnimationFrame(frameId)
  }

  if (resizeObserver && canvasRef.value) {
    resizeObserver.unobserve(canvasRef.value)
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div class="global-backdrop" aria-hidden="true">
    <canvas ref="canvasRef" class="global-backdrop-canvas"></canvas>
    <div class="global-backdrop-veil"></div>
  </div>
</template>
