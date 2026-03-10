import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(to => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated)
    return { path: '/login', query: { redirect: to.fullPath } }

  if (to.meta.guestOnly && authStore.isAuthenticated)
    return '/dashboard'

  const requiredPermission = typeof to.meta.permission === 'string' ? to.meta.permission : null

  if (to.meta.requiresAuth && requiredPermission) {
    if (!authStore.isPermissionsLoaded) {
      return authStore.loadPermissions()
        .then(() => {
          if (!authStore.hasPermission(requiredPermission))
            return { path: '/dashboard' }
        })
        .catch(() => {
          authStore.logout()
          return { path: '/login' }
        })
    }

    if (!authStore.hasPermission(requiredPermission))
      return { path: '/dashboard' }
  }
})

export default function (app: App) {
  app.use(router)
}

export { router }
