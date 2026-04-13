import { request } from './http'

export type RolePermissionItem = {
  id: string
  permissions_uuid: string
  resource: string
  action: string
  description?: string | null
  active: boolean
}

export type RolePermissionResponse = {
  success: boolean
  message: string
  data: {
    role: {
      id: string
      role_uuid: string
      name: string
    }
    permissions: RolePermissionItem[]
  }
}

export const rolePermissionService = {
  getByRoleId(roleId: string | number) {
    return request<RolePermissionResponse>(`/roles/${roleId}/permissions`, { method: 'GET' })
  },
  updateBulk(roleId: string | number, permissionIds: string[]) {
    return request<RolePermissionResponse>(`/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: {
        permission_ids: permissionIds,
      },
    })
  },
  toggle(roleId: string | number, permissionId: string | number, active: boolean) {
    return request<{ success: boolean; message: string; data: { active: boolean } }>(`/roles/${roleId}/permissions/${permissionId}`, {
      method: 'PATCH',
      body: { active },
    })
  },
}
