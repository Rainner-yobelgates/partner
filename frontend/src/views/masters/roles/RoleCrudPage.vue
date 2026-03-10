<script setup lang="ts">
import { roleMasterService, type MasterStatus, type RoleItem } from '@/services/masters'
import { ApiError } from '@/services/http'

type RoleForm = {
  name: string
  description: string
  status: MasterStatus
}

const rows = ref<RoleItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'name' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)

const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isSubmitting = ref(false)
const editedRole = ref<RoleItem | null>(null)

const form = ref<RoleForm>({
  name: '',
  description: '',
  status: 'ACTIVE',
})

const snackbar = ref({
  show: false,
  color: 'success',
  text: '',
})

const totalPages = computed(() => {
  if (total.value === 0)
    return 1

  return Math.ceil(total.value / perPage.value)
})

const isEditMode = computed(() => Boolean(editedRole.value))

const showToast = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = {
    show: true,
    color,
    text,
  }
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof ApiError)
    return error.message

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

const fetchRoles = async () => {
  isLoading.value = true

  try {
    const response = await roleMasterService.list({
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
    showToast(normalizeErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedRole.value = null
  form.value = {
    name: '',
    description: '',
    status: 'ACTIVE',
  }
}

const openCreateDialog = () => {
  resetForm()
  isFormDialogOpen.value = true
}

const openEditDialog = (item: RoleItem) => {
  editedRole.value = item
  form.value = {
    name: item.name,
    description: item.description ?? '',
    status: item.status,
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  const payload = {
    name: form.value.name.trim(),
    description: form.value.description.trim() || undefined,
    status: form.value.status,
  }

  try {
    if (editedRole.value) {
      await roleMasterService.update(editedRole.value.id, payload)
      showToast('Role berhasil diperbarui')
    }
    else {
      await roleMasterService.create(payload)
      showToast('Role berhasil dibuat')
      page.value = 1
    }

    isFormDialogOpen.value = false
    await fetchRoles()
  }
  catch (error) {
    showToast(normalizeErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: RoleItem) => {
  editedRole.value = item
  isDeleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!editedRole.value || isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await roleMasterService.remove(editedRole.value.id)
    isDeleteDialogOpen.value = false
    showToast('Role berhasil dihapus')

    if (rows.value.length === 1 && page.value > 1)
      page.value -= 1

    await fetchRoles()
  }
  catch (error) {
    showToast(normalizeErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const onSearch = async () => {
  page.value = 1
  await fetchRoles()
}

watch([page, perPage, sortBy, sortOrder], fetchRoles)

onMounted(fetchRoles)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Master Role</span>
          <VBtn
            color="primary"
            prepend-icon="ri-add-line"
            @click="openCreateDialog"
          >
            Tambah Role
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VRow>
        <VCol
          cols="12"
          md="5"
        >
          <VTextField
            v-model="search"
            label="Cari role"
            placeholder="Nama atau deskripsi"
            clearable
            prepend-inner-icon="ri-search-line"
            @keyup.enter="onSearch"
          />
        </VCol>
        <VCol
          cols="12"
          md="2"
        >
          <VBtn
            block
            class="mt-md-1"
            color="secondary"
            @click="onSearch"
          >
            Cari
          </VBtn>
        </VCol>
        <VCol
          cols="6"
          md="2"
        >
          <VSelect
            v-model="sortBy"
            label="Sort by"
            :items="[
              { title: 'Dibuat', value: 'created_at' },
              { title: 'Nama', value: 'name' },
              { title: 'Diubah', value: 'updated_at' },
            ]"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol
          cols="6"
          md="1"
        >
          <VSelect
            v-model="sortOrder"
            label="Order"
            :items="[
              { title: 'DESC', value: 'desc' },
              { title: 'ASC', value: 'asc' },
            ]"
            item-title="title"
            item-value="value"
          />
        </VCol>
        <VCol
          cols="12"
          md="2"
        >
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
      <VProgressLinear
        v-if="isLoading"
        indeterminate
        color="primary"
        class="mb-4"
      />

      <VTable density="comfortable">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Deskripsi</th>
            <th>Status</th>
            <th>Updated At</th>
            <th class="text-end">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length === 0">
            <td
              colspan="5"
              class="text-center text-medium-emphasis py-6"
            >
              Data role belum ada.
            </td>
          </tr>
          <tr
            v-for="item in rows"
            :key="item.id"
          >
            <td class="font-weight-medium">
              {{ item.name }}
            </td>
            <td>{{ item.description || '-' }}</td>
            <td>
              <VChip
                size="small"
                :color="item.status === 'ACTIVE' ? 'success' : 'warning'"
                label
              >
                {{ item.status }}
              </VChip>
            </td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td class="text-end">
              <VBtn
                size="small"
                variant="text"
                color="primary"
                @click="openEditDialog(item)"
              >
                Edit
              </VBtn>
              <VBtn
                size="small"
                variant="text"
                color="error"
                @click="openDeleteDialog(item)"
              >
                Hapus
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>

      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4">
        <span class="text-sm text-medium-emphasis">
          Total: {{ total }} data
        </span>
        <VPagination
          v-model="page"
          :length="totalPages"
          :total-visible="7"
        />
      </div>
    </VCardText>
  </VCard>

  <VDialog
    v-model="isFormDialogOpen"
    max-width="600"
  >
    <VCard>
      <VCardItem :title="isEditMode ? 'Edit Role' : 'Tambah Role'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="form.name"
                label="Nama Role"
                :rules="[v => !!v || 'Nama wajib diisi']"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.description"
                label="Deskripsi"
                rows="3"
              />
            </VCol>
            <VCol cols="12">
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
        <VBtn
          variant="text"
          @click="isFormDialogOpen = false"
        >
          Batal
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="submitForm"
        >
          Simpan
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog
    v-model="isDeleteDialogOpen"
    max-width="420"
  >
    <VCard>
      <VCardItem title="Hapus Role" />
      <VCardText>
        Yakin hapus role <strong>{{ editedRole?.name }}</strong>?
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn
          variant="text"
          @click="isDeleteDialogOpen = false"
        >
          Batal
        </VBtn>
        <VBtn
          color="error"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="confirmDelete"
        >
          Hapus
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="2500"
  >
    {{ snackbar.text }}
  </VSnackbar>
</template>
