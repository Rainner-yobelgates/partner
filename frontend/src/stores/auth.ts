import { defineStore } from 'pinia'
import { request } from '@/services/http'

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

  const isAuthenticated = computed(() => Boolean(accessToken.value))

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
  }

  const loadPermissions = async () => {
    if (!accessToken.value) {
      permissions.value = []
      roleId.value = null
      isPermissionsLoaded.value = true
      return
    }

    const response = await request<MyPermissionsResponse>('/auth/permissions')
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
    localStorage.removeItem('access_token')
    localStorage.removeItem('role_id')
    localStorage.removeItem('permissions')
  }

  return {
    accessToken,
    roleId,
    permissions,
    isPermissionsLoaded,
    isAuthenticated,
    login,
    loadPermissions,
    hasPermission,
    logout,
  }
})
