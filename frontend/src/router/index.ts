import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { initSession, useSession } from '../composables/useSession'
import AuthView from '../views/AuthView.vue'
import MenuView from '../views/MenuView.vue'
import GameView from '../views/GameView.vue'
import GameOverView from '../views/GameOverView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/menu' },
  { path: '/auth', component: AuthView, meta: { guestOnly: true } },
  { path: '/menu', component: MenuView, meta: { requiresAuth: true } },
  { path: '/game', component: GameView, meta: { requiresAuth: true } },
  { path: '/game-over', component: GameOverView, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/menu' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  await initSession()

  const { state } = useSession()
  const isAuthenticated = Boolean(state.user)

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/auth'
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return '/menu'
  }

  return true
})

export default router
