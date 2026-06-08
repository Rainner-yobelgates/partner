import { defineStore } from 'pinia'
import { request } from '@/services/http'
import { getJwtExpiresAt, isJwtExpired } from '@/utils/jwt'

type LoginResponse = {
  success: boolean
  message: string
  data: {
    access_token: string
    role_id: string | null
    permissions: string[]
  }
}

type MyPermissionsResponse = {
  success: boolean
  message: string
  data: {
    role_id: string | null
    permissions: string[]
  }
}

export const useAuthStore = defineStore('auth', () => {
  const initialPermissions = (() => {
    try {
      const saved = localStorage.getItem('permissions')
      return saved ? JSON.parse(saved) as string[] : []
    }
    catch {
      return []
    }
  })()

  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const roleId = ref<string | null>(localStorage.getItem('role_id') || null)
  const permissions = ref<string[]>(initialPermissions)
  const isPermissionsLoaded = ref(false)
  let expiryTimer: number | undefined

  const isAuthenticated = computed(() => Boolean(accessToken.value) && !isJwtExpired(accessToken.value))

  const stopSessionExpiryTimer = () => {
    if (expiryTimer !== undefined) {
      window.clearTimeout(expiryTimer)
      expiryTimer = undefined
    }
  }

  const notifySessionExpired = () => {
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
  }

  const expireSession = () => {
    logout()
    notifySessionExpired()
  }

  const startSessionExpiryTimer = () => {
    stopSessionExpiryTimer()

    const expiresAt = getJwtExpiresAt(accessToken.value)
    if (!expiresAt)
      return

    const delay = expiresAt - Date.now()
    if (delay <= 0) {
      expireSession()
      return
    }

    expiryTimer = window.setTimeout(expireSession, delay)
  }

  const isSessionValid = () => {
    if (!accessToken.value)
      return false

    if (isJwtExpired(accessToken.value)) {
      expireSession()
      return false
    }

    startSessionExpiryTimer()
    return true
  }

  const login = async (username: string, password: string) => {
    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    })

    accessToken.value = response.data.access_token
    roleId.value = response.data.role_id
    permissions.value = response.data.permissions ?? []
    isPermissionsLoaded.value = true
    localStorage.setItem('access_token', response.data.access_token)
    if (response.data.role_id)
      localStorage.setItem('role_id', response.data.role_id)
    else
      localStorage.removeItem('role_id')
    localStorage.setItem('permissions', JSON.stringify(permissions.value))
    startSessionExpiryTimer()
  }

  const loadPermissions = async () => {
    if (!isSessionValid()) {
      permissions.value = []
      roleId.value = null
      isPermissionsLoaded.value = true
      return
    }

    const response = await request<MyPermissionsResponse>('/auth/permissions', { method: 'GET' })
    roleId.value = response.data.role_id
    permissions.value = response.data.permissions ?? []
    isPermissionsLoaded.value = true
    if (response.data.role_id)
      localStorage.setItem('role_id', response.data.role_id)
    else
      localStorage.removeItem('role_id')
    localStorage.setItem('permissions', JSON.stringify(permissions.value))
  }

  const hasPermission = (permission: string) => {
    return permissions.value.includes(permission)
  }

  const logout = () => {
    accessToken.value = null
    roleId.value = null
    permissions.value = []
    isPermissionsLoaded.value = false
    stopSessionExpiryTimer()
    localStorage.removeItem('access_token')
    localStorage.removeItem('role_id')
    localStorage.removeItem('permissions')
  }

  startSessionExpiryTimer()

  return {
    accessToken,
    roleId,
    permissions,
    isPermissionsLoaded,
    isAuthenticated,
    login,
    loadPermissions,
    hasPermission,
    isSessionValid,
    logout,
  }
})
