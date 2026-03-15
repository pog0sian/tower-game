<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSession } from '../composables/useSession'
import { profileApi } from '../services/profile-api'

const BEST_SCORE_UPDATED_EVENT = 'best-score-updated'
const route = useRoute()
const router = useRouter()
const { state, logout } = useSession()

const dropdownOpen = ref(false)
const bestScore = ref(0)
const isLoadingBest = ref(false)

const userInitial = computed(() => {
  const name = state.user?.fullName?.trim()
  return name ? name[0].toUpperCase() : '?'
})

const closeDropdown = () => {
  dropdownOpen.value = false
}

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const refreshBestScore = async () => {
  if (!state.user) {
    bestScore.value = 0
    return
  }

  isLoadingBest.value = true
  try {
    const profile = await profileApi.best()
    bestScore.value = profile.bestScore
  } catch {
    bestScore.value = 0
  } finally {
    isLoadingBest.value = false
  }
}

const onDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!target || target.closest('.top-header-profile') || target.closest('.top-header-dropdown')) {
    return
  }
  closeDropdown()
}

const onEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeDropdown()
  }
}

const doLogout = async () => {
  closeDropdown()
  await logout()
  await router.push('/auth')
}

const goHome = async () => {
  closeDropdown()
  await router.push('/menu')
}

const onBestScoreUpdated = (event: Event) => {
  const customEvent = event as CustomEvent<{ bestScore?: number }>
  const nextBest = customEvent.detail?.bestScore
  if (typeof nextBest === 'number' && Number.isFinite(nextBest)) {
    bestScore.value = Math.max(bestScore.value, nextBest)
  }
}

watch(
  () => route.fullPath,
  async () => {
    closeDropdown()
    await refreshBestScore()
  },
)

onMounted(async () => {
  await refreshBestScore()
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('keydown', onEscape)
  window.addEventListener(BEST_SCORE_UPDATED_EVENT, onBestScoreUpdated as EventListener)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('keydown', onEscape)
  window.removeEventListener(BEST_SCORE_UPDATED_EVENT, onBestScoreUpdated as EventListener)
})
</script>

<template>
  <header class="top-header">
    <div class="top-header-inner">
      <div class="top-header-side top-header-left">
        <button class="top-header-home" type="button" @click="goHome">
          <div class="top-header-logo" aria-hidden="true"></div>
          <div class="top-header-brand">
            <p class="top-header-title">Башня Студвесны</p>
          </div>
        </button>
      </div>

      <a
        class="top-header-center top-header-center-link"
        href="https://vk.com/cifra.stud"
        target="_blank"
        rel="noopener noreferrer"
      >
        Институт Цифры
      </a>

      <div class="top-header-side top-header-right">
        <button
          v-if="state.user"
          class="top-header-profile"
          type="button"
          @click.stop="toggleDropdown"
          :aria-expanded="dropdownOpen"
        >
          <div class="top-header-avatar">{{ userInitial }}</div>
          <div class="top-header-user">
            <p class="top-header-username">{{ state.user.fullName }}</p>
            <p class="top-header-meta">
              {{ state.user.groupName }} В· Лучший:
              <span v-if="isLoadingBest">...</span>
              <span v-else>{{ bestScore }}</span>
            </p>
          </div>
        </button>

        <div v-if="dropdownOpen && state.user" class="top-header-dropdown">
          <button class="secondary-btn top-header-logout" @click="doLogout">Выйти</button>
        </div>
      </div>
    </div>
  </header>
</template>

