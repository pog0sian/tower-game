<template>
  <div class="app-root">
    <GameBackdrop v-if="showBackdrop" />
    <TopHeader v-if="showHeader" />
    <div :class="['app-content', { 'app-content-with-header': showHeader }]">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition :name="currentRoute.path === '/game' ? 'route-none' : 'route-smooth'">
          <component :is="Component" :key="currentRoute.fullPath" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GameBackdrop from './components/GameBackdrop.vue'
import TopHeader from './components/TopHeader.vue'
import { RouterView } from 'vue-router'

const route = useRoute()
const showBackdrop = computed(() => route.path !== '/game')
const showHeader = computed(() => route.path !== '/auth')
</script>
