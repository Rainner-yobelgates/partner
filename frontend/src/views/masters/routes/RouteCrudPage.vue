<script setup lang="ts">
import { ApiError } from '@/services/http'
import { routeMasterService, type MasterStatus, type RouteItem } from '@/services/masters'

type RouteForm = {
  origin: string
  destination: string
  distance: number | null
  estimated_time: number | null
  status: MasterStatus
}

const rows = ref<RouteItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'created_at' | 'origin' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const editedItem = ref<RouteItem | null>(null)

const form = ref<RouteForm>({
  origin: '',
  destination: '',
  distance: null,
  estimated_time: null,
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))

const showToast = (text: string, color: 'success' | 'error' = 'success') => { snackbar.value = { show: true, color, text } }
const getErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const fetchRoutes = async () => {
  isLoading.value = true
  try {
    const response = await routeMasterService.list({
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
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  editedItem.value = null
  form.value = { origin: '', destination: '', distance: null, estimated_time: null, status: 'ACTIVE' }
}

const openCreateDialog = () => { resetForm(); isFormDialogOpen.value = true }
const openEditDialog = (item: RouteItem) => {
  editedItem.value = item
  form.value = {
    origin: item.origin || '',
    destination: item.destination || '',
    distance: item.distance ?? null,
    estimated_time: item.estimated_time ?? null,
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  const payload = {
    origin: form.value.origin.trim() || undefined,
    destination: form.value.destination.trim() || undefined,
    distance: form.value.distance ?? undefined,
    estimated_time: form.value.estimated_time ?? undefined,
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await routeMasterService.update(editedItem.value.id, payload)
      showToast('Rute berhasil diperbarui')
    } else {
      await routeMasterService.create(payload)
      showToast('Rute berhasil dibuat')
      page.value = 1
    }
    isFormDialogOpen.value = false
    await fetchRoutes()
  }
  catch (error) {
    showToast(getErrorMessage(error), 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

const openDeleteDialog = (item: RouteItem) => { editedItem.value = item; isDeleteDialogOpen.value = true }
const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await routeMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Rute berhasil dihapus')
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    await fetchRoutes()
  }
  catch (error) { showToast(getErrorMessage(error), 'error') }
  finally { isSubmitting.value = false }
}

const onSearch = async () => { page.value = 1; await fetchRoutes() }
watch([page, perPage, sortBy, sortOrder], fetchRoutes)
onMounted(fetchRoutes)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Master Route</span>
          <VBtn color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Route</VBtn>
        </div>
      </template>
    </VCardItem>
    <VCardText>
      <VRow>
        <VCol cols="12" md="5"><VTextField v-model="search" label="Cari route" placeholder="Origin / destination" clearable prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" /></VCol>
        <VCol cols="12" md="2"><VBtn block class="mt-md-1" color="secondary" @click="onSearch">Cari</VBtn></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortBy" label="Sort by" :items="[{ title: 'Dibuat', value: 'created_at' },{ title: 'Origin', value: 'origin' },{ title: 'Diubah', value: 'updated_at' }]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="1"><VSelect v-model="sortOrder" label="Order" :items="[{ title:'DESC', value:'desc' },{ title:'ASC', value:'asc' }]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10,20,50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>Origin</th><th>Destination</th><th>Distance (km)</th><th>ETA (min)</th><th>Status</th><th>Updated At</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length===0"><td colspan="7" class="text-center text-medium-emphasis py-6">Data route belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td class="font-weight-medium">{{ item.origin || '-' }}</td>
            <td>{{ item.destination || '-' }}</td>
            <td>{{ item.distance ?? '-' }}</td>
            <td>{{ item.estimated_time ?? '-' }}</td>
            <td><VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td class="text-end"><VBtn size="small" variant="text" color="primary" @click="openEditDialog(item)">Edit</VBtn><VBtn size="small" variant="text" color="error" @click="openDeleteDialog(item)">Hapus</VBtn></td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4">
        <span class="text-sm text-medium-emphasis">Total: {{ total }} data</span>
        <VPagination v-model="page" :length="totalPages" :total-visible="7" />
      </div>
    </VCardText>
  </VCard>

  <VDialog v-model="isFormDialogOpen" max-width="700">
    <VCard>
      <VCardItem :title="isEditMode ? 'Edit Route' : 'Tambah Route'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6"><VTextField v-model="form.origin" label="Origin" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.destination" label="Destination" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model.number="form.distance" label="Distance (km)" type="number" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model.number="form.estimated_time" label="Estimated Time (min)" type="number" /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end"><VBtn variant="text" @click="isFormDialogOpen=false">Batal</VBtn><VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn></VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard><VCardItem title="Hapus Route" /><VCardText>Yakin hapus route <strong>{{ editedItem?.origin || '-' }} - {{ editedItem?.destination || '-' }}</strong>?</VCardText><VCardActions class="justify-end"><VBtn variant="text" @click="isDeleteDialogOpen=false">Batal</VBtn><VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn></VCardActions></VCard>
  </VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>
