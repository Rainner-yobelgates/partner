<script setup lang="ts">
import { ApiError } from '@/services/http'
import { roleMasterService, userMasterService, type MasterStatus, type RoleItem, type UserItem } from '@/services/masters'
import { useAuthStore } from '@/stores/auth'

type UserForm = {
  username: string
  email: string
  password: string
  role_id: string
  status: MasterStatus
}

const rows = ref<UserItem[]>([])
const roles = ref<RoleItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'username' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isDetailDialogOpen = ref(false)
const isSubmitting = ref(false)
const editedItem = ref<UserItem | null>(null)
const detailItem = ref<UserItem | null>(null)
const authStore = useAuthStore()

const canCreate = computed(() => authStore.hasPermission('user:create'))
const canUpdate = computed(() => authStore.hasPermission('user:update'))
const canDelete = computed(() => authStore.hasPermission('user:delete'))
const canDetail = computed(() => authStore.hasPermission('user:detail'))

const form = ref<UserForm>({
  username: '',
  email: '',
  password: '',
  role_id: '',
  status: 'ACTIVE',
})

const snackbar = ref({
  show: false,
  color: 'success',
  text: '',
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const roleOptions = computed(() => roles.value.map(role => ({
  title: role.name,
  value: role.id,
})))

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, color, text }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const fetchRoles = async () => {
  try {
    const response = await roleMasterService.list({
      page: 1,
      perPage: 100,
      sortBy: 'name',
      sortOrder: 'asc',
    })

    roles.value = response.data.filter(role => role.status === 'ACTIVE')
  }
  catch (error) {
    console.error('[pages/users.vue]', error)
    // ignore; user CRUD still works without role options
  }
}

const fetchUsers = async () => {
  isLoading.value = true

  try {
    const response = await userMasterService.list({
      page: page.value,
      perPage: perPage.value,
      search: search.value.trim() || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })

    rows.value = response.data
    total.value = response.total
  }
  catch (error) {
    console.error('[pages/users.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedItem.value = null
  form.value = {
    username: '',
    email: '',
    password: '',
    role_id: '',
    status: 'ACTIVE',
  }
}

const openCreateDialog = () => {
  resetForm()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: UserItem) => {
  editedItem.value = item
  form.value = {
    username: item.username,
    email: item.email,
    password: '',
    role_id: item.role_id ?? '',
    status: item.status,
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  const payload = {
    username: form.value.username.trim(),
    email: form.value.email.trim(),
    status: form.value.status,
    role_id: form.value.role_id || undefined,
    password: form.value.password.trim() || undefined,
  }

  try {
    if (editedItem.value) {
      await userMasterService.update(editedItem.value.id, payload)
      showToast('Pengguna berhasil diperbarui')
    }
    else {
      if (!payload.password)
        throw new Error('Password wajib diisi untuk pengguna baru')

      await userMasterService.create(payload)
      showToast('Pengguna berhasil dibuat')
      page.value = 1
    }

    isFormDialogOpen.value = false
    await fetchUsers()
  }
  catch (error) {
    console.error('[pages/users.vue]', error)
    showToast(error instanceof Error ? error.message : getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: UserItem) => {
  editedItem.value = item
  isDeleteDialogOpen.value = true
}

const openDetailDialog = (item: UserItem) => {
  detailItem.value = item
  isDetailDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await userMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Pengguna berhasil dihapus')

    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1

    await fetchUsers()
  }
  catch (error) {
    console.error('[pages/users.vue]', error)
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchUsers()
}

watch([page, perPage, sortBy, sortOrder], fetchUsers)

onMounted(async () => {
  await fetchRoles()
  await fetchUsers()
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Data Pengguna</span>
          <VBtn
            v-if="canCreate"
            color="primary"
            prepend-icon="ri-add-line"
            @click="openCreateDialog"
          >
            Tambah Pengguna
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField
            v-model="search"
            label="Cari pengguna"
            placeholder="Username atau email"
            prepend-inner-icon="ri-search-line"
            @keyup.enter="onSearch"
          />
        </VCol>
        <VCol cols="12" md="2">
          <VBtn block class="mt-md-1" color="secondary" @click="onSearch">
            Cari
          </VBtn>
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="sortBy"
            label="Urutkan"
            :items="[
              { title: 'Dibuat', value: 'created_at' },
              { title: 'Username', value: 'username' },
              { title: 'Diubah', value: 'updated_at' },
            ]"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol cols="6" md="1">
          <VSelect
            v-model="sortOrder"
            label="Urutan"
            :items="[
              { title: 'DESC', value: 'desc' },
              { title: 'ASC', value: 'asc' },
            ]"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect
            v-model="perPage"
            label="Per halaman"
            :items="[10, 20, 50]"
          />
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />

      <VTable density="comfortable">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Peran</th>
            <th>Status</th>
            <th>Diubah Pada</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0">
            <td colspan="6" class="text-center text-medium-emphasis py-6">
              Data pengguna belum ada.
            </td>
          </tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.username }}</td>
            <td>{{ item.email }}</td>
            <td>{{ item.role?.name || '-' }}</td>
            <td>
              <VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>
                {{ item.status }}
              </VChip>
            </td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td class="text-end">
              <VBtn v-if="canDetail" size="small" variant="text" color="secondary" @click="openDetailDialog(item)">
                Detail
              </VBtn>
              <VBtn v-if="canUpdate" size="small" variant="text" color="primary" @click="openEditDialog(item)">
                Ubah
              </VBtn>
              <VBtn v-if="canDelete" size="small" variant="text" color="error" @click="openDeleteDialog(item)">
                Hapus
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>

      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4">
        <span class="text-sm text-medium-emphasis">Total: {{ total }} data</span>
        <VPagination v-model="page" :length="totalPages" :total-visible="7" />
      </div>
    </VCardText>
  </VCard>

  <VDialog v-model="isFormDialogOpen" max-width="640">
    <VCard>
      <VCardItem :title="isEditMode ? 'Ubah Pengguna' : 'Tambah Pengguna'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.username"
                label="Username"
                :rules="[v => !!v || 'Username wajib diisi']"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.email"
                label="Email"
                type="email"
                :rules="[v => !!v || 'Email wajib diisi']"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.password"
                label="Password"
                type="password"
                :hint="isEditMode ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.role_id"
                label="Peran"
                :items="roleOptions"
                item-title="title"
                item-value="value"
              
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.status"
                label="Status"
                :items="['ACTIVE', 'INACTIVE']"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isFormDialogOpen = false">Batal</VBtn>
        <VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">
          Simpan
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard>
      <VCardItem title="Hapus Pengguna" />
      <VCardText>
        Yakin hapus pengguna <strong>{{ editedItem?.username }}</strong>?
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDeleteDialogOpen = false">Batal</VBtn>
        <VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">
          Hapus
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="520">
    <VCard>
      <VCardItem title="Detail Pengguna" />
      <VCardText>
        <VTable density="compact">
          <tbody>
            <tr>
              <td>Username</td>
              <td class="text-end font-weight-medium">{{ detailItem?.username || '-' }}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td class="text-end">{{ detailItem?.email || '-' }}</td>
            </tr>
            <tr>
              <td>Peran</td>
              <td class="text-end">{{ detailItem?.role?.name || '-' }}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td class="text-end">{{ detailItem?.status || '-' }}</td>
            </tr>
            <tr>
              <td>Dibuat</td>
              <td class="text-end">{{ detailItem ? formatDate(detailItem.created_at) : '-' }}</td>
            </tr>
            <tr>
              <td>Diubah</td>
              <td class="text-end">{{ detailItem ? formatDate(detailItem.updated_at) : '-' }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="isDetailDialogOpen=false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">
    {{ snackbar.text }}
  </VSnackbar>
</template>



