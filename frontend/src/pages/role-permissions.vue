<script setup lang="ts">
import {
  comparePermissionActions,
  permissionActionTitle,
  permissionResourceSortIndex,
  permissionResourceTitle,
} from '@/config/permission-ui-order'
import { ApiError } from '@/services/http'
import { roleMasterService, type RoleItem } from '@/services/masters'
import { rolePermissionService, type RolePermissionItem } from '@/services/role-permission.service'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/plugins/router'

const roles = ref<RoleItem[]>([])
const selectedRoleId = ref('')
const selectedRoleName = ref('')
const permissions = ref<RolePermissionItem[]>([])
const authStore = useAuthStore()
const canUpdate = computed(() => authStore.hasPermission('role:update'))
const isCurrentRole = computed(() => authStore.roleId && selectedRoleId.value && authStore.roleId === selectedRoleId.value)
const isLoadingRoles = ref(false)
const isLoadingPermissions = ref(false)
const togglingPermissionMap = ref<Record<string, boolean>>({})
const search = ref('')

const snackbar = ref({
  show: false,
  color: 'success',
  text: '',
})

const roleOptions = computed(() => roles.value.map(role => ({
  title: role.name,
  value: role.id,
})))

const filteredPermissions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q)
    return permissions.value

  return permissions.value.filter(item => {
    const label = `${item.resource}:${item.action}`.toLowerCase()
    const description = (item.description || '').toLowerCase()
    return label.includes(q) || description.includes(q)
  })
})

const groupedPermissions = computed(() => {
  const groups = new Map<string, RolePermissionItem[]>()

  for (const item of filteredPermissions.value) {
    if (!groups.has(item.resource))
      groups.set(item.resource, [])

    groups.get(item.resource)!.push(item)
  }

  return Array.from(groups.entries())
    .map(([resource, list]) => ({
      resource,
      list: [...list].sort((x, y) => comparePermissionActions(x.action, y.action)),
    }))
    .sort((a, b) => {
      const da = permissionResourceSortIndex(a.resource)
      const db = permissionResourceSortIndex(b.resource)
      if (da !== db)
        return da - db
      return a.resource.localeCompare(b.resource)
    })
})

const activeCount = computed(() => permissions.value.filter(item => item.active).length)

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = {
    show: true,
    color,
    text,
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const fetchRoles = async () => {
  isLoadingRoles.value = true

  try {
    const response = await roleMasterService.list({
      page: 1,
      perPage: 100,
      sortBy: 'name',
      sortOrder: 'asc',
    })

    roles.value = response.data.filter(role => role.status === 'ACTIVE')

    if (!selectedRoleId.value && roles.value.length > 0)
      selectedRoleId.value = roles.value[0].id
  }
  catch (error) {
    console.error('[pages/role-permissions.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoadingRoles.value = false
  }
}

const fetchPermissions = async () => {
  if (!selectedRoleId.value)
    return

  isLoadingPermissions.value = true

  try {
    const response = await rolePermissionService.getByRoleId(selectedRoleId.value)
    permissions.value = response.data.permissions
    selectedRoleName.value = response.data.role.name
  }
  catch (error) {
    console.error('[pages/role-permissions.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoadingPermissions.value = false
  }
}

const isToggling = (permissionId: string) => Boolean(togglingPermissionMap.value[permissionId])

const togglePermission = async (item: RolePermissionItem, nextActive: boolean) => {
  if (!selectedRoleId.value)
    return

  if (isToggling(item.id))
    return

  togglingPermissionMap.value = {
    ...togglingPermissionMap.value,
    [item.id]: true,
  }

  try {
    await rolePermissionService.toggle(selectedRoleId.value, item.id, nextActive)
    item.active = nextActive
    showToast(`Hak akses ${item.resource}:${item.action} ${nextActive ? 'aktif' : 'nonaktif'}`)

    if (isCurrentRole.value) {
      await authStore.loadPermissions()

      if (!authStore.hasPermission('role:update'))
        await router.replace('/dashboard')
    }
  }
  catch (error) {
    console.error('[pages/role-permissions.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    togglingPermissionMap.value = {
      ...togglingPermissionMap.value,
      [item.id]: false,
    }
  }
}

watch(selectedRoleId, fetchPermissions)

onMounted(async () => {
  await fetchRoles()
  await fetchPermissions()
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Pengaturan Hak Akses Peran</span>
          <VChip
            color="primary"
            label
          >
            Aktif: {{ activeCount }} / {{ permissions.length }}
          </VChip>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VSelect
            v-model="selectedRoleId"
            label="Pilih Peran"
            :items="roleOptions"
            item-title="title"
            item-value="value"
            :loading="isLoadingRoles"
            :disabled="isLoadingRoles"
          />
        </VCol>
        <VCol cols="12" md="7">
          <VTextField
            v-model="search"
            label="Cari Hak Akses"
            placeholder="resource:aksi"
            prepend-inner-icon="ri-search-line"
          />
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VCardText>
      <VProgressLinear
        v-if="isLoadingPermissions"
        indeterminate
        color="primary"
        class="mb-4"
      />

      <div
        v-if="!isLoadingPermissions && !selectedRoleId"
        class="text-center text-medium-emphasis py-8"
      >
        Peran belum tersedia.
      </div>

      <div
        v-else-if="!isLoadingPermissions && groupedPermissions.length === 0"
        class="text-center text-medium-emphasis py-8"
      >
        Hak akses tidak ditemukan.
      </div>

      <VRow v-else>
        <VCol
          v-for="group in groupedPermissions"
          :key="group.resource"
          cols="12"
        >
          <VCard variant="outlined">
            <VCardItem>
              <template #title>
                <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                  <span class="text-subtitle-1 font-weight-medium">{{ permissionResourceTitle(group.resource) }}</span>
                  <VChip
                    size="small"
                    color="secondary"
                    label
                  >
                    {{ group.list.filter(item => item.active).length }} / {{ group.list.length }}
                  </VChip>
                </div>
              </template>
            </VCardItem>

            <VTable density="compact">
              <thead>
                <tr>
                  <th>Aksi</th>
                  <th>Deskripsi</th>
                  <th class="text-end">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in group.list"
                  :key="item.id"
                >
                  <td class="font-weight-medium">
                    {{ permissionActionTitle(item.action) }}
                  </td>
                  <td>{{ item.description || '-' }}</td>
                  <td class="text-end">
                    <div class="d-inline-flex align-center gap-3">
                      <VChip
                        size="x-small"
                        label
                        :color="item.active ? 'success' : 'grey-darken-1'"
                      >
                        {{ item.active ? 'Aktif' : 'Nonaktif' }}
                      </VChip>
                      <VSwitch
                        v-if="canUpdate"
                        :model-value="item.active"
                        color="success"
                        hide-details
                        inset
                        density="compact"
                        :loading="isToggling(item.id)"
                        :disabled="isLoadingPermissions || isToggling(item.id)"
                        @update:model-value="value => togglePermission(item, Boolean(value))"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>

      <div
        v-if="selectedRoleName"
        class="text-caption text-medium-emphasis mt-4"
      >
        Peran aktif: <strong>{{ selectedRoleName }}</strong>
      </div>
    </VCardText>
  </VCard>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="2500"
  >
    {{ snackbar.text }}
  </VSnackbar>
</template>

