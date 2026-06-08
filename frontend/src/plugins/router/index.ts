import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const toLoginRedirect = (path: string) => ({
  path: '/login',
  query: { redirect: path },
})

router.beforeEach(to => {
  const authStore = useAuthStore()
  const hasValidSession = authStore.isSessionValid()

  if (to.meta.requiresAuth && !hasValidSession)
    return toLoginRedirect(to.fullPath)

  if (to.meta.guestOnly && hasValidSession)
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
          return toLoginRedirect(to.fullPath)
        })
    }

    if (!authStore.hasPermission(requiredPermission))
      return { path: '/dashboard' }
  }
})

if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-expired', () => {
    const authStore = useAuthStore()
    const currentRoute = router.currentRoute.value

    authStore.logout()

    if (currentRoute.path !== '/login')
      void router.replace(toLoginRedirect(currentRoute.fullPath))
  })
}

export default function (app: App) {
  app.use(router)
}

export { router }
