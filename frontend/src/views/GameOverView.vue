<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const score = computed(() => Number(route.query.score || 0))
const best = computed(() => Number(route.query.best || 0))

const playAgain = async () => {
  await router.push('/game')
}

const goMenu = async () => {
  await router.push('/menu')
}

const onBackdropClick = async (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    await playAgain()
  }
}
</script>

<template>
  <section class="screen game-over-screen" @click="onBackdropClick">
    <div class="panel game-over-panel">
      <p class="eyebrow">Игра окончена</p>
      <h1 class="title">Ваш результат: {{ score }}</h1>
      <p class="subtitle">Лучший результат: {{ best }}</p>
      <p class="subtitle">Нажмите вне этой панели для быстрого перезапуска.</p>

      <div class="menu-actions">
        <button class="primary-btn" @click="playAgain">Играть снова</button>
        <button class="secondary-btn" @click="goMenu">В меню</button>
      </div>
    </div>
  </section>
</template>
