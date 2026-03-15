<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { leaderboardApi } from '../services/leaderboard-api'
import type { LeaderboardItem } from '../types/api'

const router = useRouter()

const leaderboard = ref<LeaderboardItem[]>([])
const isLoading = ref(true)
const isMobileViewport = ref(false)

const MOBILE_LEADERS_LIMIT = 6
const DESKTOP_LEADERS_LIMIT = 10

const displayedLeaders = computed(() => {
  const limit = isMobileViewport.value ? MOBILE_LEADERS_LIMIT : DESKTOP_LEADERS_LIMIT
  return leaderboard.value.slice(0, limit)
})

const syncViewportMode = () => {
  isMobileViewport.value = window.matchMedia('(max-width: 767px)').matches
}

const openGame = async () => {
  await router.push('/game')
}

const reloadLeaderboard = async () => {
  isLoading.value = true
  try {
    const leaders = await leaderboardApi.top(10)
    leaderboard.value = leaders.items
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)
  window.addEventListener('orientationchange', syncViewportMode)

  try {
    await reloadLeaderboard()
  } catch {
    leaderboard.value = []
    isLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportMode)
  window.removeEventListener('orientationchange', syncViewportMode)
})
</script>

<template>
  <section class="screen menu-screen menu-hub-screen">
    <div class="backdrop-grid"></div>

    <main class="panel menu-center">
      <p class="eyebrow">Таблица лидеров</p>
      <h1 class="title">Лучшие игроки</h1>

      <p v-if="isLoading" class="subtitle">Загружаем таблицу лидеров...</p>
      <p v-else-if="leaderboard.length === 0" class="subtitle">Пока нет результатов. Будьте первым.</p>

      <ol v-else class="leaders-list leaders-list-large">
        <li v-for="item in displayedLeaders" :key="item.userId">
          <span class="leader-meta">
            <span class="leader-rank">#{{ item.rank }}</span>
            <span class="leader-name">{{ item.fullName }}</span>
          </span>
          <strong class="leader-score">{{ item.bestScore }}</strong>
        </li>
      </ol>

      <div class="menu-main-actions">
        <button class="primary-btn big-play-btn" @click="openGame">Играть</button>
        <button class="secondary-btn" @click="reloadLeaderboard">Обновить</button>
      </div>
    </main>
  </section>
</template>
