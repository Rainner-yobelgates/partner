<script setup lang="ts">
import { ApiError } from '@/services/http'
import {
  vehicleMasterService,
  vehicleServiceMasterService,
  type MasterStatus,
  type ServiceType,
  type VehicleItem,
  type VehicleServiceItem,
} from '@/services/masters'

type VehicleServiceForm = {
  vehicle_id: string
  service_date: string
  service_type: ServiceType
  cost: number | null
  description: string
  status: MasterStatus
}

const rows = ref<VehicleServiceItem[]>([])
const vehicles = ref<VehicleItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortBy = ref<'service_date' | 'created_at' | 'updated_at'>('service_date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const editedItem = ref<VehicleServiceItem | null>(null)

const form = ref<VehicleServiceForm>({
  vehicle_id: '',
  service_date: '',
  service_type: 'MAINTENANCE',
  cost: null,
  description: '',
  status: 'ACTIVE',
})

const snackbar = ref({ show: false, color: 'success', text: '' })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const isEditMode = computed(() => Boolean(editedItem.value))
const vehicleOptions = computed(() => vehicles.value.map(item => ({ title: item.plate_number || `Vehicle #${item.id}`, value: item.id })))

const showToast = (text: string, color: 'success' | 'error' = 'success') => { snackbar.value = { show: true, color, text } }
const getErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'
const toIsoDate = (value: string) => value ? new Date(value).toISOString() : undefined
const fromIsoToInputDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : ''

const fetchVehicles = async () => {
  try {
    const response = await vehicleMasterService.list({ page: 1, perPage: 100, sortBy: 'created_at', sortOrder: 'desc' })
    vehicles.value = response.data
  }
  catch {
    // ignore
  }
}

const fetchVehicleServices = async () => {
  isLoading.value = true
  try {
    const response = await vehicleServiceMasterService.list({
      page: page.value,
      perPage: perPage.value,
      search: search.value.trim() || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
    rows.value = response.data
    total.value = response.total
  }
  catch (error) { showToast(getErrorMessage(error), 'error') }
  finally { isLoading.value = false }
}

const resetForm = () => {
  editedItem.value = null
  form.value = { vehicle_id: '', service_date: '', service_type: 'MAINTENANCE', cost: null, description: '', status: 'ACTIVE' }
}

const openCreateDialog = () => { resetForm(); isFormDialogOpen.value = true }
const openEditDialog = (item: VehicleServiceItem) => {
  editedItem.value = item
  form.value = {
    vehicle_id: item.vehicle_id || '',
    service_date: fromIsoToInputDate(item.service_date),
    service_type: item.service_type || 'MAINTENANCE',
    cost: item.cost ?? null,
    description: item.description || '',
    status: item.status || 'ACTIVE',
  }
  isFormDialogOpen.value = true
}

const submitForm = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const payload = {
    vehicle_id: form.value.vehicle_id || undefined,
    service_date: toIsoDate(form.value.service_date),
    service_type: form.value.service_type,
    cost: form.value.cost ?? undefined,
    description: form.value.description.trim() || undefined,
    status: form.value.status,
  }

  try {
    if (editedItem.value) {
      await vehicleServiceMasterService.update(editedItem.value.id, payload)
      showToast('Vehicle service berhasil diperbarui')
    } else {
      await vehicleServiceMasterService.create(payload)
      showToast('Vehicle service berhasil dibuat')
      page.value = 1
    }
    isFormDialogOpen.value = false
    await fetchVehicleServices()
  }
  catch (error) { showToast(getErrorMessage(error), 'error') }
  finally { isSubmitting.value = false }
}

const openDeleteDialog = (item: VehicleServiceItem) => { editedItem.value = item; isDeleteDialogOpen.value = true }
const confirmDelete = async () => {
  if (!editedItem.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await vehicleServiceMasterService.remove(editedItem.value.id)
    isDeleteDialogOpen.value = false
    showToast('Vehicle service berhasil dihapus')
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    await fetchVehicleServices()
  }
  catch (error) { showToast(getErrorMessage(error), 'error') }
  finally { isSubmitting.value = false }
}

const onSearch = async () => { page.value = 1; await fetchVehicleServices() }
watch([page, perPage, sortBy, sortOrder], fetchVehicleServices)
onMounted(async () => { await fetchVehicles(); await fetchVehicleServices() })
</script>

<template>
  <VCard>
    <VCardItem>
      <template #title>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <span class="text-h6">Master Vehicle Service</span>
          <VBtn color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">Tambah Service</VBtn>
        </div>
      </template>
    </VCardItem>
    <VCardText>
      <VRow>
        <VCol cols="12" md="5"><VTextField v-model="search" label="Cari service" placeholder="Description" clearable prepend-inner-icon="ri-search-line" @keyup.enter="onSearch" /></VCol>
        <VCol cols="12" md="2"><VBtn block class="mt-md-1" color="secondary" @click="onSearch">Cari</VBtn></VCol>
        <VCol cols="6" md="2"><VSelect v-model="sortBy" label="Sort by" :items="[{ title:'Service Date', value:'service_date'},{ title:'Dibuat', value:'created_at'},{ title:'Diubah', value:'updated_at'}]" item-title="title" item-value="value" /></VCol>
        <VCol cols="6" md="1"><VSelect v-model="sortOrder" label="Order" :items="[{ title:'DESC', value:'desc'},{ title:'ASC', value:'asc'}]" item-title="title" item-value="value" /></VCol>
        <VCol cols="12" md="2"><VSelect v-model="perPage" label="Per halaman" :items="[10,20,50]" /></VCol>
      </VRow>
    </VCardText>
    <VDivider />
    <VCardText>
      <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <VTable density="comfortable">
        <thead>
          <tr><th>Vehicle</th><th>Service Date</th><th>Type</th><th>Cost</th><th>Description</th><th>Status</th><th class="text-end">Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="!isLoading && rows.length===0"><td colspan="7" class="text-center text-medium-emphasis py-6">Data vehicle service belum ada.</td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td>{{ item.vehicle?.plate_number || '-' }}</td>
            <td>{{ formatDate(item.service_date) }}</td>
            <td>{{ item.service_type || '-' }}</td>
            <td>{{ item.cost ?? '-' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td><VChip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'warning'" label>{{ item.status || '-' }}</VChip></td>
            <td class="text-end"><VBtn size="small" variant="text" color="primary" @click="openEditDialog(item)">Edit</VBtn><VBtn size="small" variant="text" color="error" @click="openDeleteDialog(item)">Hapus</VBtn></td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex justify-space-between align-center mt-4 flex-wrap gap-4"><span class="text-sm text-medium-emphasis">Total: {{ total }} data</span><VPagination v-model="page" :length="totalPages" :total-visible="7" /></div>
    </VCardText>
  </VCard>

  <VDialog v-model="isFormDialogOpen" max-width="840">
    <VCard>
      <VCardItem :title="isEditMode ? 'Edit Vehicle Service' : 'Tambah Vehicle Service'" />
      <VCardText>
        <VForm @submit.prevent="submitForm">
          <VRow>
            <VCol cols="12" md="6"><VSelect v-model="form.vehicle_id" label="Vehicle" :items="vehicleOptions" item-title="title" item-value="value" clearable /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.service_date" type="datetime-local" label="Service Date" /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.service_type" label="Service Type" :items="['MAINTENANCE','REPAIR','OIL_CHANGE','INSPECTION']" /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="form.status" label="Status" :items="['ACTIVE','INACTIVE']" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model.number="form.cost" label="Cost" type="number" /></VCol>
            <VCol cols="12"><VTextarea v-model="form.description" label="Description" rows="2" /></VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end"><VBtn variant="text" @click="isFormDialogOpen=false">Batal</VBtn><VBtn color="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">Simpan</VBtn></VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDeleteDialogOpen" max-width="420"><VCard><VCardItem title="Hapus Vehicle Service" /><VCardText>Yakin hapus data service <strong>{{ editedItem?.service_type || '-' }}</strong>?</VCardText><VCardActions class="justify-end"><VBtn variant="text" @click="isDeleteDialogOpen=false">Batal</VBtn><VBtn color="error" :loading="isSubmitting" :disabled="isSubmitting" @click="confirmDelete">Hapus</VBtn></VCardActions></VCard></VDialog>

  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">{{ snackbar.text }}</VSnackbar>
</template>
